import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createLink, deleteLink, getLinkByShortCode, incrementAccess, listLinks } from "./api"

describe("api request", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sends content-type only when there is a body", async () => {
    await createLink({ originalUrl: "https://exemplo.com" })
    await deleteLink("id-1")
    await incrementAccess("id-1")
    await listLinks()
    await getLinkByShortCode("abc123")

    const calls = fetchMock.mock.calls.map(call => {
      const options = call[1] as { method?: string; headers?: Record<string, string> }
      return {
        method: options.method ?? "GET",
        contentType: options.headers?.["content-type"],
      }
    })

    expect(calls).toContainEqual({ method: "POST", contentType: "application/json" })
    expect(calls).toContainEqual({ method: "DELETE", contentType: undefined })
    expect(calls).toContainEqual({ method: "PATCH", contentType: undefined })
  })
})
