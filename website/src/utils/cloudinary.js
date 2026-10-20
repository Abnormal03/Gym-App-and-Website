const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const cloudinaryReady = Boolean(CLOUD && PRESET);

/** Uploads an image file to Cloudinary and returns its https link. */
export async function uploadImage(file) {
  if (!cloudinaryReady) throw new Error('Image upload is not configured.');
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('The image must be smaller than 5 MB.');

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'Upload failed. Try again.');
  return data.secure_url;
}