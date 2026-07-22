import {
  App,
  ErrorWindow,
  LoadingText,
  Window,
  ProfilePicture,
  Html as e,
  getcenter,
} from "./windower.js";

const doc = document.getElementById("screen");
const winframe =
  "https://raw.githubusercontent.com/pgbito/pgbito.github.io/refs/heads/main/js/frame.png";
// === CONFIGURACIÓN ===
const LASTFM_API_KEY = "fe91cc33c93ea3c390251067966de1ba";
const LASTFM_USER = "pgbito";

class SoundBoard {
  preload_audio(url) {
    let _ = new Audio(url);

    _.preload = "auto";
    _.volume = 0;
    _.play()
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        _.volume = 1;
      });
    return _;
  }
  constructor() {
    this.loginaudio = this.preload_audio(
      "https://github.com/pgbito/pgbito.github.io/raw/refs/heads/main/js/startup7.mp3",
    );
    /*this.erroraudio = this.preload_audio(
      "https://www.myinstants.com/media/sounds/erro-win-7_3OFHeWK.mp3",
    );*/
  }
}
const sb = new SoundBoard();

window.byid = document.getElementById;

window.displayPfpMenu = function () {
  var imgselector = document.getElementById("imgselect");
  let file;
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    file = e.target.files[0];
    const reader = new FileReader();
    const img = new Image();
    reader.onload = function (event) {
      img.onload = function () {
        const canvas = document.createElement("canvas");
        const side = Math.min(img.width, img.height);
        canvas.width = side;
        canvas.height = side;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          side,
          side,
        );
        canvas.toBlob(
          function (blob) {
            const croppedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            imgselector.src = URL.createObjectURL(croppedFile);
          },
          file.type,
          0.8,
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

window.errorbox = function (etitle, ...args) {
  return new ErrorWindow(doc, `❌ ${etitle}`, getcenter(), 600, 0, [
    new e("img").attr({
      width: "35px",
      height: "35px",
    }),
    ...args.map((arg) => new e("p").text(arg).append(new e("br"))),
  ]);
};

// === ventana "mis links + música" ===
window.links_window = function () {
  if (window.linkswin) {
    window.linkswin.focusWindow();
    return;
  }

  const scrobblesContainer = new e("div").id("scrobbles-list");
  const loadingText = new e("p")
    .id("scrobbles-loading")
    .style({ color: "#888", "font-size": "0.92em", "font-style": "italic" })
    .text("cargando...");
  scrobblesContainer.append(loadingText);

  window.linkswin = new Window(doc, "🎵 links & música", getcenter(), 800, 0, [
    new e("div")
      .class("links-content")
      .style({ "align-self": "stretch", width: "100%", "z-index": 4 })
      .appendMany(
        new e("p")
          .class("links-section-title")
          .text("🔗 mis links")
          .style({ "font-size": "2em" }),
        new e("div").class("links-row").appendMany(
         
          new e("a")
            .class("link-chip")
            .attr({
              href: "https://open.spotify.com/user/TU_USUARIO_SPOTIFY",
              target: "_blank",
            })
            .text("🟢 spotify"),
          new e("a")
            .class("link-chip")
            .attr({
              href: `https://www.last.fm/user/${LASTFM_USER}`,
              target: "_blank",
            })
            .text("🔴 last.fm"),
        ),
        new e("hr").style({ margin: "10px 0", opacity: "0.3" }),
        new e("p")
          .class("links-section-title")
          .text("🎧 mis últimos escuchados :p")
          .style({ "font-size": "2em" }),
        scrobblesContainer,
      ),
  ]);

  // traer al frente inmediatamente al abrir
  window.linkswin.focusWindow();

  const origClose = window.linkswin.close.bind(window.linkswin);
  window.linkswin.close = function () {
    window.linkswin = undefined;
    origClose();
  };

  fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=12`,
  )
    .then((r) => r.json())
    .then((data) => {
      const loading = document.getElementById("scrobbles-loading");
      if (loading) loading.remove();

      const tracks = data?.recenttracks?.track;
      if (!tracks || !tracks.length) {
        document.getElementById("scrobbles-list")?.appendChild(
          Object.assign(document.createElement("p"), {
            textContent: "no se encontraron tracks :(",
            style: "color:#888; font-size:0.9em;",
          }),
        );
        return;
      }

      const list = document.getElementById("scrobbles-list");
      if (!list) return;

      tracks.forEach((track) => {
        const isNowPlaying = track["@attr"]?.nowplaying === "true";
        const artist = track.artist?.["#text"] || "?";
        const name = track.name || "?";
        const img = track.image?.[2]?.["#text"];

        const icon = document.createElement("div");
        icon.className =
          "scrobble-icon" + (isNowPlaying ? " scrobble-nowplaying" : "");
        icon.innerHTML = `
          ${
            img
              ? `<img src="${img}" class="scrobble-icon-img" draggable="false"/>`
              : `<div class="scrobble-icon-noimg">♪</div>`
          }
          <span class="scrobble-icon-name">${name}</span>
          <span class="scrobble-icon-artist">${artist}</span>
          ${isNowPlaying ? `<span class="scrobble-badge">▶ now</span>` : ""}
        `;
        list.appendChild(icon);
      });
    })
    .catch((err) => {
      const loading = document.getElementById("scrobbles-loading");
      if (loading) loading.textContent = "error cargando last.fm 😓";
      console.error("lastfm error:", err);
    });
};

// === ventana "sobre mí" ===
window.about_window1 = function () {
  const mobile = window.innerWidth <= 1024 || 'ontouchstart' in window;
  const frameSize = mobile ? 120 : 200;
  const pfpSize = mobile ? 80 : 135;
  const pfpTop = mobile ? '17px' : '28px';
  const pfpLeft = mobile ? '22px' : '36px';
  const winWidth = mobile ? Math.min(window.innerWidth - 20, 520) : 900;

  window.aboutwindow = new Window(doc, "✦ sobre mí", getcenter(), winWidth, 0, [
    new e("div")
      .class("unselectable")
      .style({ position: "relative", "margin-bottom": "8px", "flex-shrink": "0" })
      .appendMany(
        new e("img")
          .attr({
            draggable: "false",
            src: winframe,
          })
          .class("unselectable")
          .style({
            position: "relative",
            height: frameSize + "px",
            width: frameSize + "px",
            "z-index": 1,
          }),
        new e("img")
          .attr({ draggable: "false", src: "/js/default.png" })
          .style({
            position: "absolute",
            height: pfpSize + "px",
            width: pfpSize + "px",
            top: pfpTop,
            left: pfpLeft,
            "z-index": 2,
          }),
      ),
    new e("div").class("about-content").appendMany(
      new e("h2").class("about-title").text("sobre mí"),
      new e("p").text(
        "hola! soy pablo, tengo 18 años y vivo en costa rica. " +
          "acá planeo poner cosas interesantes :p",
      ),
      new e("p").text(
        "me gusta la electrónica, la música, programar cosas random, el gimnasio y más " + ":v",
      ),
      new e("p").text(
        "página programada por mí con ayuda del framework Win7.CSS" + ":v",
      ),

      new e("button")
        .class("about-more-btn")
        .attr({ onclick: "window.links_window()" })
        .text("mis links & lo que escucho →"),
    ),
  ]);
};

window.app1win = undefined;

/*window.app1 = new App(
  doc,
  "hola no sirvo :)",
  [330, 40],
  100,
  100,
  "/js/default.png",
  function () {
    if (window.app1win) {
      window.app1win.focusWindow();
      sb.erroraudio.play().catch((e) => {
        console.error(e);
      });
      return;
    }
    window.app1win = new Window(doc, "Verificate :p", getcenter(), 900, 0, [
      new e("h1").text("holi"),
    ]);
  },
); */
setTimeout(() => {
          const tip = new ErrorWindow(doc, "💡 tip", [120, window.innerHeight - 80], 260, 0, [
            new e("p").text("tocá el usuario :p").style({ margin: "0", 'font-size': '0.95em' }),
          ]);
          setTimeout(() => tip.close(), 4000);
        },100);
window.app1 = new ProfilePicture(
  doc,
  "pgbito ",
  getcenter(),
  140,
  140,
  "/js/default.png",
  winframe,
  function (thus) {
    thus.close();
    sb.loginaudio.play().catch((e) => {
      console.error(e);
    });
    window.loadingText = new LoadingText(
      doc,
      "cargando...",
      getcenter(),

      3000,
      (thas) => {
        thas.close();
        window.document.body.classList.toggle("active");
        // tooltip de drag, aparece abajo a la izquierda y se va solo
        setTimeout(() => {
          const tip = new ErrorWindow(doc, "💡 tip", [120, window.innerHeight - 80], 260, 0, [
            new e("p").text("podés arrastrar las ventanas :p").style({ margin: "0", 'font-size': '0.95em' }),
          ]);
          setTimeout(() => tip.close(), 4000);
        }, 400);
        setTimeout(window.about_window1, 1500);
      },
    );
  },
);

var progress = 0;
var progress_holder = document.getElementById("progress_holder");
if (progress_holder) {
  let int = setInterval((_) => {
    progress += 0.1;
    if (progress >= 100) clearInterval(int);
    progress_holder.style.width = `${progress}%`;
  }, 10);
}
