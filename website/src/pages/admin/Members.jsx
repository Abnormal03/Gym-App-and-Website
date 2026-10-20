import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/admin.api';
import { PageHeader } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList,} from '../../components/common/states';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import { formatDate } from '../../utils/format';

export default function AdminMembers() {
const [gyms, setGyms] = useState([]);
const [selectedGymId, setSelectedGymId] = useState('');
const [members, setMembers] = useState([]);

const [gymsLoading, setGymsLoading] = useState(true);
const [membersLoading, setMembersLoading] = useState(false);

const [gymsError, setGymsError] = useState(null);
const [membersError, setMembersError] = useState(null);

const [q, setQ] = useState('');

// 1. Load the authenticated admin's gyms.
useEffect(() => {
let active = true;

async function loadGyms() {
  setGymsLoading(true);
  setGymsError(null);

  try {
    const result = await adminApi.gyms();

    if (!active) return;

    setGyms(result);

    if (result.length === 1) {
      // Automatically select the only gym.
      setSelectedGymId(String(result[0].id));
    } else {
      // Let the admin select a gym when multiple gyms exist.
      setSelectedGymId('');
    }
  } catch (error) {
    if (!active) return;

    setGymsError(
      error?.response?.data?.message ||
        error?.message ||
        'Failed to load gyms.'
    );
  } finally {
    if (active) setGymsLoading(false);
  }
}

loadGyms();

return () => {
  active = false;
};

}, []);

// 2. Load members whenever the selected gym changes.
useEffect(() => {
let active = true;

if (!selectedGymId) {
  setMembers([]);
  setMembersError(null);
  setMembersLoading(false);
  return;
}

async function loadMembers() {
  setMembersLoading(true);
  setMembersError(null);
  setMembers([]);

  try {
    // selectedGymId is the gym's ID, not the admin or package ID.
    const result = await adminApi.users(selectedGymId);

    if (active) {
      setMembers(result);
    }
  } catch (error) {
    if (!active) return;

    setMembersError(
      error?.response?.data?.message ||
        error?.message ||
        'Failed to load members.'
    );
  } finally {
    if (active) setMembersLoading(false);
  }
}

loadMembers();

return () => {
  active = false;
};

}, [selectedGymId]);

// 3. Filter members using the existing search field.
const rows = useMemo(() => {
const term = q.trim().toLowerCase();
return members.filter((member) => {
  const searchableText = [
    member.name,
    member.email,
    member.phone || '',
  ]
    .join(' ')
    .toLowerCase();

  return !term || searchableText.includes(term);
});

}, [members, q]);

const columns = [
{
key: 'name',
header: 'Member',
primary: true,
sortValue: (member) => member.name,
render: (member) => ( <span> <span className="font-medium">{member.name}</span> <span className="block text-sm text-ink-500">
{member.email} </span> </span>
),
},
{
key: 'phone',
header: 'Phone',
render: (member) => member.phone || '-',
},
{
key: 'createdAt',
header: 'Joined',
sortValue: (member) => member.createdAt,
render: (member) => formatDate(member.createdAt),
},
{
key: 'bookings',
header: 'Bookings',
sortValue: (member) => member._count?.bookings ?? 0,
render: (member) => member._count?.bookings ?? '-',
},
];

const selectedGym = gyms.find(
(gym) => String(gym.id) === selectedGymId
);

return (
<>
<PageHeader
title="Members"
subtitle={
selectedGym
? `Members of ${selectedGym.name}`
: 'View members registered with your gyms.'
}
/>
  {/* Loading and error states for gyms */}
  {gymsLoading ? (
    <SkeletonList />
  ) : gymsError ? (
    <ErrorState
      error={gymsError}
      onRetry={() => window.location.reload()}
    />
  ) : gyms.length === 0 ? (
    <EmptyState
      title="Not found"
    />
  ) : (
    <>
      {/* Show the selector only when the admin owns multiple gyms. */}
      {gyms.length > 1 && (
        <div className="mb-4 max-w-md">
          <label
            htmlFor="members-gym"
            className="mb-2 block text-sm font-medium text-ink-700"
          >
            Select gym
          </label>

          <select
            id="members-gym"
            value={selectedGymId}
            onChange={(event) =>
              setSelectedGymId(event.target.value)
            }
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2"
          >
            <option value="">Choose a gym</option>

            {gyms.map((gym) => (
              <option key={gym.id} value={String(gym.id)}>
                {gym.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Search members */}
      <SearchBar
        label="Search members"
        value={q}
        onChange={setQ}
        placeholder="Search by name, email or phone"
        className="mb-4 max-w-md"
      />

      {/* Member list */}
      {!selectedGymId ? (
        <EmptyState title="Select a gym to view its members" />
      ) : membersLoading ? (
        <SkeletonList />
      ) : membersError ? (
        <ErrorState
          error={membersError}
          onRetry={() => {
            // Changing the selected ID triggers the loading effect.
            // A full page reload also retries the request.
            window.location.reload();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState title="No members found" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          caption="Members"
        />
      )}
    </>
  )}
</>

);
}
