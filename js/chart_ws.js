
// ===== CONFIG =====

const REQUEST_TIMEOUT = 10000; // 10 segundos

const LASTFM_API_KEY = "fe91cc33c93ea3c390251067966de1ba";


const SPOTIFY_CLIENT_ID = "01800d9a6c004dc9863ae48feb01af86";
const SPOTIFY_CLIENT_SECRET = "6c6d109a079e4565bdbe9a85befd6edd";


const DEFAULT_USER = "pgbito";

const DATATYPES = {
    albums: "user.gettopalbums",
    artists: "user.gettopartists",

};

const NO_IMAGE_PLACEHOLDER =
    "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png";

const DESIRED_SIZE = 320;
const DEBUG = false;

const chart_data = {};



async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
}

function buildUrl(base, params = {}) {
    const url = new URL(base);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.append(k, v);
    });
    return url.toString();
}

class HTTPError extends Error {
    constructor(status_code, detail) {
        super(detail);
        this.status_code = status_code;
        this.detail = detail;
    }
}


async function apiFetch(url, { method = "GET", params = {}, headers = {}, handling = "json" } = {}) {
    const fullUrl = method === "GET" ? buildUrl(url, params) : url;
    const res = await fetchWithTimeout(fullUrl, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: method !== "GET" ? JSON.stringify(params) : undefined,
    });

    switch (handling) {
        case "json":
            return res.json();
        case "text":
            return res.text();
        case "raw":
            return res.arrayBuffer();
        default:
            return res;
    }
}


let spotifyToken = null;
let spotifyTokenExpiresAt = 0;

async function getSpotifyToken() {
    if (spotifyToken && Date.now() < spotifyTokenExpiresAt) {
        return spotifyToken;
    }

    const res = await fetchWithTimeout("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
        },
        body: "grant_type=client_credentials",
    });

    const data = await res.json();
    spotifyToken = data.access_token;
    spotifyTokenExpiresAt = Date.now() + data.expires_in * 1000 - 5000; // margen de 5s
    return spotifyToken;
}


async function requestChart(username, datatype, period, height = 3, width = 3) {
    if (height + width > 34) {
        throw new HTTPError(400, "Height and width cannot be greater than 31");
    }

    const key = datatype.toLowerCase();
    if (!(key in DATATYPES)) {
        throw new HTTPError(400, "Invalid datatype");
    }

    const url = "http://ws.audioscrobbler.com/2.0/";
    const content = await apiFetch(url, {
        params: {
            user: username,
            method: DATATYPES[key],
            period,
            limit: width * height, // ojo: tu original tenía "q" suelto, era bug — te lo dejo corregido
            api_key: LASTFM_API_KEY,
            format: "json",
        },
    });

    if (content.error) {
        throw new HTTPError(content.error, content.message);
    }

    return createChart(content, DATATYPES[key], height, width);
}

// =========================================================
//  CREATE CHART (reemplaza create_chart de node)
// =========================================================

async function createChart(data, method, height, width, redownload = false) {
    let imgs = [];

    if (method === "user.gettopalbums") {
        const albums = data.topalbums.album;
        const albumIterator = albums.slice(0, width * height);

        imgs = await Promise.all(
            albumIterator.map(async (album) => {
                const name = album.name;
                const artist = album.artist.name;
                const fillQuery = `${name} - ${artist}`;

                let chartImg;
                if (fillQuery in chart_data && !redownload) {
                    chartImg = chart_data[fillQuery];
                } else {
                    chartImg = await getImg(album.image?.[3]?.["#text"], fillQuery);
                    chart_data[fillQuery] = chartImg;
                }

                return [[name, artist], chartImg, false];
            })
        );
    } else if (method === "user.gettopartists") {
        const artists = data.topartists.artist;
        const iterator = artists.slice(0, width * height);

        imgs = await Promise.all(
            iterator.map(async (artist) => {
                const name = artist.name;
                const plays = artist.playcount;

                let chartImg;
                if (name in chart_data) {
                    chartImg = chart_data[name];
                } else {
                    const [, imgUrl] = await scrapeArtistImagesForChart(name);
                    chartImg = imgUrl;
                    chart_data[name] = chartImg;
                }

                return [[`${plays} ${formatPlays(plays)}`, name], chartImg, true];
            })
        );
    }

    return addLayers(imgs, width, height);
}



async function getImg(url, q = null) {
    if (url)

        return url;


    const token = await getSpotifyToken();
    const req = await apiFetch("https://api.spotify.com/v1/search", {
        params: {
            q: q?.toUpperCase(),
            limit: 10,
            offset: 0,
            type: "album",
            market: "ES",
        },
        headers: { Authorization: `Bearer ${token}` },
    });

    const items = req.albums?.items || [];
    if (items.length) {
        const album = items[0];
        const image = album.images?.[1] ?? album.images?.[0];
        if (image) return image.url;
    }

    return NO_IMAGE_PLACEHOLDER;
}

// =========================================================
//  ARTIST IMAGES — workaround real (sin scraping, sin proxy)
// =========================================================
// contexto: last.fm mató las imágenes de artista en su API hace años,
// "artist.getinfo" solo devuelve el placeholder gris de siempre. Y
// scrapear el HTML de last.fm/music/.../+images desde el browser choca
// con CORS porque last.fm no manda Access-Control-Allow-Origin — un
// fetch() directo a eso SIEMPRE va a fallar en un <script type="module">
// corriendo en el cliente, no hay vuelta que darle sin backend propio.
//
// el workaround real: usar la API de Spotify (misma que ya usás para
// álbumes) para traer la foto del artista. Spotify SÍ tiene CORS abierto
// para sus endpoints de /v1, así que esto funciona 100% desde el browser.

// pequeño cache en memoria para no pedir el mismo artista dos veces
const artistImageCache = {};

async function getArtistImageFromSpotify(artistName) {
    if (artistName in artistImageCache) {
        return artistImageCache[artistName];
    }

    const token = await getSpotifyToken();
    const req = await apiFetch("https://api.spotify.com/v1/search", {
        params: {
            q: artistName,
            type: "artist",
            limit: 1,
        },
        headers: { Authorization: `Bearer ${token}` },
    });

    const items = req.artists?.items || [];
    let imgUrl = NO_IMAGE_PLACEHOLDER;

    if (items.length && items[0].images?.length) {
        // images viene ordenado de mayor a menor resolución
        // agarramos una intermedia (parecido al [1] que usabas en álbumes)
        const img = items[0].images[1] ?? items[0].images[0];
        imgUrl = img.url;
    }

    artistImageCache[artistName] = imgUrl;
    return imgUrl;
}


async function scrapeArtistImagesForChart(artist) {
    const url = await getArtistImageFromSpotify(artist);
    return [artist, url];
}



function formatPlays(amount) {
    return amount == 1 ? "play" : "plays";
}

function chunks(lst, n) {
    return Array.from({ length: Math.ceil(lst.length / n) }, (_, i) =>
        lst.slice(i * n, i * n + n)
    );
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // necesario para no ensuciar el canvas (tainted)
        img.onload = () => resolve(img);
        img.onerror = reject;

        if (src instanceof Blob) {
            img.src = URL.createObjectURL(src);
        } else if (src instanceof ArrayBuffer || src instanceof Uint8Array) {
            const blob = new Blob([src]);
            img.src = URL.createObjectURL(blob);
        } else {
            img.src = src;
        }
    });
}


function wrapText(text, maxChars) {
    const words = text.split(" ");
    const lines = [];
    let current = "";

    for (const word of words) {
        if ((current + " " + word).trim().length > maxChars) {
            if (current) lines.push(current.trim());
            current = word;
        } else {
            current += " " + word;
        }
    }
    if (current) lines.push(current.trim());
    return lines;
}


function drawStrokedText(ctx, text, x, y, font, fillColor, strokeColor, strokeWidth) {
    ctx.font = font;
    ctx.textBaseline = "top";

    const lines = text.split("\n");
    const fontSize = parseInt(font.match(/\d+/)?.[0] ?? "16", 10);
    const lineHeight = fontSize + 4;

    lines.forEach((line, i) => {
        const ly = y + i * lineHeight;
        ctx.lineWidth = strokeWidth * 2;
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(line, x, ly);

        ctx.fillStyle = fillColor;
        ctx.fillText(line, x, ly);
    });
}


async function processItem(item) {
    let [atextOriginal, byteitem, needsResize] = item;
    const atext = [...atextOriginal]; // copia, como list(atext) en python

    const canvas = document.createElement("canvas");
    canvas.width = DESIRED_SIZE;
    canvas.height = DESIRED_SIZE;
    const ctx = canvas.getContext("2d");

    let image = null;
    try {
        image = await loadImage(byteitem);
    } catch (e) {
        // equivalente a PIL.UnidentifiedImageError -> imagen negra
        ctx.fillStyle = "rgba(0,0,0,255)";
        ctx.fillRect(0, 0, DESIRED_SIZE, DESIRED_SIZE);
        needsResize = false;
    }

    if (needsResize && image) {
        // fondo negro
        ctx.fillStyle = "rgba(0,0,0,255)";
        ctx.fillRect(0, 0, DESIRED_SIZE, DESIRED_SIZE);

        // thumbnail: mantiene aspect ratio, cabe dentro de DESIRED_SIZE
        const scale = Math.min(
            DESIRED_SIZE / image.width,
            DESIRED_SIZE / image.height,
            1
        );
        const w = Math.round(image.width * scale);
        const h = Math.round(image.height * scale);

        const offsetX = Math.max((DESIRED_SIZE - w) / 2, 0);
        const offsetY = Math.max((DESIRED_SIZE - h) / 2, 0);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high"; // lo más cercano a LANCZOS en canvas nativo
        ctx.drawImage(image, offsetX, offsetY, w, h);
    } else if (image) {
        ctx.drawImage(image, 0, 0, DESIRED_SIZE, DESIRED_SIZE);
    }


    let height = 25;
    let line0 = atext[0];

    if (line0.length > 30) {
        const wrapped = wrapText(line0, 30);
        height *= wrapped.length;
        line0 = wrapped.join("\n");
    }

    drawStrokedText(ctx, line0, 5, 1 + 16, "bold 16px sans-serif", "white", "black", 1);
    drawStrokedText(ctx, atext[1], 5, height + 16, "14px sans-serif", "rgb(244,244,244)", "black", 1);

    return canvas;
}


async function addLayers(data, w, h) {
    const processed = await Promise.all(data.map(processItem));
    return mixImages(processed, w, h);
}

async function mixImages(canvasList, w, h) {
    const dimensions = [DESIRED_SIZE * w, DESIRED_SIZE * h];
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = dimensions[0];
    finalCanvas.height = dimensions[1];
    const ctx = finalCanvas.getContext("2d");

    const rows = chunks(canvasList, w);

    let y = 0;
    for (const row of rows) {
        let x = 0;
        for (const item of row) {
            ctx.drawImage(item, x, y, DESIRED_SIZE, DESIRED_SIZE);
            x += DESIRED_SIZE;
        }
        y += DESIRED_SIZE;
    }

    // resize si pasa de 2100x2100, igual que el original (evita bloquear al enviar)
    let outCanvas = finalCanvas;
    if (dimensions[0] > 2100 && dimensions[1] > 2100) {
        outCanvas = document.createElement("canvas");
        outCanvas.width = 2100;
        outCanvas.height = 2100;
        const outCtx = outCanvas.getContext("2d");
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = "high";
        outCtx.drawImage(finalCanvas, 0, 0, 2100, 2100);
    }

    return new Promise((resolve, reject) => {
        outCanvas.toBlob(
            (blob) => {
                if (!blob) return reject(new Error("no se pudo generar el blob"));
                resolve(blob); // equivalente a tu BytesIO con name="chart.webp"
            },
            "image/webp",
            1.0
        );
    });
}


async function userGetTopArtists(user = DEFAULT_USER, period = "overall", limit = 50, page = 1) {
    const data = await apiFetch("http://ws.audioscrobbler.com/2.0/", {
        params: {
            method: "user.getTopArtists",
            user,
            period,
            limit,
            page,
            api_key: LASTFM_API_KEY,
            format: "json",
        },
    });

    const artists = data.topartists.artist;
    const imgs = await Promise.all(
        artists.map((artist) => scrapeArtistImagesForChart(artist.name))
    );

    return imgs; // [[name, imgUrl], ...]
}

async function userGetTopAlbums(user = DEFAULT_USER, period = "overall", limit = 50, page = 1) {
    const data = await apiFetch("http://ws.audioscrobbler.com/2.0/", {
        params: {
            method: "user.getTopAlbums",
            user,
            period,
            limit,
            page,
            api_key: LASTFM_API_KEY,
            format: "json",
        },
    });

    const albums = data.topalbums.album;

    return albums.map((album) => {
        let img = album.image?.at(-1)?.["#text"]?.replace("300x300", "770x0");
        if (!img) {
            img = NO_IMAGE_PLACEHOLDER;
        }
        return [album.artist.name, img, album.name];
    });
}

export {
    requestChart,
    createChart,
    userGetTopArtists,
    userGetTopAlbums,
    addLayers,
    mixImages,
    processItem,
    HTTPError,
};
