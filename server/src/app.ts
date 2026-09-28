import cors from "@fastify/cors"
import Fastify from "fastify"

import { createDb } from "./db/index.js"
import { env } from "./env.js"
import { createLinksRepository } from "./repositories/links-repository.js"
import { healthCheckRoutes } from "./routes/health-check.js"
import { linksRoutes } from "./routes/links.js"
import { reportRoutes } from "./routes/report.js"
import type { LinksService } from "./services/links-service.js"
import { createLinksService } from "./services/links-service.js"
import type { ReportService } from "./services/report-service.js"
import { createReportService } from "./services/report-service.js"
import { createStorageProvider } from "./storage/storage.js"

export interface BuildAppOptions {
  linksService?: LinksService
  reportService?: ReportService
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: env.FRONTEND_URL })
  app.register(healthCheckRoutes)

  const { linksService, reportService, pool } =
    options.linksService && options.reportService
      ? {
          linksService: options.linksService,
          reportService: options.reportService,
          pool: undefined,
        }
      : createDefaultDependencies(options)

  if (pool) {
    app.addHook("onClose", async () => {
      await pool.end()
    })
  }

  app.register(linksRoutes, { linksService })
  app.register(reportRoutes, { reportService })

  return app
}

function createDefaultDependencies(options: BuildAppOptions) {
  const { db, pool } = createDb()
  const repository = createLinksRepository(db)
  const storage = createStorageProvider({
    provider: env.STORAGE_PROVIDER,
    cloudflare: {
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_SECRET_ACCESS_KEY,
      bucket: env.CLOUDFLARE_BUCKET,
      publicUrl: env.CLOUDFLARE_PUBLIC_URL,
    },
    aws: {
      region: env.AWS_REGION,
      accessKeyId: env.AWS_ACCESS_KEY_ID || undefined,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY || undefined,
      bucket: env.AWS_S3_BUCKET,
      cdnUrl: env.AWS_CDN_URL,
      endpoint: env.AWS_ENDPOINT || undefined,
    },
  })
  return {
    linksService: options.linksService ?? createLinksService(repository),
    reportService: options.reportService ?? createReportService(repository, storage),
    pool,
  }
}
