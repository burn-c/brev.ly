import { uuidv7 } from "uuidv7"
import { z } from "zod"

import type { Link } from "../domain/link.js"
import {
  InvalidShortCodeError,
  InvalidUrlError,
  LinkNotFoundError,
  ShortCodeAlreadyExistsError,
} from "../errors/links-errors.js"
import type { LinksRepository } from "../repositories/links-repository.js"
import { generateShortCode, isValidShortCode, SHORT_CODE_LENGTH } from "../utils/short-code.js"

export interface CreateLinkInput {
  originalUrl: string
  shortCode?: string
}

export interface LinksService {
  createLink(input: CreateLinkInput): Promise<Link>
  listLinks(
    page?: number,
    pageSize?: number
  ): Promise<{
    data: Link[]
    meta: { page: number; pageSize: number; total: number; totalPages: number }
  }>
  getLinkByShortCode(shortCode: string): Promise<Link>
  deleteLink(id: string): Promise<void>
  incrementAccess(id: string): Promise<{ accessCount: number }>
}

const MAX_CREATE_ATTEMPTS = 5

function validateUrl(originalUrl: string): void {
  const parsed = z.string().url().safeParse(originalUrl)
  if (!parsed.success) {
    throw new InvalidUrlError()
  }
  const url = new URL(parsed.data)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidUrlError()
  }
}

export function createLinksService(
  repo: LinksRepository,
  generate: (length?: number, alphabet?: string) => string = generateShortCode
): LinksService {
  return {
    async createLink(input) {
      validateUrl(input.originalUrl)
      if (input.shortCode !== undefined && !isValidShortCode(input.shortCode)) {
        throw new InvalidShortCodeError()
      }

      const id = uuidv7()
      let attempts = 0

      while (true) {
        const shortCode = input.shortCode ?? generate(SHORT_CODE_LENGTH)
        try {
          return await repo.create({ id, originalUrl: input.originalUrl, shortCode })
        } catch (error) {
          if (!(error instanceof ShortCodeAlreadyExistsError)) {
            throw error
          }
          if (input.shortCode !== undefined) {
            throw error
          }
          attempts += 1
          if (attempts >= MAX_CREATE_ATTEMPTS) {
            throw error
          }
        }
      }
    },

    async listLinks(page = 1, pageSize = 20) {
      const safePage = Math.max(1, page)
      const safePageSize = Math.min(100, Math.max(1, pageSize))
      const { data, total } = await repo.list(safePage, safePageSize)
      const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize)
      return {
        data,
        meta: { page: safePage, pageSize: safePageSize, total, totalPages },
      }
    },

    async getLinkByShortCode(shortCode) {
      const link = await repo.findByShortCode(shortCode)
      if (link === null) {
        throw new LinkNotFoundError()
      }
      return link
    },

    async deleteLink(id) {
      const deleted = await repo.delete(id)
      if (!deleted) {
        throw new LinkNotFoundError()
      }
    },

    async incrementAccess(id) {
      const accessCount = await repo.incrementAccess(id)
      if (accessCount === null) {
        throw new LinkNotFoundError()
      }
      return { accessCount }
    },
  }
}
