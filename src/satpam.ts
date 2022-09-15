import { CookieSerializeOptions } from 'cookie';
import { parseCookies, serializeCookie } from './utility';

export type OnValidationData = {
  token: string | null | undefined,
  refresh: string | null | undefined
};

/** Hook for validating token */
export type validationFunction = (data: OnValidationData) => OnValidationData | Promise<OnValidationData>;

export type SatpamSession = {
  /** current session status */
  status: boolean;

  /** raw token */
  token: string;

  /** cookie serialized token */
  serialized: string;

  /** raw refresh token */
  refresh?: {
    token: string;
    serialized: string;
  };
};

export type SatpamOptions = {
  /** cookie name */
  name?: string;

  /** refresh token name */
  refresh?: string;

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

  /** refresh token */
  private _refreshToken: string;

  /** identifier for satpam instance */
  private _prefix: string;

  /** cookie name */
  private _name: string;

  private _refreshName: string;

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
    this._refreshName = options.refresh ?? 'refresh';
    this._cookieOptions = options.cookieOptions ?? {};
    this._validationHook = options.onValidation ?? null;

    // set default
    this._token = ''
    this._refreshToken = ''
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

  /** full refresh cookie name getter */
  public get refreshCookie(): string {
    return [this._prefix, this._refreshName].join('.');
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
      refresh: this.refresh ?? undefined
    };
  }

  public get refresh(): { token: string, serialized: string } {
    return {
      token: this._refreshToken,
      serialized: this._refreshToken ? serializeCookie(this._refreshName, this._refreshToken, this._cookieOptions) : ''
    }
  }

  /** serializing current token */
  private _serializeToken(): string {
    if (!this._token) return '';
    return serializeCookie(this.cookieName, this._token, this._cookieOptions);
  }

  private async _runHook(hook: validationFunction, token: string, refresh: string = '') {
    if (typeof hook === 'function') {
      const result = await hook({ token, refresh })
      return result
    }

    return { token, refresh }
  }

  /**
   * utility for processing token to session
   *
   * @private
   * @param {string} token
   * @return {*}  {Promise<SatpamSession>}
   * @memberof Satpam
   */
  private async _processToken(token: string, refresh: string = ''): Promise<SatpamSession> {
    const result = await this._runHook(this._validationHook, token, refresh)

    // set refresh if exist
    if (result.refresh) this._refreshToken = result.refresh;

    // set token if exist
    if (result.token) this._token = result.token;

    return this.session
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
    let token = parsed[this.cookieName] ?? this._token;
    let refresh = parsed[this.refreshCookie] ?? this._refreshToken;

    const result = await this._runHook(onValidation, token, refresh)
    return this._processToken(result.token, result.refresh);
  }

  /**
   * Satpam checking headers for token
   *
   * @param {string} name
   * @param {(object)} headers
   * @param {validationFunction} [onValidation=null]
   * @param {boolean} asRefresh set as refresh token
   * @return {*}  {Promise<SatpamSession>}
   * @memberof Satpam
   */
  public async onHeaders(
    name: string,
    headers: object | Headers,
    onValidation: validationFunction = null,
    asRefresh: boolean = false
  ): Promise<SatpamSession> {
    // if headers name is cookie.. lol
    if (name.includes('cookie')) {
      return await this.onCookies(headers[name]);
    }

    let token: string = this._token;
    let refresh: string = this._refreshToken;

    // check if headers instanceof Headers / fetch.Headers
    if (typeof headers['has'] === 'function') {
      if (headers['has'](name)) token = headers['get'](name);
    }

    if (headers[name]) {
      token = headers[name];
    }

    if (asRefresh) {
      refresh = token
      token = this._token
    }

    const result = await this._runHook(onValidation, token, refresh)
    return this._processToken(result.token, result.refresh);
  }

  /**
   * Satpam parse and checking url for token
   *
   * @param {string} name
   * @param {(string | URL)} url
   * @param {validationFunction} [onValidation=null]
   * @param {boolean} asRefresh set as refresh token
   * @return {*}  {Promise<SatpamSession>}
   * @memberof Satpam
   */
  public async onUrl(name: string, url: string | URL, onValidation: validationFunction = null, asRefresh: boolean = false): Promise<SatpamSession> {
    let token: string = this._token;
    let refresh: string = this._refreshToken;

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

    if (asRefresh) {
      refresh = token
      token = this._token
    }

    const result = await this._runHook(onValidation, token, refresh)
    return this._processToken(result.token, result.refresh);
  }
}
