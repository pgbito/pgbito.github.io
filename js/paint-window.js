import { Window, Html as e, getcenter } from "./windower.js";

// Default showcase image (can be overridden globally via window.paint_showcase_image)
const DEFAULT_IMAGE =
  window.paint_showcase_image ||
  "js/Aura2.png";

export function openPaintWindow(customImageSrc) {
  if (window.paintwin) {
    window.paintwin.focusWindow();
    return;
  }

  const doc = document.getElementById("screen");
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const mobile = screenW <= 768;

  // On mobile, ensure window fits comfortably within the screen with margins
  const winWidth = mobile
    ? Math.min(screenW - 24, 340)
    : Math.min(625, Math.floor(screenW * 0.62));

  // Canvas size: ~350x197 on desktop, responsive on mobile
  const canvasImgW = mobile ? Math.min(winWidth - 28, 290) : 350;
  const canvasImgH = Math.round(canvasImgW * (9 / 16));

  // Snug height trimmed right around canvas (no bottom status bar)
  const winHeight = mobile ? Math.min(screenH - 70, 290) : 305;

  // Position: centered horizontally on mobile so it never goes off either edge
  const posX = mobile
    ? Math.round(screenW / 2)
    : Math.round(Math.max(winWidth / 2 + 15, screenW * 0.35));
  const posY = mobile
    ? Math.round(winHeight / 2 + 12)
    : Math.round(Math.max(winHeight / 2 + 15, screenH * 0.29));

  const imageSrc = customImageSrc || window.paint_showcase_image || DEFAULT_IMAGE;

  // Root Paint Container
  const paintApp = new e("div").class("w7-paint-app");

  // Paint Ribbon Bar
  const ribbonBar = new e("div").class("w7-paint-ribbon-bar");

  // Top Tabs: File button (blue) + Home + View
  const tabsRow = new e("div").class("w7-paint-tabs-row");
  const fileBtn = new e("div").class("w7-paint-file-btn").html(`
    <span style="display:flex;align-items:center;gap:4px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/>
      </svg>
      <span style="font-size:10px;">▼</span>
    </span>
  `);

  // Hidden file input to allow picking a new showcase photo
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", (ev) => {
    const file = ev.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgEl = document.getElementById("w7-paint-canvas-img");
        if (imgEl) imgEl.src = e.target.result;
        window.paint_showcase_image = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  document.body.appendChild(fileInput);

  fileBtn.on("click", () => {
    fileInput.click();
  });

  const homeTab = new e("div").class("w7-paint-tab", "active").text("Home");
  const viewTab = new e("div").class("w7-paint-tab").text("View");
  tabsRow.appendMany(fileBtn, homeTab, viewTab);

  // Ribbon Body
  const ribbonBody = new e("div").class("w7-paint-ribbon-body");

  // 1. Clipboard Group
  const clipboardGroup = new e("div").class("w7-paint-group").appendMany(
    new e("div").class("w7-paint-group-content", "w7-paint-clipboard").html(`
      <div class="w7-paint-big-btn" title="Paste">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#d97706">
          <path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/>
        </svg>
        <span>Paste</span>
      </div>
      <div class="w7-paint-small-col">
        <div class="w7-paint-small-btn" title="Cut">
          <span style="font-size:12px;">✂️</span> Cut
        </div>
        <div class="w7-paint-small-btn" title="Copy">
          <span style="font-size:12px;">📋</span> Copy
        </div>
      </div>
    `),
    new e("div").class("w7-paint-group-label").text("Clipboard")
  );

  // 2. Image Group
  const imageGroup = new e("div").class("w7-paint-group").appendMany(
    new e("div").class("w7-paint-group-content").html(`
      <div class="w7-paint-big-btn" title="Select">
        <div style="width:20px;height:18px;border:1px dashed #444;margin-bottom:2px;"></div>
        <span>Select</span>
      </div>
      <div class="w7-paint-small-col">
        <div class="w7-paint-small-btn" title="Crop">⌗ Crop</div>
        <div class="w7-paint-small-btn" title="Resize">⤢ Resize</div>
        <div class="w7-paint-small-btn" title="Rotate">↻ Rotate</div>
      </div>
    `),
    new e("div").class("w7-paint-group-label").text("Image")
  );

  // 3. Tools Group (2x3 grid)
  const toolsGroup = new e("div").class("w7-paint-group").appendMany(
    new e("div").class("w7-paint-group-content", "w7-paint-tools-grid").html(`
      <div class="w7-paint-tool-btn" title="Pencil">✏️</div>
      <div class="w7-paint-tool-btn" title="Fill with color">🪣</div>
      <div class="w7-paint-tool-btn" title="Text"><strong>A</strong></div>
      <div class="w7-paint-tool-btn" title="Eraser">🧹</div>
      <div class="w7-paint-tool-btn" title="Color picker">🧪</div>
      <div class="w7-paint-tool-btn" title="Magnifier">🔍</div>
    `),
    new e("div").class("w7-paint-group-label").text("Tools")
  );

  // 4. Brushes Group
  const brushesGroup = new e("div").class("w7-paint-group").appendMany(
    new e("div").class("w7-paint-group-content").html(`
      <div class="w7-paint-big-btn" title="Brushes">
        <span style="font-size:20px;">🖌️</span>
        <span>Brushes ▾</span>
      </div>
    `),
    new e("div").class("w7-paint-group-label").text("Brushes")
  );

  // 5. Shapes Group
  const shapesGroup = new e("div").class("w7-paint-group", "w7-paint-shapes-group").appendMany(
    new e("div").class("w7-paint-group-content").html(`
      <div class="w7-paint-shapes-palette">
        <div class="w7-paint-shape-btn" title="Line">╱</div>
        <div class="w7-paint-shape-btn" title="Curve">〜</div>
        <div class="w7-paint-shape-btn" title="Oval">⬭</div>
        <div class="w7-paint-shape-btn" title="Rectangle">▭</div>
        <div class="w7-paint-shape-btn" title="Rounded Rectangle">▢</div>
        <div class="w7-paint-shape-btn" title="Polygon">⬡</div>
        <div class="w7-paint-shape-btn" title="Triangle">△</div>
        <div class="w7-paint-shape-btn" title="Diamond">◇</div>
        <div class="w7-paint-shape-btn" title="Star">★</div>
        <div class="w7-paint-shape-btn" title="Heart">♥</div>
        <div class="w7-paint-shape-btn" title="Lightning">⚡</div>
        <div class="w7-paint-shape-btn" title="Callout">🗨</div>
      </div>
    `),
    new e("div").class("w7-paint-group-label").text("Shapes")
  );

  // 6. Colors Group
  const colorsGroup = new e("div").class("w7-paint-group").appendMany(
    new e("div").class("w7-paint-group-content", "w7-paint-colors-section").html(`
      <div class="w7-paint-color-box active" title="Color 1 (foreground)">
        <div class="w7-paint-color-preview" style="background:#000;"></div>
        <span>Color 1</span>
      </div>
      <div class="w7-paint-color-box" title="Color 2 (background)">
        <div class="w7-paint-color-preview" style="background:#fff;"></div>
        <span>Color 2</span>
      </div>
      <div class="w7-paint-palette-grid">
        <span class="w7-color-dot" style="background:#000000;" title="Black"></span>
        <span class="w7-color-dot" style="background:#7f7f7f;" title="Gray"></span>
        <span class="w7-color-dot" style="background:#880015;" title="Dark Red"></span>
        <span class="w7-color-dot" style="background:#ed1c24;" title="Red"></span>
        <span class="w7-color-dot" style="background:#ff7f27;" title="Orange"></span>
        <span class="w7-color-dot" style="background:#fff200;" title="Yellow"></span>
        <span class="w7-color-dot" style="background:#22b14c;" title="Green"></span>
        <span class="w7-color-dot" style="background:#00a2e8;" title="Turquoise"></span>
        <span class="w7-color-dot" style="background:#3f48cc;" title="Indigo"></span>
        <span class="w7-color-dot" style="background:#a349a4;" title="Purple"></span>

        <span class="w7-color-dot" style="background:#ffffff;" title="White"></span>
        <span class="w7-color-dot" style="background:#c3c3c3;" title="Light Gray"></span>
        <span class="w7-color-dot" style="background:#b97a57;" title="Brown"></span>
        <span class="w7-color-dot" style="background:#ffaec9;" title="Rose"></span>
        <span class="w7-color-dot" style="background:#ffc90e;" title="Gold"></span>
        <span class="w7-color-dot" style="background:#efe4b0;" title="Light Yellow"></span>
        <span class="w7-color-dot" style="background:#b5e61d;" title="Lime"></span>
        <span class="w7-color-dot" style="background:#99d9ea;" title="Light Turquoise"></span>
        <span class="w7-color-dot" style="background:#7092be;" title="Blue Gray"></span>
        <span class="w7-color-dot" style="background:#c8bfe7;" title="Lavender"></span>
      </div>
    `),
    new e("div").class("w7-paint-group-label").text("Colors")
  );

  ribbonBody.appendMany(clipboardGroup, imageGroup, toolsGroup, brushesGroup, shapesGroup, colorsGroup);
  ribbonBar.appendMany(tabsRow, ribbonBody);

  // Paint Workspace & Canvas Area
  const workspace = new e("div").class("w7-paint-workspace");

  const canvasWrapper = new e("div").class("w7-paint-canvas-wrapper");
  const canvasImg = new e("img")
    .id("w7-paint-canvas-img")
    .class("w7-paint-canvas-img")
    .attr({
      src: imageSrc,
      draggable: "false",
      alt: "Showcase Image",
    })
    .style({
      width: `${canvasImgW}px`,
      height: `${canvasImgH}px`,
    });

  // Authentic resize handle at bottom right
  const resizeHandle = new e("div").class("w7-paint-resize-handle");

  canvasWrapper.appendMany(canvasImg, resizeHandle);
  workspace.append(canvasWrapper);

  paintApp.appendMany(ribbonBar, workspace);

  // Create Window
  window.paintwin = new Window(
    doc,
    "Untitled - Paint",
    [posX, posY],
    winWidth,
    winHeight,
    [paintApp]
  );

  // Remove default body padding & ensure Paint fits edge-to-edge inside the window frame
  if (window.paintwin.content) {
    window.paintwin.content.classList.add("w7-paint-body");
    window.paintwin.content.style.padding = "0px";
    window.paintwin.content.style.alignItems = "stretch";
    window.paintwin.content.style.overflow = "hidden";
  }
  if (window.paintwin.window && window.paintwin.window.elm) {
    window.paintwin.window.elm.style.overflow = "hidden";
    window.paintwin.window.elm.style.boxSizing = "border-box";
  }

  // Paint Palette Icon & Title in title bar
  const titleEl = document.getElementById(`title-${window.paintwin.id}`);
  if (titleEl) {
    titleEl.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:6px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#e67e22" style="flex-shrink:0;">
          <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.21-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4c-.83 0-1.5-.67-1.5-1.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
        <span style="font-family:'Segoe UI',sans-serif;font-size:12px;">Untitled - Paint</span>
      </span>
    `;
  }

  // Override applyParameters so Paint always stays in the back layer ("hasta atrás")
  const origApply = window.paintwin.applyParameters.bind(window.paintwin);
  window.paintwin.applyParameters = function () {
    origApply();
    if (this.window && this.window.elm) {
      this.window.elm.style.zIndex = "0";
      this.window.elm.classList.remove("active");
    }
  };

  // Keep Paint at the bottom of the window stack
  window.paintwin.sendToBack = function () {
    if (this.window && this.window.elm) {
      this.window.elm.style.zIndex = "0";
      this.window.elm.classList.remove("active");
    }
  };

  // Override focusWindow so clicking or grabbing Paint doesn't jump over other windows
  window.paintwin.focusWindow = function () {
    this.sendToBack();
  };

  // Clean close
  const origClose = window.paintwin.close.bind(window.paintwin);
  window.paintwin.close = function () {
    window.paintwin = undefined;
    origClose();
  };

  // Send to back immediately
  window.paintwin.sendToBack();

  // If another window already exists (e.g. aboutwindow), ensure it stays in front
  if (window.aboutwindow && typeof window.aboutwindow.focusWindow === "function") {
    window.aboutwindow.focusWindow();
  }
}

// Global hooks
window.paint_window = openPaintWindow;
window.open_paint_window = openPaintWindow;

