import { describe, expect, it, test } from "vitest";
import { Abilities } from "../src/abilities";

describe("Import & Export Test", () => {
    const abilities = new Abilities({ root: "app" })
    abilities.import([
        "app/list:read",
        "app/list:update",
        "app/user/settings:read:update",
        "outside/app/login:signin",
    ])

    test("import: has total 3 ability", () => {
        expect(abilities.count).toBe(3)
    })

    test("import: root on app. path before app removed", () => {
        const outside = abilities.get("outside/app/login")
        expect(outside).toBeUndefined()

        const ability = abilities.get("app/login")
        expect(ability?.has('signin')).toBeTruthy()
    })

    test("import: has app/list:read", () => {
        const ability = abilities.get("app/list")
        expect(ability?.has('read')).toBeTruthy()
    })
    
    test("import: has app/list:update", () => {
        const ability = abilities.get("app/list")
        expect(ability?.has('update')).toBeTruthy()
    })

    test("import: has app/user/settings:read:update", () => {
        const ability = abilities.get("app/user/settings")
        expect(ability?.has('read')).toBeTruthy()
        expect(ability?.has('update')).toBeTruthy()
    })

    test("export: compact mode", () => {
        const tokens = abilities.export()
        expect(tokens.length).toBe(3)
        expect(tokens.includes("app/list:read:update")).toBeTruthy()
        expect(tokens.includes("app/user/settings:read:update")).toBeTruthy()
    })

    test("export: compact mode false", () => {
        const tokens = abilities.export("", false)
        expect(tokens.length).toBe(5)
        expect(tokens.includes("app/list:read"))
        expect(tokens.includes("app/list:update"))
        expect(tokens.includes("app/user/settings:read"))
        expect(tokens.includes("app/user/settings:update"))
    })
})

describe("add ability", () => {
    const abilities = new Abilities()
    
    test("add abilities with defaul actions", () => {
        abilities.add("home")

        const ability = abilities.get("@/home")
        expect(ability).not.toBeUndefined()
        expect(ability?.has("read")).toBeTruthy()
        expect(ability?.has("write")).toBeTruthy()
        expect(ability?.has("delete")).toBeTruthy()
    })
})

describe("get ability", () => {
    const abilities = new Abilities()
    abilities.add("home", "read")
    abilities.add("settings")

    test("abilities can be called with no root attached", () => {
        expect(abilities.get("home")).not.toBeUndefined()
    })

    test("abilities has home with read action", () => {
        expect(abilities.get("@/home")?.has("read")).toBeTruthy()
    })

    test("abilities has settings with read, write, delete action", () => {
        expect(abilities.get("@/settings")?.has("read")).toBeTruthy()
        expect(abilities.get("@/settings")?.has("write")).toBeTruthy()
        expect(abilities.get("@/settings")?.has("delete")).toBeTruthy()
    })
})