import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cloudinaryReady, uploadImage } from '../../utils/cloudinary';
import Button from './Button';
import { Avatar } from './Layout';

export default function ImageUploader({
  label = 'Photo',
  value,
  photos,
  onChange,
  name,
}) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // If photos is provided, enable multiple-image mode.
  const multiple = Array.isArray(photos);

  const pick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

    if (!files.length) return;

    setBusy(true);
    setError('');

    try {
      if (multiple) {
        const uploadedUrls = [];

        for (const file of files) {
          const url = await uploadImage(file);
          uploadedUrls.push(url);
        }

        onChange([...photos, ...uploadedUrls]);
      } else {
        const url = await uploadImage(files[0]);
        onChange(url);
      }
    } catch (err) {
      setError(err?.message || 'Image upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (index) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-700">
        {label}
      </p>

      {multiple ? (
        <div className="space-y-3">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative overflow-hidden rounded-lg border"
                >
                  <img
                    src={url}
                    alt={`${label} ${index + 1}`}
                    className="h-32 w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    disabled={busy}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute right-2 top-2 rounded-full bg-white p-1 text-red-600 shadow"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={ImagePlus}
            loading={busy}
            disabled={!cloudinaryReady || busy}
            onClick={() => input.current?.click()}
          >
            {photos.length ? 'Add more photos' : 'Upload gym photos'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Avatar name={name} src={value || null} size="lg" />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={ImagePlus}
            loading={busy}
            disabled={!cloudinaryReady || busy}
            onClick={() => input.current?.click()}
          >
            {value ? 'Change photo' : 'Upload photo'}
          </Button>
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={pick}
        aria-label={label}
      />

      {!cloudinaryReady && (
        <p className="mt-1 text-sm text-amber-700">
          Upload is not configured. Add the Cloudinary values to your .env file.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
