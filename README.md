# SureLM Application Form

A single-page job application form for [SureLM](https://surelm.com) — an intelligent insurance distribution company — with referral tracking, client-side validation, and email submission via a PHP backend.

Originally built as a **React + TypeScript + Vite** application, the project was deliberately converted to **vanilla HTML/CSS/JS** so it can be deployed to shared hosting without Node.js, root access, or any build step. There are **zero runtime dependencies**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Referral System](#referral-system)
- [Form Logic & Validation](#form-logic--validation)
- [Data Persistence](#data-persistence)
- [Submission Pipeline](#submission-pipeline)
- [Local Testing](#local-testing)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Changelog / Project History](#changelog--project-history)

---

## Features

**Form**
- 11-field application form: name\*, email\*, phone\*, LinkedIn/website, contribution\*, interests\*, work showcase\*, ownership\*, involvement level\* (radio), resume\* (file), anything else (file)
- Name, email, and phone are mandatory
- Character counters on all textareas

**Validation (client-side)**
- Required-field checks with inline error messages
- Format validation: email, phone, and URL (validated on blur)
- File type validation (resume: PDF/DOC/DOCX/TXT; other: + images/ZIP)
- File size limit of 10 MB with a live error message
- Error styling: red borders on invalid inputs, error text under fields, summary message on submit

**Referral tracking**
- URL-path slugs map to a human-readable referrer name
- Referral notice shown in a styled box above the first field
- `referred_by` automatically submitted with the form

**Uploads**
- Click-to-select or drag-and-drop
- Filename shown after selection with accent styling
- Visual drag-over and error states

**UX**
- Draft auto-save to `localStorage` (debounced), cleared on successful submit
- Loading spinner and disabled button while submitting
- 1s success transition, then redirect to `thank-you.html`
- Active-field highlight, responsive layout, dark theme

---

## Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Frontend   | Vanilla HTML5, CSS3, ES5-compatible JavaScript         |
| Styling    | Custom CSS with design tokens (CSS custom properties) |
| Backend    | PHP 5.6+ (`send.php` using `mail()`)                  |
| Routing    | Apache `mod_rewrite` (`.htaccess`)                    |
| Persistence| Browser `localStorage`                                |
| Fonts      | Google Fonts: Inter, Fraunces, IBM Plex Mono          |

No frameworks. No package manager. No build tooling. JavaScript is written in an ES5-safe style (IIFEs, `var`) so it runs on essentially any browser a candidate might use.

---

## Project Structure

```
.
├── index.html              Main form page
├── thank-you.html          Success page
├── send.php                PHP email handler (multipart, file attachments)
├── .htaccess               Apache rewrite rules + security headers + caching
├── favicon.svg             Site icon
├── fonts.css               Google Fonts loading
├── icons.svg               Icons sprite (kept for future use)
├── css/
│   └── styles.css          All styles (design tokens, form, referral box, responsive)
└── js/
    ├── referral.js         Referral detection from the URL path
    ├── storage.js          localStorage draft persistence
    └── form.js             Form state, validation, file handling, submission
```

Each script attaches to `window` (e.g. `window.SureLMReferral`, `window.SureLMStorage`) and is loaded in order at the bottom of `index.html`:
`referral.js` → `storage.js` → `form.js`.

---

## Referral System

`js/referral.js` reads the first segment of `window.location.pathname` and maps it to a referrer name:

| URL path | Referrer            |
| -------- | ------------------- |
| `/soham` | Soham Suryavanshi   |
| `/saksham` | Saksham Tripathi |
| `/harsh` | Harsh Srivastava    |
| `/harshit` | Harshit Rana      |

Behavior:
- Any other path → `null` (no referral)
- Lookup is **case-insensitive**
- Asset paths (`/css`, `/js`, `favicon.svg`, `fonts.css`, …) are ignored so the logic never fires on static resources
- When a referral is detected, `js/form.js`:
  1. Unhides the `.referralBox` above the first field with `Referred by <name>`
  2. Sets the hidden `referred_by` input, which is sent with the submission
  3. **Referral takes precedence** over any saved draft value

Server side, `.htaccess` rewrites `/soham` (and the other slugs) to `index.html` so the SPA can read the path — no hash routing needed.

---

## Form Logic & Validation

`js/form.js` is an IIFE that mirrors the original React component:

- **State** — a plain `formData` object holding all fields (files stored as `File` objects, never persisted)
- **Events** — delegated listeners on the `<form>` for `input`, `change`, `focusin`, `focusout`, `submit`; per-input `blur` handlers for email/phone/LinkedIn
- **Validation functions**:
  - `validateEmail` — regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`
  - `validatePhone` — `^[+]?[\d\s\-()]{7,20}$`
  - `validateURL` — parses with `new URL()`, requires `http:`/`https:`
  - `validateFile` — checks MIME type against allowed lists + 10 MB size limit
  - `validateAll` — required checks for all mandatory fields, format checks, and file checks; returns a map of `field → error`
- **Error rendering** — each error is written to a `<span class="fieldError">` (`#error-<field>`); inputs get `inputError` / `textareaError` classes; invalid files add `fileDropError` to the drop zone

Allowed file types:

| Field    | Allowed MIME types                                                                 |
| -------- | ---------------------------------------------------------------------------------- |
| resume   | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain` |
| other    | resume types + `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/zip`, `application/x-zip-compressed` |

---

## Data Persistence

`js/storage.js` persists the draft to `localStorage` under the key `surelm-form-data`:

- **Save** — debounced 500 ms after any `input`/`change` event; only **string** fields are stored (file objects are never serialized)
- **Load** — on page load, string fields are restored (files are always empty after refresh); any stored `resume`/`other` keys are dropped
- **Clear** — on successful submission, the key is removed so the next visit starts fresh

---

## Submission Pipeline

1. User clicks **Submit**
2. `validateAll()` runs; on failure, inline errors + summary message render and submission halts
3. A `FormData` object is built with all 11 fields
4. `fetch('send.php', { method: 'POST', body: data })` sends the request
5. Response is parsed as JSON:
   - `success` → draft cleared, button shows spinner state, after 1 s `window.location.href = 'thank-you.html'`
   - `error` or HTTP failure → error message shown, button restored
6. `send.php` builds a multipart MIME email (text body + base64-encoded attachments) and sends it with PHP's `mail()`

---

## Local Testing

Because the PHP backend is optional for UI testing, any static server works; **use PHP if you want submissions to flow end-to-end**:

```bash
php -S localhost:8000
```

Open http://localhost:8000

Referral links: http://localhost:8000/soham (valid slugs: `soham`, `saksham`, `harsh`, `harshit`)

> On macOS, `mail()` may not be configured, so the actual email send can fail locally — the form will surface the error via JSON. The frontend flow (validation, drafts, redirect) can be tested without it.

---

## Deployment

No build step. Upload all files to any PHP/Apache host (cPanel, FTP, etc.):

1. Upload the whole directory to your web root (or a subdirectory)
2. Make sure `.htaccess` is included — it is a hidden file and some FTP clients skip it
3. Open your domain. Referral links like `/soham` work as-is

**Subdirectory hosting** requires no changes — asset paths and `.htaccess` rules are relative.

**Required server capabilities:**
- Apache with `mod_rewrite` (for referral slugs and SPA fallback)
- PHP 5.6+ with the `mail()` function enabled (shared hosts typically have this)
- `mod_headers`, `mod_expires`, `mod_deflate` (optional — the `.htaccess` guards them with `<IfModule>`)

---

## Configuration

**Recipient email** — open `send.php` and change the `$to` variable:

```php
$to = "your-email@example.com";
```

**Referral slugs** — edit `VALID_REFERRALS` in `js/referral.js`:

```js
var VALID_REFERRALS = {
  soham: 'Soham Suryavanshi',
  // add: slug: 'Full Name',
};
```

Then add the slug to the `.htaccess` rewrite list:

```
RewriteRule ^(soham|saksham|harsh|harshit|newslug)/?$ index.html [L]
```

**Allowed file types / size limit** — edit `ALLOWED_RESUME_TYPES`, `ALLOWED_OTHER_TYPES`, and `MAX_FILE_SIZE` at the top of `js/form.js`, and keep the `accept` attributes in `index.html` in sync.

---

## Changelog / Project History

**2026-08 — Vanilla JS conversion (current)**
- Rewrote the React/TypeScript/Vite app as dependency-free HTML/CSS/JS
- Preserved every feature: referral tracking, validation, drag-and-drop, drafts, char counters, spinner, redirect
- Removed `node_modules/`, `dist/`, `src/`, and all TS/Vite/React config
- `.htaccess` made portable (relative rewrites) for root or subdirectory hosting
- Referral display redesigned: integrated first into the eyebrow line, then into a subtle box above the first field
- Fixed a bug where file inputs lacked `name` attributes, causing the empty-key draft entry
- Verified end-to-end with automated headless-Chrome tests (10/10 passing)

**Earlier — React/TypeScript implementation**
- React 19 + TypeScript + Vite 8 SPA with `react-router-dom`
- `useReferral` hook reading the first path segment against a slug map
- CSS Modules design system; PHP `send.php` unchanged throughout
- Added inline validation errors, spinner, drag-and-drop, localStorage drafts, char counters
