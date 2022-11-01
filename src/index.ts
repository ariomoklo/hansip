import type { CookieOptions, CookieSession, SessionValue } from "./types"
import * as cookie from 'cookie';

export * from './satpam';
export { serializeCookie, parseCookies } from './utility';

export const createCookieSession = (opts: {
    tokenName: string,
    refreshName?: string,
    cookie?: string,
    cookieOptions?: CookieOptions
} = { tokenName: 'token', cookie: '', cookieOptions: {} }): CookieSession => {
    const session: SessionValue = { token: undefined, refresh: undefined }
    if (typeof opts.cookie === 'string' && opts.cookie !== '') {
        const cookies = cookie.parse(opts.cookie, opts.cookieOptions as cookie.CookieParseOptions);
        if (cookies[opts.tokenName]) {
            session.token = cookies[opts.tokenName] !== '' ? cookies[opts.tokenName] : undefined
        }
        if (opts.refreshName && typeof cookies[opts.refreshName] === 'string') {
            session.refresh = cookies[opts.refreshName] !== '' ? cookies[opts.refreshName] : undefined
        }
    }

    return {
        get: () => session,
        has: (key: 'token' | 'refresh') => {
            if (key === 'token') return session.token !== ''
            if (typeof session.refresh === 'string') return session.refresh !== ''
            return false
        },
        set: (token: string, refresh: string | undefined) => {
            session.token = token !== '' ? token : undefined
            session.refresh = refresh
        },
        serialize: {
            token: () => {
                if (typeof session.token !== 'string' || session.token === '') return ''
                return cookie.serialize(opts.tokenName, session.token, opts.cookieOptions)
            },
            refresh: () => {
                if (typeof opts.refreshName !== 'string' || opts.refreshName === '') return ''
                if (typeof session.refresh !== 'string' || session.refresh === '') return ''
                return cookie.serialize(opts.refreshName, session.refresh, opts.cookieOptions)
            }
        }
    }
}

export const detectURL = (url: URL, opts: { tokenName: string, refreshName?: string } = { tokenName: 'token ' }) => {
    const params = url.searchParams
    const session: SessionValue = { token: undefined, refresh: undefined }

    const token = params.get(opts.tokenName)
    session.token = token ? token : undefined

    if (typeof opts.refreshName === 'string') {
        session.refresh = params.get(opts.refreshName) ?? undefined
    }

    return session
}