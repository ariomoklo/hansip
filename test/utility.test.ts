import { expect, it, test } from "vitest";
import { parseCookies, serializeCookie } from "./../src/utility"

test('parseCookie utility test return object', () => {
    const cookies = parseCookies('satpam=jwt.token; crsf=any;')

    it ('return type is object', () => {
        expect(cookies).toBeTypeOf('object')
    })

    it ('has property of satpam', () => {
        expect(cookies).toHaveProperty('satpam')
    })
})

test('serializeCookie utility test return cookie format', () => {
    
    const cookie = serializeCookie('satpam', 'jwt.token', { 
        path: '/',
        maxAge: 3600,
        secure: true,
        httpOnly: true,
        sameSite: true
    })

    const cookies = parseCookies(cookie)

    it ('return type is a string', () => {
        expect(cookie).toBeTypeOf('string')
    })

    it ('has property of satpam', () => {
        expect(cookies).toHaveProperty('satpam')
    })
})