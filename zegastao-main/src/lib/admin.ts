const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? 'processocristao@gmail.com')
  .split(',')
  .map((e: string) => e.trim().toLowerCase());

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
