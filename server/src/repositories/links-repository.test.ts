import { describe, expect, it } from "vitest"

import { isUniqueViolation } from "./links-repository.js"

function drizzleQueryError(code: string) {
  return new Error("Failed query", { cause: { code } })
}

describe("isUniqueViolation", () => {
  it("returns true when cause.code is 23505", () => {
    expect(isUniqueViolation(drizzleQueryError("23505"))).toBe(true)
  })

  it("returns true when top-level code is 23505", () => {
    const error = new Error("duplicate")
    ;(error as { code?: string }).code = "23505"
    expect(isUniqueViolation(error)).toBe(true)
  })

  it("returns false for other error codes", () => {
    expect(isUniqueViolation(drizzleQueryError("22P02"))).toBe(false)
  })

  it("returns false for non-error values", () => {
    expect(isUniqueViolation("23505")).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation({ code: "23505" })).toBe(false)
  })

  it("returns false for errors without cause or code", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false)
  })
})
