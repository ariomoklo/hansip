import type{ CookieParseOptions, CookieSerializeOptions } from "cookie";
import * as cookie from 'cookie';

export function parseCookies(
    cookies?: string | object | null,
    options?: CookieParseOptions
) {
    if (typeof cookies === 'string') {
        return cookie.parse(cookies, options);
    } else if (typeof cookies === 'object' && cookies !== null) {
        return cookies;
    } else {
        return {};
    }
}

export function serializeCookie(name: string, token: string, options?: CookieSerializeOptions) {
    return cookie.serialize(name, token, options)
}