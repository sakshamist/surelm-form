<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$to = "contact@surelm.com";
$subject = "New SureLM Application from " . htmlspecialchars($_POST['fullname'] ?? 'Anonymous');

$fullname = $_POST['fullname'] ?? '';
$email = $_POST['email'] ?? '';
$phone = $_POST['phone'] ?? '';
$linkedin = $_POST['linkedin'] ?? '';
$contribution = $_POST['contribution'] ?? '';
$interests = $_POST['interests'] ?? '';
$work_showcase = $_POST['work_showcase'] ?? '';
$ownership = $_POST['ownership'] ?? '';
$referred_by = $_POST['referred_by'] ?? 'Direct';
$involvement = $_POST['involvement'] ?? '';

$email_body = "New SureLM Application Submission\n\n";
$email_body .= "Name: $fullname\n";
$email_body .= "Email: $email\n";
$email_body .= "Phone: $phone\n";
$email_body .= "LinkedIn/Website: $linkedin\n";
$email_body .= "Referred By: $referred_by\n";
$email_body .= "Involvement: $involvement\n\n";
$email_body .= "--- Contribution ---\n$contribution\n\n";
$email_body .= "--- Interests ---\n$interests\n\n";
$email_body .= "--- Work Showcase ---\n$work_showcase\n\n";
$email_body .= "--- Ownership Vision ---\n$ownership\n";

$boundary = md5(uniqid(time(), true));

$headers = "From: no-reply@surelm.com\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

$body = "--{$boundary}\r\n";
$body .= "Content-Type: text/plain; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$body .= $email_body . "\r\n";

$files_attached = 0;

foreach (['resume', 'other'] as $file_key) {
    if (isset($_FILES[$file_key]) && $_FILES[$file_key]['error'] === UPLOAD_ERR_OK) {
        $file_tmp_path = $_FILES[$file_key]['tmp_name'];
        $file_name = $_FILES[$file_key]['name'];
        $file_size = $_FILES[$file_key]['size'];
        $file_type = $_FILES[$file_key]['type'];
        
        if ($file_size > 0 && $file_size <= 10 * 1024 * 1024) {
            $content = chunk_split(base64_encode(file_get_contents($file_tmp_path)));
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: {$file_type}; name=\"{$file_name}\"\r\n";
            $body .= "Content-Disposition: attachment; filename=\"{$file_name}\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= $content . "\r\n";
            $files_attached++;
        }
    }
}

$body .= "--{$boundary}--";

if (mail($to, $subject, $body, $headers)) {
    $response = [
        'success' => true,
        'message' => 'Application submitted successfully',
        'files_attached' => $files_attached
    ];
    http_response_code(200);
    echo json_encode($response);
} else {
    $response = [
        'error' => 'Failed to send email. Please try again later.'
    ];
    http_response_code(500);
    echo json_encode($response);
}

exit;