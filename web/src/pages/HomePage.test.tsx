import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ToastProvider } from "../components/Toast"
import { ApiError, createLink, deleteLink, listLinks } from "../lib/api"
import { HomePage } from "./HomePage"

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
    listLinks: vi.fn(),
    createLink: vi.fn(),
    deleteLink: vi.fn(),
    getCsvUrl: vi.fn(),
    buildShortUrl: (shortCode: string) => `http://localhost:5173/${shortCode}`,
  }
})

const link = {
  id: "1",
  originalUrl: "https://exemplo.com.br",
  shortCode: "abc123",
  accessCount: 42,
  createdAt: "2026-01-01T00:00:00Z",
}

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe("HomePage", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("renders the list of links with short code, URL and counter", async () => {
    vi.mocked(listLinks).mockResolvedValue({
      data: [link],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    renderHomePage()

    expect(await screen.findByText("http://localhost:5173/abc123")).toBeInTheDocument()
    expect(screen.getByText("https://exemplo.com.br")).toBeInTheDocument()
    expect(screen.getByText("42 acessos")).toBeInTheDocument()
  })

  it("renders the empty state when there are no links", async () => {
    vi.mocked(listLinks).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    })
    renderHomePage()

    expect(await screen.findByText("ainda não existem links cadastrados")).toBeInTheDocument()
  })

  it("creates a link when the form is submitted", async () => {
    const user = userEvent.setup()
    vi.mocked(listLinks).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    })
    vi.mocked(createLink).mockResolvedValue(link)
    renderHomePage()

    await user.type(screen.getByLabelText("link original"), "https://exemplo.com.br")
    await user.click(screen.getByRole("button", { name: "Salvar link" }))

    expect(vi.mocked(createLink)).toHaveBeenCalledWith({
      originalUrl: "https://exemplo.com.br",
    })
    expect(await screen.findByText("Link criado com sucesso")).toBeInTheDocument()
  })

  it("shows the API message when the short code already exists (409)", async () => {
    const user = userEvent.setup()
    vi.mocked(listLinks).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    })
    vi.mocked(createLink).mockRejectedValue(new ApiError("Código curto já em uso", 409))
    renderHomePage()

    await user.type(screen.getByLabelText("link original"), "https://exemplo.com.br")
    await user.click(screen.getByRole("button", { name: "Salvar link" }))

    expect(await screen.findByText("Código curto já em uso")).toBeInTheDocument()
  })

  it("shows a generic message when the API returns another error", async () => {
    const user = userEvent.setup()
    vi.mocked(listLinks).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    })
    vi.mocked(createLink).mockRejectedValue(new ApiError("Erro interno", 500))
    renderHomePage()

    await user.type(screen.getByLabelText("link original"), "https://exemplo.com.br")
    await user.click(screen.getByRole("button", { name: "Salvar link" }))

    expect(await screen.findByText("Não foi possível criar o link")).toBeInTheDocument()
  })

  it("deletes a link after confirming", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    vi.mocked(listLinks).mockResolvedValue({
      data: [link],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    vi.mocked(deleteLink).mockResolvedValue(undefined)
    renderHomePage()

    await screen.findByText("http://localhost:5173/abc123")
    await user.click(screen.getByRole("button", { name: "Excluir" }))

    expect(vi.mocked(deleteLink)).toHaveBeenCalledWith("1")
    expect(await screen.findByText("Link excluído com sucesso")).toBeInTheDocument()
  })

  it("does not delete a link when the confirmation is cancelled", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(false)
    vi.mocked(listLinks).mockResolvedValue({
      data: [link],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    renderHomePage()

    await screen.findByText("http://localhost:5173/abc123")
    await user.click(screen.getByRole("button", { name: "Excluir" }))

    expect(vi.mocked(deleteLink)).not.toHaveBeenCalled()
  })
})
