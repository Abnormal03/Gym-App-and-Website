export default function Logo({ light = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={light ? '#fff' : '#101B18'} />
        <rect x="5" y="14" width="22" height="4" rx="2" fill="#E8590C" />
        <rect x="7" y="9" width="3" height="14" rx="1.5" fill={light ? '#101B18' : '#fff'} />
        <rect x="22" y="9" width="3" height="14" rx="1.5" fill={light ? '#101B18' : '#fff'} />
      </svg>
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>Gym Platform</span>
    </span>
  );
}
