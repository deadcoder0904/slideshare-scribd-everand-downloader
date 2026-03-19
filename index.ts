import { parse } from '@bomb.sh/args'
import { outro, log, box } from '@clack/prompts'
import { multilinePrompt } from './src/ui/multiline-prompt'
import { parseUrls } from './src/url-parser'
import { executeAll } from './src/app'

const args = parse(process.argv.slice(2))

box('Download documents, slides & podcasts', 'SLIDESHARE / SCRIBD / EVERAND DOWNLOADER', {
  contentAlign: 'center',
  titleAlign: 'center',
  rounded: true,
})

let urls: string[] = args._.map(String).filter((u) => /^https?:\/\//.test(u))

if (urls.length === 0) {
  try {
    const input = await multilinePrompt('Paste or type URLs (one per line)')
    urls = parseUrls(input)

    if (urls.length === 0) {
      log.warn('No valid URLs provided.')
      outro('')
      process.exit(0)
    }
  } catch {
    process.exit(0)
  }
}

log.info(`${urls.length} URL${urls.length > 1 ? 's' : ''} ready`)

try {
  await executeAll(urls)
  outro('Done!')
} catch (err) {
  log.error(err instanceof Error ? err.message : String(err))
  outro('Failed.')
  process.exit(1)
}
