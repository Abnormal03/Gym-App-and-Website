import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X } from 'lucide-react';

export default function QrScanner({ onResult, onClose }) {
  const video = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available here. Open the site at http://localhost:5173 or on an https:// address.');
      return undefined;
    }
    let stream;
    let raf;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      const v = video.current;
      if (!stopped && v && v.readyState === v.HAVE_ENOUGH_DATA) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          stopped = true;
          onResultRef.current(code.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (stopped || !video.current) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        video.current.srcObject = s;
        video.current.play();
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setError('Camera blocked or not found. Allow camera access using the icon in the browser address bar.'));

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : (
        <video ref={video} muted playsInline className="aspect-video w-full max-w-md rounded-md bg-ink-900 object-cover" />
      )}
      <button type="button" onClick={onClose} className="mt-2 inline-flex items-center gap-1 text-sm text-ink-600 hover:underline">
        <X className="h-4 w-4" aria-hidden="true" /> Close camera
      </button>
    </div>
  );
}
