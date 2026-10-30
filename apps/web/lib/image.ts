/** The maximum edge size we allow for uploaded images (LLMs have size limits) */
const MAX_IMAGE_EDGE = 2576;

/** Formats we re-encode (GIFs are left alone so animations survive) */
const DOWNSCALABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** JPEG/WebP quality for re-encoded images (PNG ignores it) */
const ENCODE_QUALITY = 0.9;

/** Shrinks an image to fit the model's full-detail size, returning the original if it already fits */
export const downscaleImage = async (blob: Blob): Promise<Blob> => {
  if (!DOWNSCALABLE_TYPES.has(blob.type)) {
    return blob;
  }

  let bitmap: ImageBitmap;
  try {
    // Applies EXIF rotation, since re-encoding drops the metadata that says how to rotate
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    // Let the upload go through as-is
    return blob;
  }

  try {
    const scale = MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height);
    if (scale >= 1) {
      return blob;
    }

    const canvas = new OffscreenCanvas(
      Math.round(bitmap.width * scale),
      Math.round(bitmap.height * scale),
    );
    const context = canvas.getContext('2d');
    if (!context) {
      return blob;
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const resized = await canvas.convertToBlob({ type: blob.type, quality: ENCODE_QUALITY });
    // Browsers that can't encode a format (e.g. Safari and WebP) fall back to PNG, which would no
    // longer match the file's name and type
    return resized.type === blob.type ? resized : blob;
  } finally {
    bitmap.close();
  }
};
