import { chromium, type Browser, type Page } from 'playwright'
import { ensureDir } from './utils'

let browser: Browser | null = null
const PAGE_LOAD_DELAY_MS = 1000

// ---------------------------------------------------------------------------
// Browser lifecycle
// ---------------------------------------------------------------------------

async function launch(): Promise<Browser> {
  const isCI = Bun.env.CI === 'true'
  const args: string[] = []
  if (isCI) {
    args.push('--no-sandbox', '--disable-setuid-sandbox')
  }
  browser = await chromium.launch({
    headless: true,
    args,
    timeout: 0,
  })
  return browser
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

// ---------------------------------------------------------------------------
// Page operations
// ---------------------------------------------------------------------------

export async function openPage(url: string): Promise<Page> {
  if (!browser) {
    await launch()
  }
  if (!browser) throw new Error('Failed to launch browser')

  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await injectHelperFunctions(page)
  await Bun.sleep(PAGE_LOAD_DELAY_MS)
  return page
}

export async function generatePDF(
  page: Page,
  pdfPath: string,
  options: { width?: number; height?: number } = {}
): Promise<void> {
  const outputDir = pdfPath.substring(0, pdfPath.lastIndexOf('/'))
  ensureDir(outputDir)

  const pdfOptions: NonNullable<Parameters<Page['pdf']>[0]> = {
    path: pdfPath,
    printBackground: true,
  }

  if (options.width && options.height) {
    pdfOptions.width = `${options.width}px`
    pdfOptions.height = `${options.height}px`
  }

  await page.pdf(pdfOptions)
}

// ---------------------------------------------------------------------------
// In-page helper injection
// ---------------------------------------------------------------------------

const BROWSER_HELPER_SCRIPT = `
  window.__helpers__ = {
    lazyLoad: async (selector = null, rendertime = 100) => {
      await new Promise(resolve => {
        const container = selector ? document.querySelector(selector) : null;
        if (selector && !container) {
          return resolve();
        }
        let prevScroll = 0;
        const timer = setInterval(() => {
          if (container) {
            container.scrollTop += container.clientHeight;
            if (container.scrollTop === prevScroll) {
              clearInterval(timer);
              resolve();
            }
            prevScroll = container.scrollTop;
            if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          } else {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, window.innerHeight * 0.8);
            if (window.innerHeight + window.scrollY >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }
        }, rendertime);
      });
    },
    hideSelectorAll: (selector) => {
      document.querySelectorAll(selector).forEach(el => el.style.display = 'none');
    },
    showSelectorAll: (selector) => {
      document.querySelectorAll(selector).forEach(el => el.style.display = 'block');
    },
    removeSelectorAll: (selector) => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    },
    removeMarginSelectorAll: (selector) => {
      document.querySelectorAll(selector).forEach(el => el.style.margin = '0');
    },
    timeout: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  };
`

async function injectHelperFunctions(page: Page): Promise<void> {
  await page.evaluate(BROWSER_HELPER_SCRIPT)
}
