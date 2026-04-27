export function isAdmin(email?: string | null): boolean {
  return !!email && email === process.env.ADMIN_EMAIL;
}
