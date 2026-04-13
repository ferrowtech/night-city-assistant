const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.7;
const MAX_BYTES = 3 * 1024 * 1024; // 3MB

export function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      let quality = JPEG_QUALITY;
      let result = canvas.toDataURL("image/jpeg", quality);

      // Reduce quality iteratively if still over 3MB
      while (result.length * 0.75 > MAX_BYTES && quality > 0.1) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(result);
    };
    img.src = dataUrl;
  });
}
