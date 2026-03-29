# OpenOxygen Desktop

Tauri-based desktop application for OpenOxygen.

## Features

- **System Tray**: Minimize to tray, quick access
- **Window Controls**: Native window management
- **Dashboard**: System status, recent tasks, quick actions
- **Browser**: Integrated OxygenBrowser (WebView2)
- **Skills**: Browse and execute automation skills
- **Memory**: View and manage agent memory
- **Settings**: Configure application preferences

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Rust + Tauri
- **UI**: Custom components with CSS variables
- **State**: Pinia
- **Routing**: Vue Router

## Development

### Prerequisites

- Node.js 18+
- Rust toolchain
- Tauri CLI

### Setup

```bash
cd desktop
npm install
```

### Run Development

```bash
npm run tauri:dev
```

### Build

```bash
npm run tauri:build
```

## Project Structure

```
desktop/
├── src/
�?  ├── components/      # Vue components
�?  �?  ├── icons/      # Icon components
�?  �?  ├── AppHeader.vue
�?  �?  ├── AppSidebar.vue
�?  �?  ├── AppStatusBar.vue
�?  �?  └── SearchBar.vue
�?  ├── views/          # Page views
�?  �?  ├── Dashboard.vue
�?  �?  ├── Browser.vue
�?  �?  ├── Skills.vue
�?  �?  ├── Memory.vue
�?  �?  └── Settings.vue
�?  ├── router/         # Vue Router config
�?  ├── styles/         # Global styles
�?  ├── main.ts         # Entry point
�?  └── App.vue         # Root component
├── src-tauri/          # Rust backend
�?  ├── src/
�?  �?  └── main.rs     # Tauri commands
�?  ├── Cargo.toml
�?  └── tauri.conf.json
├── package.json
├── vite.config.ts
└── README.md
```

## UI Design

### Color Scheme (Dark)

- Background: #0d1117 (primary), #161b22 (secondary)
- Text: #e6edf3 (primary), #7d8590 (secondary)
- Accent: #2f81f7 (primary), #238636 (success)
- Border: #30363d

### Layout

- Header: 48px height with window controls
- Sidebar: 240px width with navigation
- Main: Flexible content area
- Status Bar: 28px height with system info

## Integration with OpenOxygen

The desktop app integrates with OpenOxygen core via:

1. **Tauri Commands**: Rust backend calls OpenOxygen APIs
2. **Events**: Real-time updates from agent system
3. **Shared State**: Synchronized with core memory system

## Roadmap

- [x] Basic layout and navigation
- [x] System tray integration
- [x] Dashboard view
- [x] Browser placeholder
- [ ] Full OxygenBrowser integration
- [ ] Skills execution UI
- [ ] Memory visualization
- [ ] Settings panel
- [ ] Notifications
- [ ] Auto-updater
