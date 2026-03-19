import { log } from '@clack/prompts'
import * as scribdPatterns from './downloaders/scribd/patterns'
import * as slidesharePatterns from './downloaders/slideshare/patterns'
import * as everandPatterns from './downloaders/everand/patterns'
import * as scribdDownloader from './downloaders/scribd'
import * as slideshareDownloader from './downloaders/slideshare'
import * as everandDownloader from './downloaders/everand'

// ---------------------------------------------------------------------------
// Downloader registry
// ---------------------------------------------------------------------------

interface Downloader {
  domain: RegExp
  execute: (url: string) => Promise<void>
}

const DOWNLOADERS: Downloader[] = [
  { domain: scribdPatterns.DOMAIN, execute: scribdDownloader.execute },
  { domain: slidesharePatterns.DOMAIN, execute: slideshareDownloader.execute },
  { domain: everandPatterns.DOMAIN, execute: everandDownloader.execute },
]

function findDownloader(url: string): Downloader | undefined {
  return DOWNLOADERS.find((d) => d.domain.test(url))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function execute(url: string): Promise<void> {
  const downloader = findDownloader(url)
  if (!downloader) {
    throw new Error(`Unsupported URL: ${url}`)
  }
  await downloader.execute(url)
}

export async function executeAll(urls: string[]): Promise<void> {
  let failedCount = 0

  for (let i = 0; i < urls.length; i++) {
    log.step(`[${i + 1}/${urls.length}] ${urls[i]}`)

    try {
      await execute(urls[i])
    } catch (err) {
      failedCount++
      log.error(err instanceof Error ? err.message : String(err))
    }
  }

  if (failedCount > 0) {
    log.warn(`${failedCount} of ${urls.length} downloads failed.`)
  }
}
