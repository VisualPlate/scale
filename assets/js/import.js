
// Get canvas and drawing context
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const input = document.getElementById("imageInput");

input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();

    img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        ctx.drawImage(img, 0, 0);

        URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
});