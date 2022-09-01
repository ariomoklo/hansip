import { CookieSerializeOptions } from 'cookie';
import { parseCookies, serializeCookie } from './utility';

export type OnVerifyHookReturn = string | undefined | null;

export type SatpamSession = {
  status: boolean;
  token: string;
};

export type SatpamOptions = {
  /** cookie name, default: satpam */
  name?: string;

  /** insert url query or hash parameter name to include url check */
  urlCheck?: string;

  /** if true, set cookie automaticly on verify function when token found. default: true */
  autoSetCookie?: boolean;
};

export class Satpam {
  /** Request Headers */
  private request: { headers: object | Headers; url: string | URL };

  /** Response Headers */
  private response: { headers: object | Headers };

  /** found token */
  private token: string;

  /** cookie session */
  private session: SatpamSession;

  /** cookie name */
  private name: string;

  /** url param/hash to check */
  private urlCheck: string;

  /** hook on verify done */
  private hook: (token: string) => OnVerifyHookReturn;

  /** auto set cookie flag */
  private autoSetCookie: boolean;

  constructor(opt: SatpamOptions = {}) {
    this.name = opt.name ?? 'satpam';
    this.urlCheck = opt.urlCheck ?? '';
    this.autoSetCookie = opt.autoSetCookie ?? true;
    this.session = { status: false, token: '' };
  }

  /**
   * url parameter check utility
   *
   * @private
   * @param {string} params
   * @return {string} token
   * @memberof Satpam
   */
  private _urlParamCheck(params: string, key: string): string {
    const parsed = params
      .split('&')
      .map((item) => item.split('='))
      .reduce((acc, val) => ((acc[val[0]] = val[1]), acc), {});

    if (parsed[key]) {
      return parsed[key]
    }

    return ''
  }

  private async _processToken(token: string): Promise<SatpamSession> {
    if (token === '') {
      if (typeof this.hook === 'function') {
        // get result from hook
        const result = await this.hook(token);

        // on result type string
        if (typeof result === 'string' && result !== '') {
          this.token = result;
          if (this.autoSetCookie) {
            this.setSession(this.token);
            return this.session;
          } else {
            this.session = { status: true, token: this.token };
            return this.session;
          }
        }
      }

      this.session = { status: false, token: '' };
      return this.session;
    }

    if (typeof this.hook === 'function') {
      const result = await this.hook(token);
      if (result) token = result;
    }

    this.token = token;
    if (this.autoSetCookie) {
      this.setSession(this.token);
      return this.session;
    } else {
      this.session = { status: true, token: this.token };
      return this.session;
    }
  }

  private _cookie(cookies: string): string {
    const parsed = parseCookies(cookies)
    if (parsed[this.name]) {
      return parsed[this.name]
    }

    return ''
  }

  private _url(url: string | URL, key: string = null): string {

    // query / hash parameter key
    key = key ?? this.urlCheck ?? 'access_token'

    /** check on url string */
    if (typeof url === 'string') {

      // check on url queries
      if (url.includes('?')) {
        const [_, queries] = url.split('?');
        if (queries !== '') {
          return this._urlParamCheck(queries, key);
        }
      }

      // check on url hash
      if (url.includes('#')) {
        const [_, queries] = url.split('#');
        if (queries !== '') {
          return this._urlParamCheck(queries, key);
        }
      }
    }

    /** check on url as URL instance */
    if (url instanceof URL) {
      const queries = url.searchParams;
      if (queries.has(key)) {
        return queries[key];
      }

      const hash = url.hash;
      if (hash !== '') {
        return this._urlParamCheck(hash, key);
      }
    }

    return ''
  }

  // TODO:
  // bikin dua function untuk cek token
  // - async node(req, res, hook) => auto set pakai res
  // - async browser(hook) => auto set pakai window

  /**
   * Verify jwt token exist
   *
   * @param {OnVerifyHook} Hook on token found
   * @return {SatpamVerifyReturn} status, token
   * @memberof Satpam
   */
  public async verify(
    req: { headers: object | Headers; url: string | URL },
    hook: (token: string) => OnVerifyHookReturn = null
  ): Promise<SatpamSession> {

    // set hook function
    this.hook = hook;

    /** check on cookie */
    const cookie = this._cookie(req.headers['cookie'])
    if (cookie) return this._processToken(cookie)

    /** return on url check empty */
    if (this.urlCheck === '' || !req.url) return this._processToken('');

    /** check on url */
    const url = this._url(req.url, this.urlCheck)
    if (url) return this._processToken(url)

    return await this._processToken('');
  }

  /**
   * set session by adding token to response cookie header
   *
   * @param {string} [token=""]
   * @param {CookieSerializeOptions} [opt={}]
   * @return {string} string formated cookie
   * @memberof Satpam
   */
  public setSession(token: string = '', opt: CookieSerializeOptions = {}): string {
    /** return on token empty */
    token = token ?? this.token;
    if (!token) return;

    const cookieString = serializeCookie(this.name ?? 'satpam', token, opt);
    this.session = { status: true, token: this.token };

    const headers = this.response.headers;
    if (typeof headers === 'object') {
      if (Object.keys(headers).length === 0) {
        this.response.headers['Set-Cookie'] = cookieString;
        return cookieString;
      }

      if (this.response.headers instanceof Headers) {
        this.response.headers.set('Set-Cookie', cookieString);
        return cookieString;
      }

      if (typeof headers['setHeader'] === 'function') {
        this.response.headers['setHeader']('Set-Cookie', cookieString);
        return cookieString;
      }
    }

    // if on client side
    if ('window' in globalThis) {
      window.document.cookie = cookieString;
      return cookieString;
    }

    return cookieString;
  }

  /**
   * return current session
   *
   * @return {SatpamSession} session
   * @memberof Satpam
   */
  public getSession() {
    return this.session;
  }
}
