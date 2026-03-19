import { describe, test, expect } from 'bun:test'
import { execute } from '../src/app'

describe('app routing', () => {
  test('throws on unsupported URL', () => {
    expect(execute('https://www.google.com')).rejects.toThrow('Unsupported URL')
  })

  test('throws on empty string', () => {
    expect(execute('')).rejects.toThrow('Unsupported URL')
  })

  test('throws on non-URL input', () => {
    expect(execute('not-a-url')).rejects.toThrow('Unsupported URL')
  })
})
