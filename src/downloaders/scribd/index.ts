import { spinner } from '@clack/prompts'
import type { Page } from 'playwright'
import { config, ensureDir, cleanDir, resolveIdentifier } from '../../utils'
import { openPage, generatePDF, closeBrowser } from '../../browser'
import { mergePdfs } from '../../pdf'
import { DOCUMENT, EMBED } from './patterns'
import type { PageInfo, PageGroup } from './types'

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function execute(url: string): Promise<void> {
  const docMatch = DOCUMENT.exec(url)
  const embedMatch = EMBED.exec(url)

  if (docMatch) {
    const title = await fetchDocumentTitle(
      `https://www.scribd.com/document/${docMatch[2]}/${docMatch[2]}`
    )
    await downloadEmbed(`https://www.scribd.com/embeds/${docMatch[2]}/content`, title)
  } else if (embedMatch) {
    const title = await fetchDocumentTitle(
      `https://www.scribd.com/document/${embedMatch[1]}/${embedMatch[1]}`
    )
    await downloadEmbed(url, title)
  } else {
    throw new Error(`Unsupported Scribd URL: ${url}`)
  }
}

// ---------------------------------------------------------------------------
// Title extraction from document page
// ---------------------------------------------------------------------------

export function extractTitleFromHtml(html: string): string | null {
  // Match first "title":"..." in JSON data (the document's own title)
  const jsonMatch = html.match(/"title"\s*:\s*"([^"]+)"/)
  if (jsonMatch) {
    const title = jsonMatch[1].trim()
    // Filter out generic/junk titles
    if (title && !title.match(/^(View on Scribd|Scribd)$/i)) {
      return title
    }
  }

  // Try og:title meta tag
  const ogMatch = html.match(/<meta\s[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
  if (ogMatch) return ogMatch[1].trim()

  return null
}

async function fetchDocumentTitle(documentUrl: string): Promise<string | null> {
  try {
    const response = await fetch(documentUrl)
    if (!response.ok) return null
    const html = await response.text()
    return extractTitleFromHtml(html)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Core download flow
// ---------------------------------------------------------------------------

async function downloadEmbed(url: string, title: string | null): Promise<void> {
  const match = EMBED.exec(url)
  if (!match) throw new Error(`Unsupported URL: ${url}`)

  const documentId = match[1]
  const startTime = Date.now()
  const statusSpinner = spinner()
  statusSpinner.start('Loading page...')

  const page = await openPage(url)

  try {
    statusSpinner.message('Processing document...')
    const pages = await prepareDocumentForExport(page)
    const identifier = resolveIdentifier(title, documentId)
    const pdfPath = `${config.outputDir}/${identifier}.pdf`
    ensureDir(config.outputDir)

    statusSpinner.message(`${pages.length} pages found, generating PDF...`)

    const allSameSize = pages.every(
      (p) => p.width === pages[0].width && p.height === pages[0].height
    )

    if (allSameSize) {
      await downloadUniformPages(page, pdfPath, pages[0])
    } else {
      await downloadMixedPages(page, pdfPath, identifier, pages, statusSpinner)
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000)
    statusSpinner.stop(`Downloaded ${pdfPath} [${elapsed}s]`)
  } finally {
    await page.close()
    await closeBrowser()
  }
}

// ---------------------------------------------------------------------------
// PDF generation strategies
// ---------------------------------------------------------------------------

async function downloadUniformPages(
  page: Page,
  pdfPath: string,
  dimensions: { width: number; height: number }
): Promise<void> {
  await generatePDF(page, pdfPath, dimensions)
}

async function downloadMixedPages(
  page: Page,
  pdfPath: string,
  identifier: string,
  pages: PageInfo[],
  statusSpinner: ReturnType<typeof spinner>
): Promise<void> {
  const tempDir = `${config.outputDir}/${identifier}_temp`
  const groups = groupPagesByDimensions(pages)

  statusSpinner.message(`Generating ${groups.length} page groups...`)
  const pdfPaths = await generateGroupPDFs(page, groups, tempDir, statusSpinner)

  statusSpinner.message('Merging PDFs...')
  await mergePdfs(pdfPaths, pdfPath)
  cleanDir(tempDir)
}

// ---------------------------------------------------------------------------
// Page processing & DOM extraction
// ---------------------------------------------------------------------------

async function prepareDocumentForExport(page: Page): Promise<PageInfo[]> {
  return await page.evaluate(async (rendertime: number) => {
    const helpers = (window as any).__helpers__

    // Remove cookie/opt-in overlays
    ;['div.customOptInDialog', "div[aria-label='Cookie Consent Banner']"].forEach((sel) => {
      helpers.removeSelectorAll(sel)
    })

    // Lazy-load all pages
    await helpers.lazyLoad('div.document_scroller', rendertime)

    // Remove margins for clean PDF output
    helpers.removeMarginSelectorAll("div.outer_page_container div[id^='outer_page_']")

    // Collect page dimensions
    const pages: { id: string; width: number; height: number }[] = []
    document.querySelectorAll("div.outer_page_container div[id^='outer_page_']").forEach((dom) => {
      const style = getComputedStyle(dom)
      pages.push({
        id: dom.id,
        width: parseInt(style.width),
        height: parseInt(style.height),
      })
    })

    // Replace body with just the document content
    document.body.innerHTML = document.querySelector('div.outer_page_container')!.innerHTML

    return pages
  }, config.scribdRendertime)
}

// ---------------------------------------------------------------------------
// Dimension grouping (exported for testing)
// ---------------------------------------------------------------------------

export function groupPagesByDimensions(pages: PageInfo[]): PageGroup[] {
  if (pages.length === 0) return []

  const groups: PageGroup[] = []
  let currentIds = [pages[0].id]

  for (let i = 1; i < pages.length; i++) {
    const prev = pages[i - 1]
    const curr = pages[i]

    if (curr.width === prev.width && curr.height === prev.height) {
      currentIds.push(curr.id)
    } else {
      groups.push({ ids: currentIds, width: prev.width, height: prev.height })
      currentIds = [curr.id]
    }
  }

  const lastPage = pages[pages.length - 1]
  groups.push({ ids: currentIds, width: lastPage.width, height: lastPage.height })

  return groups
}

// ---------------------------------------------------------------------------
// Group PDF generation
// ---------------------------------------------------------------------------

async function generateGroupPDFs(
  page: Page,
  groups: PageGroup[],
  tempDir: string,
  statusSpinner: ReturnType<typeof spinner>
): Promise<string[]> {
  ensureDir(tempDir)

  const pdfPaths: string[] = []
  await page.evaluate(() => {
    ;(window as any).__helpers__.hideSelectorAll("div[id^='outer_page_']")
  })

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex]

    await page.evaluate((ids: string[]) => {
      ;(window as any).__helpers__.showSelectorAll(ids.map((id) => `div#${id}`).join(','))
    }, group.ids)

    const pdfPath = `${tempDir}/${(groupIndex + 1).toString().padStart(5, '0')}.pdf`
    await generatePDF(page, pdfPath, { width: group.width, height: group.height })
    pdfPaths.push(pdfPath)
    statusSpinner.message(`Group ${groupIndex + 1}/${groups.length} done`)

    await page.evaluate((ids: string[]) => {
      ;(window as any).__helpers__.removeSelectorAll(ids.map((id) => `div#${id}`).join(','))
    }, group.ids)
  }

  return pdfPaths
}
