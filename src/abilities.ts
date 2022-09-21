/** action can be any key string for a single action like read/write/insert/update/delete/remove etc. */
export type Action = 'read' | 'write' | 'insert' | 'update' | 'delete' | string;

export type AbilitiesOptions = {
  root: string;
  actions?: Array<Action>;
  ignodeInvalidToken?: boolean;
};

export const AbilitiesOptionsDefault = {
  root: '@',
  actions: ['read', 'write', 'delete'],
  ignodeInvalidToken: false,
};

export function shiftPath(path: string, root: string) {
  const branch = path.split('/');
  const indexRoot = branch.indexOf(root);
  if (indexRoot < 0) return '';
  return branch.slice(indexRoot).join('/');
}

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
  public actions: Array<Action>;

  constructor(path: string, actions: Array<Action>) {
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
      this.add(...ability.actions);
      if (ability.parent.length > 0) {
        this.parent = ability.parent.join('/');
      }

      return;
    }

    throw new Error(`Hansip: detokenize error on [${token}][${valid.code}:${valid.message}]`);
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
   * add another action to ability path
   * @param {...Array<string>} actions
   */
  public add(...actions: Array<string>) {
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

  private _actions: Array<string>;

  private ignoreInvalid: boolean;

  constructor(options: AbilitiesOptions = AbilitiesOptionsDefault) {
    this._abilities = new Map();
    this._root = options.root;
    this._actions = options.actions ?? AbilitiesOptionsDefault.actions;
    this.ignoreInvalid = options.ignodeInvalidToken ?? AbilitiesOptionsDefault.ignodeInvalidToken;
  }

  private _cutPath(path: string | Array<string>, root: string = '') {
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
   *
   * @param {Array<string>} abilities
   * @memberof Abilities
   */
  public import(abilities: Array<string>) {
    abilities.forEach((token) => {
      const v = this._validateToken(token, this._root);
      if (!v.result) return;

      let ability = new Ability(v.token, []);
      const found = this.get(ability.path);
      if (found) {
        found.add(...ability.actions);
        ability = found;
      }

      this._abilities.set(ability.path, ability);
    });
  }

  public export(root: string = '', compact = true): Array<string> {
    const tokens: Array<string> = [];

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

  public add(path: string, ...actions: Array<string>) {
    // add root to path if needed
    if (path.split('/')[0] !== this._root) {
      path = [this._root, path].join('/');
    }

    // set default actions if needed
    if (actions.length === 0 || actions.includes('all')) {
      actions = this._actions;
    }

    let ability = new Ability(path, actions);
    const found = this.get(path);
    if (found) {
      found.add(...ability.actions);
      ability = found;
    }
    this._abilities.set(path, ability);
  }

  public get(path: string) {
    // add root to path if needed
    if (path.split('/')[0] !== this._root) {
      path = [this._root, path].join('/');
    }

    const ability = this._abilities.get(path);
    if (!ability) return undefined;

    // TODO: create add function to add sub ability

    return ability;
  }
}
