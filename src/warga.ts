import { Abilities, Ability } from './abilities';
export class Warga<T = object> {
  public meta: T;
  private _abilities: Abilities;

  constructor(abilities: Abilities | string[], meta: T = {} as T) {
    this.meta = meta;

    if (abilities instanceof Abilities) {
      this._abilities = abilities;
    } else {
      this._abilities = new Abilities();
      this._abilities.import(abilities);
    }
  }

  public get abilities() {
    return this._abilities;
  }

  public on(path: string) {
    return this._abilities.get(path);
  }

  public gain(...abilities: Ability[] | string[]) {
    if (typeof abilities[0] !== 'string') {
      this._abilities.push(...(abilities as Ability[]));
    }
    this._abilities.import(abilities as string[]);
  }
}
