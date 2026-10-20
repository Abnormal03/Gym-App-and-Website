import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import Pagination from './Pagination';

/**
 * Responsive table: a real <table> from md up, stacked cards below.
 * columns: [{ key, header, render?(row), sortValue?(row), primary?, className?, hideOnCard? }]
 * Pass `serverPaging={{ page, limit, total, onChange }}` for API pagination; otherwise it pages client-side.
 */
export default function DataTable({ columns, rows, rowKey = 'id', pageSize = 10, serverPaging, onRowClick, caption }) {
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const val = col?.sortValue || ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === y) return 0;
      if (x === undefined || x === null) return 1;
      if (y === undefined || y === null) return -1;
      return (x > y ? 1 : -1) * (sort.dir === 'asc' ? 1 : -1);
    });
  }, [rows, sort, columns]);

  const paging = serverPaging || { page, limit: pageSize, total: sorted.length, onChange: setPage };
  const visible = serverPaging ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize);
  // Stay on a valid page when filtering shrinks the list.
  if (!serverPaging && page > 1 && (page - 1) * pageSize >= sorted.length) setPage(1);

  const toggleSort = (col) => {
    if (!(col.sortValue || col.sortable)) return;
    setSort((s) => (s?.key === col.key ? (s.dir === 'asc' ? { key: col.key, dir: 'desc' } : null) : { key: col.key, dir: 'asc' }));
  };
  const cell = (col, row) => (col.render ? col.render(row) : row[col.key] ?? '-');
  const clickable = onRowClick ? 'cursor-pointer hover:bg-ink-50' : '';

  return (
    <div>
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[15px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-ink-100 bg-ink-50 text-sm text-ink-500">
            <tr>
              {columns.map((c) => {
                const sortable = Boolean(c.sortValue || c.sortable);
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={`px-4 py-3 font-medium ${c.className || ''}`}>
                    {sortable ? (
                      <button type="button" onClick={() => toggleSort(c)} className="inline-flex items-center gap-1 hover:text-ink">
                        {c.header}
                        {active && (sort.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {visible.map((row) => (
              <tr key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined} className={clickable}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.className || ''}`}>{cell(c, row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {visible.map((row) => {
          const primary = columns.find((c) => c.primary) || columns[0];
          return (
            <li key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`card p-4 ${clickable}`}>
              <div className="mb-2 font-medium">{cell(primary, row)}</div>
              <dl className="space-y-1.5">
                {columns.filter((c) => c !== primary && !c.hideOnCard).map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-4 text-sm">
                    <dt className="shrink-0 text-ink-500">{c.header}</dt>
                    <dd className="min-w-0 text-right">{cell(c, row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>

      <Pagination {...paging} />
    </div>
  );
}
