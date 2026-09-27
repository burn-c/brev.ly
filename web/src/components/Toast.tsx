import { CheckCircle2, XCircle } from "lucide-react"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"

type ToastKind = "success" | "error"

type Toast = {
  id: number
  kind: ToastKind
  message: string
}

type ToastContextValue = {
  toast: (kind: ToastKind, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const remove = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++
      setToasts(current => [...current, { id, kind, message }])
      window.setTimeout(() => remove(id), 4000)
    },
    [remove]
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message: string) => toast("success", message),
      error: (message: string) => toast("error", message),
    }),
    [toast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map(item => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-600 shadow-lg"
          >
            {item.kind === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-blue-base" aria-hidden="true" />
            ) : (
              <XCircle className="size-4 shrink-0 text-danger" aria-hidden="true" />
            )}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
