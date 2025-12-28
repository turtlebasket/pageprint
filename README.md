# pageprint

[![GitHub release](https://img.shields.io/github/v/release/turtlebasket/pageprint)](https://github.com/turtlebasket/pageprint/releases/latest)

## Installation

### From GitHub Releases

1. Download the latest `pageprint.zip` from the [Releases page](https://github.com/turtlebasket/pageprint/releases)
2. Extract the ZIP file to a folder on your computer
3. Open your browser's extension management page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
4. Enable "Developer mode" (toggle in the top-right)
5. Click "Load unpacked" and select the extracted folder

## Development

### Setup

```bash
bun install
```

### Build & Run

```bash
bun run dev       # Watch mode for development
bun run build     # Production build
bun run package   # Build and create ZIP
```

### Release

To create a new release:

```bash
./release-version 0.1.1
```

This will:

- Validate version format (semver)
- Check git is clean
- Update `package.json` and `src/manifest.json`
- Commit, tag, and push
- Trigger GitHub Actions to build and create the release
