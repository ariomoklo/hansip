import { expect, it, test } from "vitest";
import MockReq from 'mock-req';
import MockRes from 'mock-res';
import { Satpam } from "./../src/index";

const noToken = {
    method: 'GET',
    url: 'http://localhost:8000/'
}

const withToken = {
    method: 'GET',
    url: 'http://localhost:8000/',
    headers: {
		'Set-Cookie': 'satpam=jwt.token; any=any;'
	},
}

test('Satpam verify has no token', () => {
    const request = new MockReq(noToken)
    const response = new MockRes()

    const satpam = new Satpam(request, response)
    const { status, token } = satpam.verify()

    it ('has status false', () => {
        expect(status).toBeFalsy()
    })

    it ('has empty string token', () => {
        expect(token).toEqual('')
    })
})

test('Satpam verify has token on cookie', () => {
    const request = new MockReq(withToken)
    const response = new MockRes()

    const satpam = new Satpam(request, response)
    const { status, token } = satpam.verify()

    it ('has status true', () => {
        expect(status).toBeTruthy()
    })

    it ('has token string \"jwt.token\"', () => {
        expect(token).toEqual('jwt.token')
    })
})