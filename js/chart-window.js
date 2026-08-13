// =========================================================
//  chart-window.js
//  ventana "🖼️ chart generator" pa tu emulador de win7
//  usa el mismo patrón que main.js: Window + Html builder (e)
// =========================================================

import { Window, Html as e, getcenter } from "./windower.js";
import { requestChart } from "./chart-generator.js";

const doc = document.getElementById("screen");

window.chart_window = function () {
    // si ya está abierta, solo la enfocamos (mismo patrón que links_window)
    if (window.chartwin) {
        window.chartwin.focusWindow();
        return;
    }

    // ===== inputs =====
    const usernameInput = new e("input")
        .attr({ type: "text", value: "pgbito", placeholder: "usuario de last.fm" })
        .style({ width: "140px" });

    const datatypeSelect = new e("select").appendMany(
        new e("option").attr({ value: "artists" }).text("artistas"),
        new e("option").attr({ value: "albums" }).text("álbumes")
    );

    const periodSelect = new e("select").appendMany(
        new e("option").attr({ value: "overall" }).text("overall"),
        new e("option").attr({ value: "7day" }).text("7 días"),
        new e("option").attr({ value: "1month" }).text("1 mes"),
        new e("option").attr({ value: "3month" }).text("3 meses"),
        new e("option").attr({ value: "6month" }).text("6 meses"),
        new e("option").attr({ value: "12month" }).text("12 meses")
    );

    const widthInput = new e("input")
        .attr({ type: "number", value: "3", min: "1", max: "10" })
        .style({ width: "45px" });

    const heightInput = new e("input")
        .attr({ type: "number", value: "3", min: "1", max: "10" })
        .style({ width: "45px" });

    const generateBtn = new e("button").text("generar 🖼️");

    const statusText = new e("p")
        .id("chart-status")
        .style({ color: "#888", "font-size": "0.85em", "font-style": "italic", margin: "6px 0" })
        .text("");

    const resultImg = new e("img")
        .id("chart-result")
        .attr({ draggable: "false" })
        .style({
            display: "none",
            "max-width": "100%",
            "border-radius": "4px",
            "box-shadow": "0 2px 8px rgba(0,0,0,0.35)",
            "margin-top": "8px",
        });

    const downloadBtn = new e("button")
        .id("chart-download")
        .text("💾 descargar")
        .style({ display: "none", "margin-top": "6px" });

    // ===== layout =====
    const formRow1 = new e("div")
        .style({ display: "flex", gap: "6px", "flex-wrap": "wrap", "align-items": "center", "margin-bottom": "6px" })
        .appendMany(usernameInput, datatypeSelect, periodSelect);

    const formRow2 = new e("div")
        .style({ display: "flex", gap: "6px", "align-items": "center", "margin-bottom": "6px" })
        .appendMany(
            new e("span").text("tamaño:"),
            widthInput,
            new e("span").text("x"),
            heightInput,
            generateBtn
        );

    window.chartwin = new Window(doc, "🖼️ chart generator", getcenter(), 480, 0, [
        new e("div")
            .class("chart-content")
            .style({ "flex-direction": "column", padding: "10px 14px", width: "100%", "box-sizing": "border-box" })
            .appendMany(formRow1, formRow2, statusText, resultImg, downloadBtn),
    ]);

    window.chartwin.focusWindow();

    // ===== lógica de generación =====
    let currentBlobUrl = null;

    // limpieza al cerrar (mismo patrón que links_window)
    const origClose = window.chartwin.close.bind(window.chartwin);
    window.chartwin.close = function () {
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        window.chartwin = undefined;
        origClose();
    };

    generateBtn.on("click", async () => {
        const username = usernameInput.elm.value.trim();
        const datatype = datatypeSelect.elm.value;
        const period = periodSelect.elm.value;
        const width = parseInt(widthInput.elm.value, 10) || 3;
        const height = parseInt(heightInput.elm.value, 10) || 3;

        if (!username) {
            statusText.text("poné un usuario de last.fm primero mae");
            return;
        }

        generateBtn.attr({ disabled: "true" });
        statusText.text("generando chart...");
        resultImg.style({ display: "none" });
        downloadBtn.style({ display: "none" });

        try {
            const blob = await requestChart(username, datatype, period, height, width);

            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = URL.createObjectURL(blob);

            resultImg.elm.src = currentBlobUrl;
            resultImg.style({ display: "block" });
            downloadBtn.style({ display: "inline-block" });
            statusText.text("listo ✅");
        } catch (err) {
            console.error(err);
            statusText.text(`error: ${err.detail || err.message}`);
        } finally {
            generateBtn.attr({ disabled: null });
        }
    });

    downloadBtn.on("click", () => {
        if (!currentBlobUrl) return;
        const a = document.createElement("a");
        a.href = currentBlobUrl;
        a.download = "chart.webp";
        a.click();
    });
};
