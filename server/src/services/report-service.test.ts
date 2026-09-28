import { uuidv7 } from "uuidv7"
import { describe, expect, it } from "vitest"

import type { Link } from "../domain/link.js"
import type { LinksRepository } from "../repositories/links-repository.js"
import type { StorageProvider } from "../storage/storage.js"
import { buildLinksCsv, createReportService, csvEscape } from "./report-service.js"

function makeLink(overrides: Partial<Link> = {}): Link {
  return {
    id: uuidv7(),
    originalUrl: "https://example.com",
    shortCode: "abc1234",
    accessCount: 0,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

function seedLinks(count: number): Link[] {
  return Array.from({ length: count }, (_, index) =>
    makeLink({
      shortCode: `short${index}`,
      originalUrl: `https://example.com/${index}`,
      accessCount: index,
      createdAt: new Date(2024, 0, index + 1),
    })
  )
}

class FakeLinksRepository implements LinksRepository {
  private readonly links: Link[]
  readonly listCalls: { page: number; pageSize: number }[] = []

  constructor(seed: Link[] = []) {
    this.links = [...seed]
  }

  async findByShortCode(shortCode: string): Promise<Link | null> {
    return this.links.find(link => link.shortCode === shortCode) ?? null
  }

  async findById(id: string): Promise<Link | null> {
    return this.links.find(link => link.id === id) ?? null
  }

  async list(page: number, pageSize: number): Promise<{ data: Link[]; total: number }> {
    this.listCalls.push({ page, pageSize })
    const data = this.links.slice((page - 1) * pageSize, page * pageSize)
    return { data, total: this.links.length }
  }

  async create(input: { id: string; originalUrl: string; shortCode: string }): Promise<Link> {
    const link = makeLink(input)
    this.links.push(link)
    return link
  }

  async delete(id: string): Promise<boolean> {
    const index = this.links.findIndex(link => link.id === id)
    if (index === -1) {
      return false
    }
    this.links.splice(index, 1)
    return true
  }

  async incrementAccess(id: string): Promise<number | null> {
    const link = this.links.find(item => item.id === id)
    if (!link) {
      return null
    }
    link.accessCount += 1
    return link.accessCount
  }
}

class FakeStorage implements StorageProvider {
  readonly calls: { key: string; body: string; contentType: string }[] = []

  async putObject(input: {
    key: string
    body: string | Buffer
    contentType: string
  }): Promise<{ url: string }> {
    this.calls.push({ key: input.key, body: String(input.body), contentType: input.contentType })
    return { url: `http://cdn.example.com/${input.key}` }
  }
}

describe("csvEscape", () => {
  it("wraps values with comma, double quotes and line break", () => {
    const value = 'hello, "world"\nnext line'
    expect(csvEscape(value)).toBe('"hello, ""world""\nnext line"')
  })

  it("returns clean values unchanged", () => {
    expect(csvEscape("hello world")).toBe("hello world")
  })
})

describe("buildLinksCsv", () => {
  it("returns only the header for empty links", () => {
    expect(buildLinksCsv([])).toBe(
      "id,url_original,url_encurtada,contagem_de_acessos,data_de_criacao\n"
    )
  })

  it("writes one line per link with fields in order", () => {
    const first = makeLink({
      originalUrl: "https://example.com/a",
      shortCode: "short1",
      accessCount: 5,
      createdAt: new Date("2024-02-01T10:00:00.000Z"),
    })
    const second = makeLink({
      originalUrl: "https://example.com/b",
      shortCode: "short2",
      accessCount: 0,
      createdAt: new Date("2024-03-01T12:30:00.000Z"),
    })

    const csv = buildLinksCsv([first, second])
    const lines = csv.split("\n").filter(line => line !== "")

    expect(lines[0]).toBe("id,url_original,url_encurtada,contagem_de_acessos,data_de_criacao")
    expect(lines[1]).toBe(`${first.id},https://example.com/a,short1,5,2024-02-01T10:00:00.000Z`)
    expect(lines[2]).toBe(`${second.id},https://example.com/b,short2,0,2024-03-01T12:30:00.000Z`)
  })
})

describe("createReportService", () => {
  it("exports a single page of links", async () => {
    const repo = new FakeLinksRepository(seedLinks(3))
    const storage = new FakeStorage()
    const service = createReportService(repo, storage)

    const result = await service.exportLinksCsv()

    expect(storage.calls).toHaveLength(1)
    const call = storage.calls[0]
    expect(call.contentType).toBe("text/csv")
    expect(call.key).toMatch(/\.csv$/)
    expect(call.key).toMatch(/^csv\/.+\.csv$/)
    expect(call.key.length).toBeGreaterThan(0)

    const lines = call.body.split("\n").filter(line => line !== "")
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe("id,url_original,url_encurtada,contagem_de_acessos,data_de_criacao")
    expect(call.body).toContain("short0")
    expect(call.body).toContain("short1")
    expect(call.body).toContain("short2")

    expect(result.url).toBe(`http://cdn.example.com/${call.key}`)
    expect(result.url).toContain(call.key)
  })

  it("paginates through the repository in batches of 1000", async () => {
    const repo = new FakeLinksRepository(seedLinks(2500))
    const storage = new FakeStorage()
    const service = createReportService(repo, storage)

    const result = await service.exportLinksCsv()

    expect(repo.listCalls).toEqual([
      { page: 1, pageSize: 1000 },
      { page: 2, pageSize: 1000 },
      { page: 3, pageSize: 1000 },
    ])

    const dataLines = storage.calls[0].body
      .split("\n")
      .filter(line => line !== "" && !line.startsWith("id,url_original"))
    expect(dataLines).toHaveLength(2500)
    expect(result.url).toMatch(/^http:\/\/cdn\.example\.com\/.+\.csv$/)
  })

  it("exports an empty repository as header only but still uploads", async () => {
    const repo = new FakeLinksRepository()
    const storage = new FakeStorage()
    const service = createReportService(repo, storage)

    const result = await service.exportLinksCsv()

    expect(storage.calls).toHaveLength(1)
    expect(storage.calls[0].body).toBe(
      "id,url_original,url_encurtada,contagem_de_acessos,data_de_criacao\n"
    )
    expect(storage.calls[0].contentType).toBe("text/csv")
    expect(result.url).toBe(`http://cdn.example.com/${storage.calls[0].key}`)
  })
})
