import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, Download, Link, Loader, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "../components/Button"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { IconButton } from "../components/IconButton"
import { Input } from "../components/Input"
import { Logo } from "../components/Logo"
import { useToast } from "../components/Toast"
import {
  ApiError,
  buildShortUrl,
  createLink,
  deleteLink,
  getCsvUrl,
  type Link as LinkData,
  listLinks,
} from "../lib/api"

const shortCodePattern = /^[a-zA-Z0-9]{1,10}$/

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

const createLinkSchema = z.object({
  originalUrl: z
    .string()
    .trim()
    .min(1, "Informe a URL original")
    .refine(isValidHttpUrl, "Informe uma URL válida (http/https)"),
  shortCode: z
    .string()
    .trim()
    .refine(value => value === "" || shortCodePattern.test(value), {
      message: "Use de 1 a 10 caracteres alfanuméricos",
    }),
})

type FormValues = z.infer<typeof createLinkSchema>

function LoadingLinks() {
  return (
    <div
      className="flex flex-col items-center gap-3 border-t border-gray-200 py-8 text-center"
      role="status"
    >
      <Loader className="size-8 animate-spin text-gray-500" aria-hidden="true" />
      <p className="text-xs uppercase text-gray-500">CARREGANDO LINKS...</p>
    </div>
  )
}

function HomePage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isDownloading, setIsDownloading] = useState(false)
  const [linkToDelete, setLinkToDelete] = useState<LinkData | null>(null)
  const [myLinksHeight, setMyLinksHeight] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const myLinksRef = useRef<HTMLElement | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const node = myLinksRef.current
    if (!node) {
      return
    }
    const observer = new ResizeObserver(entries => {
      setMyLinksHeight(entries[0].contentRect.height)
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { originalUrl: "", shortCode: "" },
  })
  const hasFormError = Boolean(errors.originalUrl || errors.shortCode)

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["links"],
    queryFn: () => listLinks(1, 100),
  })

  const createMutation = useMutation({
    mutationFn: (input: { originalUrl: string; shortCode?: string }) => createLink(input),
    onSuccess: () => {
      toast.success("Link criado com sucesso")
      queryClient.invalidateQueries({ queryKey: ["links"] })
      reset()
    },
    onError: error => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message)
        return
      }
      toast.error("Não foi possível criar o link")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] })
      toast.success("Link excluído com sucesso")
    },
    onError: () => {
      toast.error("Não foi possível excluir o link")
    },
  })

  useEffect(() => {
    const active = createMutation.isPending || deleteMutation.isPending || isFetching
    if (active) {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
        progressTimerRef.current = null
      }
      setShowProgress(true)
      return
    }
    if (showProgress && !progressTimerRef.current) {
      progressTimerRef.current = setTimeout(() => {
        setShowProgress(false)
        progressTimerRef.current = null
      }, 700)
    }
  }, [createMutation.isPending, deleteMutation.isPending, isFetching, showProgress])

  const onSubmit = (values: FormValues) => {
    const result = createLinkSchema.safeParse(values)
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (field === "originalUrl" || field === "shortCode") {
          setError(field, { type: "manual", message: issue.message })
        }
      }
      return
    }
    const { shortCode, ...rest } = result.data
    createMutation.mutate(shortCode ? { ...rest, shortCode } : rest)
  }

  const handleCopy = async (shortCode: string) => {
    try {
      await navigator.clipboard.writeText(buildShortUrl(shortCode))
      toast.success("Copiado")
    } catch {
      toast.error("Não foi possível copiar o link")
    }
  }

  const handleDelete = (link: LinkData) => {
    setLinkToDelete(link)
  }

  const confirmDelete = () => {
    if (linkToDelete) {
      deleteMutation.mutate(linkToDelete.id)
      setLinkToDelete(null)
    }
  }

  const cancelDelete = () => {
    setLinkToDelete(null)
  }

  const handleDownloadCsv = async () => {
    try {
      setIsDownloading(true)
      const { url } = await getCsvUrl()
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("Não foi possível baixar o CSV")
    } finally {
      setIsDownloading(false)
    }
  }

  const links = data?.data ?? []

  return (
    <div className="flex min-h-dvh flex-col bg-gray-200 md:h-dvh md:overflow-hidden">
      <header className="mx-auto flex w-full max-w-[980px] justify-center px-3 py-8 md:justify-start md:px-0 md:py-10">
        <Logo className="h-6 w-auto" />
      </header>

      <main
        className={`mx-auto flex w-full max-w-[980px] flex-1 flex-col px-3 pb-10 md:min-h-0 md:overflow-hidden md:px-0 ${
          myLinksHeight >= 340 ? "md:pb-0" : "md:pb-10"
        }`}
      >
        <div className="flex flex-1 flex-col gap-5 md:min-h-0 md:flex-row md:items-start">
          <section
            className={`rounded-lg bg-gray-100 p-6 md:w-[380px] md:shrink-0 md:p-8 ${
              hasFormError ? "md:h-auto" : "md:h-[340px]"
            }`}
          >
            <h2 className="text-lg font-bold text-gray-600">Novo link</h2>
            <form className="mt-6 flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-4">
                <Input
                  label="link original"
                  placeholder="www.exemplo.com.br"
                  error={errors.originalUrl?.message}
                  {...register("originalUrl")}
                />
                <Input
                  label="link encurtado"
                  placeholder="seu-link"
                  prefix="brev.ly/"
                  error={errors.shortCode?.message}
                  {...register("shortCode")}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || createMutation.isPending}
              >
                Salvar link
              </Button>
            </form>
          </section>

          <section
            ref={myLinksRef}
            className="relative flex max-h-[340px] min-h-0 flex-col overflow-hidden rounded-lg bg-gray-100 p-6 md:min-h-[340px] md:max-h-[680px] md:flex-1 md:p-8"
          >
            {showProgress && !isLoading ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 overflow-hidden"
                role="progressbar"
                aria-label="Atualizando links"
              >
                <div className="h-full w-2/5 animate-progress bg-blue-base" />
              </div>
            ) : null}

            <div className="flex shrink-0 items-center justify-between">
              <h2 className="text-lg font-bold text-gray-600">Meus links</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadCsv}
                disabled={isDownloading || links.length === 0}
              >
                <Download size={16} aria-hidden="true" />
                Baixar CSV
              </Button>
            </div>

            <div className="scrollbar-thin mt-5 min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <LoadingLinks />
              ) : isError ? (
                <div className="flex flex-col items-center gap-3 border-t border-gray-200 py-10 text-center">
                  <p className="text-xs uppercase text-gray-500">
                    Não foi possível carregar os links
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => refetch()}>
                    Tentar novamente
                  </Button>
                </div>
              ) : links.length === 0 ? (
                <div className="flex flex-col items-center gap-3 border-t border-gray-200 py-8 text-center">
                  <Link size={32} className="text-gray-500" aria-hidden="true" />
                  <p className="text-xs uppercase text-gray-500">
                    ainda não existem links cadastrados
                  </p>
                </div>
              ) : (
                <ul>
                  {links.map(link => (
                    <li
                      key={link.id}
                      className="flex items-center gap-4 border-t border-gray-200 py-5 md:gap-5"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="block truncate text-sm font-semibold text-blue-base">
                          {buildShortUrl(link.shortCode)}
                        </span>
                        <p className="truncate text-xs text-gray-500">{link.originalUrl}</p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-gray-500">
                        {link.accessCount} acessos
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton label="Copiar" onClick={() => handleCopy(link.shortCode)}>
                          <Copy size={16} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          label="Excluir"
                          onClick={() => handleDelete(link)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </IconButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>

      <ConfirmDialog
        open={linkToDelete !== null}
        title="Excluir link"
        description={`Tem certeza que deseja excluir "${linkToDelete?.shortCode}"?`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}

export { HomePage }
