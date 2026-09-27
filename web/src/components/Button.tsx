import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant = "primary" | "secondary"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "h-12 rounded-lg bg-blue-base text-white hover:bg-blue-dark disabled:opacity-50",
  secondary:
    "h-8 rounded border border-transparent bg-gray-200 px-2 text-xs font-semibold text-gray-500 hover:border-blue-base disabled:opacity-50",
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-1.5 transition-colors disabled:cursor-not-allowed"

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
