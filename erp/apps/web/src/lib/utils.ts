import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format paise as ₹ with Indian locale grouping (1,23,456). */
export function formatPaise(paise: bigint | number | null | undefined): string {
  if (paise == null) return '—';
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/** Format a UTC ISO string in org timezone (default Asia/Kolkata). */
export function formatDate(
  iso: string | Date | null | undefined,
  tz = 'Asia/Kolkata',
): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
