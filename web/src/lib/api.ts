export type Link = {
  id: string
  originalUrl: string
  shortCode: string
  accessCount: number
  createdAt: string
}

export type ListLinksResponse = {
  data: Link[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type CreateLinkInput = {
  originalUrl: string
  shortCode?: string
}

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3333"

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.body !== undefined && init?.body !== null) {
    headers["content-type"] = "application/json"
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...init,
  })

  if (!response.ok) {
    let message = "Erro inesperado"
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) {
        message = body.message
      }
    } catch {
      // corpo não-JSON: mantém a mensagem padrão
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function listLinks(page = 1, pageSize = 20): Promise<ListLinksResponse> {
  return request(`/links?page=${page}&pageSize=${pageSize}`)
}

export function createLink(input: CreateLinkInput): Promise<Link> {
  return request("/links", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getLinkByShortCode(shortCode: string): Promise<Link> {
  return request(`/links/${encodeURIComponent(shortCode)}`)
}

export function deleteLink(id: string): Promise<void> {
  return request(`/links/${id}`, { method: "DELETE" })
}

export function incrementAccess(id: string): Promise<{ accessCount: number }> {
  return request(`/links/${id}/access`, { method: "PATCH" })
}

export function getCsvUrl(): Promise<{ url: string }> {
  return request("/reports/links.csv")
}

export function shortCodeFromUrl(path: string): string {
  const segments = path.split("/").filter(Boolean)
  return segments[0] ?? ""
}

export function buildShortUrl(shortCode: string): string {
  const origin = import.meta.env.VITE_FRONTEND_URL ?? window.location.origin
  return `${origin.replace(/\/$/, "")}/${shortCode}`
}

export { ApiError }
