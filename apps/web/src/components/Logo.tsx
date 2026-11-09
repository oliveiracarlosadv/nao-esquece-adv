import { cx } from '@/lib/format';

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1D4ED8" />
      <path d="M21 15h20a3 3 0 0 1 3 3v31l-13-8.5L18 49V18a3 3 0 0 1 3-3z" fill="#FFFFFF" />
      <path d="M24.5 28.5l4.5 4.5 8.5-9" fill="none" stroke="#1D4ED8" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="45" cy="17" r="7" fill="#F59E0B" stroke="#1D4ED8" strokeWidth="3" />
    </svg>
  );
}

export function Logo({ className, slogan }: { className?: string; slogan?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={slogan ? 44 : 32} />
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-tight text-ink">
          NÃO ESQUECE <span className="font-normal text-brand-600">ADV</span>
        </span>
        {slogan && <span className="block text-xs text-soft">Nenhuma intimação passa despercebida.</span>}
      </span>
    </span>
  );
}
