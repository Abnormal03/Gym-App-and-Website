import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';

const ADDIS = [9.0108, 38.7613];
const pin = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#2E68F4;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function MapPicker({ lat, lng, onPick }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const valid = (a, b) => a !== '' && b !== '' && Number.isFinite(Number(a)) && Number.isFinite(Number(b));

  const place = (a, b) => {
    if (marker.current) marker.current.setLatLng([a, b]);
    else marker.current = L.marker([a, b], { icon: pin }).addTo(map.current);
  };

  useEffect(() => {
    const has = valid(lat, lng);
    map.current = L.map(el.current).setView(has ? [Number(lat), Number(lng)] : ADDIS, has ? 16 : 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.current);
    if (has) place(Number(lat), Number(lng));
    map.current.on('click', (e) => {
      const a = Number(e.latlng.lat.toFixed(6));
      const b = Number(e.latlng.lng.toFixed(6));
      place(a, b);
      pickRef.current(a, b);
    });
    setTimeout(() => map.current?.invalidateSize(), 100); // map sits inside a modal
    return () => map.current.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the pin in sync when latitude/longitude are typed by hand
  useEffect(() => {
    if (map.current && valid(lat, lng)) {
      place(Number(lat), Number(lng));
      map.current.panTo([Number(lat), Number(lng)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((p) => {
      const a = Number(p.coords.latitude.toFixed(6));
      const b = Number(p.coords.longitude.toFixed(6));
      map.current.setView([a, b], 16);
      place(a, b);
      pickRef.current(a, b);
    });
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">Location on map</span>
        <button type="button" onClick={useMyLocation} className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
          <LocateFixed className="h-4 w-4" aria-hidden="true" /> Use my location
        </button>
      </div>
      <div ref={el} className="isolate z-0 h-64 w-full overflow-hidden rounded-md border border-ink-200" />
      <p className="mt-1 text-sm text-ink-500">Click the map to place the gym. Latitude and longitude fill in automatically.</p>
    </div>
  );
}