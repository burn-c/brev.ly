import logoUrl from "../../assets/Logo.svg"
import logoIconUrl from "../../assets/Logo_Icon.svg"

export function Logo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="Brev.ly" className={className} />
}

export function LogoIcon({ className }: { className?: string }) {
  return <img src={logoIconUrl} alt="Brev.ly" className={className} />
}
