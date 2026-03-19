import { spinner, progress, log } from '@clack/prompts'
import { config, sleep, ensureDir } from '../../utils'
import { openPage, closeBrowser } from '../../browser'
import { PODCAST_SERIES, PODCAST_EPISODE, PODCAST_LISTEN } from './patterns'
import type { Page } from 'playwright'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EpisodeMetadata {
  title: string
  audioUrl: string
  seriesUrl: string
}

interface SeriesInfo {
  totalEpisodes: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function execute(url: string): Promise<void> {
  if (url.match(PODCAST_SERIES)) {
    await downloadSeries(url)
  } else if (url.match(PODCAST_EPISODE)) {
    const match = PODCAST_EPISODE.exec(url)!
    await downloadEpisode(`https://www.everand.com/listen/podcast/${match[1]}`)
  } else if (url.match(PODCAST_LISTEN)) {
    await downloadEpisode(url)
  } else {
    throw new Error(`Unsupported Everand URL: ${url}`)
  }
}

// ---------------------------------------------------------------------------
// Page data extraction
// ---------------------------------------------------------------------------

async function extractEpisodeMetadata(page: Page): Promise<EpisodeMetadata> {
  const title: string = await page.evaluate(
    () => (globalThis as any).Scribd.current_doc.short_title
  )
  const audioUrl: string = await page.evaluate(
    () => document.querySelector('audio#audioplayer')!.getAttribute('src')!
  )
  const seriesUrl: string = await page.evaluate(
    () =>
      document
        .querySelector('a[href^="https://www.everand.com/podcast-show/"]')!
        .getAttribute('href')!
  )
  return { title, audioUrl, seriesUrl }
}

async function extractSeriesInfo(page: Page): Promise<SeriesInfo> {
  const totalEpisodes: number = await page.evaluate(() =>
    parseInt(
      document
        .querySelector('span[data-e2e="podcast-series-header-total-episodes"]')!
        .textContent!.replace('episodes', '')
        .trim()
    )
  )

  const totalPages: number = await page.evaluate(() =>
    Number(
      [...document.querySelectorAll('div[data-e2e="pagination"] a[aria-label^="Page"]')].at(-1)
        ?.textContent ?? '1'
    )
  )

  return { totalEpisodes, totalPages }
}

// ---------------------------------------------------------------------------
// Episode download
// ---------------------------------------------------------------------------

async function downloadEpisode(url: string, showProgress = true): Promise<void> {
  const episodeId = PODCAST_LISTEN.exec(url)![1]
  const page = await openPage(url)

  await sleep(1000)

  const { title, audioUrl } = await extractEpisodeMetadata(page)
  ensureDir(config.outputDir)

  let statusSpinner: ReturnType<typeof spinner> | null = null
  if (showProgress) {
    statusSpinner = spinner()
    statusSpinner.start('Downloading episode...')
  }

  const filePath = `${config.outputDir}/${episodeId}_${title}.mp3`
  const response = await fetch(audioUrl)
  await Bun.write(filePath, response)

  if (showProgress && statusSpinner) {
    statusSpinner.stop('Episode downloaded')
    log.success(`Downloaded: ${filePath}`)
  }

  await page.close()
  if (showProgress) {
    await closeBrowser()
  }
}

// ---------------------------------------------------------------------------
// Series download
// ---------------------------------------------------------------------------

async function downloadSeries(url: string): Promise<void> {
  const page = await openPage(url)
  await sleep(1000)

  const { totalEpisodes, totalPages } = await extractSeriesInfo(page)

  const progressBar = progress({
    style: 'block',
    max: totalEpisodes,
    indicator: 'timer',
  })
  progressBar.start(`Downloading ${totalEpisodes} episodes`)
  let downloaded = 0

  for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
    await page.goto(`${url}?page=${pageIndex}&sort=desc`, { waitUntil: 'load' })
    await sleep(1000)

    const episodeUrls: string[] = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'div.breakpoint_hide.below a[data-e2e="podcast-episode-player-button"]'
        ),
      ].map((x) => (x as HTMLAnchorElement).href)
    )

    for (let episodeIndex = 0; episodeIndex < episodeUrls.length; episodeIndex++) {
      await downloadEpisode(episodeUrls[episodeIndex], false)
      downloaded++
      progressBar.advance(1, `Episode ${downloaded}/${totalEpisodes}`)
    }
  }

  progressBar.stop(`Downloaded ${downloaded} episodes`)
  await page.close()
  await closeBrowser()
}
