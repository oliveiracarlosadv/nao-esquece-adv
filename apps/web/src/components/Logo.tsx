import { useId } from 'react';
import { cx } from '@/lib/format';

/** Símbolo: dedo levantado com uma fita (laço) — verde-oliva pastel, minimalista. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: BODY.replace(/__ID__/g, 'nea' + id) }} />
  );
}

const BODY = '<defs><clipPath id="__ID__"><rect width="512" height="512" rx="112"/></clipPath></defs><g clip-path="url(#__ID__)"><rect width="512" height="512" fill="#B8C39A"/>\n<rect x="196" y="96" width="92" height="330" rx="46" fill="#FBFAF3"/>\n<rect x="196" y="300" width="196" height="300" rx="72" fill="#FBFAF3"/>\n<path d="M292 304 v40 M342 312 v36" stroke="#DCE2C6" stroke-width="10" stroke-linecap="round"/>\n<g fill="none" stroke="#C0573E" stroke-linecap="round" stroke-linejoin="round">\n<path d="M190 200 Q242 190 294 200" stroke-width="18"/>\n<path d="M236 196 C206 150 150 150 152 182 C154 210 204 210 236 196Z" stroke-width="14"/>\n<path d="M248 196 C278 150 336 150 334 182 C332 210 282 210 248 196Z" stroke-width="14"/>\n<path d="M236 202 C226 236 210 258 192 274" stroke-width="13"/>\n<path d="M250 202 C262 236 280 256 300 270" stroke-width="13"/>\n</g>\n<circle cx="242" cy="198" r="15" fill="#C0573E"/></g>';

export function Logo({ className, slogan }: { className?: string; slogan?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={slogan ? 48 : 36} />
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-tight text-ink">
          NÃO ESQUECE <span className="font-normal text-[#6B7A45] dark:text-[#B8C39A]">ADV</span>
        </span>
        {slogan && <span className="block text-xs text-soft">Nenhuma intimação passa despercebida.</span>}
      </span>
    </span>
  );
}
