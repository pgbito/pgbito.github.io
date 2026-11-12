import { Window, Html as e, getcenter } from "./windower.js";

const LASTFM_API_KEY = "fe91cc33c93ea3c390251067966de1ba";
const LASTFM_USER = "pgbito";
const SPOTIFY_CLIENT_ID = "01800d9a6c004dc9863ae48feb01af86";
const SPOTIFY_CLIENT_SECRET = "6c6d109a079e4565bdbe9a85befd6edd";
const DEFAULT_AVATAR =
  "https://lastfm-img.freetls.fastly.net/i/u/300x300/b9e88aee43fa54718be9eb272686b894.png";

// In-memory caches to avoid redundant requests and rate limits
let cachedUserInfo = null;
let cachedLovedTracks = null;
const cachedTopArtists = {};
let cachedRecentTracks = null;
const artistImageCache = {};
let spotifyToken = null;
let spotifyTokenExpiresAt = 0;

// Format numbers with period separators: 205916 -> 205.916
function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Format unix timestamp to Spanish date: "5 agosto 2021"
function formatRegisteredDate(unixTimestamp) {
  if (!unixTimestamp) return "5 agosto 2021";
  const date = new Date(Number(unixTimestamp) * 1000);
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Relative time formatter for scrobbles
function formatRelativeTime(dateUts) {
  if (!dateUts) return "";
  const diffSec = Math.floor(Date.now() / 1000 - Number(dateUts));
  if (diffSec < 60) return "hace un momento";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

// Fetch Spotify client credentials access token (CORS-enabled)
async function getSpotifyToken() {
  if (spotifyToken && Date.now() < spotifyTokenExpiresAt) {
    return spotifyToken;
  }
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error("Spotify auth error");
    const data = await res.json();
    spotifyToken = data.access_token;
    spotifyTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000 - 5000;
    return spotifyToken;
  } catch (err) {
    console.warn("Spotify token fetch failed:", err);
    return null;
  }
}

// Fetch artist photo from Spotify API (avoids Last.fm CORS scraping issues)
async function getArtistImage(artistName) {
  if (artistImageCache[artistName]) {
    return artistImageCache[artistName];
  }
  try {
    const token = await getSpotifyToken();
    if (!token) return null;

    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.artists?.items;
    if (items && items.length && items[0].images?.length) {
      const img = items[0].images[1]?.url || items[0].images[0]?.url;
      artistImageCache[artistName] = img;
      return img;
    }
  } catch (err) {
    console.warn("Spotify artist image lookup failed:", err);
  }
  return null;
}

// Last.fm user info & loved tracks
async function fetchLastfmUser() {
  if (cachedUserInfo && cachedLovedTracks) {
    return { user: cachedUserInfo, loved: cachedLovedTracks };
  }

  const [userRes, lovedRes] = await Promise.allSettled([
    fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json`
    ).then((r) => r.json()),
    fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getlovedtracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=1`
    ).then((r) => r.json()),
  ]);

  if (userRes.status === "fulfilled" && userRes.value?.user) {
    cachedUserInfo = userRes.value.user;
  }
  if (lovedRes.status === "fulfilled") {
    cachedLovedTracks = lovedRes.value?.lovedtracks?.["@attr"]?.total || "2179";
  }

  return {
    user: cachedUserInfo || {
      name: "pgbito",
      realname: "pablo",
      country: "Costa Rica",
      playcount: "205916",
      artist_count: "5633",
      registered: { unixtime: 1628188365 },
    },
    loved: cachedLovedTracks || "2179",
  };
}

// Fetch Top Artists for selected period (8 artists for 4x2 grid)
async function fetchTopArtists(period = "3month") {
  if (cachedTopArtists[period]) {
    return cachedTopArtists[period];
  }
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=8&period=${period}`
  );
  if (!res.ok) throw new Error("Error fetching top artists");
  const data = await res.json();
  const list = data?.topartists?.artist || [];
  cachedTopArtists[period] = list;
  return list;
}

// Fetch Recent Tracks for Scrobblings tab
async function fetchRecentTracks() {
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=20`
  );
  if (!res.ok) throw new Error("Error fetching recent tracks");
  const data = await res.json();
  const tracks = data?.recenttracks?.track || [];
  cachedRecentTracks = tracks;
  return tracks;
}

export function openLastfmWindow() {
  if (window.lastfmwin) {
    window.lastfmwin.focusWindow();
    return;
  }

  const doc = document.getElementById("screen");
  const mobile = window.innerWidth <= 768;
  const winWidth = mobile ? Math.min(window.innerWidth - 16, 680) : 690;
  const winHeight = mobile ? Math.min(window.innerHeight - 60, 560) : 580;

  // Root container for edge-to-edge Last.fm Scrobbler app
  const appContainer = new e("div")
    .class("lastfm-scrobbler-app")
    .style({
      width: "100%",
      height: "100%",
      display: "flex",
      "flex-direction": "column",
      "align-self": "stretch",
      "font-family": '"Segoe UI", Tahoma, sans-serif',
      "user-select": "none",
      background: "#f0f0f0",
      overflow: "hidden",
    });

  // Windows classic menu bar: Archivo, Ver, Scrobblings, Controles, Cuenta, Herramientas, Ventana, Ayuda
  const menuBar = new e("div").class("lastfm-menu-bar").appendMany(
    new e("div").class("lastfm-menu-item").text("Archivo").on("click", () => {
      if (window.lastfmwin) window.lastfmwin.close();
    }),
    new e("div").class("lastfm-menu-item").text("Ver").on("click", () => {
      switchTab("perfil");
    }),
    new e("div").class("lastfm-menu-item").text("Scrobblings").on("click", () => {
      switchTab("scrobblings");
    }),
    new e("div").class("lastfm-menu-item").text("Controles"),
    new e("div").class("lastfm-menu-item").text("Cuenta").on("click", () => {
      window.open(`https://www.last.fm/user/${LASTFM_USER}`, "_blank");
    }),
    new e("div").class("lastfm-menu-item").text("Herramientas").on("click", () => {
      if (window.chart_window) window.chart_window();
    }),
    new e("div").class("lastfm-menu-item").text("Ventana"),
    new e("div").class("lastfm-menu-item").text("Ayuda").on("click", () => {
      alert("Last.fm Scrobbler (Web Edition)\nUsuario: pgbito\nHecho con amor y estilo Windows 7 :p");
    })
  );

  // App body: Left sidebar + Right main content
  const appBody = new e("div").class("lastfm-app-body").style({
    display: "flex",
    flex: "1",
    overflow: "hidden",
  });

  // Left Sidebar
  const sidebar = new e("div").class("lastfm-sidebar");

  // Tab 1: Scrobblings
  const tabScrobblings = new e("div")
    .class("lastfm-tab-btn")
    .id("lastfm-tab-scrobblings")
    .appendMany(
      new e("div").class("lastfm-tab-icon").html(`
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6h2v2H4zm0 5h2v2H4zm0 5h2v2H4zm5-10h11v2H9zm0 5h11v2H9zm0 5h11v2H9z"/>
        </svg>
      `),
      new e("div").class("lastfm-tab-label").text("Scrobblings")
    )
    .on("click", () => switchTab("scrobblings"));

  // Tab 2: Perfil (Active by default)
  const tabPerfil = new e("div")
    .class("lastfm-tab-btn", "active")
    .id("lastfm-tab-perfil")
    .appendMany(
      new e("div").class("lastfm-tab-icon").html(`
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a9 9 0 0 0-9 9v3a3 3 0 0 0 3 3h1v-6H5v-0a7 7 0 1 1 14 0v0h-2v6h1a3 3 0 0 0 3-3v-3a9 9 0 0 0-9-9zM7 14h1v4H7zm9 0h1v4h-1z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `),
      new e("div").class("lastfm-tab-label").text("Perfil")
    )
    .on("click", () => switchTab("perfil"));

  // Sidebar footer: pgbito (Conectado)
  const sidebarFooter = new e("div").class("lastfm-sidebar-footer").appendMany(
    new e("div").class("lastfm-gear-icon").html(`
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    `),
    new e("div").class("lastfm-status-text").html(`
      <span class="lastfm-online-dot"></span>
      <span title="Conectado a Last.fm">pgbito (Conectado)</span>
    `)
  );

  sidebar.appendMany(tabScrobblings, tabPerfil, sidebarFooter);

  // Right Main Content Container
  const contentArea = new e("div").class("lastfm-main-content");

  // View: Perfil
  const perfilView = new e("div").id("lastfm-view-perfil").class("lastfm-view");

  // View: Scrobblings
  const scrobblingsView = new e("div")
    .id("lastfm-view-scrobblings")
    .class("lastfm-view")
    .style({ display: "none" });

  contentArea.appendMany(perfilView, scrobblingsView);
  appBody.appendMany(sidebar, contentArea);
  appContainer.appendMany(menuBar, appBody);

  // Create Window
  window.lastfmwin = new Window(
    doc,
    "Last.fm Scrobbler",
    getcenter(),
    winWidth,
    winHeight,
    [appContainer]
  );

  // Remove default padding so Last.fm Scrobbler app fits edge-to-edge
  if (window.lastfmwin.content) {
    window.lastfmwin.content.style.padding = "0px";
    window.lastfmwin.content.style.alignItems = "stretch";
    window.lastfmwin.content.style.overflow = "hidden";
  }

  // Customize window title with Last.fm logo
  const titleEl = document.getElementById(`title-${window.lastfmwin.id}`);
  if (titleEl) {
    titleEl.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:6px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#d51007" style="flex-shrink:0;">
          <circle cx="12" cy="12" r="12" fill="#d51007"/>
          <path d="M10.2 16.5c-2.8 0-4.5-1.7-4.5-4.5s1.7-4.5 4.5-4.5c2 0 3.3.9 4 2.3l-1.5.9c-.5-.9-1.3-1.5-2.5-1.5-1.8 0-2.8 1.2-2.8 2.8s1 2.8 2.8 2.8c1.3 0 2.2-.6 2.7-1.6l1.5.9c-.8 1.7-2.3 2.8-4.2 2.8zm7.3 0c-1.3 0-2.2-.7-2.6-1.8h-.1v1.6h-1.6V7.8h1.6v3.2h.1c.4-1.1 1.4-1.8 2.6-1.8 1.8 0 3.1 1.5 3.1 3.6s-1.3 3.7-3.1 3.7zm-.3-1.6c1 0 1.7-.8 1.7-2.1s-.7-2.1-1.7-2.1c-1 0-1.8.8-1.8 2.1s.8 2.1 1.8 2.1z" fill="#fff"/>
        </svg>
        <span>Last.fm Scrobbler</span>
      </span>
    `;
  }

  // Handle window close
  const origClose = window.lastfmwin.close.bind(window.lastfmwin);
  window.lastfmwin.close = function () {
    window.lastfmwin = undefined;
    origClose();
  };

  // Switch tabs
  function switchTab(tab) {
    const scrobBtn = document.getElementById("lastfm-tab-scrobblings");
    const perfilBtn = document.getElementById("lastfm-tab-perfil");
    const scrobViewEl = document.getElementById("lastfm-view-scrobblings");
    const perfilViewEl = document.getElementById("lastfm-view-perfil");

    if (tab === "perfil") {
      perfilBtn?.classList.add("active");
      scrobBtn?.classList.remove("active");
      if (perfilViewEl) perfilViewEl.style.display = "block";
      if (scrobViewEl) scrobViewEl.style.display = "none";
    } else {
      scrobBtn?.classList.add("active");
      perfilBtn?.classList.remove("active");
      if (perfilViewEl) perfilViewEl.style.display = "none";
      if (scrobViewEl) scrobViewEl.style.display = "block";
      loadScrobblingsTab();
    }
  }

  // Load Perfil Tab content
  async function loadPerfilTab() {
    perfilView.html(`
      <div class="lastfm-loading-container">
        <div class="lastfm-spinner"></div>
        <div style="font-size:12px;color:#777;margin-top:8px;">Cargando perfil de Last.fm...</div>
      </div>
    `);

    try {
      const { user, loved } = await fetchLastfmUser();
      const playcount = Number(user.playcount || 205916);
      const artistCount = Number(user.artist_count || 5633);
      const regTime = Number(user.registered?.unixtime || 1628188365);
      const daysSince = Math.max(1, (Date.now() / 1000 - regTime) / 86400);
      const avgPerDay = Math.round(playcount / daysSince);
      const avatarUrl =
        user.image?.[3]?.["#text"] ||
        user.image?.[2]?.["#text"] ||
        DEFAULT_AVATAR;

      const profileHtml = `
        <div class="lastfm-profile-header">
          <div class="lastfm-avatar-wrapper">
            <img src="${avatarUrl}" class="lastfm-avatar-img" alt="${user.name}" draggable="false" />
          </div>
          <div class="lastfm-user-details">
            <h2 class="lastfm-username">${user.name || "pgbito"}</h2>
            <div class="lastfm-user-sub">${user.realname || "pablo"}, ${user.country || "Costa Rica"}</div>
            
            <div class="lastfm-stat-row">
              <div class="lastfm-stat-value">${formatNumber(playcount)}</div>
              <div class="lastfm-stat-label">scrobblings desde ${formatRegisteredDate(regTime)}</div>
            </div>

            <div class="lastfm-stat-row">
              <div class="lastfm-stat-value">${formatNumber(loved)}</div>
              <div class="lastfm-stat-label">temas favoritos</div>
            </div>
          </div>
        </div>

        <!-- Speech Bubble Callout -->
        <div class="lastfm-speech-bubble">
          <div class="lastfm-bubble-arrow"></div>
          Tienes <strong>${formatNumber(artistCount)}</strong> artistas en tu colección y escuchas una media de <strong>${avgPerDay}</strong> temas al día.
        </div>

        <!-- Top Artists Section with Period Selector -->
        <div class="lastfm-section-header">
          <div class="lastfm-section-title">Artistas más escuchados</div>
          <div class="lastfm-period-container">
            <select id="lastfm-period-select" class="lastfm-select">
              <option value="7day">Últimos 7 días</option>
              <option value="1month">Últimos 30 días</option>
              <option value="3month" selected>Últimos 90 días</option>
              <option value="6month">Últimos 6 meses</option>
              <option value="12month">Últimos 12 meses</option>
              <option value="overall">Todo el tiempo</option>
            </select>
          </div>
        </div>

        <!-- Last.fm Artists Grid (Cuadrícula) -->
        <div id="lastfm-artists-grid" class="lastfm-grid">
          <div class="lastfm-grid-loading">Cargando cuadrícula de artistas...</div>
        </div>

        <div class="lastfm-grid-footer">
          <a href="https://www.last.fm/user/${LASTFM_USER}/library/artists" target="_blank" class="lastfm-more-link">
            Ver más artistas en Last.fm ›
          </a>
        </div>
      `;

      perfilView.html(profileHtml);

      // Bind period select change
      const periodSelect = document.getElementById("lastfm-period-select");
      if (periodSelect) {
        periodSelect.addEventListener("change", (e) => {
          loadArtistsGrid(e.target.value);
        });
      }

      // Load initial grid (90 days, matching reference)
      loadArtistsGrid("3month");
    } catch (err) {
      console.error("Lastfm profile load error:", err);
      perfilView.html(`
        <div style="padding:20px;text-align:center;color:#666;">
          <p>Error cargando información de Last.fm 😓</p>
          <button id="lastfm-retry-btn" class="lastfm-btn" style="margin-top:10px;">Reintentar</button>
        </div>
      `);
      document.getElementById("lastfm-retry-btn")?.addEventListener("click", loadPerfilTab);
    }
  }

  // Load and render the 8-card grid of Top Artists (4x2)
  async function loadArtistsGrid(period = "3month") {
    const gridEl = document.getElementById("lastfm-artists-grid");
    if (!gridEl) return;

    gridEl.innerHTML = `
      <div class="lastfm-grid-loading" style="grid-column: 1 / -1; text-align:center; padding: 30px 0; color:#777;">
        <div class="lastfm-spinner" style="margin:0 auto 8px auto;"></div>
        Cargando cuadrícula de artistas...
      </div>
    `;

    try {
      const artists = await fetchTopArtists(period);
      if (!artists.length) {
        gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:20px; color:#888;">No hay artistas en este período.</div>`;
        return;
      }

      // Take first 8 artists for the 4x2 grid
      const top8 = artists.slice(0, 8);
      gridEl.innerHTML = "";

      // Create card elements with fallback photo initially
      const cardEls = top8.map((artist, idx) => {
        const card = document.createElement("div");
        card.className = "lastfm-artist-card";
        card.setAttribute("title", `${artist.name} - ${artist.playcount} reproducciones`);
        card.innerHTML = `
          <div class="lastfm-card-img-wrapper">
            <div class="lastfm-card-img-placeholder" id="lastfm-placeholder-${idx}">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#666">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <img class="lastfm-card-img" id="lastfm-card-img-${idx}" alt="${artist.name}" style="display:none;" />
            <div class="lastfm-card-overlay">
              <span class="lastfm-card-artist">${artist.name}</span>
              <span class="lastfm-card-plays">${formatNumber(artist.playcount)} plays</span>
            </div>
          </div>
        `;
        card.addEventListener("click", () => {
          window.open(
            artist.url || `https://www.last.fm/music/${encodeURIComponent(artist.name)}`,
            "_blank"
          );
        });
        gridEl.appendChild(card);
        return { artist, idx, card };
      });

      // Asynchronously fetch artist photos from Spotify (avoiding CORS issues)
      top8.forEach(async (artist, idx) => {
        const imgUrl = await getArtistImage(artist.name);
        const imgEl = document.getElementById(`lastfm-card-img-${idx}`);
        const phEl = document.getElementById(`lastfm-placeholder-${idx}`);
        if (imgUrl && imgEl) {
          imgEl.src = imgUrl;
          imgEl.onload = () => {
            imgEl.style.display = "block";
            if (phEl) phEl.style.display = "none";
          };
          imgEl.onerror = () => {
            if (phEl) phEl.style.display = "flex";
          };
        }
      });
    } catch (err) {
      console.error("Top artists load error:", err);
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding:20px; color:#c00;">
          Error al cargar los artistas más escuchados.
        </div>
      `;
    }
  }

  // Load Recent Tracks (Scrobblings tab)
  async function loadScrobblingsTab() {
    scrobblingsView.html(`
      <div class="lastfm-loading-container">
        <div class="lastfm-spinner"></div>
        <div style="font-size:12px;color:#777;margin-top:8px;">Cargando scrobblings recientes...</div>
      </div>
    `);

    try {
      const tracks = await fetchRecentTracks();
      if (!tracks.length) {
        scrobblingsView.html(`
          <div style="padding:30px;text-align:center;color:#888;">
            No se encontraron scrobblings recientes.
          </div>
        `);
        return;
      }

      let tracksHtml = `
        <div class="lastfm-scrob-header">
          <div style="font-weight:bold;font-size:14px;color:#222;">Pistas recientes (${tracks.length})</div>
          <button id="lastfm-refresh-scrob-btn" class="lastfm-btn-small">🔄 Actualizar</button>
        </div>
        <div class="lastfm-scrob-list">
      `;

      tracks.forEach((track) => {
        const isNowPlaying = track["@attr"]?.nowplaying === "true";
        const artist = track.artist?.["#text"] || "?";
        const name = track.name || "?";
        const album = track.album?.["#text"] || "";
        const img = track.image?.[1]?.["#text"] || track.image?.[2]?.["#text"];
        const timeText = isNowPlaying ? "Escuchando ahora" : formatRelativeTime(track.date?.uts);
        const trackUrl = track.url || `https://www.last.fm/music/${encodeURIComponent(artist)}/_/${encodeURIComponent(name)}`;

        tracksHtml += `
          <div class="lastfm-scrob-row ${isNowPlaying ? "now-playing" : ""}" onclick="window.open('${trackUrl}', '_blank')">
            <div class="lastfm-scrob-cover">
              ${img ? `<img src="${img}" alt="${name}" draggable="false" />` : `<div class="lastfm-scrob-nocover">♪</div>`}
            </div>
            <div class="lastfm-scrob-info">
              <div class="lastfm-scrob-title">${name}</div>
              <div class="lastfm-scrob-meta">${artist} ${album ? `— <span style="opacity:0.8;">${album}</span>` : ""}</div>
            </div>
            <div class="lastfm-scrob-time">
              ${isNowPlaying ? `<span class="lastfm-live-badge"><span class="lastfm-pulse-dot"></span> scrobbling</span>` : timeText}
            </div>
          </div>
        `;
      });

      tracksHtml += `</div>`;
      scrobblingsView.html(tracksHtml);

      document
        .getElementById("lastfm-refresh-scrob-btn")
        ?.addEventListener("click", () => {
          cachedRecentTracks = null;
          loadScrobblingsTab();
        });
    } catch (err) {
      console.error("Scrobblings load error:", err);
      scrobblingsView.html(`
        <div style="padding:20px;text-align:center;color:#666;">
          <p>Error cargando los scrobblings 😓</p>
          <button id="lastfm-retry-scrob" class="lastfm-btn" style="margin-top:10px;">Reintentar</button>
        </div>
      `);
      document.getElementById("lastfm-retry-scrob")?.addEventListener("click", loadScrobblingsTab);
    }
  }

  // Initial load
  loadPerfilTab();
  window.lastfmwin.focusWindow();
}

// Global hook & backwards compatibility
window.lastfm_window = openLastfmWindow;
window.links_window = openLastfmWindow;
