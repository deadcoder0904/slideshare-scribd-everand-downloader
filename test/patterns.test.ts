import { describe, test, expect } from 'bun:test'
import * as scribd from '../src/downloaders/scribd/patterns'
import * as slideshare from '../src/downloaders/slideshare/patterns'
import * as everand from '../src/downloaders/everand/patterns'

describe('scribd patterns', () => {
  test('DOMAIN matches scribd.com URLs', () => {
    expect('https://www.scribd.com/document/123'.match(scribd.DOMAIN)).toBeTruthy()
    expect('https://www.google.com'.match(scribd.DOMAIN)).toBeFalsy()
  })

  test('DOCUMENT captures doc type and ID', () => {
    const match = scribd.DOCUMENT.exec('https://www.scribd.com/document/123456/title')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('document')
    expect(match![2]).toBe('123456')
  })

  test('DOCUMENT matches presentation URLs', () => {
    const match = scribd.DOCUMENT.exec('https://www.scribd.com/presentation/789/slides')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('presentation')
  })

  test('DOCUMENT matches doc URLs', () => {
    const match = scribd.DOCUMENT.exec('https://www.scribd.com/doc/111/name')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('doc')
  })

  test('EMBED captures embed ID', () => {
    const match = scribd.EMBED.exec('https://www.scribd.com/embeds/555666/content')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('555666')
  })
})

describe('slideshare patterns', () => {
  test('DOMAIN matches slideshare.net URLs', () => {
    expect('https://www.slideshare.net/user/pres'.match(slideshare.DOMAIN)).toBeTruthy()
    expect('https://www.scribd.com'.match(slideshare.DOMAIN)).toBeFalsy()
  })

  test('SLIDESHOW captures slug and ID', () => {
    const match = slideshare.SLIDESHOW.exec('https://www.slideshare.net/slideshow/my-deck/12345')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('my-deck')
    expect(match![2]).toBe('12345')
  })

  test('PPT captures slug', () => {
    const match = slideshare.PPT.exec('https://www.slideshare.net/username/my-presentation')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('my-presentation')
  })
})

describe('everand patterns', () => {
  test('DOMAIN matches everand.com URLs', () => {
    expect('https://www.everand.com/podcast-show/123/name'.match(everand.DOMAIN)).toBeTruthy()
    expect('https://www.scribd.com'.match(everand.DOMAIN)).toBeFalsy()
  })

  test('PODCAST_SERIES captures series ID and slug', () => {
    const match = everand.PODCAST_SERIES.exec('https://www.everand.com/podcast-show/999/my-podcast')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('999')
    expect(match![2]).toBe('my-podcast')
  })

  test('PODCAST_EPISODE captures episode ID and slug', () => {
    const match = everand.PODCAST_EPISODE.exec('https://www.everand.com/podcast/777/episode-title')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('777')
    expect(match![2]).toBe('episode-title')
  })

  test('PODCAST_LISTEN captures listen ID', () => {
    const match = everand.PODCAST_LISTEN.exec('https://www.everand.com/listen/podcast/888')
    expect(match).toBeTruthy()
    expect(match![1]).toBe('888')
  })
})
