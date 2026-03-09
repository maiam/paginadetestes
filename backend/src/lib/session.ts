import { env } from './env.js';

export const SESSION_COOKIE = 'app_session';
export const OAUTH_STATE_COOKIE = 'oauth_state';

export function setCookie(
  name: string,
  value: string,
  options: { maxAgeSeconds?: number; clear?: boolean } = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (env.NODE_ENV === 'production') parts.push('Secure');
  if (options.clear) parts.push('Max-Age=0');
  if (options.maxAgeSeconds) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  return parts.join('; ');
}
