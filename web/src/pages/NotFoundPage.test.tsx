import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { NotFoundPage } from "./NotFoundPage"

describe("NotFoundPage", () => {
  it("renders the not found heading", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByText("Link não encontrado")).toBeInTheDocument()
  })

  it("renders the 404 image", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByAltText("404")).toBeInTheDocument()
  })

  it("links brev.ly back to the home page", () => {
    render(
      <MemoryRouter initialEntries={["/nao-existe"]}>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByRole("link", { name: "brev.ly" })).toHaveAttribute("href", "/")
  })
})
