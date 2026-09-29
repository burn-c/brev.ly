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

  it("renders the warning icon in danger color when error is provided", () => {
    const { container } = render(<Input label="link original" error="Informe a URL original" />)
    const icon = container.querySelector("svg")
    expect(icon).toHaveClass("text-danger")
  })

  it("marks the input as aria-invalid when error is provided", () => {
    render(<Input label="link original" error="Informe a URL original" />)
    expect(screen.getByLabelText("link original")).toHaveAttribute("aria-invalid", "true")
  })

  it("renders a fixed prefix before the input value", () => {
    render(<Input label="link encurtado" prefix="brev.ly/" />)
    expect(screen.getByText("brev.ly/")).toBeInTheDocument()
    const input = screen.getByLabelText("link encurtado")
    expect(input).toHaveValue("")
  })
})
