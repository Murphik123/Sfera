# SFERA / СФЕРА — Codex Project Instructions

## 1. Project identity
- Project: Сфера (SFERA)
- Repository: `Murphik123/Sfera`
- Architecture: modular digital platform; current working baseline is the existing Sfera project, evolved from Prototype v0.1 toward system v1.0.
- Primary UI language: Turkmen (`tm`). Supported languages: Turkmen, Russian, English.
- This file is the authoritative transfer brief for Codex. Do not replace project decisions with generic templates or assumptions.

## 2. Non-negotiable working rules
1. Preserve existing page-specific visual design. **Do not redesign pages while fixing logic.**
2. Do not centralize/replace visual CSS engines in a way that breaks module-specific effects. Preserve glass effects, gradients, floating particles/dots, SVGs, animations, and page-specific visual behavior.
3. Do not change DOM structure, nesting, IDs, classes, `data-*` attributes, SVG structure, button contents, or event wiring unless a requested functional fix requires it.
4. Work in the fixed order: documentation -> Core -> refactor existing files -> UI/business modules. Keep file/dependency registries and CHANGELOG information consistent.
5. Work one file/module at a time when auditing or repairing existing code, and validate before moving to the next file.
6. Do not invent backend endpoints, fake balances, fake transactions, random forecasts, or demo data where a real contract exists.
7. Multiple authorization contexts are intentional: system administrator, normal user, and Marketplace administrator/owner are not to be blindly merged. Audit server-side permissions before changing roles.
8. TM Bank, TM Pay, and TM Coin are separate modules. Never map Bank to TM Pay merely because both handle money.

## 3. Approved product/module decisions
- Marketplace: real catalog/order flow; seller identity comes from JWT; ownership/admin checks are enforced; images use `{url}` objects; order payment rails are `bank`, `tm_pay`, `tm_coin`.
- TM Pay: separate wallet/payment module with real transfers; no arbitrary money minting; deposit is disabled unless a real funding contract exists.
- TM Coin: separate digital-asset module; real wallet/transaction/transfer API; no fake localStorage balance, fake address, random price/chart, or simulated staking/swap.
- Digital Bank: standalone bank module and `bank.html` must exist.
- Messenger: real dialogs/history/send/presence via API and Socket.IO; WebRTC signaling/media lifecycle is treated as a real integration, not a mock.
- Sfera Mail: MongoDB-backed internal mail contracts are the target architecture; external mail may use the existing Resend path where applicable.
- Documents: MongoDB metadata/ownership/verification/signing rules; binary persistence, OCR, registry and real e-signature remain explicit future work unless implemented in the current code.
- AI: predictions must come from backend/MongoDB; no `Math.random()` forecasts. Document verification must use the backend contract.
- Statistics: values come from MongoDB through `/api/stats`; no hardcoded demo metrics.

## 4. Localization — current authoritative implementation
### Runtime rule
There must be **one runtime localization engine**: `public/js/i18n.js`.

- Languages: `tm -> ru -> en -> tm`.
- First run/default: Turkmen (`tm`).
- Persist selected language in `localStorage` under `sfera_lang`.
- Dictionaries: exactly one active set: `public/languages/tm.json`, `ru.json`, `en.json`.
- All three dictionaries must have identical key sets.
- Current dictionaries contain the cleaned key set (376 keys each at transfer time).
- `data-i18n` values in current `public/index.html` must exist in all three dictionaries.
- Translation must update text/attributes without replacing DOM structure. SVG, nested spans/icons, IDs/classes and data attributes must survive language changes.
- `placeholder`, `title`, and `aria-label` are translated separately where supported.
- Language change emits `sfera:language-changed` for modules that need to redraw dynamic text.

### Local translator removal
The old **inline/local page translator is removed from `public/index.html`**. Do not reintroduce:
- inline `translations` dictionaries;
- page-local `currentLang` / `setLanguage()` translator logic;
- `sphere_lang` storage;
- third-party/automatic translators;
- DOM-wide `textContent` replacement that destroys nested structure.

`public/scripts/auto_translate_i18n.js` is a developer-side script/tool and is **not a runtime translator**. It must not be loaded by pages as a translation engine.

The current `index.html` loads the central engine once with:
```html
<script type="module" src="./js/i18n.js"></script>
```
Do not add a second i18n implementation.

## 5. Current localization validation baseline
At transfer time:
- `public/index.html`: 43 unique `data-i18n` keys.
- `tm.json`: 376 keys.
- `ru.json`: 376 keys.
- `en.json`: 376 keys.
- Dictionary key sets: identical.
- Current index `data-i18n` keys missing from dictionaries: none.
- Legacy localization aliases targeted during cleanup: removed from the active dictionaries.
- Static scan of current index: no inline `const translations`, no page-local `setLanguage`, no `sphere_lang` storage, no Google/automatic translator runtime.

A real browser click test was previously blocked by the execution environment; do not claim live browser verification unless Codex actually performs it successfully.

## 6. Current frontend/backend architecture
- Frontend lives in `public/`.
- Backend lives in `server/`.
- Production server entrypoint is `server/server.js`, not `server/src/app.js`.
- `server/server.js` creates the HTTP server, attaches Socket.IO, auto-loads routes, applies security/CORS/rate limits, loads `.env` before MongoDB connection, and waits for MongoDB before listening.
- `public/js/api.js` is the central frontend API client. Do not bypass it with page-specific API implementations unless a documented exception exists.
- `public/js/auth.js` uses the central API client.
- `public/js/auth-check.js` owns frontend auth exposure and transitional fetch bridging.
- Socket authentication uses JWT and authenticated user identity; client-side `register_user` cannot change identity.

## 7. Security and authorization
- JWT authentication is the source of authenticated identity.
- Protected operations must be enforced server-side.
- Admin deletion/role changes must preserve safeguards such as self-protection and last-admin protection.
- Marketplace deletion requires listing ownership or admin role.
- Never trust client-supplied seller/user identity.

## 8. Deployment
- Frontend may be served from GitHub Pages/subpath as well as a root-hosted environment. Use deployment-safe relative asset paths for frontend-local modules and dictionaries where possible.
- Backend is deployed separately on Render. Frontend localization must work without Render being available.
- Do not make frontend language switching dependent on backend availability.

## 9. Documentation/architecture decisions
The project documentation established:
- modular architecture;
- Core/Kernel/Namespace/Registry/EventBus/Logger/Scheduler/SystemManager/PerformanceManager/NetworkManager/Recovery concepts;
- Security and Identity;
- Communication Center and Sfera Mail;
- Commerce: Marketplace, CRM, Logistics;
- Finance: Digital Bank, TM Koin/TM Coin, Payment System;
- Government, Documents, AI, Reports, Administration;
- API, Backup, Queue/Background Processing, Localization.

DOC-007 MODULE_REGISTRY is an approved project document and is preserved in the transfer package as `DOC-007.docx`.

## 10. Latest approved transfer overlay
The full source archive used as the base was the previously saved `Sfera-main.zip`. The following later-approved files were overlaid into their canonical project locations:
- latest `public/index.html`;
- latest `public/js/i18n.js`;
- latest `public/languages/tm.json`;
- latest `public/languages/ru.json`;
- latest `public/languages/en.json`;
- latest `public/marketplace.html` from `marketplace-v28-final.html`;
- latest `server/src/controllers/marketplaceController.js` from `marketplaceController-v18-final.js`.

Supporting project documents included at the project root:
- `API-CONTRACT-AUDIT.md`;
- `DOC-007.docx`.

## 11. Codex startup procedure
Before changing code:
1. Read this `AGENTS.md` completely.
2. Inspect the actual repository tree and current git status.
3. Treat the code in the transfer archive as the source of truth; do not resurrect older Library drafts.
4. Check `public/js/i18n.js` and all three dictionaries before touching localization.
5. Check `public/index.html` for absence of the old inline translator before making localization changes.
6. Run static searches for duplicate i18n implementations, legacy keys, fake data and broken endpoint references.
7. Preserve page design and DOM unless a functional defect explicitly requires a minimal change.
8. For every repair, explain the exact root cause, affected files, and validation performed.
9. Never state that something was browser-tested unless it was actually executed in a browser.

## 12. Definition of done for the current transfer
The transfer is considered faithful when Codex has:
- the full base source tree;
- the later approved frontend/i18n/marketplace overlays;
- this `AGENTS.md` at repository root;
- no runtime local translator in `public/index.html`;
- one central runtime `public/js/i18n.js`;
- one identical dictionary set `tm/ru/en`;
- the architecture and important decisions preserved;
- no redesign introduced merely during transfer.
