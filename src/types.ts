export interface CookieOptions {
  domain?: string | undefined;
  expires?: Date | undefined;
  httpOnly?: boolean | undefined;
  maxAge?: number | undefined;
  path?: string | undefined;
  priority?: 'low' | 'medium' | 'high' | undefined;
  sameSite?: true | false | 'lax' | 'strict' | 'none' | undefined;
  secure?: boolean | undefined;
}

export type SessionValue = {
  token?: string;
  refresh?: string;
};

export type CookieSession = {
  get: () => SessionValue;
  set: (token: string, refreshToken?: string) => void;
  has: (key: 'token' | 'refresh') => boolean;
  serialize: {
    token: () => string;
    refresh: () => string;
  };
};
