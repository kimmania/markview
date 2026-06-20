# Markview

A modern desktop Markdown editor and vault manager for macOS and Windows. Built with **Tauri v2 + React + TypeScript + Tailwind CSS**.

## Features (Phase 1)

- 🗂️ **Vault Mode** — Open a folder as your markdown workspace
- 📝 **Edit** — Plain text editor with file creation, edit, and save
- 🌙 **Dark Mode** — Toggle between light and dark themes
- 🖥️ **Native** — Runs as a desktop app using native WebKit/WebView2

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Shell | Tauri v2 (Rust) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Editor | CodeMirror 6 (coming in Phase 2) |
| Renderer | `react-markdown` + `remark-gfm` (coming in Phase 2) |
| State | Zustand |

## Development

### Prerequisites
- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/) (v18+)

### Setup

```bash
# Install dependencies
npm install

# Run in development mode (launches Tauri window)
npm run tauri dev
```

### Build

```bash
# Build for production
npm run tauri build
```

## Roadmap

See the full [Product Plan](.hermes/plans/2026-06-19_markdown-viewer-editor-plan.md) for build phases.

### Phase 0: ✅ Bootstrap
### Phase 1: 🔄 Core Shell & File I/O
### Phase 2: ⏳ Live Split-Pane Preview
### Phase 3: ⏳ Workspace Sidebar & Tabs
### Phase 4: ⏳ Markdown Enhancements (Math, Diagrams, Images)
### Phase 5: ⏳ PDF Export, Settings, Polish
### Phase 6: ⏳ Distribution

## License

MIT
