import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Input } from "./Input"

describe("Input", () => {
  it("renders the label", () => {
    render(<Input label="link original" />)
    expect(screen.getByLabelText("link original")).toBeInTheDocument()
  })

  it("renders the label with uppercase class", () => {
    render(<Input label="link original" />)
    expect(screen.getByText("link original")).toHaveClass("uppercase")
  })

  it("does not set aria-invalid when there is no error", () => {
    render(<Input label="link original" />)
    expect(screen.getByLabelText("link original")).not.toHaveAttribute("aria-invalid")
  })

  it("shows the error message when error is provided", () => {
    render(<Input label="link original" error="Informe a URL original" />)
    expect(screen.getByText("Informe a URL original")).toBeInTheDocument()
  })

  it("marks the input as aria-invalid when error is provided", () => {
    render(<Input label="link original" error="Informe a URL original" />)
    expect(screen.getByLabelText("link original")).toHaveAttribute("aria-invalid", "true")
  })
})
