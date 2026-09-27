import { describe, expect, it, vi } from "vitest"

import { buildApp } from "../app.js"
import type { ReportService } from "../services/report-service.js"

function createReportServiceStub(): ReportService {
  return {
    exportLinksCsv: vi.fn(),
  }
}

type InjectOptions = {
  method: "GET"
  url: string
}

async function inject(stub: ReportService, options: InjectOptions) {
  const app = buildApp({ reportService: stub })

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
