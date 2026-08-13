const btnDownloadCombined = document.getElementById("downloadCombined");

btnDownloadCombined.addEventListener("click", () => {
    downloadCombined();
});

function downloadCombined() {
    const canvas = document.getElementById("canvas");
    const overlay = document.getElementById("overlayCanvas");

    // Create a temporary canvas
    const combined = document.createElement("canvas");
    combined.width = canvas.width;
    combined.height = canvas.height;

    const ctx = combined.getContext("2d");

    // Draw the base canvas first
    ctx.drawImage(canvas, 0, 0);

    // Draw the overlay canvas on top
    ctx.drawImage(overlay, 0, 0);

    // Download as PNG
    const link = document.createElement("a");
    link.download = "combined.png";
    link.href = combined.toDataURL("image/png");
    link.click();
}