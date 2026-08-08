<?php
// Enable error reporting for debugging if needed
error_reporting(0);

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $to = "contact@surelm.com";
    $subject = "New SureLM Application from " . htmlspecialchars($_POST['fullname']);
    
    // Collect form field data safely
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

    // Build the email body text
    $email_body = "You have received a new application submission:\n\n";
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

    // Handle file attachment (Resume)
    $attachment_processed = false;
    $boundary = md5(time());
    
    $headers = "From: no-reply@surelm.com\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

    $body = "--{$boundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $body .= $email_body . "\r\n";

    if (isset($_FILES['resume']) && $_FILES['resume']['error'] == UPLOAD_ERR_OK) {
        $file_tmp_path = $_FILES['resume']['tmp_name'];
        $file_name = $_FILES['resume']['name'];
        $file_size = $_FILES['resume']['size'];
        $file_type = $_FILES['resume']['type'];
        
        // Max 10MB check
        if ($file_size <= 10 * 1024 * 1024) {
            $content = chunk_split(base64_encode(file_get_contents($file_tmp_path)));
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: {$file_type}; name=\"{$file_name}\"\r\n";
            $body .= "Content-Disposition: attachment; filename=\"{$file_name}\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= $content . "\r\n";
        }
    }
    
    $body .= "--{$boundary}--";

    // Send the email
    if (mail($to, $subject, $body, $headers)) {
        // Redirect back to page or a success state (you can customize this)
        echo "<script>alert('Application submitted successfully!'); window.location.href='/';</script>";
    } else {
        echo "<script>alert('Error sending mail. Please try again later.'); window.history.back();</script>";
    }
} else {
    header("Location: /");
}
?>