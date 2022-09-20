import { describe, expect, test } from "vitest";
import MockReq from 'mock-req';
import { Satpam, SatpamSession } from "./../src/index";

const noTokenRequest = new MockReq({
    method: 'GET',
    url: 'http://localhost:8000/'
})

const withTokenRequest = new MockReq({
    method: 'GET',
    url: 'http://localhost:8000/?access_token=jwt.token',
    headers: {
        'Authorization': 'Bearer jwt.token',
		'Cookie': 'test.satpam=jwt.token; test.refresh=jwt.refresh;'
	},
})

function sessionWithTokenCheck(session: SatpamSession) {
    test ('has status true', () => {
        expect(session.status).toBeTruthy()
    })

    test ('has token string \"jwt.token\"', () => {
        expect(session.token).toEqual('jwt.token')
    })

    test ('serialized has test.satpam=jwt.token', () => {
        expect(session.serialized).toContain('test.satpam=jwt.token;')
    })
}

function sessionNoTokenCheck(session: SatpamSession) {
    test ('has status false', () => {
        expect(session.status).toBeFalsy()
    })

    test ('has empty string token', () => {
        expect(session.token).toEqual('')
    })
}

describe('Satpam on Cookie', () => {
    test('Satpam on cookie test has no token', async () => {
        const satpam = new Satpam("test")
        const session = await satpam.onCookies(noTokenRequest.headers['cookie'])
    
        sessionNoTokenCheck(session)
    })
    
    test('Satpam on cookie with token', async () => {
        const satpam = new Satpam("test")
        const session = await satpam.onCookies(withTokenRequest.headers['cookie'])
    
        sessionWithTokenCheck(session)
    })
})
 
describe('Satpam on URL', () => {
    test('Satpam on url with no token', async () => {
        const satpam = new Satpam("test")
        const session = await satpam.onUrl('access_token', noTokenRequest.url)
    
        sessionNoTokenCheck(session)
    })

    test('Satpam on url with token', async () => {
        const satpam = new Satpam("test")
        const session = await satpam.onUrl('access_token', withTokenRequest.url)
    
        sessionWithTokenCheck(session)
    })
})

describe('Satpam on Headers', () => {
    test('Satpam on headers with no token', async () => {
        const satpam = new Satpam("test")
        const session = await satpam.onHeaders(
            'Authorization', 
            noTokenRequest.headers, 
            ({ token, refresh }) => ({
                token: token?.replace('Bearer ', '') ?? '',
                refresh
            }))
    
        sessionNoTokenCheck(session)
    })
    
    test('Satpam on headers with token', async () => {
        const satpam = new Satpam("test")
        const session = await satpam.onHeaders(
            'Authorization', 
            withTokenRequest.headers, 
            ({ token, refresh }) => ({
                token: token?.replace('Bearer ', '') ?? '',
                refresh
            }))
    
        sessionWithTokenCheck(session)
    })

    test('Satpam on headers but cookie', async () => {
        const satpam = new Satpam("test")
        const session = await satpam.onHeaders('cookie', withTokenRequest.headers)
    
        sessionWithTokenCheck(session)
    })
})

describe('Global validation function', () => {
    test('Change token on global validation', async () => {
        const satpam = new Satpam("test", {
            onValidation: () => ({ token: "global.hook.token", refresh: "global.hook.refresh" }),
            name: 'testing',
            loginPath: "/login",
            homePath: "/"
        })

        const session = await satpam.onCookies(withTokenRequest.headers['cookie'])
        test ('has cookie name test.testing', () => {
            expect(satpam.cookieName).toEqual('test.testing')
        })

        test ('has token string \"global.hook.token\"', () => {
            expect(session.token).toEqual('global.hook.token')
        })

        test ('has cookie name test.testing', () => {
            expect(satpam.refreshCookie).toEqual('test.refresh')
        })

        test ('has token string \"global.hook.token\"', () => {
            expect(session.refresh?.token).toEqual('global.hook.refresh')
        })
    })
})