import { User } from '@supabase/supabase-js';

/**
 * Company email domain that has full access
 */
const COMPANY_EMAIL_DOMAIN = 'planetive.org';

/**
 * Check if a user has a company email address
 * @param user - The user object from Supabase auth
 * @returns true if user has company email, false otherwise
 */
export function isCompanyUser(user: User | null): boolean {
  if (!user || !user.email) {
    return false;
  }

  return user.email.toLowerCase().endsWith(`@${COMPANY_EMAIL_DOMAIN}`);
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

