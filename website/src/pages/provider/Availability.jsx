import { useEffect, useState } from 'react';
import { meApi } from '../../api/me.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { AsyncView, SkeletonList } from '../../components/common/states';
import { Card, PageHeader } from '../../components/common/Layout';
import AvailabilityGrid from '../../components/common/AvailabilityGrid';
import Button from '../../components/common/Button';

export default function Availability() {
  const state = useAsync(() => meApi.availability(), []);
  const [value, setValue] = useState([]);
  const [saved, setSaved] = useState([]);
  const { run, pending } = useSubmit();

  useEffect(() => {
    if (!state.data) return;
    const list = asList(state.data, 'slots').map(({ dayOfWeek, period }) => ({ dayOfWeek, period }));
    setValue(list);
    setSaved(list);
  }, [state.data]);

  const key = (l) => l.map((x) => `${x.dayOfWeek}-${x.period}`).sort().join();
  const dirty = key(value) !== key(saved);

  const save = async () => {
    const ok = await run(() => meApi.replaceAvailability(value), { success: 'Availability saved' });
    if (ok) setSaved(value);
  };

  return (
    <>
      <PageHeader title="Availability" subtitle="Tap the periods you can work each week. Members only see you for bookings that fit. Saving replaces your whole schedule." actions={<Button onClick={save} loading={pending} disabled={!dirty}>Save availability</Button>} />
      <Card>
        <AsyncView state={state} skeleton={<SkeletonList rows={3} />}>
          {() => (
            <>
              <AvailabilityGrid value={value} onChange={setValue} />
              <p className="mt-3 text-sm text-ink-500">{value.length} period{value.length === 1 ? '' : 's'} selected.{dirty ? ' You have unsaved changes.' : ''}</p>
            </>
          )}
        </AsyncView>
      </Card>
    </>
  );
}
