# Emboss in Leantime: File Headers & Separation Guide

## Purpose

This document defines the header comments and file organization that establish
the legal separation between Emboss (commercial) and Leantime (AGPL-3.0) code.

---

## Directory Structure in Leantime

```
public/assets/js/libs/emboss/
├── LICENSE                      ← Emboss commercial license
├── emboss.min.js                ← Bundled Emboss core + Organize extensions
├── emboss.min.js.map            ← Source map (optional, for debugging)
└── emboss.css                   ← Emboss base styles

app/Domain/Tickets/
├── Services/
│   └── EmbossAdapter.php        ← AGPL-3.0 — Leantime data → Emboss Row format
├── Controllers/
│   └── Roadmap.php              ← AGPL-3.0 — unchanged, calls adapter
├── Templates/
│   └── roadmap.blade.php        ← AGPL-3.0 — initializes Emboss with Leantime config
└── Js/
    └── embossInit.js            ← AGPL-3.0 — Leantime-specific callbacks and wiring

public/assets/css/components/
└── emboss-leantime-bridge.css   ← AGPL-3.0 — maps Leantime CSS vars to Emboss CSS vars
```

---

## Header: Emboss Dist File

Place at the top of `emboss.min.js` (preserved by build tooling):

```javascript
/**
 * Emboss Gantt Library v1.0.0
 * Copyright (c) 2025 Leantime, Inc.
 *
 * COMMERCIAL LICENSE — NOT open source.
 * This file is NOT covered by Leantime's AGPL-3.0 license.
 * See /public/assets/js/libs/emboss/LICENSE for full terms.
 *
 * Unauthorized copying, extraction, or use outside of Leantime
 * is strictly prohibited without a separate Emboss license.
 * Visit https://getemboss.io for licensing options.
 */
```

---

## Header: Emboss CSS File

Place at the top of `emboss.css`:

```css
/**
 * Emboss Gantt Library — Styles
 * Copyright (c) 2025 Leantime, Inc.
 * COMMERCIAL LICENSE — See /public/assets/js/libs/emboss/LICENSE
 * NOT covered by Leantime's AGPL-3.0 license.
 */
```

---

## Header: Leantime Adapter (PHP)

Place at the top of `EmbossAdapter.php`:

```php
<?php

/**
 * Emboss Adapter — Transforms Leantime data into Emboss Row format.
 *
 * This file is part of Leantime and is licensed under AGPL-3.0.
 * It calls Emboss's public JavaScript API but does not contain
 * any Emboss source code.
 *
 * @see /public/assets/js/libs/emboss/LICENSE for Emboss's own license
 */

namespace Leantime\Domain\Tickets\Services;
```

---

## Header: Leantime Bridge CSS

Place at the top of `emboss-leantime-bridge.css`:

```css
/**
 * Emboss ↔ Leantime CSS Bridge
 * Maps Leantime's CSS custom properties to Emboss's CSS custom properties.
 *
 * This file is part of Leantime and is licensed under AGPL-3.0.
 * It does NOT contain Emboss source code — it only maps CSS variables.
 */
```

---

## Header: Leantime Init JS

Place at the top of `embossInit.js`:

```javascript
/**
 * Emboss initialization for Leantime
 * Wires Emboss callbacks to Leantime's API endpoints and UI patterns.
 *
 * This file is part of Leantime and is licensed under AGPL-3.0.
 * It calls Emboss's public API but does not contain Emboss source code.
 */
```

---

## Build Process Note

The Emboss build pipeline (`/Herd/emboss/`) produces a single bundled dist file
that includes core + selected extensions. The build should:

1. Bundle core + Free extensions + Organize extensions into one file
2. Minify with source maps
3. Prepend the commercial license header (use a build plugin like
   `rollup-plugin-license` or a banner in the Rollup/Vite config)
4. Output to a `dist/` directory
5. Copy `dist/emboss.min.js` → Leantime's `public/assets/js/libs/emboss/`

The Organize extensions should NOT be published as separate files in the
Leantime repo. Bundle them into the single dist so they're not trivially
extractable as standalone modules.

---

## What Contributors Need to Know

If someone contributes to Leantime and needs to modify how Emboss integrates:

- **Modify freely:** `EmbossAdapter.php`, `emboss-leantime-bridge.css`,
  `embossInit.js`, any `.blade.php` templates — these are AGPL Leantime code
- **Do not modify:** anything in `public/assets/js/libs/emboss/` — these are
  commercial Emboss files. File an issue against Emboss instead.
- **Do not copy:** Emboss code into Leantime source files. Call Emboss's public
  API from Leantime code.

This boundary is the same as any web app that uses a commercial library —
you write integration code in your app, you don't fork the library.
