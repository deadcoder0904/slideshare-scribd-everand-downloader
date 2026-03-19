import { describe, test, expect } from 'bun:test'
import {
  buildSlideUrls,
  extractSlideCount,
  extractSampleImageUrl,
  extractTitle,
} from '../src/downloaders/slideshare'

describe('buildSlideUrls', () => {
  test('generates full sequence of URLs from High-Res sample', () => {
    const sample = 'https://image.slidesharecdn.com/deck/75/title-here-1-2048.jpg'
    const result = buildSlideUrls(sample, 3)

    expect(result.length).toBe(3)
    expect(result[0]).toBe('https://image.slidesharecdn.com/deck/75/title-here-1-2048.jpg')
    expect(result[1]).toBe('https://image.slidesharecdn.com/deck/75/title-here-2-2048.jpg')
    expect(result[2]).toBe('https://image.slidesharecdn.com/deck/75/title-here-3-2048.jpg')
  })

  test('transforms thumbnail sample to High-Res and generates sequence', () => {
    const sample = 'https://image.slidesharecdn.com/playbook/85/tiktok-douyin-1-320.jpg'
    const result = buildSlideUrls(sample, 2)

    expect(result.length).toBe(2)
    expect(result[0]).toBe('https://image.slidesharecdn.com/playbook/75/tiktok-douyin-1-2048.jpg')
    expect(result[1]).toBe('https://image.slidesharecdn.com/playbook/75/tiktok-douyin-2-2048.jpg')
  })

  test('handles non-matching fallback URLs', () => {
    const sample = 'https://example.com/logo.png'
    const result = buildSlideUrls(sample, 5)

    expect(result.length).toBe(1)
    expect(result[0]).toBe(sample)
  })
})

describe('extractSlideCount', () => {
  test('extracts count from totalSlides JSON field', () => {
    const html = '{"totalSlides": 42, "other": "data"}'
    expect(extractSlideCount(html)).toBe(42)
  })

  test('extracts count from "1 of N" fallback pattern', () => {
    const html = '<span>1 of 15</span>'
    expect(extractSlideCount(html)).toBe(15)
  })

  test('extracts count from "1/N" fallback pattern', () => {
    const html = '<span>1/20</span>'
    expect(extractSlideCount(html)).toBe(20)
  })

  test('returns 0 when no slide count found', () => {
    const html = '<html><body>No slides here</body></html>'
    expect(extractSlideCount(html)).toBe(0)
  })
})

describe('extractSampleImageUrl', () => {
  test('extracts 320px thumbnail URL', () => {
    const html = 'src="https://image.slidesharecdn.com/deck/85/title-1-320.jpg" alt="slide"'
    expect(extractSampleImageUrl(html)).toBe(
      'https://image.slidesharecdn.com/deck/85/title-1-320.jpg'
    )
  })

  test('extracts 2048px high-res URL', () => {
    const html = 'src="https://image.slidesharecdn.com/deck/75/title-1-2048.jpg"'
    expect(extractSampleImageUrl(html)).toBe(
      'https://image.slidesharecdn.com/deck/75/title-1-2048.jpg'
    )
  })

  test('returns null when no CDN image found', () => {
    const html = '<html><img src="https://example.com/photo.png" /></html>'
    expect(extractSampleImageUrl(html)).toBeNull()
  })
})

describe('extractTitle', () => {
  test('extracts title from <title> tag with PDF suffix', () => {
    const html = '<title>My Presentation | PDF</title>'
    expect(extractTitle(html, 'fallback')).toBe('My Presentation')
  })

  test('extracts title from plain <title> tag', () => {
    const html = '<title>Another Deck</title>'
    expect(extractTitle(html, 'fallback')).toBe('Another Deck')
  })

  test('strips pipe-delimited suffixes', () => {
    const html = '<title>Cool Slides | SlideShare | PDF</title>'
    expect(extractTitle(html, 'fallback')).toBe('Cool Slides')
  })

  test('returns fallback when no title tag found', () => {
    const html = '<html><body>No title</body></html>'
    expect(extractTitle(html, 'my-slug')).toBe('my-slug')
  })
})
