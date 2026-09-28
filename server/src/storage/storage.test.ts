import { describe, expect, it } from "vitest"

import {
  buildPublicUrl,
  buildS3ClientOptions,
  createStorageProvider,
  type StorageConfig,
} from "./storage.js"

describe("buildPublicUrl", () => {
  it("joins base URL and key", () => {
    expect(buildPublicUrl("http://cdn.example.com", "abc.csv")).toBe(
      "http://cdn.example.com/abc.csv"
    )
  })

  it("handles a trailing slash in the base URL", () => {
    expect(buildPublicUrl("http://cdn.example.com/", "abc.csv")).toBe(
      "http://cdn.example.com/abc.csv"
    )
  })

  it("keeps keys with subfolders intact", () => {
    expect(buildPublicUrl("http://cdn.example.com", "reports/abc.csv")).toBe(
      "http://cdn.example.com/reports/abc.csv"
    )
  })
})

describe("buildS3ClientOptions - cloudflare", () => {
  const cloudflareConfig: StorageConfig = {
    provider: "cloudflare",
    cloudflare: {
      accountId: "acc123",
      accessKeyId: "ak",
      secretAccessKey: "sk",
      bucket: "brevly-bucket",
      publicUrl: "https://cdn.r2.example.com",
    },
  }

  it("builds client options with R2 defaults", () => {
    const { clientOptions, bucket, publicUrl } = buildS3ClientOptions(cloudflareConfig)
    expect(clientOptions.region).toBe("auto")
    expect(clientOptions.endpoint).toContain("acc123")
    expect(clientOptions.endpoint).toMatch(/\.r2\.cloudflarestorage\.com$/)
    expect(clientOptions.credentials).toEqual({ accessKeyId: "ak", secretAccessKey: "sk" })
    expect(bucket).toBe("brevly-bucket")
    expect(publicUrl).toBe("https://cdn.r2.example.com")
  })

  it("throws when publicUrl is missing", () => {
    const config = {
      provider: "cloudflare",
      cloudflare: {
        accountId: "acc123",
        accessKeyId: "ak",
        secretAccessKey: "sk",
        bucket: "brevly-bucket",
      },
    } as StorageConfig
    expect(() => buildS3ClientOptions(config)).toThrow("Cloudflare R2 storage is not configured")
  })

  it("throws when bucket is missing", () => {
    const config = {
      provider: "cloudflare",
      cloudflare: {
        accountId: "acc123",
        accessKeyId: "ak",
        secretAccessKey: "sk",
        publicUrl: "https://cdn.r2.example.com",
      },
    } as StorageConfig
    expect(() => buildS3ClientOptions(config)).toThrow("Cloudflare R2 storage is not configured")
  })

  it("throws when accessKeyId is missing", () => {
    const config = {
      provider: "cloudflare",
      cloudflare: {
        accountId: "acc123",
        secretAccessKey: "sk",
        bucket: "brevly-bucket",
        publicUrl: "https://cdn.r2.example.com",
      },
    } as StorageConfig
    expect(() => buildS3ClientOptions(config)).toThrow("Cloudflare R2 storage is not configured")
  })
})

describe("buildS3ClientOptions - aws", () => {
  const awsConfig: StorageConfig = {
    provider: "aws",
    aws: {
      region: "us-east-1",
      accessKeyId: "ak",
      secretAccessKey: "sk",
      bucket: "brevly-bucket",
      cdnUrl: "https://d1.example.net",
    },
  }

  it("builds client options with AWS defaults", () => {
    const { clientOptions, bucket, publicUrl } = buildS3ClientOptions(awsConfig)
    expect(clientOptions.region).toBe("us-east-1")
    expect(clientOptions.endpoint).toBeUndefined()
    expect(clientOptions.credentials).toEqual({ accessKeyId: "ak", secretAccessKey: "sk" })
    expect(bucket).toBe("brevly-bucket")
    expect(publicUrl).toBe("https://d1.example.net")
  })

  it("builds client options without credentials for ECS task role", () => {
    const { clientOptions } = buildS3ClientOptions({
      provider: "aws",
      aws: {
        region: "us-east-1",
        bucket: "brevly-bucket",
        cdnUrl: "https://d1.example.net",
      },
    })
    expect(clientOptions.region).toBe("us-east-1")
    expect(clientOptions.credentials).toBeUndefined()
  })

  it("uses a custom endpoint when provided", () => {
    const { clientOptions } = buildS3ClientOptions({
      provider: "aws",
      aws: {
        region: "us-east-1",
        accessKeyId: "ak",
        secretAccessKey: "sk",
        bucket: "brevly-bucket",
        cdnUrl: "https://d1.example.net",
        endpoint: "http://localhost:9000",
      },
    })
    expect(clientOptions.endpoint).toBe("http://localhost:9000")
  })

  it("throws when cdnUrl is missing", () => {
    const config = {
      provider: "aws",
      aws: {
        region: "us-east-1",
        accessKeyId: "ak",
        secretAccessKey: "sk",
        bucket: "brevly-bucket",
      },
    } as StorageConfig
    expect(() => buildS3ClientOptions(config)).toThrow("AWS S3 storage is not configured")
  })

  it("throws when region is missing", () => {
    const config = {
      provider: "aws",
      aws: {
        accessKeyId: "ak",
        secretAccessKey: "sk",
        bucket: "brevly-bucket",
        cdnUrl: "https://d1.example.net",
      },
    } as StorageConfig
    expect(() => buildS3ClientOptions(config)).toThrow("AWS S3 storage is not configured")
  })

  it("throws when bucket is missing", () => {
    const config = {
      provider: "aws",
      aws: {
        region: "us-east-1",
        accessKeyId: "ak",
        secretAccessKey: "sk",
        cdnUrl: "https://d1.example.net",
      },
    } as StorageConfig
    expect(() => buildS3ClientOptions(config)).toThrow("AWS S3 storage is not configured")
  })
})

describe("createStorageProvider", () => {
  it("returns a provider with a putObject function", () => {
    const provider = createStorageProvider({
      provider: "aws",
      aws: {
        region: "us-east-1",
        accessKeyId: "ak",
        secretAccessKey: "sk",
        bucket: "brevly-bucket",
        cdnUrl: "https://d1.example.net",
      },
    })
    expect(typeof provider.putObject).toBe("function")
  })

  it("does not throw on creation with an empty aws config", () => {
    const provider = createStorageProvider({ provider: "aws" })
    expect(typeof provider.putObject).toBe("function")
  })

  it("rejects putObject when aws config is missing", async () => {
    const provider = createStorageProvider({ provider: "aws" })
    await expect(
      provider.putObject({ key: "abc.csv", body: "x", contentType: "text/csv" })
    ).rejects.toThrow("AWS S3 storage is not configured")
  })

  it("rejects putObject when cloudflare config is missing", async () => {
    const provider = createStorageProvider({ provider: "cloudflare" })
    await expect(
      provider.putObject({ key: "abc.csv", body: "x", contentType: "text/csv" })
    ).rejects.toThrow("Cloudflare R2 storage is not configured")
  })

  it("caches the configuration error across calls", async () => {
    const provider = createStorageProvider({ provider: "aws" })
    const input = { key: "abc.csv", body: "x", contentType: "text/csv" }
    await expect(provider.putObject(input)).rejects.toThrow("AWS S3 storage is not configured")
    await expect(provider.putObject(input)).rejects.toThrow("AWS S3 storage is not configured")
  })
})
