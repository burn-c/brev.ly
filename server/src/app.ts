import cors from "@fastify/cors"
import Fastify from "fastify"

import { env } from "./env.js"
import { healthCheckRoutes } from "./routes/health-check.js"

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: env.FRONTEND_URL })
  app.register(healthCheckRoutes)

  return app
}
