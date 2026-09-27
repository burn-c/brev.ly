import { describe, expect, it } from "vitest"

import {
  generateShortCode,
  isValidShortCode,
  SHORT_CODE_ALPHABET,
  SHORT_CODE_LENGTH,
  SHORT_CODE_MAX_LENGTH,
  SHORT_CODE_REGEX,
} from "./short-code.js"

describe("isValidShortCode", () => {
  it("accepts valid codes", () => {
    expect(isValidShortCode("abc")).toBe(true)
    expect(isValidShortCode("AbC123")).toBe(true)
    expect(isValidShortCode("1234567890")).toBe(true)
  })

  it("rejects empty strings", () => {
    expect(isValidShortCode("")).toBe(false)
  })

  it("rejects codes with spaces", () => {
    expect(isValidShortCode("abc def")).toBe(false)
  })

  it("rejects codes with hyphens or underscores", () => {
    expect(isValidShortCode("abc-def")).toBe(false)
    expect(isValidShortCode("abc_def")).toBe(false)
  })

  it("rejects codes longer than the maximum length", () => {
    expect(isValidShortCode("12345678901")).toBe(false)
  })

  it("rejects codes with special characters", () => {
    expect(isValidShortCode("abc$")).toBe(false)
  })

  it("exposes the expected constants", () => {
    expect(SHORT_CODE_LENGTH).toBe(7)
    expect(SHORT_CODE_MAX_LENGTH).toBe(10)
    expect(SHORT_CODE_REGEX.source).toBe("^[a-zA-Z0-9]{1,10}$")
  })
})

describe("generateShortCode", () => {
  it("generates 7 characters by default", () => {
    expect(generateShortCode()).toHaveLength(SHORT_CODE_LENGTH)
  })

  it("generates a string with the requested length", () => {
    expect(generateShortCode(10)).toHaveLength(10)
    expect(generateShortCode(4)).toHaveLength(4)
  })

  it("only uses characters from the default alphabet", () => {
    const code = generateShortCode(100)
    for (const char of code) {
      expect(SHORT_CODE_ALPHABET).toContain(char)
    }
  })

  it("only uses characters from a custom alphabet", () => {
    const code = generateShortCode(100, "AB")
    for (const char of code) {
      expect(char === "A" || char === "B").toBe(true)
    }
  })

  it("is deterministic with a single-character alphabet", () => {
    expect(generateShortCode(10, "X")).toBe("XXXXXXXXXX")
  })

  it("generates different codes on consecutive calls", () => {
    expect(generateShortCode()).not.toBe(generateShortCode())
  })

  it("rejects invalid length or empty alphabet", () => {
    expect(() => generateShortCode(0)).toThrow(RangeError)
    expect(() => generateShortCode(-1)).toThrow(RangeError)
    expect(() => generateShortCode(7, "")).toThrow(RangeError)
  })
})
