
export type Aksi = {
    key: string;
    acts: Array<string>;
}

export type Halaman = {
    path: string;
    title: string;
    actions: Array<Aksi>;
}

export class Warga {

    private _access: Array<string>

    constructor(access: Array<string>) {
        this._access = access
    }

    private _canAbility(pagePath: string) {}

    private _pageAccessable(pagePath: string) {}

    public has(path: string) {}
}

export class Akses {

    private _pages: Array<Halaman>

    public definePage(path: string, title: string, actions: Array<Aksi>) {
        const page: Halaman = { path, title, actions }
        this._pages.push(page)
    }

    public defineAction(key: string, acts: Array<string>){
        const action: Aksi = { key, acts }
        return action
    }

    public importRule(rules: Array<string>){}

    public exportRule(){}
}