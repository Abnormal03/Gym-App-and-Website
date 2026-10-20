import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search', label = 'Search', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <label className="sr-only" htmlFor={`sb-${label}`}>{label}</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
      <input id={`sb-${label}`} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9" />
    </div>
  );
}
