# SureLM Application Form

A single-page job application form for SureLM with referral tracking, client-side validation, and email submission via a PHP backend. Built with **vanilla HTML/CSS/JS** — no build step, no Node.js required.

## Features

- 11-field application form (contact info, contribution, interests, portfolio, files)
- Referral tracking via URL slugs (`/soham`, `/saksham`, `/harsh`, `/harshit`) with auto-filled `referred_by`
- Client-side validation: required fields, email/phone/URL formats, file type and size (10MB max)
- Drag-and-drop file uploads with inline error messages
- Form draft persistence in localStorage (cleared on successful submit)
- Dark, responsive design

## Files

```
index.html        Main form page
thank-you.html    Success page
send.php          PHP email handler (multipart, file attachments)
.htaccess         Apache SPA routing + referral slugs + security headers
css/styles.css    All styles
js/referral.js    Referral detection from the URL path
js/storage.js     localStorage draft persistence
js/form.js        Form logic, validation, and submission
favicon.svg       Site icon
fonts.css         Google Fonts loading
```

## Local Testing

Serve the directory with any static server (PHP recommended so submissions work):

```bash
php -S localhost:8000
```

Open http://localhost:8000

Referral links: http://localhost:8000/soham (valid slugs: `soham`, `saksham`, `harsh`, `harshit`)

> Note: `send.php` uses PHP's `mail()`. Configure the recipient email inside `send.php` before deploying.

## Deployment

No build step needed. Upload all files to any PHP/Apache host (cPanel, FTP, etc.):

1. Upload the whole directory contents to your web root (or a subdirectory)
2. Confirm `.htaccess` is included (hidden file — some FTP clients skip it)
3. Open your domain. Referral links like `/soham` work as-is

If hosting in a **subdirectory**, no changes are needed — paths and `.htaccess` rules are relative.

## Configuring the Recipient Email

Open `send.php` and update the `$to` variable:

```php
$to = "your-email@example.com";
```
