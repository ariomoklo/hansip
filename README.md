# Hansip

Authorization library for building SSR app.

Hansip adalah authorisasi library. Konsep dari hansip adalah authentikasi haruslah berasal dari API dan aplikasi front-end hanya melakukan authorisasi terhadap token yang diberikan oleh API. Hansip akan mencari token dalam cookie / header / url mengikuti kebutuhan mu.

## Usage

>
> install hansip as dependency
>
> `npm install hansip` | `yarn add hansip` | `pnpm add hansip`
>

### Astro example

```astro
---
// Astro example
import { Satpam } from 'hansip'

/** 
 * create satpam instance with unique prefix.
 * you can create many satpam instance.
 */
const satpam = new Satpam("uniquePrefix")

const cookies = Astro.request.headers.get('cookie') ?? ''
const session = await satpam.onCookies(cookies, async (token: string) => {

  /**
   * This is validation hook
   * you can do token validation here.
   * 
   * you can return new token here if you want:
   * token = 'new token'
   * return token
   */

  /** do token validation */
  if (token) {
    const user = await axios.get('/user/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (user) return token
    else return null
  }

  return null
})

/** redirect on login */
if (!session.status) {
  return Astro.redirect('/login')
}

/** set cookie to response */
Astro.response.headers.set('Set-Cookie', session.serialized)

---

<h1>Private Page: Hello World!</h1>
```

### Nuxt.js example

```js
// auth/hansip.js

import { Satpam } from "hansip"
import axios from "axios"

export default async function (req, res, next) {
  
  const satpam = new Satpam("hansip")
  const session = await satpam.onCookies(req.headers['cookie'], async (token) => {
    
    if (token) {
      const user = await axios.get('/user/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (user) return token
      else return null
    }

    return null
  })

  if (token) {
    return res.redirect('/login')
  }

  res.headers['cookie'] = session.serialized
  next()
}
```

then don't forget to add `auth/hansip.js` to nuxt.config.js

```js
export default {
  {
    serverMiddleware: ['~/auth/hansip']
  }
}
```