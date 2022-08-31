# Hansip

Authorization library for building SSR app.

Hansip adalah authorisasi library. Konsep dari hansip adalah authentikasi haruslah berasal dari API dan aplikasi front-end hanya melakukan authorisasi terhadap token yang diberikan oleh API. Hansip akan mencari token pada http request dan menyimpannya dalam cookie.

## Usage

> install hansip as dependency
>
> `npm install hansip` | `yarn add hansip` | `pnpm add hansip`

### Express example

```ts
// express simple setup
import { Satpam } from 'hansip'

app.use(async (req, res) => {
  const satpam = new Satpam(req, res)
  const { status, token } = await satpam.verify()

  if (status) {
    return res.redirect('/home')
  } else {
    return res.redirect('login')
  }
})

```

### Astro example

```astro
---
// Astro example
import { Satpam } from 'hansip'

const satpam = new Satpam(Astro.request, Astro.response, {
    
  // cookie name. default to 'satpam'
  name: 'jwt'   
  
  // if urlCheck provided, satpam will read url for parameter 'access_token'
  urlCheck: 'access_token'

  // always set cookie instanly when token found
  autoSetCookie: true
})

const { status, token } = await satpam.verify(async (token: string) => {
  // do anything with token. if token not found, will be set as ''
  // you can return new token here if you want:
  // token = 'new token'
  // return token

  // or do token check
  if (token) {
    const user = await axios.get('/user/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (user) return token
    else return null
  }

  // after returning updated token,
  // satpam will set token to cookie 'jwt'
  // based on configuration name and autoSetCookie
  return null
})

if (!status) {
  Astro.redirect('/login')
}

---

<h1>Private Page: Hello World!</h1>
```

### Nuxt.js example

```js
// auth/hansip.js

import { Satpam } from "hansip"
import axios from "axios"

export default async function (req, res, next) {
  
  const satpam = new Satpam(req, res)
  const { status, token } = await satpam.verify(async (token) => {
    
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