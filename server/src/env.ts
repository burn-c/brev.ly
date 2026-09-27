import { z } from "zod"

try {
  process.loadEnvFile()
} catch {
  // .env ausente: usa apenas as variáveis do ambiente do processo
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().default(""),
  STORAGE_PROVIDER: z.enum(["cloudflare", "aws"]).default("cloudflare"),
  CLOUDFLARE_ACCOUNT_ID: z.string().default(""),
  CLOUDFLARE_ACCESS_KEY_ID: z.string().default(""),
  CLOUDFLARE_SECRET_ACCESS_KEY: z.string().default(""),
  CLOUDFLARE_BUCKET: z.string().default(""),
  CLOUDFLARE_PUBLIC_URL: z.string().default(""),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  AWS_REGION: z.string().default(""),
  AWS_S3_BUCKET: z.string().default(""),
  AWS_CDN_URL: z.string().default(""),
  AWS_ENDPOINT: z.string().default(""),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
})

export const env = envSchema.parse(process.env)
