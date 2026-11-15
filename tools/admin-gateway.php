<?php
declare(strict_types=1);
header('X-Robots-Tag: noindex, nofollow', true);
header('X-Content-Type-Options: nosniff', true);
header('Cache-Control: private, no-store', true);
$usersPath = '/var/www/u3728035/data/wedding-private/.htpasswd';
$rows = @file($usersPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$stored = is_array($rows) && count($rows) ? explode(':', $rows[0], 2) : [];
$user = (string)($_SERVER['PHP_AUTH_USER'] ?? '');
$password = (string)($_SERVER['PHP_AUTH_PW'] ?? '');
if (!$user) {
    $header = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (preg_match('/^Basic\\s+([A-Za-z0-9+\\/=]+)$/i', $header, $matches)) {
        $decoded = base64_decode($matches[1], true);
        if (is_string($decoded) && strpos($decoded, ':') !== false) {
            [$user, $password] = explode(':', $decoded, 2);
        }
    }
}
$authorized = count($stored) === 2 &&
    hash_equals((string)$stored[0], $user) &&
    password_verify($password, (string)$stored[1]);
if (!$authorized) {
    header('WWW-Authenticate: Basic realm="Wedding admin", charset="UTF-8"', true);
    header('Content-Type: text/plain; charset=UTF-8', true);
    http_response_code(401);
    echo 'Authentication required.';
    exit;
}
$types = [
    'index.html' => 'text/html; charset=UTF-8',
    'src/admin-app.js' => 'text/javascript; charset=UTF-8',
    'src/data.js' => 'text/javascript; charset=UTF-8',
    'src/venues.js' => 'text/javascript; charset=UTF-8',
    'src/venues-data.js' => 'text/javascript; charset=UTF-8',
    'src/venue-detail-ui.js' => 'text/javascript; charset=UTF-8',
    'src/venues-pricing.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-1.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-2.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-3.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-4.js' => 'text/javascript; charset=UTF-8',
    'src/styles.css' => 'text/css; charset=UTF-8',
    'src/venues.css' => 'text/css; charset=UTF-8',
    'src/venue-detail-ui.css' => 'text/css; charset=UTF-8',
];
$asset = $_GET['asset'] ?? 'index.html';
if (!is_string($asset) || !isset($types[$asset])) {
    http_response_code(404);
    exit;
}
$path = '/var/www/u3728035/data/wedding-private/admin-release/' . $asset;
if (!is_file($path) || !is_readable($path)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=UTF-8', true);
    echo 'Admin bundle unavailable.';
    exit;
}
header('Content-Type: ' . $types[$asset], true);
readfile($path);
