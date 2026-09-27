import type { FastifyInstance } from "fastify"

import type { ReportService } from "../services/report-service.js"

export interface ReportRoutesOptions {
  reportService: ReportService
}

export async function reportRoutes(app: FastifyInstance, opts: ReportRoutesOptions) {
  const { reportService } = opts

  app.get("/reports/links.csv", async () => {
    return reportService.exportLinksCsv()
  })
}
