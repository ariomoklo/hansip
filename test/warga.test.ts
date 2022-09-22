import { describe, expect, test } from "vitest";
import { Abilities } from "../src/abilities";
import { Warga } from "../src/warga";

const abilities = new Abilities()
abilities.add("archer", "rapid-shot")
abilities.add("archer/sniper", "eagle-eye")

describe("warga: meta check", () => {

    const user = new Warga(abilities, { id: "onepiece", name: "usopp" })

    test("user has meta id, name", () => {
        expect(user.meta.id).toBe("onepiece")
        expect(user.meta.name).toBe("usopp")
    })

    test("usop has rapid-shot", () => {
        expect(user.on("archer").has("rapid-shot"))
    })

    test("change user meta name to goku", () => {
        user.meta.name = "sogeking"
        expect(user.meta.name).toBe("sogeking")
    })

    test("sogeking has eagle-eye", () => {
        expect(user.on("archer/sniper").has("eagle-eye"))
    })
})