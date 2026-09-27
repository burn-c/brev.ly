import type { FastifyInstance } from "fastify"

export async function healthCheckRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() }
  })
}
