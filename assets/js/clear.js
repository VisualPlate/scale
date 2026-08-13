const clearCanvas = document.getElementById('clearCanvas');

clearCanvas.addEventListener('click', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Wipe everything drawn on the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset calibration so old ratio isn't reused by mistake
    window.mmPerPixel = null;
});