import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant = "primary" | "secondary"
type ButtonSize = "md" | "sm"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-blue-base text-white hover:bg-blue-dark disabled:opacity-50",
  secondary:
    "border border-transparent bg-gray-200 text-gray-500 hover:border-blue-base disabled:opacity-50",
}

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-12 rounded-lg px-4 text-sm font-semibold",
  sm: "h-8 rounded px-2 text-xs font-semibold",
}

export function Button({
  variant = "primary",
  size = "md",
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
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
