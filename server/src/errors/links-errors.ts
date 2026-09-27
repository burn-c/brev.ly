export class LinkNotFoundError extends Error {
  override name = "LinkNotFoundError"

  constructor(message = "Link não encontrado") {
    super(message)
  }
}

export class ShortCodeAlreadyExistsError extends Error {
  override name = "ShortCodeAlreadyExistsError"

  constructor(message = "URL encurtada já existente") {
    super(message)
  }
}

export class InvalidShortCodeError extends Error {
  override name = "InvalidShortCodeError"

  constructor(message = "URL encurtada mal formatada") {
    super(message)
  }
}

export class InvalidUrlError extends Error {
  override name = "InvalidUrlError"

  constructor(message = "URL original inválida") {
    super(message)
  }
}
