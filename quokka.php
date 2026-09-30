<?php
/**
 * SureLM application handler.
 *
 * Success contract: this endpoint NEVER redirects. It always returns JSON with
 * an unambiguous Content-Type. The client may only show thank-you.html when the
 * response is valid JSON AND success === true.
 *
 * "success" means: the submission passed validation AND mail() accepted the
 * message for delivery. A 200 status alone is never treated as success by the
 * client.
 *
 * Threat model notes:
 *  - Every value that reaches a mail header is stripped of CR/LF, because
 *    mail()'s 4th argument is passed to the MTA verbatim and can be used to
 *    inject headers such as Bcc.
 *  - Uploads are validated on extension AND magic bytes, and are never written
 *    to the web root, so a malicious upload cannot be executed.
 *  - Field lengths are capped so a single request cannot exhaust memory.
 *  - A honeypot plus per-IP throttling blunt trivial mail-relay abuse.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Buffer so stray PHP notices can never be flushed into the JSON body and
// break the client's parse. See respond().
ob_start();

set_error_handler(function ($severity, $message, $file, $line) {
    error_log('[quokka] notice: ' . $message);
    return true;
});

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

/* ---------- config ---------- */

$to = 'contact@surelm.com';
$from = 'no-reply@surelm.com';

define('MAX_FILE_SIZE', 10 * 1024 * 1024);          // 10MB per file
define('MAX_TEXT_LENGTH', 5000);                   // per free-text field
define('MAX_NAME_LENGTH', 120);
define('THROTTLE_WINDOW', 60);                     // seconds
define('THROTTLE_MAX', 5);                         // submissions per window
define('HONEYPOT_FIELD', 'website_url');

/* Extension => list of acceptable magic-byte prefixes / container signatures. */
$ALLOWED_EXTENSIONS = array(
    'pdf'  => array('%PDF-'),
    'doc'  => array("\xd0\xcf\x11\xe0"),                        // OLE2 (doc/xls/ppt)
    'docx' => array('PK\x03\x04'),                             // zip container
    'txt'  => null,                                            // any text
    'jpg'  => array("\xff\xd8\xff"),
    'jpeg' => array("\xff\xd8\xff"),
    'png'  => array("\x89PNG\r\n\x1a\n"),
    'gif'  => array('GIF87a', 'GIF89a'),
    'webp' => array('RIFF'),
    'zip'  => array('PK\x03\x04', 'PK\x05\x06'),
);

/**
 * Emit a JSON response and stop. This is the only way this script ends.
 */
function respond($success, $payload = array())
{
    $body = array_merge(array('success' => (bool) $success), $payload);

    // Discard anything buffered before this point so the response body is
    // nothing but JSON. A "PHP Request Startup: POST Content-Length exceeds"
    // warning can be emitted before this script runs, which would otherwise
    // prepend HTML and break the client's parse.
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    if (!headers_sent()) {
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
    }

    echo json_encode($body);
    exit;
}

function fail($message, $fields = array())
{
    respond(false, array_merge(array('error' => $message), array('fields' => (object) $fields)));
}

function log_line($message)
{
    error_log('[quokka] ' . $message);
}

/**
 * Read a POST value as a trimmed string. Arrays are rejected rather than
 * allowed to reach trim(), which would raise a TypeError and return an empty
 * 500 body the client cannot parse.
 */
function post_string($key, $max_length = 0)
{
    if (!array_key_exists($key, $_POST)) {
        return '';
    }

    $value = $_POST[$key];

    if (is_array($value)) {
        fail('Malformed submission. Please reload the page and try again.');
    }

    if (!is_string($value)) {
        $value = '';
    }

    // Strip control characters, including the CR/LF used for header injection.
    // No /u modifier: it returns null on invalid UTF-8, which would silently
    // blank a field for anyone typing accented characters from a Latin-1
    // keyboard. Bytes >= 0x80 are left alone so names survive intact.
    $stripped = preg_replace('/[\x00-\x1F\x7F]/', '', $value);
    $value = trim($stripped === null ? $value : $stripped);

    if ($max_length > 0) {
        $value = function_exists('mb_substr')
            ? mb_substr($value, 0, $max_length, 'UTF-8')
            : substr($value, 0, $max_length);
    }

    return $value;
}

/* ---------- 1. method ---------- */

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, array('error' => 'Invalid request method.'));
}

/* ---------- 2. honeypot ---------- */

// Real applicants never see this field; bots fill everything they find.
if (post_string(HONEYPOT_FIELD) !== '') {
    log_line('honeypot triggered');
    fail('Your submission could not be processed.');
}

/* ---------- 3. throttle ---------- */

function client_ip()
{
    return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
}

function throttle_record($file)
{
    @file_put_contents($file, time() . "\n", FILE_APPEND | LOCK_EX);
    @chmod($file, 0600);
}

$throttle_file = sys_get_temp_dir() . '/surelm_rate_' . substr(sha1(client_ip()), 0, 24) . '.dat';

if (is_readable($throttle_file)) {
    $stamps = array_filter(array_map('floatval', @file($throttle_file) ?: array()));
    $cutoff = time() - THROTTLE_WINDOW;
    $recent = array_filter($stamps, function ($t) use ($cutoff) {
        return $t >= $cutoff;
    });

    if (count($recent) >= THROTTLE_MAX) {
        log_line('throttled client ' . client_ip());
        fail('Too many submissions. Please wait a minute and try again.');
    }
}

/* ---------- 4. body received at all? ---------- */

// If POST data is empty but a body was sent, PHP discarded it (post_max_size).
if (empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && (int) $_SERVER['CONTENT_LENGTH'] > 0) {
    log_line('body discarded, likely post_max_size overflow (content-length=' . (int) $_SERVER['CONTENT_LENGTH'] . ')');
    fail('The submission was too large for the server. Please try a smaller file.');
}

/* ---------- 5. validate fields ---------- */

$fields = array(
    'fullname' => post_string('fullname', MAX_NAME_LENGTH),
    'email' => post_string('email', 254),
    'phone' => post_string('phone', 40),
    'linkedin' => post_string('linkedin', 500),
    'contribution' => post_string('contribution', MAX_TEXT_LENGTH),
    'interests' => post_string('interests', MAX_TEXT_LENGTH),
    'work_showcase' => post_string('work_showcase', MAX_TEXT_LENGTH),
    'ownership' => post_string('ownership', MAX_TEXT_LENGTH),
    'involvement' => post_string('involvement', MAX_NAME_LENGTH),
    'referred_by' => post_string('referred_by', MAX_NAME_LENGTH),
);

$errors = array();

foreach (array('fullname', 'email', 'phone', 'contribution', 'interests', 'work_showcase', 'ownership', 'involvement') as $key) {
    if ($fields[$key] === '') {
        $errors[$key] = 'This field is required.';
    }
}

if ($fields['email'] !== '' && !filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}

if ($fields['linkedin'] !== '' && !filter_var($fields['linkedin'], FILTER_VALIDATE_URL)) {
    $errors['linkedin'] = 'Please enter a valid URL.';
}

if (!empty($errors)) {
    fail('Please fix the highlighted fields and try again.', $errors);
}

/* ---------- 6. validate uploads ---------- */

/**
 * Validate one uploaded file. Returns array('tmp' => path, 'name' => safe name)
 * or ends the request via respond().
 */
function validate_upload($key, $required, $allowed_extensions)
{
    if (!isset($_FILES[$key]) || !is_array($_FILES[$key])) {
        if ($required) {
            fail('Your resume did not upload. Please attach it and try again.', array($key => 'A file is required.'));
        }
        return null;
    }

    $file = $_FILES[$key];

    if (isset($file['error']) && is_array($file['error'])) {
        fail('Malformed submission. Please reload the page and try again.');
    }

    switch ($file['error']) {
        case UPLOAD_ERR_OK:
            break;

        case UPLOAD_ERR_NO_FILE:
            if ($required) {
                fail('Your resume did not upload. Please attach it and try again.', array($key => 'A file is required.'));
            }
            return null;

        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            log_line($key . ' rejected: exceeds server upload limit');
            fail('That file is larger than the server allows. Please use a file under 10MB.', array($key => 'File too large.'));
            break;

        case UPLOAD_ERR_PARTIAL:
            log_line($key . ' rejected: partial upload');
            fail('That upload was interrupted. Please try again.', array($key => 'Upload incomplete.'));
            break;

        case UPLOAD_ERR_NO_TMP_DIR:
        case UPLOAD_ERR_CANT_WRITE:
            log_line($key . ' rejected: server write failure (error=' . $file['error'] . ')');
            fail('The server could not store your file. Please try again.', array($key => 'Upload failed.'));
            break;

        default:
            log_line($key . ' rejected: unknown upload error ' . $file['error']);
            fail('That file could not be uploaded. Please try a different file.', array($key => 'Upload failed.'));
    }

    $tmp = isset($file['tmp_name']) ? (string) $file['tmp_name'] : '';

    // Confirms PHP actually received this as an uploaded file.
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        log_line($key . ' rejected: not an uploaded file');
        fail('That file could not be verified. Please choose it again.', array($key => 'Upload failed.'));
    }

    $size = isset($file['size']) ? (int) $file['size'] : 0;

    if ($size <= 0) {
        fail('That file appears to be empty. Please choose a valid file.', array($key => 'File is empty.'));
    }

    if ($size > MAX_FILE_SIZE) {
        fail('That file is larger than 10MB. Please use a smaller file.', array($key => 'File too large.'));
    }

    $safe_name = sanitize_filename($file['name']);
    $ext = strtolower(pathinfo($safe_name, PATHINFO_EXTENSION));

    if (!isset($allowed_extensions[$ext])) {
        log_line($key . ' rejected: disallowed extension .' . $ext);
        fail('That file type is not allowed. Please upload a PDF, DOC, DOCX, TXT, image or ZIP.', array($key => 'File type not allowed.'));
    }

    // Magic-byte check: the extension alone is attacker controlled.
    $signatures = $allowed_extensions[$ext];

    if ($signatures !== null) {
        $handle = @fopen($tmp, 'rb');

        if ($handle === false) {
            fail('The server could not read your file. Please try again.', array($key => 'Upload failed.'));
        }

        $head = (string) fread($handle, 16);
        fclose($handle);

        $matched = false;

        foreach ($signatures as $sig) {
            if (strncmp($head, $sig, strlen($sig)) === 0) {
                $matched = true;
                break;
            }
        }

        if (!$matched) {
            log_line($key . ' rejected: content does not match .' . $ext);
            fail('That file does not look like a valid ' . strtoupper($ext) . '. Please choose another file.', array($key => 'File type not allowed.'));
        }
    }

    return array('tmp' => $tmp, 'name' => $safe_name, 'size' => $size);
}

/**
 * Strip directory components and any characters that could break out of a
 * MIME header (CR/LF especially), then keep a conservative filename charset.
 */
function sanitize_filename($name)
{
    $name = basename(str_replace('\\', '/', (string) $name));
    $stripped = preg_replace('/[\x00-\x1F\x7F]/', '', $name);
    $name = trim($stripped === null ? $name : $stripped);
    $name = str_replace('"', '', $name);

    // Keep the extension so the recipient sees something sane, but drop
    // anything else that is not plainly safe.
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $stem = pathinfo($name, PATHINFO_FILENAME);

    if (function_exists('iconv')) {
        $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $stem);
        if ($converted !== false && $converted !== '') {
            $stem = $converted;
        }
    }

    $stem = preg_replace('/[^A-Za-z0-9._-]/', '_', $stem);
    $stem = trim((string) $stem, '._-');
    $stem = substr($stem, 0, 80);

    if ($stem === '') {
        $stem = 'attachment';
    }

    $ext = preg_replace('/[^a-z0-9]/', '', $ext);
    $ext = substr((string) $ext, 0, 8);

    return $ext === '' ? $stem : $stem . '.' . $ext;
}

$attachments = array();

$resume_extensions = array_intersect_key($ALLOWED_EXTENSIONS, array_flip(array('pdf', 'doc', 'docx', 'txt')));
$other_extensions = $ALLOWED_EXTENSIONS;

$resume = validate_upload('resume', true, $resume_extensions);
if ($resume !== null) {
    $attachments['Resume'] = $resume;
}

$other = validate_upload('other', false, $other_extensions);
if ($other !== null) {
    $attachments['Other'] = $other;
}

if (count($attachments) === 0) {
    fail('No files were received. Please attach your resume and try again.');
}

/* ---------- 7. build + send ---------- */

// Control characters were already stripped, so nothing here can inject a header.
$reply_to = $fields['email'];
$subject = 'New SureLM Application from ' . $fields['fullname'];

$email_body = "New SureLM Application Submission\n\n";
$email_body .= "Name: {$fields['fullname']}\n";
$email_body .= "Email: {$fields['email']}\n";
$email_body .= "Phone: {$fields['phone']}\n";
$email_body .= "LinkedIn/Website: {$fields['linkedin']}\n";
$email_body .= "Referred By: {$fields['referred_by']}\n";
$email_body .= "Involvement: {$fields['involvement']}\n\n";
$email_body .= "--- Contribution ---\n{$fields['contribution']}\n\n";
$email_body .= "--- Interests ---\n{$fields['interests']}\n\n";
$email_body .= "--- Work Showcase ---\n{$fields['work_showcase']}\n\n";
$email_body .= "--- Ownership Vision ---\n{$fields['ownership']}\n";

$boundary = 'surelm-' . bin2hex(random_bytes(16));

$headers = "From: {$from}\r\n";
$headers .= "Reply-To: {$reply_to}\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

$body = "--{$boundary}\r\n";
$body .= "Content-Type: text/plain; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$body .= $email_body . "\r\n";

foreach ($attachments as $label => $file) {
    // Streamed in chunks so a 10MB file never has to exist in memory twice.
    $handle = @fopen($file['tmp'], 'rb');

    if ($handle === false) {
        log_line('could not open temp file for ' . $label);
        fail('The server could not read your file. Please try again.', array('resume' => 'Upload failed.'));
    }

    $safe = $file['name'];

    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: application/octet-stream; name=\"{$safe}\"\r\n";
    $body .= "Content-Disposition: attachment; filename=\"{$safe}\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";

    while (!feof($handle)) {
        $chunk = fread($handle, 57 * 1024);

        if ($chunk === false) {
            break;
        }

        $body .= chunk_split(base64_encode($chunk), 76, "\r\n");
    }

    fclose($handle);
    $body .= "\r\n";
}

$body .= "--{$boundary}--";

if (@mail($to, $subject, $body, $headers)) {
    throttle_record($throttle_file);
    log_line('mail accepted for ' . $fields['email'] . ' with ' . count($attachments) . ' attachment(s)');
    respond(true);
}

log_line('mail() FAILED for ' . $fields['email']);
fail('We could not send your application right now. Your details are still here — please try again.');