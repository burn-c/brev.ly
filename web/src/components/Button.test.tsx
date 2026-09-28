import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Button } from "./Button"

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Salvar link</Button>)
    expect(screen.getByRole("button", { name: "Salvar link" })).toBeInTheDocument()
  })

  it("applies primary classes by default", () => {
    render(<Button>Salvar link</Button>)
    expect(screen.getByRole("button")).toHaveClass("bg-blue-base")
  })

  it("applies secondary classes when variant is secondary", () => {
    render(<Button variant="secondary">Baixar CSV</Button>)
    expect(screen.getByRole("button")).toHaveClass("bg-gray-200")
  })

  it("applies md size by default and sm size when set", () => {
    render(<Button>Padrão</Button>)
    expect(screen.getByRole("button", { name: "Padrão" })).toHaveClass("h-12")

    render(<Button size="sm">Compacto</Button>)
    expect(screen.getByRole("button", { name: "Compacto" })).toHaveClass("h-8")
  })

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <Button disabled onClick={onClick}>
        Salvar link
      </Button>
    )
    await user.click(screen.getByRole("button"))
    expect(onClick).not.toHaveBeenCalled()
  })
})
