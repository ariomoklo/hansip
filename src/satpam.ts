import type { CookieSerializeOptions } from 'cookie';
import { parseCookies, serializeCookie } from './utility';

export type OnVerifyHookReturn = string | undefined | null | boolean;

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

  constructor(
    req: { headers: object | Headers; url: string | URL },
    res: { headers: object | Headers },
    opt: SatpamOptions = {},
  ) {
    this.request = req;
    this.response = res;

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
   * @return {SatpamVerifyReturn} status, token
   * @memberof Satpam
   */
  private _urlParamCheck(params: string): SatpamSession {
    const parsed = params.split('&').reduce((acc, val) => ((acc[val[0]] = val[1]), acc), {});

    if (parsed[this.urlCheck]) {
      const token = parsed[this.urlCheck];
      return this._processToken(token);
    }

    return this._processToken('');
  }

  private _processToken(token: string): SatpamSession {
    if (token === '') {
      if (typeof this.hook === 'function') {
        // get result from hook
        const result = this.hook(token);

        // on result type string
        if (typeof result === 'string' && result !== '') {
          this.token = result;
          if (this.autoSetCookie) {
            this.setSession(this.token);
            return this.session;
          }

          return { status: true, token: this.token };
        }
      }

      return { status: false, token: '' };
    }

    this.token = token;
    if (this.autoSetCookie) {
      this.setSession(this.token);
      return this.session;
    }

    return { status: true, token: '' };
  }

  /**
   * Verify jwt token exist
   *
   * @param {OnVerifyHook} Hook on token found
   * @return {SatpamVerifyReturn} status, token
   * @memberof Satpam
   */
  public verify(cb: (token: string) => OnVerifyHookReturn = null): SatpamSession {
    const cookies = this.request.headers['cookie'];
    const cookie = parseCookies(cookies);

    const name = this.name;
    this.hook = cb;

    if (cookie[name]) {
      return this._processToken(cookie[name]);
    }

    /** return on url check empty */
    if (this.urlCheck === '' || !this.request.url) return this._processToken('');

    /** check on url string */
    if (typeof this.request.url === 'string') {
      const url = this.request.url;

      const [_, queries] = url.includes('#') ? url.split('#') : url.split('?');

      if (queries !== '') {
        return this._urlParamCheck(queries);
      }
    }

    /** check on url as URL instance */
    if (this.request.url instanceof URL) {
      const queries = this.request.url.searchParams;
      if (queries.has(this.urlCheck)) {
        this._processToken(queries[this.urlCheck]);
      }

      const hash = this.request.url.hash;
      if (hash !== '') {
        return this._urlParamCheck(hash);
      }
    }

    return this._processToken('');
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

    if (typeof this.response.headers['setHeader'] === 'function') {
      this.response.headers['setHeader']('Set-Cookie', cookieString);
      return cookieString;
    }

    if (this.response.headers instanceof Headers) {
      this.response.headers.set('Set-Cookie', cookieString);
      return cookieString;
    }

    // if on client side
    if ('window' in globalThis) {
      window.document.cookie = cookieString;
      return cookieString;
    } else {
      this.response.headers['Set-Cookie'] = cookieString;
      return cookieString;
    }
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
