import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Copy } from "lucide-react"
import { describe, expect, it, vi } from "vitest"
import { IconButton } from "./IconButton"

describe("IconButton", () => {
  it("renders the aria-label", () => {
    render(
      <IconButton label="Copiar">
        <Copy size={16} />
      </IconButton>
    )
    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument()
  })

  it("fires onClick when clicked", async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <IconButton label="Copiar" onClick={onClick}>
        <Copy size={16} />
      </IconButton>
    )
    await user.click(screen.getByRole("button", { name: "Copiar" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
