import { describe, test, expect } from 'bun:test'
import { config } from '../src/utils'

describe('config', () => {
  test('has default outputDir', () => {
    expect(config.outputDir).toBe('dist')
  })

  test('has default filenameMode', () => {
    expect(config.filenameMode).toBe('title')
  })

  test('has default scribdRendertime', () => {
    expect(config.scribdRendertime).toBe(100)
  })

  test('has default slideshareRendertime', () => {
    expect(config.slideshareRendertime).toBe(100)
  })

  test('scribdRendertime is a number', () => {
    expect(typeof config.scribdRendertime).toBe('number')
  })
})
