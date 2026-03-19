# slideshare-scribd-everand-downloader

CLI tool for downloading stuff from Scribd, Slideshare, and Everand easily.

> [!WARNING]
> This tool is not intended to bypass paywalls, violate terms of service, or download copyrighted content you are not permitted to access. Use it responsibly.

## Supported Sources

- [scribd.com](https://www.scribd.com/) — documents, presentations, embeds
- [slideshare.net](https://www.slideshare.net/) — slideshows, presentations
- [everand.com](https://www.everand.com/podcasts) — podcast series, episodes, listen pages

### Supported URL Formats

```
https://www.scribd.com/doc/**
https://www.scribd.com/document/**
https://www.scribd.com/presentation/**
https://www.scribd.com/embeds/**
https://www.slideshare.net/**
https://www.slideshare.net/slideshow/**
https://www.everand.com/podcast-show/**
https://www.everand.com/podcast/**
https://www.everand.com/listen/podcast/**
```

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)

## Setup

```bash
bun install
cp .env.example .env  # optional — defaults are sensible
```

## Usage

```bash
bun start
```

Paste or type URLs (one per line), then press Enter to download:

```
https://www.slideshare.net/slideshow/tiktok-douyin-playbook-by-uplab/132915122
https://www.scribd.com/document/679737266/tiktok-crash-course
https://www.everand.com/podcast/967145626/DAVID-GOGGINS-BEST-MOTIVATIONAL-SPEECH-LISTEN-TO-THIS-EVERYDAY-An-unfiltered-deep-dive-into-obsession-self-discipline-and-the-war-inside-your-own
```

Use **Ctrl+J** or **Shift+Enter** for new lines and **Enter** to submit.

## Configuration

Copy `.env.example` to `.env` and customize:

```env
OUTPUT_DIR=dist
FILENAME_MODE=title
SCRIBD_RENDERTIME=100
SLIDESHARE_RENDERTIME=100
```

| Variable                | Description                                         | Default |
| ----------------------- | --------------------------------------------------- | ------- |
| `OUTPUT_DIR`            | Output directory for downloaded files               | `dist`  |
| `FILENAME_MODE`         | `title` uses page title, otherwise uses document ID | `title` |
| `SCRIBD_RENDERTIME`     | Wait time (ms) for Scribd page rendering            | `100`   |
| `SLIDESHARE_RENDERTIME` | Wait time (ms) for Slideshare page rendering        | `100`   |

## Development

```bash
bun lint       # Lint with oxlint (type-aware)
bun fmt        # Format with oxfmt
bun vitest     # Run tests with vitest
bun check      # Run all checks (lint + fmt)
```

## Project Structure

```
src/
├── app.ts              # URL routing via downloader registry
├── browser.ts          # Playwright browser management
├── pdf.ts              # PDF merging
├── url-parser.ts       # URL parsing from user input
├── utils.ts            # Config, helpers, shared utilities
├── ui/
│   └── multiline-prompt.ts  # Interactive multi-line input
└── downloaders/        # Self-contained per-service modules
    ├── scribd/
    │   ├── index.ts     # Scribd download logic
    │   ├── patterns.ts  # URL patterns
    │   └── types.ts     # PageInfo, PageGroup
    ├── slideshare/
    │   ├── index.ts     # Slideshare download logic
    │   └── patterns.ts  # URL patterns
    └── everand/
        ├── index.ts     # Everand download logic
        └── patterns.ts  # URL patterns
```

## Legal

This project is not affiliated with, endorsed by, or sponsored by Scribd, SlideShare, or Everand. All trademarks and copyrights belong to their respective owners. Users are solely responsible for ensuring their use complies with applicable laws and platform terms.

## Inspiration

Based on [rkwyu/scribd-dl](https://github.com/rkwyu/scribd-dl). Rebuilt with Bun for significantly faster downloads, a polished interactive CLI, and a modular codebase that's easy to extend and maintain.

## License

[MIT](LICENSE)
