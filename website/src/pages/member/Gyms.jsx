import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Dumbbell, ExternalLink, MapPin, Search, Users } from 'lucide-react';
import { gymsApi } from '../../api/gyms.api';
import { packagesApi } from '../../api/packages.api';
import { providersApi } from '../../api/providers.api';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader, Avatar, Stars } from '../../components/common/Layout';
import { AsyncView, EmptyState, ErrorState, SkeletonGrid, SkeletonList } from '../../components/common/states';
import { GymCard, GymPhoto, PackageCard } from '../../components/common/GymParts';
import SearchBar from '../../components/common/SearchBar';
import Button from '../../components/common/Button';
import { isUrl } from '../../utils/validators';

export function GymList() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const dName = useDebounce(name.trim());
  const dLoc = useDebounce(location.trim());
  const searching = Boolean(dName || dLoc);
  const state = useAsync(() => (searching ? gymsApi.search({ name: dName, location: dLoc }) : gymsApi.list()), [dName, dLoc]);

  return (
    <>
      <PageHeader title="Find a gym" subtitle="Search by name, by location, or both." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SearchBar label="Gym name" value={name} onChange={setName} placeholder="Gym name" />
        <SearchBar label="Location" value={location} onChange={setLocation} placeholder="Area or address, e.g. Bole" />
      </div>
      <AsyncView
        state={state}
        skeleton={<SkeletonGrid />}
        isEmpty={(d) => !d || d.length === 0}
        empty={<EmptyState icon={Search} title="No gyms found" message={searching ? 'Try a different name or area.' : 'No gyms are listed yet.'} />}
      >
        {(gyms) => (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {gyms.map((g) => <GymCard key={g.id} gym={g} to={`/app/gyms/${g.id}`} />)}
          </div>
        )}
      </AsyncView>
    </>
  );
}

export function GymDetail() {
  const { id } = useParams();
  const gym = useAsync(() => gymsApi.get(id), [id]);
  const packages = useAsync(() => packagesApi.forGym(id), [id]);
  const coaches = useAsync(() => providersApi.search({ gymId: id }), [id]);

  if (gym.loading && !gym.data) return <SkeletonList rows={3} />;
  if (gym.error) return <ErrorState error={gym.error} onRetry={gym.reload} title="Could not load this gym" />;
  const g = gym.data;
  const mapUrl = g.latitude != null && g.longitude != null ? `https://www.openstreetmap.org/?mlat=${g.latitude}&mlon=${g.longitude}#map=16/${g.latitude}/${g.longitude}` : null;
  const activePackages = (packages.data || []).filter((p) => p.isActive !== false);
  const team = (coaches.data || []).filter((p) => p.type !== 'NUTRITION_CONSULTANT');

  return (
    <>
      <div className="card mb-6 overflow-hidden">
        <GymPhoto photos={g.photos} name={g.name} className="h-48 sm:h-64" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl">{g.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-ink-600"><MapPin className="h-4 w-4" aria-hidden="true" />{g.address}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-ink-600">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />Open {g.openingTime} - {g.closingTime}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden="true" />Capacity {g.capacity}</span>
            </div>
            {g.amenities?.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">{g.amenities.map((a) => <li key={a} className="rounded-full bg-ink-50 px-2.5 py-0.5 text-sm text-ink-600">{a}</li>)}</ul>}
            {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">View on map <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
          </div>
          <Button as={Link} to={`/app/gyms/${g.id}/book`} size="lg" icon={Dumbbell} disabled={g.isActive === false}>Book this gym</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-2xl">Packages</h2>
          <AsyncView state={packages} skeleton={<SkeletonList rows={2} />} isEmpty={() => activePackages.length === 0} empty={<EmptyState title="No active packages" message="This gym has not published a package yet." />}>
            {() => <div className="space-y-3">{activePackages.map((p) => <PackageCard key={p.id} pkg={p} />)}</div>}
          </AsyncView>
        </div>
        <div>
          <h2 className="mb-3 text-2xl">Coaches</h2>
          <AsyncView state={coaches} skeleton={<SkeletonList rows={2} />} isEmpty={() => team.length === 0} empty={<EmptyState title="No coaches listed" />}>
            {() => (
              <ul className="space-y-3">
                {team.map((p) => (
                  <li key={p.id} className="card flex items-center gap-3 p-3">
                    <Avatar name={p.name} src={isUrl(p.photoUrl) ? p.photoUrl : null} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-sm text-ink-500">{p.type === 'TRAINER' ? 'Trainer' : 'Physiotherapist'}{p.specializations?.length ? ` · ${p.specializations.slice(0, 2).join(', ')}` : ''}</p>
                      <Stars value={p.ratingAvg || 0} count={p.ratingCount || 0} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AsyncView>
        </div>
      </div>
    </>
  );
}
