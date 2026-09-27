import { TriangleAlert } from "lucide-react"
import { forwardRef, type InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
  ref
) {
  const inputId = id ?? `field-${label}`

  const borderClass = error ? "border-danger" : "border-gray-300 focus-within:border-blue-base"

  return (
    <div className="flex w-full flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-xxs font-normal uppercase tracking-wide text-gray-500"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`h-12 w-full rounded-lg border bg-transparent px-4 text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus-visible:border-blue-base ${borderClass} ${className}`}
        {...props}
      />
      {error ? (
        <div id={`${inputId}-error`} className="flex items-center gap-2 text-xs text-gray-500">
          <TriangleAlert className="size-4 text-gray-500" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  )
})
