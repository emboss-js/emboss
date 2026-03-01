# Emboss Addendum 005: License Enforcement Model

**Date:** 2026-02-24  
**Replaces:** Build spec Section 10 Phase 6 ("soft enforcement", "console warning")  
**Affects:** Package structure, extension loading, API reference  

---

## Decision

**Single npm package. Paid features gated by runtime license key. No key = features don't execute.**

Not a console warning. Not an honor system. The paid extension code ships minified and obfuscated in the bundle. Without a valid license key, those code paths don't run. With a key, they unlock.

---

## How It Works

### Package Structure (what ships in `@emboss/core`)

```
@emboss/core/
├── dist/
│   ├── emboss.js              ← core + free extensions (readable, MIT)
│   ├── emboss.min.js          ← core + free extensions (minified)
│   ├── emboss-pro.min.js      ← paid extensions (minified + obfuscated)
│   ├── emboss.css             ← all styles
│   └── emboss.d.ts            ← full TypeScript declarations (all features)
├── LICENSE                     ← MIT for core, commercial for pro
└── package.json
```

TypeScript declarations are **complete** — developers get autocomplete and type checking for all features, free and paid. They can see the API shape, read the docs, plan their integration. The types are documentation, not the implementation.

### Initialization

```typescript
import { Emboss } from '@emboss/core'
import { todayMarker, tooltips, arrows } from '@emboss/core/extensions'
import { sidebar, phases, milestones } from '@emboss/core/extensions/organize'

// Without key — free extensions work, paid extensions are no-ops
const chart = new Emboss('#gantt', rows, {
  extensions: [todayMarker, tooltips, arrows, sidebar, phases, milestones],
  theme: 'dark'
})
// Result: today marker ✓, tooltips ✓, arrows ✓
//         sidebar ✗ (silently skipped), phases ✗, milestones ✗

// With key — everything works
const chart = new Emboss('#gantt', rows, {
  licenseKey: 'EMB-XXXX-XXXX-XXXX',
  extensions: [todayMarker, tooltips, arrows, sidebar, phases, milestones],
  theme: 'dark'
})
// Result: everything ✓
```

### What "Silently Skipped" Means

When a paid extension is registered without a valid key:

1. Extension's `init()` is **not called**
2. Extension's renderers are **not registered**
3. Extension's event handlers are **not wired**
4. Extension's styles are **not injected**
5. **One** console.info (not warning, not error): `"Emboss: Organize features require a license key. Get one at getemboss.io/pricing"`
6. Everything else works normally — free extensions, core rendering, drag, etc.

No broken UI. No error states. No degraded experience. The paid features simply aren't there — as if you never imported them.

### What the Key Validates

The license key is validated **locally, at runtime, on initialization only.** No server calls. No phone-home. No telemetry.

The key encodes:
- Which bundles are licensed (Organize, People, Vivid, Subtasks)
- Expiry date (for subscription-based licenses, if you go there later)
- A checksum to prevent tampering

```typescript
// Key format: EMB-{bundle_flags}-{expiry}-{checksum}
// Bundle flags: O=Organize, P=People, V=Vivid, S=Subtasks
// Example: EMB-OPVS-20271231-a8f3e2 (all bundles, expires end of 2027)

function validateKey(key: string): { valid: boolean, bundles: string[] } {
  // Decode, verify checksum, check expiry
  // Returns which bundles this key unlocks
}
```

For one-time purchases (current pricing: Organize $49, templates $19), the expiry can be set far out (2099) or omitted entirely. The structure supports subscriptions later if you want, without changing the key format.

### What Gets Obfuscated

**Paid extension source code** is:
1. Minified (variable names stripped)
2. Obfuscated (control flow flattened, string literals encoded)
3. Bundled into a single `emboss-pro.min.js` file

This isn't DRM — a determined reverse-engineer can still extract it. But it makes it harder than "read the source and copy-paste." The goal is to make paying easier than stealing, which at $49 it already is.

**Free extension source code** stays readable. It's MIT licensed. People should be able to read it, learn from it, fork it.

---

## What Engineers See

### Before Purchase

- Full API docs (all methods, all events, all types) ✓
- TypeScript declarations with autocomplete for everything ✓
- Free extensions working perfectly ✓
- Paid extensions importable but non-functional ✓
- One polite console message pointing to pricing ✓

### After Purchase

- License key entered in config ✓
- All purchased bundle features activate ✓
- No console messages ✓
- No server calls ✓
- Key works offline, in CI, in Docker, everywhere ✓

---

## Bundles and Keys

| Bundle | Price | Key Flag | What Unlocks |
|---|---|---|---|
| Organize | $49 | O | Sidebar, phases, milestones, inline edit, reorder, collapse, "+" menu |
| People | $29 | P | Avatars, assignee colors, team grouping |
| Vivid | $19 | V | Color system, per-phase colors, color picker, hue-shift gradients |
| Subtasks | $29 | S | Depth 2 rows, re-parent drag, subtask creation, parent collapse |
| All Bundles | $99 | OPVS | Everything |

Prices are placeholders — adjust as needed. The key system supports any combination.

---

## Build Process

The build step that produces the npm package:

1. Compile core + free extensions → `emboss.js` (readable, sourcemapped)
2. Compile paid extensions → `emboss-pro.js` (readable, for development)
3. Minify core → `emboss.min.js`
4. Minify + obfuscate paid → `emboss-pro.min.js` (this is what ships)
5. Generate combined TypeScript declarations → `emboss.d.ts`
6. Bundle CSS → `emboss.css` (all themes, all extensions)
7. Package everything into `@emboss/core`

The npm package includes ONLY the minified+obfuscated version of paid extensions. The readable version is never published — it lives in the private repo only.

---

## What This Replaces in the Build Spec

**Delete** from Phase 6:
> "Implement `license.js` — checks for `licenseKey` in config, logs console warning if paid features used without key"

**Replace with:**
> "Implement license key validation (local, no server). Paid extensions check key on registration — valid key activates, invalid/missing key silently skips. One console.info message per missing bundle. Paid extension code ships minified+obfuscated."

---

## What NOT to Do

- **No server-side validation.** Ever. The key works offline.
- **No "trial mode"** where paid features work for 14 days then stop. Too much complexity, too much support.
- **No per-domain licensing.** The key works everywhere. If someone buys it for `leantime.io` and also uses it on their side project, good — they're a fan.
- **No obfuscating free extensions.** MIT means MIT. Keep that code clean and readable.
- **No disabling core features if key is invalid.** A bad key only affects paid extensions. Core always works.
