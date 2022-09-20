import { describe, expect, test } from "vitest";
import { parseCookies, serializeCookie } from "./../src/utility"

describe('parseCookie utility test return object', () => {
    const cookies = parseCookies('satpam=jwt.token; crsf=any;')

    test ('return type is object', () => {
        expect(cookies).toBeTypeOf('object')
    })

    test ('has property of satpam', () => {
        expect(cookies).toHaveProperty('satpam')
    })
})

describe('serializeCookie utility test return cookie format', () => {
    
    const cookie = serializeCookie('satpam', 'jwt.token', { 
        path: '/',
        maxAge: 3600,
        secure: true,
        httpOnly: true,
        sameSite: true
    })

    const cookies = parseCookies(cookie)

    test ('return type is a string', () => {
        expect(cookie).toBeTypeOf('string')
    })

    test ('has property of satpam', () => {
        expect(cookies).toHaveProperty('satpam')
    })
})