import { describe, test, expect } from 'bun:test'
import { groupPagesByDimensions, extractTitleFromHtml } from '../src/downloaders/scribd'
import type { PageInfo } from '../src/downloaders/scribd/types'

describe('extractTitleFromHtml', () => {
  test('extracts title from JSON data', () => {
    const html = '{"title":"tiktok crash course","other":"data"}'
    expect(extractTitleFromHtml(html)).toBe('tiktok crash course')
  })

  test('filters out "View on Scribd" generic title', () => {
    const html = '{"title":"View on Scribd"}'
    expect(extractTitleFromHtml(html)).toBeNull()
  })

  test('filters out "Scribd" generic title', () => {
    const html = '{"title":"Scribd"}'
    expect(extractTitleFromHtml(html)).toBeNull()
  })

  test('extracts title from og:title meta tag', () => {
    const html = '<meta property="og:title" content="My Document Title" />'
    expect(extractTitleFromHtml(html)).toBe('My Document Title')
  })

  test('returns null when no title found', () => {
    const html = '<html><body>No title here</body></html>'
    expect(extractTitleFromHtml(html)).toBeNull()
  })
})

describe('groupPagesByDimensions', () => {
  test('groups pages with same dimensions into one group', () => {
    const pages: PageInfo[] = [
      { id: 'p1', width: 800, height: 600 },
      { id: 'p2', width: 800, height: 600 },
      { id: 'p3', width: 800, height: 600 },
    ]
    const groups = groupPagesByDimensions(pages)
    expect(groups).toEqual([{ ids: ['p1', 'p2', 'p3'], width: 800, height: 600 }])
  })

  test('splits pages with different dimensions', () => {
    const pages: PageInfo[] = [
      { id: 'p1', width: 800, height: 600 },
      { id: 'p2', width: 800, height: 600 },
      { id: 'p3', width: 1024, height: 768 },
      { id: 'p4', width: 1024, height: 768 },
    ]
    const groups = groupPagesByDimensions(pages)
    expect(groups).toEqual([
      { ids: ['p1', 'p2'], width: 800, height: 600 },
      { ids: ['p3', 'p4'], width: 1024, height: 768 },
    ])
  })

  test('handles single-page input', () => {
    const pages: PageInfo[] = [{ id: 'p1', width: 800, height: 600 }]
    const groups = groupPagesByDimensions(pages)
    expect(groups).toEqual([{ ids: ['p1'], width: 800, height: 600 }])
  })

  test('returns empty array for empty input', () => {
    expect(groupPagesByDimensions([])).toEqual([])
  })

  test('handles alternating dimensions', () => {
    const pages: PageInfo[] = [
      { id: 'p1', width: 800, height: 600 },
      { id: 'p2', width: 1024, height: 768 },
      { id: 'p3', width: 800, height: 600 },
    ]
    const groups = groupPagesByDimensions(pages)
    expect(groups).toHaveLength(3)
  })
})
