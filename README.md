# 🧭 AI Chat Navigator

A beautiful Chrome extension for navigating long conversations in ChatGPT, Claude, and Gemini.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Chrome-orange.svg)

## ✨ Features

- **Visual Mini-Map** — See all your queries and AI responses in a sleek side panel
- **One-Click Navigation** — Jump to any message instantly
- **Smart Scrolling** — Messages are positioned with comfortable padding at the top
- **Filter Messages** — View all, queries only, or responses only
- **Multi-Platform Support** — Works on ChatGPT, Claude, and Gemini
- **Keyboard Shortcuts** — Navigate without touching your mouse
- **Dark Theme** — Premium design that matches AI chat interfaces
- **Live Updates** — Automatically detects new messages as they stream

## 🖼️ Screenshots

<!-- Add your screenshots here -->
![AI Chat Navigator Screenshot](https://res.cloudinary.com/dvfmwmmna/image/upload/v1767024058/CleanShot-29-12-2025_at_7_.00.10_2x_bdq7pz.png)

## 📦 Installation

### From Source (Developer Mode)

1. **Clone or download** this repository
   ```bash
   git clone https://github.com/musabaku/aiChatNavigator.git
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)

3. **Load the extension**
   - Click **Load unpacked**
   - Select the `ai-chat-navigator` folder

4. **Start using!**
   - Go to [ChatGPT](https://chat.openai.com), [Claude](https://claude.ai), or [Gemini](https://gemini.google.com)
   - The navigator panel appears on the right side

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + N` | Toggle navigator panel |
| `Alt + ↑` | Jump to previous user query |
| `Alt + ↓` | Jump to next user query |
| `Alt + T` | Jump to first message (top) |
| `Alt + B` | Jump to last message (bottom) |
| `Alt + 1` | Show all messages |
| `Alt + 2` | Show queries only |
| `Alt + 3` | Show responses only |
| `Alt + R` | Manual refresh |

## 🌐 Supported Platforms

| Platform | URL | Status |
|----------|-----|--------|
| ChatGPT | chat.openai.com, chatgpt.com | ✅ Fully Supported |
| Claude | claude.ai | ✅ Fully Supported |
| Gemini | gemini.google.com | ✅ Fully Supported |

## 📁 Project Structure

```
ai-chat-navigator/
├── manifest.json      # Extension configuration
├── content.js         # Main navigation logic
├── styles.css         # Premium dark theme styling
├── README.md          # This file
└── icons/
    ├── icon16.svg     # Toolbar icon
    ├── icon48.svg     # Extension page icon
    └── icon128.svg    # Chrome Web Store icon
```

## 🔒 Privacy

This extension:
- ✅ Runs **entirely locally** in your browser
- ✅ Does **NOT** collect any data
- ✅ Does **NOT** make any network requests
- ✅ Does **NOT** store any conversation content
- ✅ Only reads the DOM to find message elements for navigation

## 🛠️ Development

### Prerequisites
- Google Chrome browser
- Basic knowledge of Chrome extensions

### Making Changes
1. Edit the source files (`content.js`, `styles.css`, etc.)
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload the target page (ChatGPT/Claude/Gemini)

### Debug Mode
Open the browser console (`F12`) to see debug logs:
- `AI Navigator: Detected platform - ChatGPT`
- `AI Navigator: Found X messages`
- `AI Navigator: Scrolling to message X`

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Navigator not appearing | Refresh the page, check extension is enabled |
| Messages not detected | Press `Alt + R` to force refresh |
| Scroll position off | AI platforms update frequently; pull latest version |
| "Empty message" shown | Wait 3 seconds for auto-update, or press `Alt + R` |

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs via GitHub Issues
- Submit pull requests with improvements
- Suggest new features

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

Made with ❤️ for productive AI conversations
