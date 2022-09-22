import { Warga } from "./warga";

/** action can be any key string for a single action like read/write/insert/update/delete/remove etc. */
export type Action = 'read' | 'write' | 'insert' | 'update' | 'delete' | string;

export type AbilitiesOptions = {
  /** root path. default to @ */
  root: string;
  /** default actions. default to read, write, delete */
  actions?: Action[];
  /** ignoring invalid token when import. */
  ignoreInvalidToken?: boolean;
};

/** default value for abilities options */
export const AbilitiesOptionsDefault = {
  root: '@',
  actions: ['read', 'write', 'delete'],
  ignoreInvalidToken: false,
};

/**
 * utility function for shifting path to given root
 * @param {string} path
 * @param {string} root
 * @return {string} new path 
 */
export function shiftPath(path: string, root: string) {
  const branch = path.split('/');
  const indexRoot = branch.indexOf(root);
  if (indexRoot < 0) return '';
  return branch.slice(indexRoot).join('/');
}

/**
 * utility function for validating token
 * @param {string} token
 * @param {string} [root='']
 * @return {*}  {{
 *   result: boolean;
 *   code: string;
 *   message: string;
 *   parsed?: { parent: string[]; key: string; actions: Action[] };
 * }}
 */
export function validateToken(
  token: string,
  root: string = '',
): {
  result: boolean;
  code: string;
  message: string;
  parsed?: { parent: string[]; key: string; actions: Action[] };
} {
  // split token with "/" as branch.
  const branch = token.split('/');

  // end of the branch will be leaf.
  const leaf = branch.pop();

  // check root
  if (root.length > 0 && branch[0] !== root) {
    return {
      result: false,
      code: branch.includes(root) ? 'has-root' : 'no-root',
      message: `${root} has to be root.`,
    };
  }

  // no leaf means token is not formated correctly.
  if (!leaf) {
    return {
      result: false,
      code: 'leaf',
      message: 'token not formated correctly',
    };
  }

  // split leaf key:action1:action2
  let [key, ...actions] = leaf.split(':');

  // key falsy. token not formated correctly.
  if (!key) {
    return {
      result: false,
      code: 'key',
      message: 'ability key not found',
    };
  }

  // has no action
  if (actions.length === 0) {
    return {
      result: false,
      code: 'action',
      message: 'ability has no action',
    };
  }

  // token pass
  return {
    result: true,
    code: 'valid',
    message: 'token validated',
    parsed: { parent: branch, key, actions },
  };
}

export class Ability {
  public key: string;
  public parent: string;
  public actions: Action[];

  /**
   * Creates an instance of Ability.
   * @param {string} path
   * @param {Action[]} actions
   */
  constructor(path: string, actions: Action[]) {
    /** set ability actions */
    this.actions = actions;

    if (path.includes(':')) {
      /** parse path as a token */
      this._detokenize(path);
    } else if (path.includes('/')) {
      /** parse path to parent and key string */
      const branch = path.split('/');
      this.key = branch.pop() ?? '';

      if (!this.key) {
        const tokenized = `${path}:${actions}`;
        throw new Error(`Hansip: ability token error on [${tokenized}]`);
      }

      if (branch.length > 0) {
        this.parent = branch.join('/');
      }
    } else {
      /** no parent */
      this.key = path;
    }
  }

  private _detokenize(token: string) {
    const valid = validateToken(token);
    const ability = valid.parsed;

    if (valid.result && typeof ability === 'object') {
      this.key = ability.key;
      this.gain(...ability.actions);
      if (ability.parent.length > 0) {
        this.parent = ability.parent.join('/');
      }

      return;
    }

    throw new Error(`Hansip: detokenize error on [${token}][${valid.code}:${valid.message}]`);
  }

  public get root(): string {
    return this.path.split('/')[0]
  }

  public set root(root: string) {
    if (this.parent) {
      let parent = this.parent
      parent = shiftPath(parent, root)
      if (parent === "") {
        parent = `${root}/${this.parent}`
      }

      this.parent = parent
      return
    }
    
    this.parent = root
    return
  }

  public get path(): string {
    if (!this.parent) return this.key;
    return `${this.parent}/${this.key}`;
  }

  public get token(): string {
    return `${this.path}:${this.actions.join(':')}`;
  }

  /**
   * shift path to start from. return new ability object
   * and this ability is not changed. when no root given, will shift to no parent.
   *
   * @param {string} [root=""]
   */
  public shift(root: string = ''): Ability {
    if (!this.parent && root) {
      // return new ability with root as parent
      return new Ability(`${root}/${this.key}`, this.actions);
    }

    if (root) {
      const parent = shiftPath(this.path, root);
      if (parent) {
        // return new ability with new path
        return new Ability(parent, this.actions);
      }
    }

    // this ability has no parent and root is not given
    return this;
  }

  /**
   * check if ability path has an actions
   * @param {string} action
   * @return {boolean}
   */
  public has(action: string): boolean {
    return this.actions.includes(action);
  }

  /**
   * check if ability has any given actions
   * @param actions
   * @returns boolean
   */
  public hasAny(...actions: string[]): boolean {
    return actions.map(act => this.has(act)).reduce((prev, curr) => prev || curr)
  }
  
  /**
   * check if ability has all given actions
   * @param actions
   * @returns boolean
   */
  public hasAll(...actions: string[]): boolean {
    return actions.map(act => this.has(act)).reduce((prev, curr) => prev && curr)
  }

  /**
   * add another action to ability
   * @param {...string[]} actions
   */
  public gain(...actions: string[]) {
    // removing duplicates
    this.actions = [...new Set([...this.actions, ...actions])];
  }

  /**
   * remove action from ability
   * @param {string} action
   * @return {boolean}
   */
  public remove(action: string): boolean {
    if (!this.has(action)) return false;
    this.actions = this.actions.filter((act) => act !== action);
    return true;
  }
}

export class Abilities {
  private _abilities: Map<string, Ability>;

  private _root: string;

  private _actions: string[];

  private ignoreInvalid: boolean;

  /**
   * Creates an instance of Abilities.
   * @param {AbilitiesOptions} [options=AbilitiesOptionsDefault]
   * @memberof Abilities
   */
  constructor(options: AbilitiesOptions = AbilitiesOptionsDefault) {
    this._abilities = new Map();
    this._root = options.root;
    this._actions = options.actions ?? AbilitiesOptionsDefault.actions;
    this.ignoreInvalid = options.ignoreInvalidToken ?? AbilitiesOptionsDefault.ignoreInvalidToken;
  }

  private _cutPath(path: string | string[], root: string = '') {
    if (!root) root = this._root;
    if (typeof path !== 'string') {
      path = path.join('/');
    }

    const newpath = shiftPath(path, root);
    if (!newpath) return undefined;
    return newpath;
  }

  private _validateToken(token: string, root: string) {
    const valid = validateToken(token, root);
    if (!valid.result && valid.code !== 'has-root') {
      if (!this.ignoreInvalid) {
        throw new Error(`Unvalid Token: ${valid.message} [${token}]`);
      }
    }

    if (valid.code === 'has-root') {
      token = shiftPath(token, this._root);
      valid.result = true;
      valid.message = 'token validated';
    }

    return { ...valid, token };
  }

  /**
   * import abilities from array tokens.
   * @param {string[]} abilities
   */
  public import(abilities: string[]) {
    abilities.forEach((token) => {
      const v = this._validateToken(token, this._root);
      if (!v.result) return;

      let ability = new Ability(v.token, []);
      if (this.exist(ability.path)) {
        const found = this.get(ability.path);
        found.gain(...ability.actions);
      } else {
        this._abilities.set(ability.path, ability);
      }
    });
  }

  /**
   * export current abilities to array token
   * @param {string} [root='']
   * @param {boolean} [compact=true]
   * @return {*}  {string[]}
   */
  public export(root: string = '', compact = true): string[] {
    const tokens: string[] = [];

    if (compact) {
      for (let [path, value] of this._abilities) {
        const rootPath = this._cutPath(path, root);
        if (rootPath === undefined) break;

        tokens.push([rootPath, ...value.actions].join(':'));
      }
    } else {
      for (let [path, value] of this._abilities) {
        const rootPath = this._cutPath(path, root);
        if (rootPath === undefined) break;

        tokens.push(...value.actions.map((acts) => `${rootPath}:${acts}`));
      }
    }

    return tokens;
  }

  public get count(): number {
    return this._abilities.size;
  }

  /**
   * add new ability or set new action for existed abilities
   * @param {string} path
   * @param {...string[]} actions
   * @memberof Abilities
   */
  public add(path: string, ...actions: string[]) {
    // add root to path if needed
    if (path.split('/')[0] !== this._root) {
      path = [this._root, path].join('/');
    }

    // set default actions if needed
    if (actions.length === 0 || actions.includes('all')) {
      actions = this._actions;
    }

    let ability = new Ability(path, actions);
    if (this.exist(path)) {
      const found = this.get(path);
      found.gain(...ability.actions);
    } else {
      this._abilities.set(path, ability);
    }
  }

  /**
   * push/insert new ability
   * @param {...Ability[]} abilities
   * @memberof Abilities
   */
  public push(...abilities: Ability[]) {
    abilities.forEach(ability => {
      if (ability.root !== this._root) {
        ability.root = this._root
      }

      if (this.exist(ability.path)) {
        const found = this.get(ability.path);
        found.gain(...ability.actions);
      } else {
        this._abilities.set(ability.path, ability)
      }
    })
  }

  /**
   * check if ability path exist
   * @param {string} path
   * @memberof Abilities
   */
  public exist(path: string) {
    // add root to path if needed
    if (path.split('/')[0] !== this._root) {
      path = `${this._root}/${path}`;
    }

    const ability = this._abilities.get(path)
    return ability !== undefined
  }

  /**
   * get ability by path
   * @param {string} path
   * @memberof Abilities
   */
  public get(path: string) {
    // add root to path if needed
    if (path.split('/')[0] !== this._root) {
      path = `${this._root}/${path}`;
    }

    const ability = this._abilities.get(path);

    /**
     * check if ability has an action
     * @param action
     * @returns boolean
     */
    const has = (action: string) => {
      return ability?.has(action) ?? false
    }

    /**
     * check if ability has any given actions
     * @param {...string[]} actions
     * @return boolean
     */
    const hasAny = (...actions: string[]) => {
      return ability?.hasAny(...actions) ?? false
    }

    /**
     * check if ability has all given actions
     * @param {...string[]} actions
     * @returns boolean
     */
    const hasAll = (...actions: string[]) => {
      return ability?.hasAll(...actions) ?? false
    }

    /**
     * give ability new action
     * @param actions
     */
    const gain = (...actions: string[]) => {
      if (ability) {
        ability.gain(...actions)
        this._abilities.set(ability.path, ability)
      }
    }

    /**
     * add new sub ability from current ability path
     * @param path 
     * @param actions
     */
    const add = (path: string, ...actions: string[]) => {
      if (!ability) return undefined
      path = `${ability.path}/path`
      this.add(path, ...actions)
      return this.get(path)
    }

    return { has, hasAny, hasAll, gain, add };
  }

  /**
   * install abilities to new user
   *
   * @param {T} meta user data
   * @memberof Abilities
   */
  public setupUser<T=any>(meta: T) {
    return new Warga(this, meta)
  }
}
