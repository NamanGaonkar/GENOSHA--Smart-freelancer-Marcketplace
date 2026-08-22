export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ── Currency ──────────────────────────────────────────────────
const USD_TO_INR = 83.33; // closer to real market rate

export function toINR(amount: number): string {
  const inr = Math.round(amount * USD_TO_INR);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inr);
}

export function toUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

// Dual display: shows budget in both currencies
// amount is ALWAYS stored in the currency specified by the currency param
export function formatDual(amount: number, currency?: string): string {
  if (!amount || amount <= 0) return currency === 'inr' ? '₹0' : '$0';
  if (currency === 'inr') {
    // amount is already in INR — display directly, show USD equivalent
    return `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)} (${toUSD(Math.round(amount / 83.5))})`;
  }
  // amount is in USD — display directly, show INR equivalent
  return `${toUSD(amount)} (${toINR(amount)})`;
}

// Show amount in a specific currency
export function formatCurrency(amount: number, currency: string = 'usd'): string {
  if (currency === 'inr') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }
  return toUSD(amount);
}

// ── File validation ───────────────────────────────────────────
export const MAX_FILE_SIZE = 1 * 1024 * 1024;

export function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function validateImageType(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Profile completeness ──────────────────────────────────────
export function calcProfileCompleteness(profile: any): number {
  if (!profile) return 0;
  const checks = [
    !!profile.full_name,
    !!profile.bio && profile.bio.length > 10,
    !!profile.avatar_url,
    !!profile.hourly_rate && profile.hourly_rate > 0,
    !!profile.experience_level,
    profile.skills && profile.skills.length > 0,
    profile.role === 'freelancer' ? !!profile.availability : true,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
