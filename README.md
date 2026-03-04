# github-notify

Desktop notifications for GitHub notifications. Polls your GitHub notifications and displays desktop alerts on Linux (GNOME/KDE).

## Features

- Desktop notifications via `notify-send` (GNOME) or `kdialog` (KDE)
- Automatic polling every 30 seconds
- Marks threads as read automatically
- Support for private repositories
- Auto-setup wizard on first run

## Installation

### From Source

```bash
bun install
bun run build
```

This creates an executable at `dist/github-notify`.

### Running

```bash
# Development
bun run dev

# Production
./dist/github-notify
```

On first run, the setup wizard will guide you through configuration.

## Usage

```bash
./dist/github-notify        # Start notifications (runs setup if needed)
./dist/github-notify run     # Same as above
./dist/github-notify setup  # Re-run setup wizard
```

## Setup

1. Create a GitHub Personal Access Token at: https://github.com/settings/tokens
2. Required scopes:
   - `notifications` (required)
   - `repo` (for private repositories)
3. Select your desktop environment (GNOME or KDE)

The config is saved to `~/.config/github-notify/config.json`.

## Autostart

### Option 1: XDG Autostart (recommended)

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/github-notify.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=github-notify
Comment=GitHub desktop notifications
Exec=/path/to/dist/github-notify
X-GNOME-Autostart-enabled=true
EOF
```

### Option 2: systemd

```bash
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/github-notify.service << 'EOF'
[Unit]
Description=GitHub desktop notifications
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/path/to/dist/github-notify
Restart=on-failure
RestartSec=15
Environment=DBUS_SESSION_BUS_ADDRESS=%I

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now github-notify
```

## Project Structure

```
├── index.ts          # CLI entry point
├── src/
│   ├── setup.ts      # Setup wizard
│   ├── github-notify.ts  # Main polling logic
│   └── shared/       # Shared config, types, constants
├── dist/
│   └── github-notify # Compiled executable
└── package.json
```

## Scripts

- `bun run dev` - Development mode
- `bun run build` - Build Linux executable
- `bun run build:macos` - Build macOS executable
- `bun run build:win` - Build Windows executable
- `bun run typecheck` - TypeScript check

## License

MIT
