import type { FastifyInstance } from "fastify"
import { z } from "zod"

import {
  InvalidShortCodeError,
  InvalidUrlError,
  LinkNotFoundError,
  ShortCodeAlreadyExistsError,
} from "../errors/links-errors.js"
import type { LinksService } from "../services/links-service.js"

export interface LinksRoutesOptions {
  linksService: LinksService
}

const createLinkSchema = z.object({
  originalUrl: z.string().url(),
  shortCode: z.string().optional(),
})

const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
})

const shortCodeParamsSchema = z.object({
  shortCode: z.string().min(1),
})

const idParamsSchema = z.object({
  id: z.string().uuid(),
})

export async function linksRoutes(app: FastifyInstance, opts: LinksRoutesOptions) {
  const { linksService } = opts

  app.post("/links", async (request, reply) => {
    const parsed = createLinkSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid request body" })
    }

    try {
      const link = await linksService.createLink(parsed.data)
      return reply.code(201).send(link)
    } catch (error) {
      if (error instanceof InvalidUrlError || error instanceof InvalidShortCodeError) {
        return reply.code(400).send({ message: error.message })
      }
      if (error instanceof ShortCodeAlreadyExistsError) {
        return reply.code(409).send({ message: error.message })
      }
      throw error
    }
  })

  app.get("/links", async (request, reply) => {
    const parsed = listLinksQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query parameters" })
    }

    return linksService.listLinks(parsed.data.page, parsed.data.pageSize)
  })

  app.get("/links/:shortCode", async (request, reply) => {
    const parsed = shortCodeParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid short code" })
    }

    try {
      const link = await linksService.getLinkByShortCode(parsed.data.shortCode)
      return link
    } catch (error) {
      if (error instanceof LinkNotFoundError) {
        return reply.code(404).send({ message: error.message })
      }
      throw error
    }
  })

  app.delete("/links/:id", async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid link id" })
    }

    try {
      await linksService.deleteLink(parsed.data.id)
      return reply.code(204).send()
    } catch (error) {
      if (error instanceof LinkNotFoundError) {
        return reply.code(404).send({ message: error.message })
      }
      throw error
    }
  })

  app.patch("/links/:id/access", async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid link id" })
    }

    try {
      const { accessCount } = await linksService.incrementAccess(parsed.data.id)
      return { accessCount }
    } catch (error) {
      if (error instanceof LinkNotFoundError) {
        return reply.code(404).send({ message: error.message })
      }
      throw error
    }
  })
}
