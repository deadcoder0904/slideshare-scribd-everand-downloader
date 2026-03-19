import { progress, log } from '@clack/prompts'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'
import { config, ensureDir, resolveIdentifier } from '../../utils'
import { SLIDESHOW, PPT } from './patterns'

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function execute(url: string): Promise<void> {
  const slideshowMatch = SLIDESHOW.exec(url)
  const pptMatch = PPT.exec(url)

  if (slideshowMatch) {
    await downloadSlideshow(url, slideshowMatch[1])
  } else if (pptMatch) {
    await downloadSlideshow(url, pptMatch[1])
  } else {
    throw new Error(`Unsupported Slideshare URL: ${url}`)
  }
}

// ---------------------------------------------------------------------------
// HTML extraction helpers (pure functions, testable)
// ---------------------------------------------------------------------------

export function extractSlideCount(html: string): number {
  const primaryMatch = html.match(/"totalSlides"\s*:\s*(\d+)/)
  if (primaryMatch) return parseInt(primaryMatch[1])

  const fallbackMatch = html.match(/1\s*(?:of|\/)\s*(\d+)/)
  return fallbackMatch ? parseInt(fallbackMatch[1]) : 0
}

export function extractSampleImageUrl(html: string): string | null {
  const match = html.match(/https:\/\/image\.slidesharecdn\.com\/[^"']+(?:-320\.jpg|-2048\.jpg)/)
  return match ? match[0] : null
}

export function extractTitle(html: string, fallback: string): string {
  const match =
    html.match(/<title>([^<]+)\|?\s*PDF<\/title>/i) || html.match(/<title>([^<]+)<\/title>/i)
  return match ? match[1].split('|')[0].trim() : fallback
}

// ---------------------------------------------------------------------------
// Slide URL generation
// ---------------------------------------------------------------------------

/**
 * Build all slide URLs by extracting the base pattern
 * and interpolating slide numbers 1..totalSlides.
 *
 * Pattern: https://image.slidesharecdn.com/<slug>/75/<title>-<N>-2048.jpg
 */
export function buildSlideUrls(sampleUrl: string, totalSlides: number): string[] {
  const highResUrl = sampleUrl.replace(/\/85\//, '/75/').replace(/-320\.jpg/, '-2048.jpg')

  const match = highResUrl.match(/^(.*)-\d+-(\d+\.jpg)$/)
  if (!match) return [highResUrl]

  const [, base, suffix] = match
  return Array.from({ length: totalSlides }, (_, i) => `${base}-${i + 1}-${suffix}`)
}

// ---------------------------------------------------------------------------
// Single slide download
// ---------------------------------------------------------------------------

async function downloadSlideImage(
  slideUrl: string,
  pdfDoc: typeof PDFDocument.prototype
): Promise<boolean> {
  const slideResponse = await fetch(slideUrl)
  if (!slideResponse.ok) return false

  const buffer = new Uint8Array(await slideResponse.arrayBuffer())
  const jpgBuffer = await sharp(buffer).jpeg().toBuffer()

  const img = await pdfDoc.embedJpg(jpgBuffer)
  const page = pdfDoc.addPage([img.width, img.height])
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })

  return true
}

// ---------------------------------------------------------------------------
// Core download flow
// ---------------------------------------------------------------------------

async function downloadSlideshow(url: string, slug: string): Promise<void> {
  const cleanUrl = url.split('#')[0]

  const response = await fetch(cleanUrl)
  if (!response.ok) throw new Error(`Failed to fetch page: HTTP ${response.status}`)
  const html = await response.text()

  const totalSlides = extractSlideCount(html)
  const sampleUrl = extractSampleImageUrl(html)
  const title = extractTitle(html, slug)

  if (!sampleUrl || totalSlides === 0) {
    log.warn('Could not extract slides from page. Slideshare structure may have changed.')
    return
  }

  const slideUrls = buildSlideUrls(sampleUrl, totalSlides)
  const identifier = resolveIdentifier(title, slug)

  const progressBar = progress({
    style: 'block',
    max: slideUrls.length,
    indicator: 'timer',
  })
  progressBar.start(`Downloading ${slideUrls.length} slides`)

  const pdfDoc = await PDFDocument.create()

  for (let slideIndex = 0; slideIndex < slideUrls.length; slideIndex++) {
    const downloaded = await downloadSlideImage(slideUrls[slideIndex], pdfDoc)

    if (downloaded) {
      progressBar.advance(1, `Slide ${slideIndex + 1}/${slideUrls.length}`)
    } else {
      progressBar.advance(1, `Skipped slide ${slideIndex + 1} (failed)`)
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    progressBar.error('No slides downloaded')
    return
  }

  progressBar.message('Saving PDF...')
  const pdfPath = `${config.outputDir}/${identifier}.pdf`
  ensureDir(config.outputDir)

  const pdfBytes = await pdfDoc.save()
  await Bun.write(pdfPath, pdfBytes)

  progressBar.stop(`Downloaded ${pdfPath}`)
}
