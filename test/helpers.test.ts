import { describe, test, expect } from 'bun:test'
import { sleep, ensureDir, cleanDir, resolveIdentifier } from '../src/utils'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const TMP = join(import.meta.dir, '.tmp-helpers-test')

describe('sleep', () => {
  test('resolves after given ms', async () => {
    const start = Date.now()
    await sleep(50)
    expect(Date.now() - start).toBeGreaterThanOrEqual(40)
  })
})

describe('ensureDir / cleanDir', () => {
  test('creates and removes a directory', () => {
    const dir = join(TMP, 'nested', 'dir')
    ensureDir(dir)
    expect(existsSync(dir)).toBe(true)

    cleanDir(TMP)
    expect(existsSync(TMP)).toBe(false)
  })

  test('ensureDir is idempotent', () => {
    ensureDir(TMP)
    ensureDir(TMP)
    expect(existsSync(TMP)).toBe(true)
    cleanDir(TMP)
  })
})

describe('resolveIdentifier', () => {
  test('uses name when filenameMode is title', () => {
    const result = resolveIdentifier('My Document', '12345')
    expect(result).toBe('My Document')
  })

  test('falls back to id when name is null', () => {
    const result = resolveIdentifier(null, '12345')
    expect(result).toBe('12345')
  })

  test('sanitizes unsafe characters', () => {
    const result = resolveIdentifier('doc/with:bad*chars', 'id')
    expect(result).not.toContain('/')
    expect(result).not.toContain(':')
    expect(result).not.toContain('*')
  })

  test('prefers title over slug for scribd documents', () => {
    const result = resolveIdentifier('tiktok crash course', 'tiktok-crash-course')
    expect(result).toBe('Tiktok Crash Course')
  })

  test('prefers title over slug for slideshare presentations', () => {
    const result = resolveIdentifier(
      'Everything You Need To Know About ChatGPT',
      'everything-you-need-to-know-about-chatgpt-8ba3'
    )
    expect(result).toBe('Everything You Need To Know About ChatGPT')
  })
})
