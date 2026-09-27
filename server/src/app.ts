import cors from "@fastify/cors"
import Fastify from "fastify"

import { createDb } from "./db/index.js"
import { env } from "./env.js"
import { createLinksRepository } from "./repositories/links-repository.js"
import { healthCheckRoutes } from "./routes/health-check.js"
import { linksRoutes } from "./routes/links.js"
import type { LinksService } from "./services/links-service.js"
import { createLinksService } from "./services/links-service.js"

export interface BuildAppOptions {
  linksService?: LinksService
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: env.FRONTEND_URL })
  app.register(healthCheckRoutes)

  const linksService = options.linksService ?? createDefaultLinksService()
  app.register(linksRoutes, { linksService })

  return app
}

function createDefaultLinksService(): LinksService {
  const { db } = createDb()
  const repository = createLinksRepository(db)
  return createLinksService(repository)
}
