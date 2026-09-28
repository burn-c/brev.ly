import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NotFoundPage } from "./NotFoundPage"

describe("NotFoundPage", () => {
  it("renders the not found heading", () => {
    render(<NotFoundPage />)
    expect(screen.getByText("Link não encontrado")).toBeInTheDocument()
  })

  it("renders the 404 image", () => {
    render(<NotFoundPage />)
    expect(screen.getByAltText("404")).toBeInTheDocument()
  })
})
