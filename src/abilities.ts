
/** action can be any key string for a single action like read/write/insert/update/delete/remove etc. */
export type Action = "read" | "write" | "insert" | "update" | "delete" | string

export type Ability = {
    key: string;
    actions: Array<Action>;
}

export type AbilitiesOptions = {
    root: string;
    actions?: Array<Action>;
}

export const AbilitiesOptionsDefault = {
    root: "@",
    actions: ["read", "write", "delete"]
}

export class Abilities {

    private _abilities: Map<string, Ability>

    private _root: string

    private _actions: Array<string>

    constructor(options: AbilitiesOptions = AbilitiesOptionsDefault) {
        this._abilities = new Map()
        this._root = options.root
        this._actions = options.actions ?? AbilitiesOptionsDefault.actions
    }

    private _cutPath(path: string | Array<string>, root: string = "") {
        const split = typeof path === "string" ? path.split("/") : path
        const indexRoot = split.indexOf(!root ? this._root : root)
        if (indexRoot < 0) return undefined
        return split.slice(indexRoot).join("/")
    }

    private _parseToken(token: string, root: string = ""): { path: string, ability: Ability } | undefined {
        // split token with "/" as branch.
        const branch = token.split("/")

        // end of the branch will be leaf.
        const leaf = branch.pop()

        // joining branch to create root to parent path.
        const parent = this._cutPath(branch, root)

        // no leaf means token is not formated correctly.
        // and parent path has no desired root in it.
        if (parent === undefined || !leaf) return

        // split leaf key:action1:action2
        let [ key, ...actions ] = leaf.split(":")

        // key falsy. token not formated correctly.
        if (!key) return

        if (actions.length === 0 || actions.includes('all')) {
            actions = [...actions, ...this._actions]
        }

        let path = key
        if (parent) path = `${parent}/${path}`
        return { path, ability: { key, actions }}
    }

    public import(abilities: Array<string>){
        abilities.forEach(token => {
            const parsed = this._parseToken(token)
            if (parsed === undefined) return
            
            const ability = this.get(parsed.path)
            if (ability) {
                ability.add(...parsed.ability.actions)
            } else {
                this._abilities.set(parsed.path, parsed.ability)
            }
        })
    }

    public export(root: string = "", compact = true): Array<string> {
        const tokens: Array<string> = []
        
        if (compact) {
            for (let [path, value] of this._abilities) {
                const rootPath = this._cutPath(path, root)
                if (rootPath === undefined) break

                tokens.push([ rootPath, ...value.actions ].join(":"))
            }
        } else {
            for (let [path, value] of this._abilities) {
                const rootPath = this._cutPath(path, root)
                if (rootPath === undefined) break

                tokens.push(...value.actions.map(acts => `${rootPath}:${acts}`))
            }
        }

        return tokens
    }

    public get count (): number {
        return this._abilities.size
    }

    public add (path: string, ...actions: Array<string>) {

        // add root to path if needed
        if (path.split('/')[0] !== this._root) {
            path = [this._root, path].join('/')
        }

        // set default actions if needed
        if (actions.length === 0 || actions.includes('all')) {
            actions = this._actions
        }

        let ability: Ability

        if (path.includes(":")) {
            // path is a full token
            const parsed = this._parseToken(path)
            if (parsed === undefined) return
            parsed.ability.actions = [...parsed.ability.actions, ...actions]
            ability = parsed.ability
            path = parsed.path
        } else {
            // path is a branch path with no action to be a token
            const branch = path.split('/')
            const key = branch.pop() ?? path
            ability = { key, actions }
        }

        const current = this.get(path)
        if (current) {
            current.add(...ability.actions)
        } else {
            this._abilities.set(path, ability)
        }
    }

    public get (path: string) {
        // add root to path if needed
        if (path.split('/')[0] !== this._root) {
            path = [this._root, path].join('/')
        }

        const access = this._abilities.get(path)
        if (!access) return undefined

        /**
         * check if ability path has an actions
         *
         * @param {string} action
         */
        const has = (action: string) => access.actions.includes(action)

        /**
         * TODO: rename to actions.add ?
         * add another action to ability path
         *
         * @param {string} action
         */
        const add = (...actions: Array<string>) => {
            // removing duplicates
            access.actions = [...new Set([ ...access.actions, ...actions])]
            this._abilities.set(path, access)
        }

        /**
         * TODO: rename to actions.remove ?
         * remove action from ability
         *
         * @param {string} action
         * @return {boolean} 
         */
        const remove = (action: string) => {
            if (!has(action)) return false
            access.actions = access.actions.filter(act => act !== action)
            this._abilities.set(path, access)
            return true
        }

        // TODO: create add function to add sub ability

        return { has, add, remove }
    }
}