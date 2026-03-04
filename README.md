# Vanduo Framework v1.2.3

<p align="center">
  <img src="vanduo-banner.svg" alt="Vanduo Framework Banner" width="100%">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@vanduo-oss/framework"><img src="https://img.shields.io/npm/v/@vanduo-oss/framework?style=flat-square&color=3b82f6" alt="NPM Version"></a>
  <a href="https://github.com/vanduo-oss/framework/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/vanduo-oss/framework/ci.yml?branch=main&style=flat-square&color=10b981" alt="Build Status"></a>
  <a href="https://github.com/vanduo-oss/framework/blob/main/dist/vanduo.min.css"><img src="https://img.shields.io/badge/minified_size-~110kb-8b5cf6?style=flat-square" alt="Minified Size"></a>
  <a href="https://github.com/vanduo-oss/framework/blob/main/LICENSE"><img src="https://img.shields.io/github/license/vanduo-oss/framework?style=flat-square&color=64748b" alt="License"></a>
</p>

**Essential just like water is.** 

- **Pure HTML, CSS, JS** 
- **No third party dependencies**
- **Free and open source.**

## Overview

A lightweight, pure HTML/CSS/JS framework for designing beautiful interfaces. Zero runtime dependencies, no mandatory build tools, just clean and simple code.

[**Browse Full Documentation →**](https://vanduo.dev/#docs)

## Features

- 🎨 **Pure CSS/JS** - No libraries, no dependencies
- 🚀 **Lightweight** - Minimal file size, maximum performance
- 📱 **Responsive** - Mobile-first design approach
- 🎯 **Utility-First** - Flexible utility classes for rapid development
- 🧩 **Modular** - Import only what you need
- ♿ **Accessible** - Built with accessibility in mind (WCAG 2.1 AA)
- 🌙 **Dark Mode** - Automatic OS preference detection + manual toggle
- 🎛️ **Theme Customizer** - Real-time color, radius, font, and mode customization
- 🔍 **SEO-Ready** - Comprehensive meta tags, structured data, and sitemap

---

## Quick Start

### Option 1: CDN (Recommended)

The quickest way to get started — no install, no build step. Add two lines to any HTML file:

```html
<!-- Vanduo CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vanduo-oss/framework@main/dist/vanduo.min.css">

<!-- Vanduo JS -->
<script src="https://cdn.jsdelivr.net/gh/vanduo-oss/framework@main/dist/vanduo.min.js"></script>
<script>Vanduo.init();</script>
```

**Pin to a specific version** for production:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vanduo-oss/framework@v1.2.3/dist/vanduo.min.css">
<script src="https://cdn.jsdelivr.net/gh/vanduo-oss/framework@v1.2.3/dist/vanduo.min.js"></script>
<script>Vanduo.init();</script>
```

### Option 2: Download

[**Download the dist/ folder**](https://github.com/vanduo-oss/framework/tree/main/dist) and include locally — no internet connection required at runtime:

```html
<link rel="stylesheet" href="dist/vanduo.min.css">
<script src="dist/vanduo.min.js"></script>
<script>Vanduo.init();</script>
```

The `dist/` folder is **self-contained** (CSS, JS, Fonts, Icons).

### Option 3: Source Files

For development or when you need more control, use the unminified source:

```html
<link rel="stylesheet" href="css/vanduo.css">
<script src="js/vanduo.js"></script>
<script>Vanduo.init();</script>
```

### Option 4: With a Bundler (Vite)

> **Requires a build tool.** The imports below use bare module specifiers (`@vanduo-oss/framework`) which browsers cannot resolve on their own. For static HTML files, use the CDN or Download options above.

Scaffold a Vite project and install Vanduo:

```bash
pnpm create vite my-app --template vanilla
cd my-app
pnpm add @vanduo-oss/framework
```

Import in your entry file (e.g. `main.js`):

```js
import '@vanduo-oss/framework/css';
import { Vanduo } from '@vanduo-oss/framework';
Vanduo.init();
```

**Why pnpm?** pnpm enforces a strict lockfile and creates an isolated `node_modules` structure. Vanduo's `.npmrc` security policies work best with pnpm out of the box.

*(Note: `npm install @vanduo-oss/framework` and `yarn add @vanduo-oss/framework` will also work, but they do not enforce the same strict lockfile and isolated `node_modules` security guarantees.)*

---

## LLM Access

This project includes an [`llms.txt`](llms.txt) file — a structured markdown summary designed for AI assistants and LLM-powered code editors. It provides quick access to framework documentation, component references, and usage patterns.

---

## Release Assets (Maintainers)

Use the hardened upload script to attach only approved bundle artifacts from `dist/`:

```bash
pnpm run release:assets -- v1.2.3
```

Notes:
- If tag is omitted, it defaults to `v` + version from `package.json`.
- Use `--dry-run` to preview files without uploading.

---

## Documentation

Comprehensive documentation for all components, utilities, and customization options is available at vanduo.dev.

[**View Documentation**](https://vanduo.dev/#docs)

### Key Capabilities

*   **Dark Mode**: Works automatically with system preferences. Can be forced via `data-theme="dark"` on `<html>`.
*   **Theme Customizer**: Built-in runtime tool to change colors, fonts, and radius.
*   **Modular Imports**: Import only specific components (e.g., `css/components/buttons.css`) to keep your site lean.
*   **Icons**: Includes [Phosphor Icons](https://phosphoricons.com) (Regular + Fill weights bundled).

---

## Project Structure

```
vanduo-framework/
├── dist/                  # Production ready files (minified)
├── css/
│   ├── vanduo.css         # Main framework file (imports all)
│   ├── core/              # Foundation (colors, typography, grid)
│   ├── components/        # UI components (buttons, cards, etc)
│   ├── utilities/         # Utility classes
│   └── effects/           # Visual effects
├── js/
│   ├── vanduo.js          # Main entry point
│   └── components/        # Component logic
├── icons/                 # Phosphor Icons
├── fonts/                 # Web fonts
└── tests/                 # Framework test suite
```

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

- **Color System**: [Open Color](https://yeun.github.io/open-color/) by Heeyeun Jeong (MIT License)
- **Icons**: [Phosphor Icons](https://phosphoricons.com) (MIT License)

---
Vanduo Framework - Built with ❤️ for the web.
