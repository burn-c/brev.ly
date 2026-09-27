import { uuidv7 } from "uuidv7"
import { describe, expect, it } from "vitest"

import type { Link } from "../domain/link.js"
import {
  InvalidShortCodeError,
  InvalidUrlError,
  LinkNotFoundError,
  ShortCodeAlreadyExistsError,
} from "../errors/links-errors.js"
import type { LinksRepository } from "../repositories/links-repository.js"
import { createLinksService } from "./links-service.js"

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/

function makeLink(overrides: Partial<Link> = {}): Link {
  return {
    id: uuidv7(),
    originalUrl: "https://example.com",
    shortCode: "abc1234",
    accessCount: 0,
    createdAt: new Date(),
    ...overrides,
  }
}

function seedLinks(count: number): Link[] {
  return Array.from({ length: count }, (_, index) =>
    makeLink({
      shortCode: `short${index}`,
      createdAt: new Date(2024, 0, index + 1),
    })
  )
}

class FakeLinksRepository implements LinksRepository {
  private readonly store = new Map<string, Link>()
  private accessCounter = 1

  constructor(seed: Link[] = []) {
    for (const link of seed) {
      this.store.set(link.id, link)
    }
  }

  async findByShortCode(shortCode: string): Promise<Link | null> {
    for (const link of this.store.values()) {
      if (link.shortCode === shortCode) {
        return link
      }
    }
    return null
  }

  async findById(id: string): Promise<Link | null> {
    return this.store.get(id) ?? null
  }

  async list(page: number, pageSize: number): Promise<{ data: Link[]; total: number }> {
    const data = [...this.store.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice((page - 1) * pageSize, page * pageSize)
    return { data, total: this.store.size }
  }

  async create(input: { id: string; originalUrl: string; shortCode: string }): Promise<Link> {
    for (const link of this.store.values()) {
      if (link.shortCode === input.shortCode) {
        throw new ShortCodeAlreadyExistsError()
      }
    }
    const link = makeLink(input)
    this.store.set(link.id, link)
    return link
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id)
  }

  async incrementAccess(id: string): Promise<number | null> {
    if (!this.store.has(id)) {
      return null
    }
    return this.accessCounter++
  }
}

describe("createLinksService", () => {
  describe("createLink", () => {
    it("creates a link with a custom short code", async () => {
      const service = createLinksService(new FakeLinksRepository())

      const link = await service.createLink({
        originalUrl: "https://example.com",
        shortCode: "abc1234",
      })

      expect(link).toMatchObject({ originalUrl: "https://example.com", shortCode: "abc1234" })
    })

    it("throws ShortCodeAlreadyExistsError for a duplicated custom short code", async () => {
      const repo = new FakeLinksRepository([makeLink({ shortCode: "abc1234" })])
      const service = createLinksService(repo)

      await expect(
        service.createLink({ originalUrl: "https://example.com", shortCode: "abc1234" })
      ).rejects.toBeInstanceOf(ShortCodeAlreadyExistsError)
    })

    it.each(["ab c", "a!"])("rejects malformed short code %j", async shortCode => {
      const service = createLinksService(new FakeLinksRepository())

      await expect(
        service.createLink({ originalUrl: "https://example.com", shortCode })
      ).rejects.toBeInstanceOf(InvalidShortCodeError)
    })

    it.each(["not-a-url", "ftp://x"])("rejects invalid url %j", async originalUrl => {
      const service = createLinksService(new FakeLinksRepository())

      await expect(service.createLink({ originalUrl })).rejects.toBeInstanceOf(InvalidUrlError)
    })

    it("creates a link with an auto-generated short code", async () => {
      const service = createLinksService(new FakeLinksRepository(), () => "abc1234")

      const link = await service.createLink({ originalUrl: "https://example.com" })

      expect(link.shortCode).toBe("abc1234")
      expect(link.id).toMatch(UUID_V7_REGEX)
    })

    it("retries with a new short code when the auto-generated code collides", async () => {
      const repo = new FakeLinksRepository([makeLink({ shortCode: "abc1234" })])
      const codes = ["abc1234", "abc1234", "xyz9876"]
      let index = 0
      const service = createLinksService(repo, () => codes[index++])

      const link = await service.createLink({ originalUrl: "https://example.com" })

      expect(link.shortCode).toBe("xyz9876")
    })

    it("throws ShortCodeAlreadyExistsError when retries are exhausted", async () => {
      const repo = new FakeLinksRepository([makeLink({ shortCode: "abc1234" })])
      const service = createLinksService(repo, () => "abc1234")

      await expect(
        service.createLink({ originalUrl: "https://example.com" })
      ).rejects.toBeInstanceOf(ShortCodeAlreadyExistsError)
    })
  })

  describe("getLinkByShortCode", () => {
    it("returns the link for an existing short code", async () => {
      const link = makeLink({ shortCode: "abc1234" })
      const service = createLinksService(new FakeLinksRepository([link]))

      await expect(service.getLinkByShortCode("abc1234")).resolves.toEqual(link)
    })

    it("throws LinkNotFoundError for an unknown short code", async () => {
      const service = createLinksService(new FakeLinksRepository())

      await expect(service.getLinkByShortCode("missing")).rejects.toBeInstanceOf(LinkNotFoundError)
    })
  })

  describe("deleteLink", () => {
    it("deletes an existing link", async () => {
      const link = makeLink()
      const service = createLinksService(new FakeLinksRepository([link]))

      await expect(service.deleteLink(link.id)).resolves.toBeUndefined()
    })

    it("throws LinkNotFoundError for an unknown id", async () => {
      const service = createLinksService(new FakeLinksRepository())

      await expect(service.deleteLink("unknown")).rejects.toBeInstanceOf(LinkNotFoundError)
    })
  })

  describe("incrementAccess", () => {
    it("returns the new access count", async () => {
      const link = makeLink()
      const service = createLinksService(new FakeLinksRepository([link]))

      await expect(service.incrementAccess(link.id)).resolves.toEqual({ accessCount: 1 })
    })

    it("throws LinkNotFoundError for an unknown id", async () => {
      const service = createLinksService(new FakeLinksRepository())

      await expect(service.incrementAccess("unknown")).rejects.toBeInstanceOf(LinkNotFoundError)
    })
  })

  describe("listLinks", () => {
    it("paginates results", async () => {
      const service = createLinksService(new FakeLinksRepository(seedLinks(25)))

      const result = await service.listLinks(2, 10)

      expect(result.meta).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 })
      expect(result.data).toHaveLength(10)
    })

    it("clamps page and pageSize to valid ranges", async () => {
      const service = createLinksService(new FakeLinksRepository(seedLinks(25)))

      const result = await service.listLinks(0, 500)

      expect(result.meta).toEqual({ page: 1, pageSize: 100, total: 25, totalPages: 1 })
    })
  })
})
