import { Scissors } from "lucide-react"
import { Route, Routes } from "react-router-dom"

function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
    </Routes>
  )
}

function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-6 sm:px-6">
        <Scissors className="size-5 text-blue-base" aria-hidden="true" />
        <span className="text-lg font-bold tracking-tight">Brev.ly</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h1 className="text-2xl font-bold">Encurtador de URLs</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Crie links curtos, acompanhe o número de acessos e compartilhe com facilidade.
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
