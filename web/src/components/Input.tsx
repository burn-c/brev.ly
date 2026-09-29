import { TriangleAlert } from "lucide-react"
import { forwardRef, type InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, prefix, ...props },
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
      <div
        className={`flex h-12 w-full items-center gap-0 rounded-lg border bg-transparent px-4 focus-within:outline-none ${borderClass}`}
      >
        {prefix ? <span className="shrink-0 text-sm text-gray-400">{prefix}</span> : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`min-w-0 flex-1 bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <div id={`${inputId}-error`} className="flex items-center gap-2 text-xs text-gray-500">
          <TriangleAlert className="size-4 text-danger" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  )
})
