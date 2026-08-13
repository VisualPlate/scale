(function () {
    const canvasWrap = document.getElementById('canvasWrap');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const overlayCanvas = document.getElementById('overlayCanvas');
    const overlayCtx = overlayCanvas.getContext('2d');

    const drawCalibrationBtn = document.getElementById('drawCalibrationMeasurements');
    const drawScaleBtn = document.getElementById('drawScale');
    const drawSquareBtn = document.getElementById('drawSquare');

    const lineLengthP = document.getElementById('lineLength');
    const realLengthP = document.getElementById('realLength');
    const mmPerPixelP = document.getElementById('mmPerPixel');
    const linelenghtInMMP = document.getElementById('linelenghtInMM');
    const squareDimensionsP = document.getElementById('squareDimensions'); // add this <span> to the readout

    const COLORS = {
        calibrate: '#e63946',
        scale: '#1a73e8',
        square: '#2a9d34'
    };

    let pixelToMmRatio = 0; // mm per pixel, set by calibration (the "Draw" step)
    let mode = null;        // 'calibrate' | 'scale' | 'square' | null
    let pointA = null;
    let pointB = null;

    // --- coordinate handling -------------------------------------------------
    function getCanvasCoords(evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    function clearOverlay() {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    function setActiveButton(activeBtn) {
        [drawCalibrationBtn, drawScaleBtn, drawSquareBtn].forEach(btn => btn.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');
        canvasWrap.classList.toggle('mode-active', !!activeBtn);
    }

    function resetPoints() {
        pointA = null;
        pointB = null;
        mode = null;
        setActiveButton(null);
        clearOverlay();
    }

    // --- drawing helpers ------------------------------------------------------
    function drawPointMarker(context, point, color) {
        context.beginPath();
        context.arc(point.x, point.y, 5, 0, Math.PI * 2);
        context.fillStyle = 'white';
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = color;
        context.stroke();
    }

    function drawLine(context, a, b, color, dashed) {
        context.beginPath();
        context.setLineDash(dashed ? [6, 5] : []);
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.lineWidth = 2.5;
        context.lineCap = 'round';
        context.strokeStyle = color;
        context.stroke();
        context.setLineDash([]);
    }

    // Normalizes two arbitrary corner points into a top-left-origin rect
    function rectFromPoints(a, b) {
        return {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            w: Math.abs(b.x - a.x),
            h: Math.abs(b.y - a.y)
        };
    }

    function drawRect(context, a, b, color, dashed) {
        const r = rectFromPoints(a, b);
        context.beginPath();
        context.setLineDash(dashed ? [6, 5] : []);
        context.lineWidth = 2.5;
        context.strokeStyle = color;
        context.strokeRect(r.x, r.y, r.w, r.h);
        context.setLineDash([]);
    }

    function drawLabel(context, text, position, color) {
        context.font = 'bold 13px Arial';
        const paddingX = 6;
        const paddingY = 4;
        const textWidth = context.measureText(text).width;
        const boxW = textWidth + paddingX * 2;
        const boxH = 20;

        const boxX = position.x - boxW / 2;
        const boxY = position.y - boxH - 8;

        context.fillStyle = 'rgba(255, 255, 255, 0.92)';
        context.strokeStyle = color;
        context.lineWidth = 1.5;
        roundRect(context, boxX, boxY, boxW, boxH, 5);
        context.fill();
        context.stroke();

        context.fillStyle = '#222';
        context.textBaseline = 'middle';
        context.fillText(text, boxX + paddingX, boxY + boxH / 2 + paddingY / 2);
    }

    function roundRect(context, x, y, w, h, r) {
        context.beginPath();
        context.moveTo(x + r, y);
        context.arcTo(x + w, y, x + w, y + h, r);
        context.arcTo(x + w, y + h, x, y + h, r);
        context.arcTo(x, y + h, x, y, r);
        context.arcTo(x, y, x + w, y, r);
        context.closePath();
    }

    function midpoint(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function pixelDistance(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // --- interaction ------------------------------------------------------
    function handleMouseMove(evt) {
        if (!mode || !pointA) return;

        const pos = getCanvasCoords(evt);
        const color = COLORS[mode];

        clearOverlay();

        if (mode === 'square') {
            const r = rectFromPoints(pointA, pos);
            drawRect(overlayCtx, pointA, pos, color, true);
            drawPointMarker(overlayCtx, pointA, color);
            drawPointMarker(overlayCtx, pos, color);

            const widthMM = r.w * pixelToMmRatio;
            const heightMM = r.h * pixelToMmRatio;
            const previewText = `${widthMM.toFixed(1)} × ${heightMM.toFixed(1)} mm`;
            drawLabel(overlayCtx, previewText, { x: r.x + r.w / 2, y: r.y }, color);
            return;
        }

        drawLine(overlayCtx, pointA, pos, color, true);
        drawPointMarker(overlayCtx, pointA, color);
        drawPointMarker(overlayCtx, pos, color);

        const pixelLength = pixelDistance(pointA, pos);
        const previewText = mode === 'calibrate'
            ? `${pixelLength.toFixed(0)} px`
            : `${(pixelLength * pixelToMmRatio).toFixed(1)} mm`;
        drawLabel(overlayCtx, previewText, midpoint(pointA, pos), color);
    }

    function handleCanvasClick(evt) {
        if (!mode) return; // ignore clicks unless a mode is active

        const pos = getCanvasCoords(evt);

        if (!pointA) {
            // first click sets point A
            pointA = pos;
            drawPointMarker(overlayCtx, pointA, COLORS[mode]);
            return;
        }

        // second click sets point B and completes the shape
        pointB = pos;
        const color = COLORS[mode];
        const pixelLength = pixelDistance(pointA, pointB);

        if (mode === 'calibrate') {
            const mmInput = prompt('What is the length of this side of the blueprint in mm?');
            const mmLength = parseFloat(mmInput);

            if (!isNaN(mmLength) && mmLength > 0 && pixelLength > 0) {
                pixelToMmRatio = mmLength / pixelLength;

                drawLine(ctx, pointA, pointB, color, false);
                drawPointMarker(ctx, pointA, color);
                drawPointMarker(ctx, pointB, color);
                drawLabel(ctx, `${mmLength} mm`, midpoint(pointA, pointB), color);

                lineLengthP.textContent = `${pixelLength.toFixed(2)} px`;
                realLengthP.textContent = `${mmLength} mm`;
                mmPerPixelP.textContent = `${pixelToMmRatio.toFixed(4)} mm`;
            } else {
                alert('Invalid length entered. Calibration cancelled.');
            }
        } else if (mode === 'scale') {
            const drawScale = pixelLength * pixelToMmRatio;

            drawLine(ctx, pointA, pointB, color, false);
            drawPointMarker(ctx, pointA, color);
            drawPointMarker(ctx, pointB, color);
            drawLabel(ctx, `${drawScale.toFixed(1)} mm`, midpoint(pointA, pointB), color);

            linelenghtInMMP.textContent = `${drawScale.toFixed(2)} mm (${pixelLength.toFixed(2)} px)`;
        } else if (mode === 'square') {
            const r = rectFromPoints(pointA, pointB);
            const widthMM = r.w * pixelToMmRatio;
            const heightMM = r.h * pixelToMmRatio;
            const areaMM2 = widthMM * heightMM;

            drawRect(ctx, pointA, pointB, color, false);
            drawPointMarker(ctx, pointA, color);
            drawPointMarker(ctx, pointB, color);
            drawLabel(ctx, `${widthMM.toFixed(1)} × ${heightMM.toFixed(1)} mm`, { x: r.x + r.w / 2, y: r.y }, color);

            if (squareDimensionsP) {
                squareDimensionsP.textContent =
                    `${widthMM.toFixed(2)} × ${heightMM.toFixed(2)} mm (Area: ${areaMM2.toFixed(2)} mm²)`;
            }
        }

        resetPoints();
    }

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleMouseMove);

    drawCalibrationBtn.addEventListener('click', () => {
        mode = 'calibrate';
        pointA = null;
        pointB = null;
        setActiveButton(drawCalibrationBtn);
    });

    drawScaleBtn.addEventListener('click', () => {
        if (!pixelToMmRatio || pixelToMmRatio <= 0) {
            alert('Please calibrate first using "Draw" before measuring a line.');
            return;
        }
        mode = 'scale';
        pointA = null;
        pointB = null;
        setActiveButton(drawScaleBtn);
    });

    drawSquareBtn.addEventListener('click', () => {
        if (!pixelToMmRatio || pixelToMmRatio <= 0) {
            alert('Please calibrate first using "Draw" before drawing a square.');
            return;
        }
        mode = 'square';
        pointA = null;
        pointB = null;
        setActiveButton(drawSquareBtn);
    });
})();