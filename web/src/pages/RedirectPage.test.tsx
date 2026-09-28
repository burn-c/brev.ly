import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, getLinkByShortCode, incrementAccess } from "../lib/api"
import { RedirectPage } from "./RedirectPage"

vi.mock("../lib/api", () => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
      this.name = "ApiError"
    }
  }
  return {
    ApiError,
    getLinkByShortCode: vi.fn(),
    incrementAccess: vi.fn(),
  }
})

const link = {
  id: "1",
  originalUrl: "https://exemplo.com.br",
  shortCode: "abc123",
  accessCount: 42,
  createdAt: "2026-01-01T00:00:00Z",
}

function renderRedirect(initialEntry = "/abc123") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path=":urlEncurtada" element={<RedirectPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("RedirectPage", () => {
  let originalLocation: Location

  beforeEach(() => {
    originalLocation = window.location
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "" } as Location,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
    vi.clearAllMocks()
  })

  it("redirects to the original URL after incrementing access", async () => {
    vi.mocked(getLinkByShortCode).mockResolvedValue(link)
    vi.mocked(incrementAccess).mockResolvedValue({ accessCount: 43 })
    renderRedirect()

    await waitFor(() => {
      expect(window.location.href).toBe("https://exemplo.com.br")
    })
    expect(vi.mocked(incrementAccess)).toHaveBeenCalledWith("1")
  })

  it("renders the not found page when the link does not exist (404)", async () => {
    vi.mocked(getLinkByShortCode).mockRejectedValue(new ApiError("Link não encontrado", 404))
    renderRedirect()

    expect(await screen.findByText("Link não encontrado")).toBeInTheDocument()
  })

  it("renders the not found page for an invalid short code without calling the API", async () => {
    renderRedirect("/invalid!")

    expect(await screen.findByText("Link não encontrado")).toBeInTheDocument()
    expect(vi.mocked(getLinkByShortCode)).not.toHaveBeenCalled()
  })
})
