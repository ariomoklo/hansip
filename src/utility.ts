import type { CookieParseOptions, CookieSerializeOptions } from 'cookie';
import * as cookie from 'cookie';

export function parseCookies(cookies?: string | object | null, options?: CookieParseOptions) {
  if (typeof cookies === 'string') {
    return cookie.parse(cookies, options);
  } else if (typeof cookies === 'object' && cookies !== null) {
    return cookies;
  } else {
    return {};
  }
}

export function serializeCookie(name: string, token: string, options?: CookieSerializeOptions) {

  const opts = {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    sameSite: true,           // set sameSite to strict
    ...options
  }

  return cookie.serialize(name, token, opts);
}
