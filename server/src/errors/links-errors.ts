export class LinkNotFoundError extends Error {
  override name = "LinkNotFoundError"
}

export class ShortCodeAlreadyExistsError extends Error {
  override name = "ShortCodeAlreadyExistsError"
}

export class InvalidShortCodeError extends Error {
  override name = "InvalidShortCodeError"
}

export class InvalidUrlError extends Error {
  override name = "InvalidUrlError"
}
