import { describe, test, expect } from 'bun:test'
import { groupPagesByDimensions } from '../src/downloaders/scribd'
import type { PageInfo } from '../src/downloaders/scribd/types'

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
