// Windows Media Player 7/9/XP "Headspace" Y2K Internet Radio Player
// Authentic early 2000s alien green skin with live radio streaming, flame visualizer, EQ & playlist

export const STATIONS = [
  {
    id: "0n-2000s",
    name: "0N - 2000s Hits",
    genre: "Pop / Y2K / 00s",
    url: "https://0n-2000s.radionetz.de/0n-2000s.mp3",
  },
  {
    id: "antenne-2000",
    name: "Antenne 2000er",
    genre: "Dance / Rock / 2000s",
    url: "https://s2-webradio.antenne.de/2000er-hits/stream/mp3",
  },
  {
    id: "0n-greatest",
    name: "0N - Greatest Hits",
    genre: "2000s / 90s Hits",
    url: "https://0n-greatesthits.radionetz.de/0n-greatesthits.mp3",
  },
  {
    id: "retro-radio",
    name: "Retro Rádió",
    genre: "Millennium Hits",
    url: "https://icast.connectmedia.hu/5001/live.mp3",
  },
];

let audioEl = null;
let currentStationIdx = 0;
let isPlaying = false;
let currentVolume = 0.8;
let animFrameId = null;
let visualizerMode = 0; // 0: Flame, 1: Cyber Bars, 2: Neon Wave
const VISUALIZERS = ["Flame", "Cyber Bars", "Neon Wave"];

function getAudio() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.crossOrigin = "anonymous";
    audioEl.preload = "none";
    audioEl.volume = currentVolume;
  }
  return audioEl;
}

export function openWmpWindow() {
  if (document.getElementById("w7-wmp-container")) {
    const existing = document.getElementById("w7-wmp-container");
    existing.style.display = "block";
    if (!isPlaying) playStation();
    return;
  }

  const screen = document.getElementById("screen") || document.body;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const isMobile = screenW <= 768;

  // Scale down on mobile if needed
  const scale = isMobile ? Math.min(1, (screenW - 20) / 620) : 1;
  const wmpW = 620 * scale;
  const wmpH = 334 * scale;

  // Initial position: nicely placed on screen
  let posX = isMobile ? (screenW - wmpW) / 2 : Math.max(20, screenW - wmpW - 40);
  let posY = isMobile ? Math.max(50, screenH - wmpH - 70) : Math.max(60, screenH - wmpH - 90);

  const container = document.createElement("div");
  container.id = "w7-wmp-container";
  container.className = "w7-wmp-window unselectable";
  container.style.cssText = `
    position: absolute;
    left: ${posX}px;
    top: ${posY}px;
    width: 620px;
    height: 334px;
    transform-origin: top left;
    transform: scale(${scale});
    z-index: 1000;
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
    filter: drop-shadow(0 10px 25px rgba(0,0,0,0.65));
  `;

  container.innerHTML = `
    <!-- Skin Background -->
    <img src="js/wmp-headspace.png" draggable="false" style="position:absolute;left:0;top:0;width:620px;height:334px;pointer-events:none;z-index:1;" alt="WMP Headspace Skin" />

    <!-- Drag Header Region (Forehead / Face) -->
    <div id="wmp-drag-bar" style="position:absolute;left:180px;top:0;width:260px;height:70px;z-index:10;cursor:grab;" title="Arrastrar WMP"></div>

    <!-- Close Button (Top right of head) -->
    <div id="wmp-btn-close" style="position:absolute;left:301px;top:9px;width:12px;height:12px;z-index:20;cursor:pointer;" title="Cerrar reproductor"></div>

    <!-- Playback Controls (Forehead) -->
    <div id="wmp-btn-prev" class="wmp-click-btn" style="position:absolute;left:261px;top:25px;width:18px;height:18px;z-index:20;cursor:pointer;" title="Anterior estación"></div>
    <div id="wmp-btn-play" class="wmp-click-btn" style="position:absolute;left:282px;top:22px;width:22px;height:22px;z-index:20;cursor:pointer;" title="Reproducir / Pausa"></div>
    <div id="wmp-btn-stop" class="wmp-click-btn" style="position:absolute;left:306px;top:22px;width:22px;height:22px;z-index:20;cursor:pointer;" title="Detener"></div>
    <div id="wmp-btn-next" class="wmp-click-btn" style="position:absolute;left:330px;top:25px;width:18px;height:18px;z-index:20;cursor:pointer;" title="Siguiente estación"></div>
    <div id="wmp-btn-vis" class="wmp-click-btn" style="position:absolute;left:358px;top:22px;width:22px;height:22px;z-index:20;cursor:pointer;" title="Cambiar visualizador"></div>

    <!-- Forehead Screen / Visualizer Box -->
    <div style="position:absolute;left:230px;top:70px;width:160px;height:105px;background:#000000;border-radius:4px;overflow:hidden;z-index:5;display:flex;flex-direction:column;">
      <!-- Visualizer Header -->
      <div style="height:18px;display:flex;align-items:center;justify-content:space-between;padding:0 6px;color:#a3e635;font-family:'Segoe UI',monospace,sans-serif;font-size:9.5px;border-bottom:1px solid #14532d;background:#051a08;">
        <span id="wmp-vis-prev" style="cursor:pointer;padding:0 2px;">◀</span>
        <span id="wmp-vis-name" style="font-weight:bold;letter-spacing:0.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">Flame</span>
        <span id="wmp-vis-next" style="cursor:pointer;padding:0 2px;">▶</span>
      </div>
      <!-- Canvas Visualizer -->
      <canvas id="wmp-vis-canvas" width="160" height="87" style="width:160px;height:87px;display:block;background:#000000;"></canvas>
    </div>

    <!-- Left Wing: Equalizer & Volume -->
    <div style="position:absolute;left:75px;top:72px;width:125px;height:115px;z-index:15;display:flex;flex-direction:column;justify-content:space-between;padding:4px;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-family:'Segoe UI',sans-serif;font-size:9px;color:#a3e635;font-weight:bold;">
        <span>EQ Live</span>
        <span id="wmp-vol-text">80%</span>
      </div>
      <!-- Volume Slider -->
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="font-size:8px;color:#a3e635;">Vol:</span>
        <input id="wmp-vol-slider" type="range" min="0" max="100" value="80" style="width:85px;height:4px;accent-color:#22c55e;cursor:pointer;" />
      </div>
      <!-- Animated Equalizer Bars -->
      <div id="wmp-eq-bars" style="display:flex;align-items:flex-end;gap:3px;height:50px;padding:2px 0;">
        <!-- 8 EQ Sliders -->
        <div class="wmp-bar" style="flex:1;background:linear-gradient(to top,#16a34a,#84cc16,#eab308,#ef4444);height:20px;border-radius:1px;"></div>
        <div class="wmp-bar" style="flex:1;background:linear-gradient(to top,#16a34a,#84cc16,#eab308,#ef4444);height:32px;border-radius:1px;"></div>
        <div class="wmp-bar" style="flex:1;background:linear-gradient(to top,#16a34a,#84cc16,#eab308,#ef4444);height:44px;border-radius:1px;"></div>
        <div class="wmp-bar" style="flex:1;background:linear-gradient(to top,#16a34a,#84cc16,#eab308,#ef4444);height:28px;border-radius:1px;"></div>
        <div class="wmp-bar" style="flex:1;background:linear-gradient(to top,#16a34a,#84cc16,#eab308,#ef4444);height:38px;border-radius:1px;"></div>
        <div class="wmp-bar" style="flex:1;background:linear-gradient(to top,#16a34a,#84cc16,#eab308,#ef4444);height:48px;border-radius:1px;"></div>
        <div class="wmp-bar" style="flex:1;background:linear-gradient(to top,#16a34a,#84cc16,#eab308,#ef4444);height:35px;border-radius:1px;"></div>
        <div class="wmp-bar" style="flex:1;background:linear-gradient(to top,#16a34a,#84cc16,#eab308,#ef4444);height:25px;border-radius:1px;"></div>
      </div>
      <div id="wmp-eq-reset" style="text-align:right;font-size:8.5px;color:#86efac;cursor:pointer;font-family:sans-serif;" title="Reset EQ">reset</div>
    </div>

    <!-- Right Wing: Playlist / Stations Box -->
    <div style="position:absolute;left:405px;top:72px;width:135px;height:115px;z-index:15;display:flex;flex-direction:column;font-family:'Segoe UI',Tahoma,sans-serif;box-sizing:border-box;">
      <!-- Playlist Header -->
      <div style="background:#e2e8f0;border:1px solid #64748b;border-radius:2px;padding:1px 4px;font-size:9.5px;color:#1e293b;display:flex;align-items:center;justify-content:space-between;height:16px;">
        <span style="display:flex;align-items:center;gap:3px;font-weight:600;">
          <span>📄</span>
          <span>Y2K Radio</span>
        </span>
        <span style="font-size:8px;">▼</span>
      </div>
      <!-- Station List Items -->
      <div id="wmp-station-list" style="flex:1;overflow-y:auto;overflow-x:hidden;margin-top:2px;display:flex;flex-direction:column;gap:1px;padding-right:1px;">
        ${STATIONS.map(
          (st, idx) => `
          <div class="wmp-station-item ${idx === currentStationIdx ? "active" : ""}" data-idx="${idx}" style="padding:2px 4px;font-size:9px;color:${idx === currentStationIdx ? "#ffffff" : "#bbf7d0"};background:${idx === currentStationIdx ? "rgba(22,101,52,0.9)" : "rgba(6,78,59,0.5)"};cursor:pointer;border-radius:2px;display:flex;justify-content:space-between;align-items:center;">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:95px;">${st.name}</span>
            <span style="font-size:8px;opacity:0.75;">${idx === currentStationIdx ? "▶" : ""}</span>
          </div>
        `
        ).join("")}
      </div>
      <!-- Station Status Banner -->
      <div id="wmp-status-banner" style="font-size:8.5px;color:#fef08a;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-weight:600;">
        Pausado • Y2K Radio
      </div>
    </div>
  `;

  screen.appendChild(container);

  // Drag handling
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  const dragBar = document.getElementById("wmp-drag-bar");
  dragBar.addEventListener("mousedown", (ev) => {
    isDragging = true;
    dragStartX = ev.clientX - posX;
    dragStartY = ev.clientY - posY;
    dragBar.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (ev) => {
    if (isDragging) {
      posX = ev.clientX - dragStartX;
      posY = ev.clientY - dragStartY;
      container.style.left = `${posX}px`;
      container.style.top = `${posY}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      if (dragBar) dragBar.style.cursor = "grab";
    }
  });

  // Touch drag for mobile
  dragBar.addEventListener("touchstart", (ev) => {
    isDragging = true;
    const t = ev.touches[0];
    dragStartX = t.clientX - posX;
    dragStartY = t.clientY - posY;
  });

  document.addEventListener("touchmove", (ev) => {
    if (isDragging) {
      const t = ev.touches[0];
      posX = t.clientX - dragStartX;
      posY = t.clientY - dragStartY;
      container.style.left = `${posX}px`;
      container.style.top = `${posY}px`;
    }
  });

  document.addEventListener("touchend", () => {
    isDragging = false;
  });

  // Close button
  document.getElementById("wmp-btn-close").addEventListener("click", () => {
    stopRadio();
    container.style.display = "none";
  });

  // Controls logic
  document.getElementById("wmp-btn-play").addEventListener("click", togglePlay);
  document.getElementById("wmp-btn-stop").addEventListener("click", stopRadio);
  document.getElementById("wmp-btn-next").addEventListener("click", () => switchStation(1));
  document.getElementById("wmp-btn-prev").addEventListener("click", () => switchStation(-1));
  document.getElementById("wmp-btn-vis").addEventListener("click", cycleVisualizer);
  document.getElementById("wmp-vis-next").addEventListener("click", cycleVisualizer);
  document.getElementById("wmp-vis-prev").addEventListener("click", () => cycleVisualizer(-1));

  // Station list click
  document.getElementById("wmp-station-list").addEventListener("click", (ev) => {
    const item = ev.target.closest(".wmp-station-item");
    if (item) {
      const idx = parseInt(item.getAttribute("data-idx"), 10);
      if (!isNaN(idx)) {
        currentStationIdx = idx;
        playStation();
      }
    }
  });

  // Volume control
  const volSlider = document.getElementById("wmp-vol-slider");
  const volText = document.getElementById("wmp-vol-text");
  volSlider.addEventListener("input", (ev) => {
    const val = parseInt(ev.target.value, 10);
    currentVolume = val / 100;
    if (audioEl) audioEl.volume = currentVolume;
    volText.innerText = `${val}%`;
  });

  // Visualizer loop
  startVisualizer();

  // Auto-play radio on open
  if (!isPlaying) {
    playStation();
  }
}

function updateUi() {
  const statusEl = document.getElementById("wmp-status-banner");
  const st = STATIONS[currentStationIdx];
  if (statusEl) {
    statusEl.innerText = isPlaying ? `● En Vivo • ${st.name}` : `Pausado • ${st.name}`;
  }

  // Update active item in list
  const items = document.querySelectorAll(".wmp-station-item");
  items.forEach((it, idx) => {
    const active = idx === currentStationIdx;
    it.style.background = active ? "rgba(22,101,52,0.9)" : "rgba(6,78,59,0.5)";
    it.style.color = active ? "#ffffff" : "#bbf7d0";
    const arrow = it.querySelector("span:last-child");
    if (arrow) arrow.innerText = active && isPlaying ? "▶" : "";
  });
}

function playStation() {
  const audio = getAudio();
  const st = STATIONS[currentStationIdx];
  audio.src = st.url;
  audio
    .play()
    .then(() => {
      isPlaying = true;
      updateUi();
    })
    .catch((err) => {
      console.warn("WMP Audio playback:", err);
      isPlaying = false;
      updateUi();
    });
}

function togglePlay() {
  const audio = getAudio();
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    updateUi();
  } else {
    playStation();
  }
}

function stopRadio() {
  const audio = getAudio();
  audio.pause();
  audio.currentTime = 0;
  isPlaying = false;
  updateUi();
}

function switchStation(delta = 1) {
  currentStationIdx = (currentStationIdx + delta + STATIONS.length) % STATIONS.length;
  if (isPlaying) {
    playStation();
  } else {
    updateUi();
  }
}

function cycleVisualizer(delta = 1) {
  visualizerMode = (visualizerMode + delta + VISUALIZERS.length) % VISUALIZERS.length;
  const nameEl = document.getElementById("wmp-vis-name");
  if (nameEl) nameEl.innerText = VISUALIZERS[visualizerMode];
}

// Visualizer Renderer (Flame, Cyber Bars, Neon Wave)
function startVisualizer() {
  const canvas = document.getElementById("wmp-vis-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // Flame particles
  const particles = [];
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: w / 2 + (Math.random() - 0.5) * 40,
      y: h - 10,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(Math.random() * 2.5 + 1.2),
      radius: Math.random() * 8 + 4,
      life: Math.random(),
    });
  }

  let tick = 0;

  function render() {
    tick++;
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(0, 0, w, h);

    // Randomize EQ bars if playing
    if (isPlaying && tick % 4 === 0) {
      const bars = document.querySelectorAll("#wmp-eq-bars .wmp-bar");
      bars.forEach((b) => {
        const randH = Math.floor(Math.random() * 38) + 10;
        b.style.height = `${randH}px`;
      });
    }

    if (visualizerMode === 0) {
      // 0. FLAME VISUALIZER (Classic WMP Flame)
      ctx.globalCompositeOperation = "screen";

      // Blue flame base
      const baseGrad = ctx.createRadialGradient(w / 2, h - 5, 2, w / 2, h - 5, 24);
      baseGrad.addColorStop(0, isPlaying ? "rgba(59, 130, 246, 0.8)" : "rgba(30, 64, 175, 0.4)");
      baseGrad.addColorStop(1, "transparent");
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(w / 2, h - 5, 24, 0, Math.PI * 2);
      ctx.fill();

      // Rising fiery particles
      for (const p of particles) {
        p.x += p.vx + (Math.random() - 0.5) * 0.8;
        p.y += p.vy * (isPlaying ? 1.2 : 0.6);
        p.life -= 0.025;

        if (p.life <= 0 || p.y < 5) {
          p.x = w / 2 + (Math.random() - 0.5) * (isPlaying ? 50 : 25);
          p.y = h - 10;
          p.vy = -(Math.random() * (isPlaying ? 3.0 : 1.8) + 1.2);
          p.life = 1;
        }

        const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius);
        if (p.life > 0.6) {
          grad.addColorStop(0, "rgba(255, 255, 200, 0.9)");
          grad.addColorStop(0.4, "rgba(250, 204, 21, 0.7)");
          grad.addColorStop(1, "transparent");
        } else if (p.life > 0.3) {
          grad.addColorStop(0, "rgba(249, 115, 22, 0.8)");
          grad.addColorStop(0.5, "rgba(239, 68, 68, 0.5)");
          grad.addColorStop(1, "transparent");
        } else {
          grad.addColorStop(0, "rgba(185, 28, 28, 0.4)");
          grad.addColorStop(1, "transparent");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    } else if (visualizerMode === 1) {
      // 1. CYBER BARS (Y2K Green Spectrum)
      const numBars = 16;
      const barWidth = w / numBars - 2;
      for (let i = 0; i < numBars; i++) {
        const factor = isPlaying ? Math.sin(tick * 0.15 + i * 0.6) * 0.5 + 0.5 : 0.15;
        const barH = Math.max(4, factor * (h - 15));
        const grad = ctx.createLinearGradient(0, h, 0, h - barH);
        grad.addColorStop(0, "#16a34a");
        grad.addColorStop(0.6, "#84cc16");
        grad.addColorStop(1, "#facc15");

        ctx.fillStyle = grad;
        ctx.fillRect(i * (barWidth + 2) + 2, h - barH, barWidth, barH);

        // Peak dot
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(i * (barWidth + 2) + 2, h - barH - 2, barWidth, 1.5);
      }
    } else {
      // 2. NEON WAVE (Oscilloscope)
      ctx.beginPath();
      ctx.strokeStyle = isPlaying ? "#38bdf8" : "#0284c7";
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x++) {
        const freq = isPlaying ? 0.08 : 0.04;
        const amp = isPlaying ? 22 : 6;
        const y = h / 2 + Math.sin(x * freq + tick * 0.1) * amp * Math.sin(tick * 0.03 + x * 0.01);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    animFrameId = requestAnimationFrame(render);
  }

  if (animFrameId) cancelAnimationFrame(animFrameId);
  render();
}

// Global hook
window.open_wmp_radio = openWmpWindow;
window.wmp_radio = openWmpWindow;

