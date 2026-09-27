import { describe, expect, it, vi } from "vitest"

import { buildApp } from "../app.js"
import type { Link } from "../domain/link.js"
import {
  InvalidShortCodeError,
  InvalidUrlError,
  LinkNotFoundError,
  ShortCodeAlreadyExistsError,
  ShortCodeGenerationError,
} from "../errors/links-errors.js"
import type { LinksService } from "../services/links-service.js"
import type { ReportService } from "../services/report-service.js"

const link: Link = {
  id: "0192f3a0-0000-7000-8000-000000000001",
  originalUrl: "https://example.com",
  shortCode: "abc123",
  accessCount: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
}

function createLinksServiceStub(): LinksService {
  return {
    createLink: vi.fn().mockResolvedValue(link),
    listLinks: vi.fn().mockResolvedValue({
      data: [link],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    }),
    getLinkByShortCode: vi.fn().mockResolvedValue(link),
    deleteLink: vi.fn().mockResolvedValue(undefined),
    incrementAccess: vi.fn().mockResolvedValue({ accessCount: 1 }),
  }
}

type InjectOptions = {
  method: "GET" | "POST" | "DELETE" | "PATCH"
  url: string
  payload?: Record<string, unknown>
}

async function inject(stub: LinksService, options: InjectOptions) {
  const reportServiceStub: ReportService = {
    exportLinksCsv: vi.fn(),
  }
  const app = buildApp({ linksService: stub, reportService: reportServiceStub })

  const response = await app.inject(options)

  await app.close()

  return response
}

describe("POST /links", () => {
  it("returns 201 with the created link", async () => {
    const response = await inject(createLinksServiceStub(), {
      method: "POST",
      url: "/links",
      payload: { originalUrl: "https://example.com", shortCode: "abc123" },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({
      ...link,
      createdAt: link.createdAt.toISOString(),
    })
  })

  it("returns 400 when service throws InvalidShortCodeError", async () => {
    const stub = createLinksServiceStub()
    stub.createLink = vi.fn().mockRejectedValue(new InvalidShortCodeError("invalid"))

    const response = await inject(stub, {
      method: "POST",
      url: "/links",
      payload: { originalUrl: "https://example.com", shortCode: "ab" },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: "invalid" })
  })

  it("returns 400 when service throws InvalidUrlError", async () => {
    const stub = createLinksServiceStub()
    stub.createLink = vi.fn().mockRejectedValue(new InvalidUrlError("invalid"))

    const response = await inject(stub, {
      method: "POST",
      url: "/links",
      payload: { originalUrl: "https://example.com" },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: "invalid" })
  })

  it("returns 409 when service throws ShortCodeAlreadyExistsError", async () => {
    const stub = createLinksServiceStub()
    stub.createLink = vi.fn().mockRejectedValue(new ShortCodeAlreadyExistsError("taken"))

    const response = await inject(stub, {
      method: "POST",
      url: "/links",
      payload: { originalUrl: "https://example.com", shortCode: "abc123" },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({ message: "taken" })
  })

  it("returns 500 when service throws ShortCodeGenerationError", async () => {
    const stub = createLinksServiceStub()
    stub.createLink = vi.fn().mockRejectedValue(new ShortCodeGenerationError("failed"))

    const response = await inject(stub, {
      method: "POST",
      url: "/links",
      payload: { originalUrl: "https://example.com" },
    })

    expect(response.statusCode).toBe(500)
  })

  it("returns 400 when body is invalid", async () => {
    const response = await inject(createLinksServiceStub(), {
      method: "POST",
      url: "/links",
      payload: { shortCode: "abc123" },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe("GET /links", () => {
  it("returns 200 with data and meta", async () => {
    const response = await inject(createLinksServiceStub(), {
      method: "GET",
      url: "/links?page=1&pageSize=10",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      data: [{ ...link, createdAt: link.createdAt.toISOString() }],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    })
  })
})

describe("GET /links/:shortCode", () => {
  it("returns 200 with the link", async () => {
    const response = await inject(createLinksServiceStub(), {
      method: "GET",
      url: "/links/abc123",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      ...link,
      createdAt: link.createdAt.toISOString(),
    })
  })

  it("returns 404 when link is not found", async () => {
    const stub = createLinksServiceStub()
    stub.getLinkByShortCode = vi.fn().mockRejectedValue(new LinkNotFoundError("not found"))

    const response = await inject(stub, {
      method: "GET",
      url: "/links/abc123",
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: "not found" })
  })
})

describe("DELETE /links/:id", () => {
  it("returns 204", async () => {
    const response = await inject(createLinksServiceStub(), {
      method: "DELETE",
      url: "/links/0192f3a0-0000-7000-8000-000000000001",
    })

    expect(response.statusCode).toBe(204)
  })

  it("returns 404 when link is not found", async () => {
    const stub = createLinksServiceStub()
    stub.deleteLink = vi.fn().mockRejectedValue(new LinkNotFoundError("not found"))

    const response = await inject(stub, {
      method: "DELETE",
      url: "/links/0192f3a0-0000-7000-8000-000000000001",
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: "not found" })
  })
})

describe("PATCH /links/:id/access", () => {
  it("returns 200 with accessCount", async () => {
    const response = await inject(createLinksServiceStub(), {
      method: "PATCH",
      url: "/links/0192f3a0-0000-7000-8000-000000000001/access",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ accessCount: 1 })
  })

  it("returns 404 when link is not found", async () => {
    const stub = createLinksServiceStub()
    stub.incrementAccess = vi.fn().mockRejectedValue(new LinkNotFoundError("not found"))

    const response = await inject(stub, {
      method: "PATCH",
      url: "/links/0192f3a0-0000-7000-8000-000000000001/access",
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: "not found" })
  })
})
