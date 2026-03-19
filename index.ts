import { outro, log, box } from '@clack/prompts'
import { multilinePrompt } from './src/ui/multiline-prompt'
import { parseUrls } from './src/url-parser'
import { executeAll } from './src/app'

box('Download documents, slides & podcasts', 'SLIDESHARE / SCRIBD / EVERAND DOWNLOADER', {
  contentAlign: 'center',
  titleAlign: 'center',
  rounded: true,
})

try {
  const input = await multilinePrompt('Paste or type URLs (one per line)')
  const urls = parseUrls(input)

  if (urls.length === 0) {
    log.warn('No valid URLs provided.')
    outro('')
    process.exit(0)
  }

  log.info(`${urls.length} URL${urls.length > 1 ? 's' : ''} ready`)
  await executeAll(urls)
  outro('Done!')
} catch (err) {
  if (err instanceof Error && err.message === 'cancelled') {
    process.exit(0)
  }
  log.error(err instanceof Error ? err.message : String(err))
  outro('Failed.')
  process.exit(1)
}
