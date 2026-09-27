import { PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3"

export type StorageProviderName = "cloudflare" | "aws"

export interface StorageConfig {
  provider: StorageProviderName
  cloudflare?: {
    accountId: string
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    publicUrl: string
  }
  aws?: {
    region: string
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    cdnUrl: string
    endpoint?: string
  }
}

export interface StorageProvider {
  putObject(input: {
    key: string
    body: string | Buffer
    contentType: string
  }): Promise<{ url: string }>
}

export function buildPublicUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${key}`
}

export function buildS3ClientOptions(config: StorageConfig): {
  clientOptions: S3ClientConfig
  bucket: string
  publicUrl: string
} {
  if (config.provider === "cloudflare") {
    const c = config.cloudflare
    if (!c?.accountId || !c.accessKeyId || !c.secretAccessKey || !c.bucket || !c.publicUrl) {
      throw new Error("Cloudflare R2 storage is not configured")
    }
    return {
      clientOptions: {
        region: "auto",
        endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      },
      bucket: c.bucket,
      publicUrl: c.publicUrl,
    }
  }

  const a = config.aws
  if (!a?.region || !a.accessKeyId || !a.secretAccessKey || !a.bucket || !a.cdnUrl) {
    throw new Error("AWS S3 storage is not configured")
  }
  return {
    clientOptions: {
      region: a.region,
      endpoint: a.endpoint || undefined,
      credentials: { accessKeyId: a.accessKeyId, secretAccessKey: a.secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    },
    bucket: a.bucket,
    publicUrl: a.cdnUrl,
  }
}

export function createStorageProvider(config: StorageConfig): StorageProvider {
  type Resolved = {
    client: S3Client
    bucket: string
    publicUrl: string
  }
  let resolved: Resolved | undefined
  let configError: unknown

  function getResolved(): Resolved {
    if (resolved) {
      return resolved
    }
    if (configError) {
      throw configError
    }
    try {
      const options = buildS3ClientOptions(config)
      resolved = {
        client: new S3Client(options.clientOptions),
        bucket: options.bucket,
        publicUrl: options.publicUrl,
      }
    } catch (error) {
      configError = error
      throw error
    }
    return resolved
  }

  return {
    async putObject({ key, body, contentType }) {
      const { client, bucket, publicUrl } = getResolved()

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      )

      return { url: buildPublicUrl(publicUrl, key) }
    },
  }
}
