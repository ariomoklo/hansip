import { CookieSerializeOptions } from 'cookie';
import { parseCookies, serializeCookie } from './utility';

export type OnValidationReturn = string | undefined | null;

/** Hook for validating token */
export type validationFunction = (token: string) => OnValidationReturn | Promise<OnValidationReturn>;

export type SatpamSession = {
  /** current session status */
  status: boolean;

  /** raw token */
  token: string;

  /** cookie serialized token */
  serialized: string;
};

export type SatpamOptions = {
  /** cookie name */
  name?: string;

  /**
   * cookie options for cookie npm lib
   * @link https://www.npmjs.com/package/cookie
   */
  cookieOptions?: CookieSerializeOptions;

  /**
   * onValidation async hook.
   *
   * called after token check. for you to validate the token.
   * @param {string} token
   * @return string | undefined | null
   */
  onValidation?: validationFunction;
};

export class Satpam {
  /** found token */
  private _token: string;

  /** identifier for satpam instance */
  private _prefix: string;

  /** cookie name */
  private _name: string;

  private _cookieOptions: CookieSerializeOptions;

  private _validationHook: validationFunction;

  /**
   *
   * @param prefix cookie prefix
   * @param options stapam options
   */
  constructor(prefix: string, options: SatpamOptions = {}) {
    this._prefix = prefix;
    this._name = options.name ?? 'satpam';
    this._cookieOptions = options.cookieOptions ?? {};
    this._validationHook = options.onValidation ?? null;
  }

  /** cookie max age setter */
  public set maxAge(value: number) {
    this._cookieOptions.maxAge = value;
  }

  /** cookie expired date setter */
  public set expires(value: Date) {
    this._cookieOptions.expires = value;
  }

  /** cookie options setter */
  public set httpOnly(value: boolean) {
    this._cookieOptions.httpOnly = value;
  }

  /** cookie options setter */
  public set priority(value: 'low' | 'medium' | 'high') {
    this._cookieOptions.priority = value;
  }

  /** cookie options setter */
  public set sameSite(value: true | false | 'lax' | 'strict' | 'none') {
    this._cookieOptions.sameSite = value;
  }

  /** cookie options setter */
  public set secure(value: boolean) {
    this._cookieOptions.secure = value;
  }

  /** full cookie name getter */
  public get cookieName(): string {
    return [this._prefix, this._name].join('.');
  }

  /** cookie name getter */
  public get name(): string {
    return this._name;
  }

  /**
   * session getter
   * @type { status: boolean, token: string, serialized: string }
   */
  public get session(): SatpamSession {
    return {
      token: this._token,
      status: this._token ? true : false,
      serialized: this._serializeToken(),
    };
  }

  /** serializing current token */
  private _serializeToken(): string {
    if (!this._token) return '';
    return serializeCookie(this.cookieName, this._token, this._cookieOptions);
  }

  /**
   * utility for processing token to session
   *
   * @private
   * @param {string} token
   * @return {*}  {Promise<SatpamSession>}
   * @memberof Satpam
   */
  private async _processToken(token: string): Promise<SatpamSession> {
    if (typeof this._validationHook === 'function') {
      token = (await this._validationHook(token)) ?? '';
    }

    if (token) {
      this._token = token;
      return {
        token,
        status: true,
        serialized: this._serializeToken(),
      };
    }

    return { status: false, serialized: '', token };
  }

  /**
   * Satpam scaning cookie string for token
   *
   * @param {string} cookies
   * @param {validationFunction} [onValidation=null]
   * @return {*}  {Promise<SatpamSession>}
   * @memberof Satpam
   */
  public async onCookies(cookies: string, onValidation: validationFunction = null): Promise<SatpamSession> {
    /** parsing cookies */
    const parsed = parseCookies(cookies);
    let token = parsed[this.cookieName];

    if (typeof onValidation === 'function') {
      token = (await onValidation(token)) ?? '';
    }

    return this._processToken(token);
  }

  /**
   * Satpam checking headers for token
   *
   * @param {string} name
   * @param {(object)} headers
   * @param {validationFunction} [onValidation=null]
   * @return {*}  {Promise<SatpamSession>}
   * @memberof Satpam
   */
  public async onHeaders(
    name: string,
    headers: object | Headers,
    onValidation: validationFunction = null,
  ): Promise<SatpamSession> {
    // if headers name is cookie.. lol
    if (name.includes('cookie')) {
      return await this.onCookies(headers[name]);
    }

    let token: string = '';

    // check if headers instanceof Headers / fetch.Headers
    if (typeof headers['has'] === 'function') {
      if (headers['has'](name)) token = headers['get'](name);
    }

    if (headers[name]) {
      token = headers[name];
    }

    if (typeof onValidation === 'function') {
      token = (await onValidation(token)) ?? '';
    }

    return this._processToken(token);
  }

  /**
   * Satpam parse and checking url for token
   *
   * @param {string} name
   * @param {(string | URL)} url
   * @param {validationFunction} [onValidation=null]
   * @return {*}  {Promise<SatpamSession>}
   * @memberof Satpam
   */
  public async onUrl(name: string, url: string | URL, onValidation: validationFunction = null): Promise<SatpamSession> {
    let token: string = '';

    if (typeof url === 'string') {
      // check on url queries
      if (url.includes('?')) {
        const [_, queries] = url.split('?');
        if (queries !== '') {
          token = this._urlParamCheck(queries, name) ?? '';
        }
      }

      // check on url hash
      if (url.includes('#')) {
        const [_, queries] = url.split('#');
        if (queries !== '') {
          token = this._urlParamCheck(queries, name) ?? '';
        }
      }
    } else if (url instanceof URL) {
      const queries = url.searchParams;
      if (queries.has(name)) {
        token = queries.get(name) ?? '';
      } else {
        const hash = url.hash;
        if (hash !== '') {
          token = this._urlParamCheck(hash, name) ?? '';
        }
      }
    }

    if (typeof onValidation === 'function') {
      token = (await onValidation(token)) ?? '';
    }

    return this._processToken(token);
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
      return parsed[key];
    }

    return '';
  }
}
