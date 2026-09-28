import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ToastProvider, useToast } from "./Toast"

function ToastTrigger() {
  const { success, error } = useToast()
  return (
    <div>
      <button type="button" onClick={() => success("Link criado com sucesso")}>
        disparar sucesso
      </button>
      <button type="button" onClick={() => error("Não foi possível criar o link")}>
        disparar erro
      </button>
    </div>
  )
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows the success message after success()", () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("disparar sucesso"))
    expect(screen.getByText("Link criado com sucesso")).toBeInTheDocument()
  })

  it("shows the error message after error()", () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("disparar erro"))
    expect(screen.getByText("Não foi possível criar o link")).toBeInTheDocument()
  })

  it("removes the toast after the timeout", () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("disparar sucesso"))
    expect(screen.getByText("Link criado com sucesso")).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText("Link criado com sucesso")).not.toBeInTheDocument()
  })

  it("throws when used outside a ToastProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<ToastTrigger />)).toThrow("useToast must be used within a ToastProvider")
    consoleError.mockRestore()
  })
})
