import { describe, expect, it, vi } from "vitest"

import { buildApp } from "./app.js"
import type { LinksService } from "./services/links-service.js"
import type { ReportService } from "./services/report-service.js"

function createLinksServiceStub(): LinksService {
  return {
    createLink: vi.fn(),
    listLinks: vi.fn(),
    getLinkByShortCode: vi.fn(),
    deleteLink: vi.fn(),
    incrementAccess: vi.fn(),
  }
}

function createReportServiceStub(): ReportService {
  return {
    exportLinksCsv: vi.fn(),
  }
}

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = buildApp({
      linksService: createLinksServiceStub(),
      reportService: createReportServiceStub(),
    })

    const response = await app.inject({
      method: "GET",
      url: "/health",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: "ok" })

    await app.close()
  })
})
