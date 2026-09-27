import { describe, expect, it, vi } from "vitest"

import { buildApp } from "../app.js"
import type { LinksService } from "../services/links-service.js"
import type { ReportService } from "../services/report-service.js"

function createReportServiceStub(): ReportService {
  return {
    exportLinksCsv: vi.fn(),
  }
}

function createLinksServiceStub(): LinksService {
  return {
    createLink: vi.fn(),
    listLinks: vi.fn(),
    getLinkByShortCode: vi.fn(),
    deleteLink: vi.fn(),
    incrementAccess: vi.fn(),
  }
}

type InjectOptions = {
  method: "GET"
  url: string
}

async function inject(stub: ReportService, options: InjectOptions) {
  const app = buildApp({ reportService: stub, linksService: createLinksServiceStub() })

  const response = await app.inject(options)

  await app.close()

  return response
}

describe("GET /reports/links.csv", () => {
  it("returns 200 with the report url", async () => {
    const stub = createReportServiceStub()
    stub.exportLinksCsv = vi.fn().mockResolvedValue({ url: "http://cdn.example.com/x.csv" })

    const response = await inject(stub, {
      method: "GET",
      url: "/reports/links.csv",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ url: "http://cdn.example.com/x.csv" })
  })

  it("returns 500 when the service fails", async () => {
    const stub = createReportServiceStub()
    stub.exportLinksCsv = vi.fn().mockRejectedValue(new Error("storage not configured"))

    const response = await inject(stub, {
      method: "GET",
      url: "/reports/links.csv",
    })

    expect(response.statusCode).toBe(500)
  })
})
