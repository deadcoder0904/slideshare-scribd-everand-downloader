import { stdin as input, stdout as output } from 'node:process'
import * as p from '@clack/prompts'

// ---------------------------------------------------------------------------
// Buffer state & pure helpers
// ---------------------------------------------------------------------------

interface BufferState {
  text: string
  cursor: number
}

function insertText(state: BufferState, newText: string): BufferState {
  return {
    text: state.text.slice(0, state.cursor) + newText + state.text.slice(state.cursor),
    cursor: state.cursor + newText.length,
  }
}

function deleteBack(state: BufferState, count: number): BufferState {
  if (state.cursor === 0 || count === 0) return state
  const deleteLen = Math.min(count, state.cursor)
  return {
    text: state.text.slice(0, state.cursor - deleteLen) + state.text.slice(state.cursor),
    cursor: state.cursor - deleteLen,
  }
}

function deleteForward(state: BufferState): BufferState {
  if (state.cursor >= state.text.length) return state
  return {
    text: state.text.slice(0, state.cursor) + state.text.slice(state.cursor + 1),
    cursor: state.cursor,
  }
}

// ---------------------------------------------------------------------------
// Cursor navigation helpers
// ---------------------------------------------------------------------------

function moveCursorLeft(state: BufferState): BufferState {
  return state.cursor > 0 ? { ...state, cursor: state.cursor - 1 } : state
}

function moveCursorRight(state: BufferState): BufferState {
  return state.cursor < state.text.length ? { ...state, cursor: state.cursor + 1 } : state
}

function moveCursorUp(state: BufferState): BufferState {
  const before = state.text.slice(0, state.cursor)
  const prevNewline = before.lastIndexOf('\n')
  if (prevNewline < 0) return state

  const col = state.cursor - prevNewline - 1
  const prevPrevNewline = state.text.lastIndexOf('\n', prevNewline - 1)
  const prevLineLen = prevNewline - (prevPrevNewline + 1)
  return { ...state, cursor: prevPrevNewline + 1 + Math.min(col, prevLineLen) }
}

function moveCursorDown(state: BufferState): BufferState {
  const before = state.text.slice(0, state.cursor)
  const currentLineStart = before.lastIndexOf('\n') + 1
  const col = state.cursor - currentLineStart
  const nextNewline = state.text.indexOf('\n', state.cursor)
  if (nextNewline < 0) return state

  const nextNextNewline = state.text.indexOf('\n', nextNewline + 1)
  const nextLineLen =
    (nextNextNewline >= 0 ? nextNextNewline : state.text.length) - (nextNewline + 1)
  return { ...state, cursor: nextNewline + 1 + Math.min(col, nextLineLen) }
}

function moveCursorToLineStart(state: BufferState): BufferState {
  const before = state.text.slice(0, state.cursor)
  return { ...state, cursor: before.lastIndexOf('\n') + 1 }
}

function moveCursorToLineEnd(state: BufferState): BufferState {
  const nextNewline = state.text.indexOf('\n', state.cursor)
  return { ...state, cursor: nextNewline >= 0 ? nextNewline : state.text.length }
}

// ---------------------------------------------------------------------------
// Key handler dispatch
// ---------------------------------------------------------------------------

type KeyResult = 'submit' | 'cancel' | 'handled' | 'ignored'

type KeyHandler = (
  state: BufferState,
  keySequence: string
) => { result: KeyResult; state: BufferState }

function handleDeleteWord(state: BufferState): { result: KeyResult; state: BufferState } {
  if (state.cursor === 0) return { result: 'handled', state }
  const before = state.text.slice(0, state.cursor)
  const match = before.match(/(?:.*\s)?(\S+)$/)
  const deleteLen = match ? match[1].length : 1
  return { result: 'handled', state: deleteBack(state, deleteLen) }
}

const KEY_HANDLERS: Map<string, KeyHandler> = new Map([
  ['\x03', (state) => ({ result: 'cancel', state })],
  ['\r', (state) => ({ result: 'submit', state })],
  ['\n', (state) => ({ result: 'handled', state: insertText(state, '\n') })],
  ['\x17', (state) => handleDeleteWord(state)],
  ['\x7f', (state) => ({ result: 'handled', state: deleteBack(state, 1) })],
  ['\x1b[3~', (state) => ({ result: 'handled', state: deleteForward(state) })],
  ['\x1b[D', (state) => ({ result: 'handled', state: moveCursorLeft(state) })],
  ['\x1b[C', (state) => ({ result: 'handled', state: moveCursorRight(state) })],
  ['\x1b[A', (state) => ({ result: 'handled', state: moveCursorUp(state) })],
  ['\x1b[B', (state) => ({ result: 'handled', state: moveCursorDown(state) })],
  ['\x1b[H', (state) => ({ result: 'handled', state: moveCursorToLineStart(state) })],
  ['\x01', (state) => ({ result: 'handled', state: moveCursorToLineStart(state) })],
  ['\x1b[F', (state) => ({ result: 'handled', state: moveCursorToLineEnd(state) })],
  ['\x05', (state) => ({ result: 'handled', state: moveCursorToLineEnd(state) })],
])

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderBuffer(buffer: string, cursor: number, prev: { lineCount: number; cursorRow: number }) {
  // Move from where cursor was left to the top of the block
  if (prev.cursorRow > 0) {
    output.write(`\x1b[${prev.cursorRow}A`)
  }
  output.write('\r')

  // Clear all previously rendered lines
  for (let i = 0; i < prev.lineCount; i++) {
    output.write('\x1b[2K')
    if (i < prev.lineCount - 1) output.write('\x1b[B')
  }

  // Move back to top
  if (prev.lineCount > 1) {
    output.write(`\x1b[${prev.lineCount - 1}A`)
  }
  output.write('\r')

  // Draw all lines
  const lines = buffer.split('\n')

  for (let i = 0; i < lines.length; i++) {
    output.write('\x1b[2K│  ' + lines[i])
    if (i < lines.length - 1) output.write('\n')
  }

  // Calculate where cursor should be
  const before = buffer.slice(0, cursor)
  const cursorRow = before.split('\n').length - 1
  const cursorCol = cursor - before.lastIndexOf('\n') - 1

  // Move from last row to cursor row
  const lastRow = lines.length - 1
  if (lastRow > cursorRow) {
    output.write(`\x1b[${lastRow - cursorRow}A`)
  }
  output.write(`\r\x1b[${3 + cursorCol}C`)

  return { lineCount: lines.length, cursorRow }
}

// ---------------------------------------------------------------------------
// Public prompt
// ---------------------------------------------------------------------------

/**
 * A Clack-compatible multiline text prompt.
 *
 * - Enter → submit
 * - Ctrl+J → new line
 * - Ctrl+C → cancel (rejects with Error)
 * - Ctrl+Backspace → delete word
 * - Backspace → delete char
 * - Arrow keys → move cursor
 * - Paste → buffers entire chunk including newlines
 */
export async function multilinePrompt(message: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let state: BufferState = { text: '', cursor: 0 }
    let prev = { lineCount: 0, cursorRow: 0 }

    input.setRawMode(true)
    input.resume()
    input.setEncoding('utf8')

    p.note([message, '', 'Enter → submit', 'Ctrl+J → new line', 'Ctrl+C → cancel'].join('\n'))

    prev = renderBuffer(state.text, state.cursor, prev)

    function cleanup() {
      input.setRawMode(false)
      input.pause()
      input.removeListener('data', onData)
      // Move to end of content
      const lines = state.text.split('\n')
      const lastRow = lines.length - 1
      if (lastRow > prev.cursorRow) {
        output.write(`\x1b[${lastRow - prev.cursorRow}B`)
      }
      output.write('\n')
    }

    function onData(keySequence: string) {
      const handler = KEY_HANDLERS.get(keySequence)

      if (handler) {
        const { result, state: newState } = handler(state, keySequence)
        state = newState

        if (result === 'cancel') {
          cleanup()
          p.cancel('Cancelled.')
          reject(new Error('cancelled'))
          return
        }

        if (result === 'submit') {
          cleanup()
          resolve(state.text)
          return
        }

        prev = renderBuffer(state.text, state.cursor, prev)
        return
      }

      // Ignore other escape sequences
      if (keySequence.startsWith('\x1b')) return

      // Paste / regular typing — normalize \r\n and \r to \n
      const normalized = keySequence.length > 1 ? keySequence.replace(/\r\n?/g, '\n') : keySequence
      state = insertText(state, normalized)
      prev = renderBuffer(state.text, state.cursor, prev)
    }

    input.on('data', onData)
  })
}
