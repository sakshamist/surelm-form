# SureLM Application Form

A single-page job application form for SureLM with referral tracking, client-side validation, and email submission via a PHP backend.

## Features

- 11-field application form (contact info, contribution, interests, portfolio, files)
- Referral tracking via URL slugs (`/soham`, `/saksham`, `/harsh`, `/harshit`) with auto-filled `referred_by`
- Client-side validation: required fields, email/phone/URL formats, file type and size (10MB max)
- Drag-and-drop file uploads with inline error messages
- Form draft persistence in localStorage (cleared on successful submit)
- Dark, responsive design using CSS Modules

## Tech Stack

- React 19 + TypeScript + Vite
- React Router v7
- CSS Modules
- PHP (`send.php`) for email delivery with file attachments
- Apache `.htaccess` for SPA routing and security headers

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

Referral links: http://localhost:5173/soham (valid slugs: `soham`, `saksham`, `harsh`, `harshit`)

> Note: the PHP backend is only available on a PHP server. Configure `send.php`'s recipient email before deploying.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
npm run lint     # run oxlint
```

## Deployment

1. `npm run build`
2. Upload `dist/`, `send.php`, `.htaccess`, and `public/` to an Apache/PHP host.

## Project Structure

```
src/
  components/   JoinForm, ThankYouPage
  hooks/        useReferral (slug → referrer mapping)
  styles/       CSS Modules + global styles
  types/        TypeScript types for the form
send.php        PHP email handler (multipart, file attachments)
vite.config.ts  Vite config with /send.php proxy
```
