import { useRef, useState } from 'react';
import { Clock, Dumbbell, MapPin, Pencil, Plus, PowerOff, Search, Users } from 'lucide-react';

import { gymsApi } from '../../api/gyms.api';
import { useAdminGym } from '../../contexts/AdminGymContext';
import { useSubmit } from '../../hooks/useSubmit';

import Modal, { ConfirmDialog } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { TextField } from '../../components/common/Field';
import ImageUploader from '../../components/common/ImageUploader';
import MapPicker from '../../components/common/MapPicker';
import { ErrorState, SkeletonGrid } from '../../components/common/states';

import { collect, isUrl, numberInRange, required } from '../../utils/validators';
import { splitCsv } from '../../utils/format';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function AdminGyms() {
  const { gyms, loading, error, reload } = useAdminGym();

  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null); // null | 'new' | gym object
  const [deactivating, setDeactivating] = useState(null);
  const deactivate = useSubmit();

  const query = search.trim().toLowerCase();
  const filtered = gyms.filter(
    (g) => (g.name || '').toLowerCase().includes(query) || (g.address || '').toLowerCase().includes(query),
  );

  const confirmDeactivate = async () => {
    // Needs the backend to accept `isActive` on PUT /api/gyms/:id
    const ok = await deactivate.run(() => gymsApi.update(deactivating.id, { isActive: false }), { success: 'Gym deactivated' });
    if (ok) {
      setDeactivating(null);
      reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl">Gyms</h1>
          <p className="mt-1 text-ink-500">Manage gyms, locations, photos and capacity.</p>
        </div>
        <Button icon={Plus} onClick={() => setForm('new')}>New gym</Button>
      </div>

      <div className="relative">
        <label htmlFor="gym-search" className="sr-only">Search gyms</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <input
          id="gym-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gyms by name or address"
          className="input pl-9"
        />
      </div>

      {loading && !gyms.length && <SkeletonGrid count={3} />}
      {error && !gyms.length && <ErrorState error={error} onRetry={reload} title="Could not load your gyms" />}

      {!loading && !error && filtered.length === 0 && (
        <div className="card p-10 text-center">
          <Dumbbell className="mx-auto mb-3 h-10 w-10 text-ink-300" aria-hidden="true" />
          <h2 className="text-xl">{search ? 'No matching gyms' : 'No gyms yet'}</h2>
          <p className="mt-1 text-ink-500">{search ? 'Try a different search term.' : 'Add your first gym to get started.'}</p>
          {!search && <div className="mt-4"><Button icon={Plus} onClick={() => setForm('new')}>New gym</Button></div>}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((gym) => {
            const photos = Array.isArray(gym.photos) ? gym.photos.filter(Boolean) : [];
            return (
              <article key={gym.id} className="card overflow-hidden">
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1 bg-ink-100">
                    {photos.slice(0, 4).map((photo, index) => (
                      <div key={`${photo}-${index}`} className="relative h-28 overflow-hidden">
                        <img
                          src={photo}
                          alt={`${gym.name} photo ${index + 1}`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        {index === 3 && photos.length > 4 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold text-white">+{photos.length - 4}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center bg-ink-100">
                    <Dumbbell className="h-12 w-12 text-ink-300" aria-hidden="true" />
                  </div>
                )}

                <div className="space-y-4 p-5">
                  <div>
                    <h2 className="text-xl">{gym.name}</h2>
                    <p className="mt-1 flex items-start gap-2 text-sm text-ink-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{gym.address || 'No address provided'}</span>
                    </p>
                    <p className="mt-2 text-xs text-ink-500">{photos.length} photo{photos.length === 1 ? '' : 's'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-ink-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-ink-500"><Clock className="h-4 w-4" aria-hidden="true" />Hours</div>
                      <p className="mt-1 text-sm font-semibold">{gym.openingTime || '--:--'} - {gym.closingTime || '--:--'}</p>
                    </div>
                    <div className="rounded-lg bg-ink-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-ink-500"><Users className="h-4 w-4" aria-hidden="true" />Capacity</div>
                      <p className="mt-1 text-sm font-semibold">{gym.capacity ?? 'N/A'}</p>
                    </div>
                  </div>

                  {Array.isArray(gym.amenities) && gym.amenities.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {gym.amenities.slice(0, 5).map((a, i) => (
                        <li key={`${a}-${i}`} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{a}</li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2 border-t border-ink-100 pt-4">
                    <Button variant="secondary" icon={Pencil} className="flex-1" onClick={() => setForm(gym)}>Edit</Button>
                    <Button variant="dangerOutline" icon={PowerOff} onClick={() => setDeactivating(gym)}>Deactivate</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {form && <GymForm gym={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={reload} />}

      <ConfirmDialog
        open={Boolean(deactivating)}
        title={`Deactivate ${deactivating?.name}?`}
        message="Members will no longer see or book this gym. Existing bookings and data are kept."
        confirmLabel="Deactivate"
        danger
        loading={deactivate.pending}
        onConfirm={confirmDeactivate}
        onClose={() => setDeactivating(null)}
      />
    </div>
  );
}

/* ---------- Create / edit form ---------- */

function GymForm({ gym, onClose, onSaved }) {
  const editing = Boolean(gym);

  const [v, setV] = useState({
    name: gym?.name || '',
    address: gym?.address || '',
    latitude: gym?.latitude ?? '',
    longitude: gym?.longitude ?? '',
    openingTime: gym?.openingTime || '06:00',
    closingTime: gym?.closingTime || '22:00',
    capacity: gym?.capacity ?? '',
    photos: Array.isArray(gym?.photos) ? gym.photos : [], // always an array of links
    amenities: Array.isArray(gym?.amenities) ? gym.amenities.join(', ') : '',
  });
  const [errors, setErrors] = useState({});
  const { run, pending, error, fieldErrors } = useSubmit();

  const set = (key) => (e) => setV((cur) => ({ ...cur, [key]: e.target.value }));
  const err = (key) => errors[key] || fieldErrors[key];

  // Map click: fill latitude/longitude and a short address ("Piassa, Addis Ababa").
  // The address follows the pin until you type in the Address box yourself.
  const addressTyped = useRef(false);
  const pick = async (lat, lng) => {
    setV((cur) => ({ ...cur, latitude: String(lat), longitude: String(lng) }));
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en&zoom=18&lat=${lat}&lon=${lng}`);
      const j = await r.json();
      const a = j.address || {};
      const area = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.residential || a.road || j.name;
      const city = a.city || a.town || a.village || a.state;
      const short = [...new Set([area, city].filter(Boolean))].join(', ');
      if (short && !addressTyped.current) setV((cur) => ({ ...cur, address: short }));
    } catch {
      /* the address can be typed by hand */
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    const found = collect({
      name: () => required(v.name, 'Name'),
      address: () => required(v.address, 'Address'),
      latitude: () => numberInRange(v.latitude, { min: -90, max: 90, label: 'Latitude' }),
      longitude: () => numberInRange(v.longitude, { min: -180, max: 180, label: 'Longitude' }),
      openingTime: () => (TIME.test(v.openingTime) ? null : 'Use HH:mm.'),
      closingTime: () => (!TIME.test(v.closingTime) ? 'Use HH:mm.' : v.closingTime <= v.openingTime ? 'Closing must be after opening.' : null),
      capacity: () => numberInRange(v.capacity, { min: 1, integer: true, label: 'Capacity' }),
      photos: () => (v.photos.every(isUrl) ? null : 'Every photo must be a valid http(s) link.'),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = {
      name: v.name.trim(),
      address: v.address.trim(),
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      openingTime: v.openingTime,
      closingTime: v.closingTime,
      capacity: Number(v.capacity),
      photos: v.photos,
      amenities: splitCsv(v.amenities),
    };

    const ok = await run(() => (editing ? gymsApi.update(gym.id, body) : gymsApi.create(body)), {
      success: editing ? 'Gym updated' : 'Gym created',
    });
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit ${gym.name}` : 'New gym'}
      size="lg"
      locked={pending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form="gym-form" loading={pending}>{editing ? 'Save changes' : 'Create gym'}</Button>
        </>
      }
    >
      <form id="gym-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Gym name" value={v.name} onChange={set('name')} error={err('name')} required />
        <TextField className="sm:col-span-2" label="Address" value={v.address} onChange={(e) => { addressTyped.current = true; set('address')(e); }} error={err('address')} required />
        <div className="sm:col-span-2">
          <MapPicker lat={v.latitude} lng={v.longitude} onPick={pick} />
        </div>
        <TextField label="Latitude" type="number" step="any" value={v.latitude} onChange={set('latitude')} error={err('latitude')} required />
        <TextField label="Longitude" type="number" step="any" value={v.longitude} onChange={set('longitude')} error={err('longitude')} required />
        <TextField label="Opens" type="time" value={v.openingTime} onChange={set('openingTime')} error={err('openingTime')} required />
        <TextField label="Closes" type="time" value={v.closingTime} onChange={set('closingTime')} error={err('closingTime')} required />
        <TextField className="sm:col-span-2" label="Capacity" type="number" min="1" value={v.capacity} onChange={set('capacity')} error={err('capacity')} hint="People allowed at the same time." required />

        <div className="sm:col-span-2">
          <ImageUploader photos={v.photos} onChange={(photos) => setV((cur) => ({ ...cur, photos }))} />
          {err('photos') && <p role="alert" className="mt-1 text-sm text-red-600">{err('photos')}</p>}
        </div>

        <TextField className="sm:col-span-2" label="Amenities" value={v.amenities} onChange={set('amenities')} hint="Comma separated, e.g. Wi-Fi, Parking, Shower." />

        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error.message}</p>}
      </form>
    </Modal>
  );
}
