import { describe, expect, test } from "vitest";
import { createCookieSession } from "./../src/index"

describe('createCookieSession test', () => {
    const cookies = createCookieSession({
        tokenName: 'satpam',
        cookie: 'satpam=jwt.token; crsf=any;'
    })

    test ('return type is object', () => {
        expect(cookies).toBeTypeOf('object')
    })

    test ('has property of satpam', () => {
        expect(cookies.get()).toHaveProperty('token')
    })
})