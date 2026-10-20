import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-signal text-white hover:bg-signal-600 disabled:bg-signal/50',
  brand: 'bg-brand text-white hover:bg-brand-600 disabled:bg-brand/50',
  secondary: 'border border-ink-200 bg-white text-ink hover:bg-ink-50 disabled:text-ink-300',
  ghost: 'text-ink-600 hover:bg-ink-100 disabled:text-ink-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  dangerOutline: 'border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:text-red-300',
};
const SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-[15px]', lg: 'px-5 py-3 text-base' };

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, className = '', children, disabled, type = 'button', as: Tag = 'button', ...props }) {
  const isDisabled = disabled || loading;
  return (
    <Tag
      type={Tag === 'button' ? type : undefined}
      disabled={Tag === 'button' ? isDisabled : undefined}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </Tag>
  );
}
