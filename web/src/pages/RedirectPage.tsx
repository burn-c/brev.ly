import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { LogoIcon } from "../components/Logo"
import type { Link as LinkType } from "../lib/api"
import { ApiError, getLinkByShortCode, incrementAccess } from "../lib/api"
import { NotFoundPage } from "./NotFoundPage"

const SHORT_CODE_REGEX = /^[a-zA-Z0-9]{1,10}$/

function RedirectPage() {
  const { urlEncurtada } = useParams()
  const [status, setStatus] = useState<"loading" | "notFound" | "error">("loading")
  const [link, setLink] = useState<LinkType | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const shortCode = urlEncurtada ?? ""

    if (!SHORT_CODE_REGEX.test(shortCode)) {
      setStatus("notFound")
      return
    }

    let cancelled = false

    getLinkByShortCode(shortCode)
      .then(async found => {
        if (cancelled) {
          return
        }
        setLink(found)
        try {
          await incrementAccess(found.id)
        } catch {}
        if (cancelled) {
          return
        }
        window.location.href = found.originalUrl
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        if (error instanceof ApiError && error.status === 404) {
          setStatus("notFound")
          return
        }
        setStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "Erro inesperado")
      })

    return () => {
      cancelled = true
    }
  }, [urlEncurtada])

  if (status === "notFound") {
    return <NotFoundPage />
  }

  if (status === "error") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-200 px-3">
        <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-lg bg-gray-100 p-12 text-center">
          <p className="text-sm text-gray-500">{errorMessage}</p>
          <Link to="/" className="text-sm text-blue-base underline">
            Voltar para a página inicial
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-200 px-3">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-lg bg-gray-100 p-12 text-center">
        <LogoIcon className="mx-auto size-12" />
        <h1 className="text-center text-xl font-bold text-gray-600">Redirecionando...</h1>
        <p className="text-center text-sm text-gray-500">
          O link será aberto automaticamente em alguns instantes.
        </p>
        {link && (
          <p className="text-center text-sm text-gray-500">
            Não foi redirecionado?{" "}
            <a
              href={link.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-base underline"
            >
              Acesse aqui
            </a>
          </p>
        )}
      </div>
    </main>
  )
}

export { RedirectPage }
