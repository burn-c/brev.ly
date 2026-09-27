import { defineConfig } from "tsup"

export default defineConfig({
  outExtension: () => ({ js: ".mjs" }),
})
