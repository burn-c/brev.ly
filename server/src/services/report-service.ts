import { randomUUID } from "node:crypto"

import type { Link } from "../domain/link.js"
import type { LinksRepository } from "../repositories/links-repository.js"
import type { StorageProvider } from "../storage/storage.js"

export interface ReportService {
  exportLinksCsv(): Promise<{ url: string }>
}

const CSV_HEADER = "url_original,url_encurtada,contagem_de_acessos,data_de_criacao"
const PAGE_SIZE = 1000

export function csvEscape(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value
  }
  return `"${value.replaceAll('"', '""')}"`
}

export function buildLinksCsv(links: Link[]): string {
  const rows = links.map(link =>
    [
      csvEscape(link.originalUrl),
      csvEscape(link.shortCode),
      csvEscape(String(link.accessCount)),
      csvEscape(link.createdAt.toISOString()),
    ].join(",")
  )
  return `${[CSV_HEADER, ...rows].join("\n")}\n`
}

export function createReportService(
  repo: LinksRepository,
  storage: StorageProvider
): ReportService {
  return {
    async exportLinksCsv() {
      const links: Link[] = []
      let page = 1
      while (true) {
        const { data } = await repo.list(page, PAGE_SIZE)
        links.push(...data)
        if (data.length < PAGE_SIZE) {
          break
        }
        page += 1
      }

      const csv = buildLinksCsv(links)
      const key = `csv/${randomUUID()}.csv`
      const { url } = await storage.putObject({ key, body: csv, contentType: "text/csv" })
      return { url }
    },
  }
}
