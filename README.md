# Hansip

Authorization library for building SSR app.

Hansip adalah authorisasi library. Konsep dari hansip adalah authentikasi haruslah berasal dari API dan aplikasi front-end hanya melakukan authorisasi terhadap token yang diberikan oleh API. Hansip akan mencari token dalam cookie / header / url mengikuti kebutuhan mu.

>
> this package is not stable.
>
> use with your own risk.
> 

## Usage

>
> install hansip as dependency
>
> `npm install hansip` | `yarn add hansip` | `pnpm add hansip`
>

### createCookieSession

``` ts
import { createCookieSession } from 'hansip'

// get your cookie
const cookie = request.headers.get('cookie')
const session = createCookieSession({
  cookie: cookie,
  tokenName: 'token'      // cookie name for jwt token.
  refreshName: 'refresh'  // token refresh name. optional
  cookieOptions: { 
    /**
      
      check cookie.serialize options for detailed info
      @link https://www.npmjs.com/package/cookie

      domain?: string | undefined,
      expires?: Date | undefined,
      httpOnly?: boolean | undefined,
      maxAge?: number | undefined,
      path?: string | undefined,
      priority?: 'low' | 'medium' | 'high' | undefined,
      sameSite?: true | false | 'lax' | 'strict' | 'none' | undefined,
      secure?: boolean | undefined,
    */
  }
})

const { token } = session.get()

// do anything you want with token.
if (!token) {
  // redirect on token not found or validation false
  return redirect()
}

response.headers.set('Set-Cookie', session.serialize.token())
response.headers.set('Set-Cookie', session.serialize.refresh())
// send response with token in cookie

```

### detectURL

``` ts
import { detectURL } from 'hansip'

const session = createCookieSession({ tokenName: 'token' })
const url = new URL(request.url, 'http://localhost')

const validate = detectURL(url, { tokenName: 'access_token', refreshName: 'refresh_token' })
if (validate.token) {
  
  // do anything you want with token and refresh token

  session.set(validate.token, validate.refresh)
  response.headers.set('Set-Cookie', session.serialize.token())
  response.headers.set('Set-Cookie', session.serialize.refresh())

  // send response
}

// redirect on token undefined
```