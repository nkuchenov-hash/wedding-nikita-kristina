<?php
declare(strict_types=1);
// This entrypoint is NOT activated until trusted TLS and a verified PHP handler are installed.
header('X-Robots-Tag: noindex,nofollow');
header('X-Content-Type-Options: nosniff');
$target='/var/www/u3728035/data/wedding-private/backend/src/api.php';
if(!is_file($target)){
    http_response_code(503);
    header('Content-Type: application/json; charset=UTF-8');
    echo '{"ok":false,"error":"not_ready"}';
    exit;
}
require_once $target;
\Wedding\handle();
