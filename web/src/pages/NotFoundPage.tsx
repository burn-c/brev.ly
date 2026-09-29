import { Link } from "react-router-dom"
import notFoundUrl from "../../assets/404.svg"

function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-200 px-3">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-lg bg-gray-100 p-12 text-center">
        <img src={notFoundUrl} alt="404" className="h-auto w-48 max-w-full" />
        <h1 className="text-xl font-bold text-gray-600">Link não encontrado</h1>
        <p className="text-sm text-gray-500">
          O link que você está tentando acessar não existe, foi removido ou é uma URL inválida.
          Saiba mais em{" "}
          <Link to="/" className="text-blue-base underline">
            brev.ly
          </Link>
          .
        </p>
      </div>
    </main>
  )
}

export { NotFoundPage }
