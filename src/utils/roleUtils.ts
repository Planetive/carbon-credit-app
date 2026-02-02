import { User } from '@supabase/supabase-js';

/**
 * Specific emails and domains that have full access (dashboard, all features, admin-level permissions).
 * - it@majeedfabrics.com (specific client)
 * - Any email with @planetive (e.g. @planetive.com, @planetive.org)
 */
const FULL_ACCESS_EMAILS = ['it@majeedfabrics.com'] as const;
const FULL_ACCESS_DOMAIN = '@planetive';

/**
 * Check if an email has full access (allowlist: specific emails + @planetive domain).
 */
export function hasFullAccessByEmail(email: string | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (FULL_ACCESS_EMAILS.some((e) => lower === e)) return true;
  return lower.includes(FULL_ACCESS_DOMAIN);
}

/**
 * Check if a user has a company / full-access email address
 * @param user - The user object from Supabase auth
 * @returns true if user has full-access email (allowlist or @planetive), false otherwise
 */
export function isCompanyUser(user: User | null): boolean {
  if (!user || !user.email) {
    return false;
  }
  return hasFullAccessByEmail(user.email);
}

/**
 * Get the list of routes that require company access
 */
export function getRestrictedRoutes(): string[] {
  return ['/dashboard', '/reports', '/drafts', '/settings'];
}

/**
 * Check if a route requires company access
 * @param path - The route path to check
 * @returns true if route requires company access, false otherwise
 */
export function isRestrictedRoute(path: string): boolean {
  const restrictedRoutes = getRestrictedRoutes();
  return restrictedRoutes.some(route => path.startsWith(route));
}

