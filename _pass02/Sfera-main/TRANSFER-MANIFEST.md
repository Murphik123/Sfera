# SFERA Codex Transfer Manifest

Transfer date: 2026-09-12

## Base
`Sfera-main.zip` was used as the full-source base archive. It contains the frontend, backend, assets, scripts and dependencies that were present in that saved project archive.

## Later approved overlays
The following saved Library artifacts were applied over the base archive:

| Artifact | Canonical destination |
|---|---|
| latest index.html | `public/index.html` |
| latest i18n.js | `public/js/i18n.js` |
| latest tm.json | `public/languages/tm.json` |
| latest ru.json | `public/languages/ru.json` |
| latest en.json | `public/languages/en.json` |
| marketplace-v28-final.html | `public/marketplace.html` |
| marketplaceController-v18-final.js | `server/src/controllers/marketplaceController.js` |

Supporting approved documentation:
- `API-CONTRACT-AUDIT.md`
- `DOC-007.docx`

## Localization verification performed during packaging
- 43 unique `data-i18n` keys in the current index.
- 376 keys in each of `tm.json`, `ru.json`, `en.json`.
- Dictionary key sets are identical.
- No missing current-index translation keys.
- No inline runtime `translations` dictionary in `public/index.html`.
- No page-local runtime `setLanguage()` implementation.
- No `sphere_lang` storage.
- The runtime i18n engine is `public/js/i18n.js` only.

## Important
`public/scripts/auto_translate_i18n.js` is retained only as a developer-side script from the source tree. It is not a runtime translator and must not be loaded by pages.
