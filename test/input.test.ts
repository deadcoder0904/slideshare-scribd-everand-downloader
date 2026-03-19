import { describe, test, expect } from 'bun:test'
import { parseUrls } from '../src/url-parser'

describe('multi-URL input parsing', () => {
  test('parses multiple URLs from separate lines', () => {
    const input = [
      'https://www.slideshare.net/slideshow/deck/123',
      'https://www.scribd.com/document/456/title',
      'https://www.everand.com/podcast/789/ep',
    ].join('\n')
    expect(parseUrls(input)).toEqual([
      'https://www.slideshare.net/slideshow/deck/123',
      'https://www.scribd.com/document/456/title',
      'https://www.everand.com/podcast/789/ep',
    ])
  })

  test('ignores blank lines', () => {
    const input = [
      'https://www.slideshare.net/slideshow/deck/123',
      '',
      '   ',
      'https://www.scribd.com/document/456/title',
    ].join('\n')
    expect(parseUrls(input)).toEqual([
      'https://www.slideshare.net/slideshow/deck/123',
      'https://www.scribd.com/document/456/title',
    ])
  })

  test('filters out non-URL text', () => {
    const input = [
      'https://www.slideshare.net/slideshow/deck/123',
      'not a url',
      'ftp://wrong-protocol.com',
      'https://www.scribd.com/document/456/title',
    ].join('\n')
    expect(parseUrls(input)).toEqual([
      'https://www.slideshare.net/slideshow/deck/123',
      'https://www.scribd.com/document/456/title',
    ])
  })

  test('trims whitespace around URLs', () => {
    const input = [
      '  https://www.slideshare.net/slideshow/deck/123  ',
      '\thttps://www.scribd.com/document/456/title\t',
    ].join('\n')
    expect(parseUrls(input)).toEqual([
      'https://www.slideshare.net/slideshow/deck/123',
      'https://www.scribd.com/document/456/title',
    ])
  })

  test('returns empty array when no valid URLs', () => {
    expect(parseUrls('hello\nworld')).toEqual([])
    expect(parseUrls('')).toEqual([])
  })
})
