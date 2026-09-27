import { randomInt } from "node:crypto"

export const SHORT_CODE_ALPHABET: string =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

export const SHORT_CODE_LENGTH: number = 7

export const SHORT_CODE_MAX_LENGTH: number = 10

export const SHORT_CODE_REGEX: RegExp = /^[a-zA-Z0-9]{1,10}$/

export function isValidShortCode(code: string): boolean {
  return SHORT_CODE_REGEX.test(code)
}

export function generateShortCode(
  length: number = SHORT_CODE_LENGTH,
  alphabet: string = SHORT_CODE_ALPHABET
): string {
  if (length <= 0 || alphabet.length === 0) {
    throw new RangeError("generateShortCode requires a positive length and a non-empty alphabet")
  }

  const chars: string[] = []
  for (let i = 0; i < length; i++) {
    chars.push(alphabet[randomInt(alphabet.length)])
  }
  return chars.join("")
}
