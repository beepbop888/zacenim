// Shrinks a photo before upload: at most 1,280 px on the long side and about 300 KB of JPEG.
export const MAX_SIDE = 1280;
export const MAX_BYTES = 300 * 1024;

export function fitSize(w, h, max = MAX_SIDE) {
  const k = Math.min(1, max / Math.max(w, h));
  return [Math.round(w * k), Math.round(h * k)];
}

export async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file);
  const [w, h] = fitSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("photo too large");
}
