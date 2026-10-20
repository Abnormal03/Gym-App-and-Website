import { AlertTriangle, Inbox, Loader2, PlugZap, RefreshCw, ServerCrash } from 'lucide-react';
import Button from './Button';

export function Spinner({ label = 'Loading' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-ink-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-ink-100 ${className}`} />;
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="h-36 rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-xl">{title}</h3>
      {message && <p className="mt-1 max-w-md text-ink-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Error panel. A missing `/api/v1` route gets its own explanation instead of a generic failure. */
export function ErrorState({ error, onRetry, title }) {
  if (error?.unavailable) {
    return (
      <EmptyState
        icon={PlugZap}
        title={title || 'Not available on this server yet'}
        message="The backend does not expose this feature (the endpoint returned 404). It is listed in the V2 spec, so the backend team needs to deploy it."
      />
    );
  }
  const Icon = error?.network ? ServerCrash : AlertTriangle;
  return (
    <div role="alert" className="card flex flex-col items-center border-red-200 px-6 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-xl">{title || (error?.network ? 'Server unreachable' : 'Could not load this')}</h3>
      <p className="mt-1 max-w-md text-ink-500">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry} className="mt-4">Try again</Button>
      )}
    </div>
  );
}

/** Standard loading / error / empty / content switch for a useAsync result. */
export function AsyncView({ state, skeleton, isEmpty, empty, children }) {
  if (state.loading && !state.data) return skeleton || <SkeletonList />;
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (isEmpty?.(state.data)) return empty;
  return children(state.data);
}
