import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ToastProvider } from "../components/Toast"
import { ApiError, createLink, deleteLink, getCsvUrl, listLinks } from "../lib/api"
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
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    })
  })

  it("shows the skeleton while the list is loading", () => {
    vi.mocked(listLinks).mockReturnValue(new Promise(() => {}))
    renderHomePage()

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument()
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

  it("downloads the CSV from the CDN url", async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)
    vi.mocked(listLinks).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    })
    vi.mocked(getCsvUrl).mockResolvedValue({
      url: "https://brev-ly.burndev.app/csv/report.csv",
    })
    renderHomePage()

    await user.click(screen.getByRole("button", { name: /baixar csv/i }))

    expect(vi.mocked(getCsvUrl)).toHaveBeenCalled()
    expect(openSpy).toHaveBeenCalledWith(
      "https://brev-ly.burndev.app/csv/report.csv",
      "_blank",
      "noopener,noreferrer"
    )
  })

  it("shows a toast when the CSV download fails", async () => {
    const user = userEvent.setup()
    vi.mocked(listLinks).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    })
    vi.mocked(getCsvUrl).mockRejectedValue(new ApiError("Erro interno", 500))
    renderHomePage()

    await user.click(screen.getByRole("button", { name: /baixar csv/i }))

    expect(await screen.findByText("Não foi possível baixar o CSV")).toBeInTheDocument()
  })

  it("copies the short url to the clipboard", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })
    vi.mocked(listLinks).mockResolvedValue({
      data: [link],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    renderHomePage()

    await screen.findByText("http://localhost:5173/abc123")
    await user.click(screen.getByRole("button", { name: "Copiar" }))

    expect(writeText).toHaveBeenCalledWith("http://localhost:5173/abc123")
    expect(await screen.findByText("Copiado")).toBeInTheDocument()
  })

  it("shows a toast when copying fails", async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    })
    vi.mocked(listLinks).mockResolvedValue({
      data: [link],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    renderHomePage()

    await screen.findByText("http://localhost:5173/abc123")
    await user.click(screen.getByRole("button", { name: "Copiar" }))

    expect(await screen.findByText("Não foi possível copiar o link")).toBeInTheDocument()
  })

  it("shows the validation error for an invalid url", async () => {
    const user = userEvent.setup()
    vi.mocked(listLinks).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    })
    renderHomePage()

    await user.type(screen.getByLabelText("link original"), "not-a-url")
    await user.click(screen.getByRole("button", { name: "Salvar link" }))

    expect(await screen.findByText("Informe uma URL válida (http/https)")).toBeInTheDocument()
    expect(vi.mocked(createLink)).not.toHaveBeenCalled()
  })

  it("shows the validation error for an invalid short code", async () => {
    const user = userEvent.setup()
    vi.mocked(listLinks).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    })
    renderHomePage()

    await user.type(screen.getByLabelText("link original"), "https://exemplo.com.br")
    await user.type(screen.getByLabelText("link encurtado"), "codigo invalido!!")
    await user.click(screen.getByRole("button", { name: "Salvar link" }))

    expect(await screen.findByText("Use de 1 a 10 caracteres alfanuméricos")).toBeInTheDocument()
    expect(vi.mocked(createLink)).not.toHaveBeenCalled()
  })

  it("shows an error state and retries the list when requested", async () => {
    const user = userEvent.setup()
    vi.mocked(listLinks)
      .mockRejectedValueOnce(new ApiError("Erro interno", 500))
      .mockResolvedValueOnce({
        data: [link],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      })
    renderHomePage()

    expect(await screen.findByText("Não foi possível carregar os links")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))

    expect(await screen.findByText("http://localhost:5173/abc123")).toBeInTheDocument()
    expect(vi.mocked(listLinks)).toHaveBeenCalledTimes(2)
  })
})
