import { mkdirSync, rmSync } from 'node:fs'
import sanitize from 'sanitize-filename'

// --- Config ---

export const config = {
  outputDir: Bun.env.OUTPUT_DIR ?? 'dist',
  filenameMode: Bun.env.FILENAME_MODE ?? 'title',
  scribdRendertime: Number(Bun.env.SCRIBD_RENDERTIME ?? 100),
  slideshareRendertime: Number(Bun.env.SLIDESHARE_RENDERTIME ?? 100),
}

// --- Helpers ---

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true })
}

export function cleanDir(dirPath: string): void {
  rmSync(dirPath, { recursive: true })
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function resolveIdentifier(name: string | null, fallbackId: string): string {
  const raw = config.filenameMode === 'title' ? (name ?? fallbackId) : fallbackId
  return sanitize(toTitleCase(raw))
}
