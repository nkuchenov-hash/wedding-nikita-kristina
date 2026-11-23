<?php
declare(strict_types=1);

/**
 * REG.RU shared hosting admin gateway. Password is never passed in an HTTP
 * Authorization header: some hosting proxies drop that header before PHP.
 * Every HTML/CSS/JS asset is served only after a verified PHP session.
 */
header('X-Robots-Tag: noindex, nofollow', true);
header('X-Content-Type-Options: nosniff', true);
header('Referrer-Policy: no-referrer', true);
header('Cache-Control: private, no-store', true);
header('Content-Security-Policy: frame-ancestors \'none\'', true);

$private = '/var/www/u3728035/data/wedding-private';
$usersPath = $private.'/.htpasswd';
$sessionDir = $private.'/admin-sessions';
if (!is_dir($sessionDir) && !@mkdir($sessionDir, 0700, true) && !is_dir($sessionDir)) {
    http_response_code(503);
    exit('Administrative session storage unavailable');
}
ini_set('session.save_path', $sessionDir);
// Keep PHP's session garbage collection in sync with the 12-hour admin idle timeout.
ini_set('session.gc_maxlifetime', '43200');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_samesite', 'Lax');
session_name('wedding_admin');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/admin', 'secure' => true,
    'httponly' => true, 'samesite' => 'Lax'
]);
session_start();
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
}
// An already-open login tab may outlive its PHP session. Let the same-origin
// form retrieve a fresh token immediately before posting, without weakening
// CSRF enforcement on login or on authenticated data changes.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' &&
    isset($_GET['refresh_login_csrf'])) {
    header('Content-Type: application/json; charset=UTF-8', true);
    echo json_encode(['ok'=>true, 'csrf'=>(string)$_SESSION['csrf']],
      JSON_THROW_ON_ERROR);
    exit;
}

$rows = @file($usersPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$users = [];
if (is_array($rows)) {
    foreach ($rows as $row) {
        $pair = explode(':', $row, 2);
        if (count($pair) === 2 && preg_match('/^[a-z][a-z0-9_-]{3,40}$/i', $pair[0])) {
            $users[$pair[0]] = $pair[1];
        }
    }
}
function adminEscape(string $text): string {
    return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function adminCsrfValid(): bool {
    return isset($_POST['csrf']) && is_string($_POST['csrf']) &&
        hash_equals((string)($_SESSION['csrf'] ?? ''), $_POST['csrf']);
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && isset($_POST['logout'])) {
    if (adminCsrfValid()) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    header('Location: /admin/', true, 303);
    exit;
}

$loginError = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && isset($_POST['login'])) {
    $attempts = (int)($_SESSION['attempts'] ?? 0);
    $since = (int)($_SESSION['attempt_start'] ?? 0);
    if (time() - $since > 900) {
        $attempts = 0;
        $_SESSION['attempt_start'] = time();
    }
    if ($attempts >= 8) {
        http_response_code(429);
        $loginError = 'Слишком много попыток. Повторите позже.';
    } elseif (!adminCsrfValid()) {
        http_response_code(403);
        $loginError = 'Страница устарела. Обновите её и попробуйте ещё раз.';
    } else {
        $user = substr(trim((string)($_POST['username'] ?? '')), 0, 100);
        $password = (string)($_POST['password'] ?? '');
        $hash = $users[$user] ?? '';
        if ($hash !== '' && strlen($password) <= 512 && password_verify($password, $hash)) {
            session_regenerate_id(true);
            $_SESSION['admin_login'] = $user;
            $_SESSION['admin_stamp'] = hash('sha256', $hash);
            $_SESSION['last_seen'] = time();
            $_SESSION['attempts'] = 0;
            header('Location: /admin/', true, 303);
            exit;
        }
        $_SESSION['attempts'] = $attempts + 1;
        http_response_code(401);
        $loginError = 'Неверный логин или пароль.';
    }
}

$login = (string)($_SESSION['admin_login'] ?? '');
$valid = $login !== '' && isset($users[$login]) &&
    hash_equals(hash('sha256', $users[$login]), (string)($_SESSION['admin_stamp'] ?? '')) &&
    time() - (int)($_SESSION['last_seen'] ?? 0) <= 12 * 3600;
if (!$valid) {
    unset($_SESSION['admin_login'], $_SESSION['admin_stamp']);
    if (isset($_GET['api'])) {
        http_response_code(401);
        header('Content-Type: application/json; charset=UTF-8', true);
        echo '{"ok":false,"error":"login_required"}';
        exit;
    }
    if (isset($_GET['asset'])) {
        http_response_code(401);
        header('Content-Type: text/plain; charset=UTF-8', true);
        exit('Authentication required');
    }
    header('Content-Type: text/html; charset=UTF-8', true);
    $csrf = adminEscape((string)$_SESSION['csrf']);
    $error = adminEscape($loginError);
    echo '<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<meta name="robots" content="noindex,nofollow"><title>Вход — Никита и Кристина</title>';
    echo '<style>*,*:before,*:after{box-sizing:border-box}body{margin:0;min-height:100svh;background:#eff3ed;color:#203b2c;font:16px system-ui,Arial,sans-serif;display:grid;place-items:center;padding:20px}main{background:white;padding:clamp(24px,5vw,44px);border-radius:20px;width:min(100%,450px);box-shadow:0 12px 48px #173b2414}h1{font-family:Georgia,serif;font-size:34px;font-weight:400;margin:8px 0 18px}p{font-size:14px;color:#627568;line-height:1.6}label{display:block;margin:15px 0;font-weight:600;font-size:14px}input{display:block;width:100%;margin-top:8px;padding:13px;border:1px solid #c5d4c8;border-radius:10px;font:inherit}button{background:#26563c;color:#fff;border:0;border-radius:10px;width:100%;padding:14px;margin-top:12px;font-weight:600;font:inherit;cursor:pointer}.error{color:#9c2c2c}</style>';
    echo '</head><body><main><p>НИКИТА И КРИСТИНА</p><h1>Панель организаторов</h1><p>Вход только для организаторов свадьбы.</p>';
    if ($error !== '') echo '<p class="error" role="alert">'.$error.'</p>';
    echo '<form method="post" action="/admin/" autocomplete="on"><input type="hidden" name="csrf" value="'.$csrf.'">';
    echo '<input type="hidden" name="login" value="1"><label>Логин<input name="username" value="wedding-admin" autocomplete="username" required maxlength="100"></label>';
    echo '<label>Пароль<input name="password" type="password" autocomplete="current-password" required maxlength="512"></label>';
    echo '<button type="submit">Войти в админку</button></form>';
    // Prevent a long-idle mobile tab from submitting an expired session token.
    // If the preflight fails, a standard HTML form submission still works.
    echo '<script>(function(){const f=document.querySelector("form");let busy=false;f.addEventListener("submit",async function(e){if(busy)return;e.preventDefault();busy=true;const b=f.querySelector("button");b.disabled=true;try{const r=await fetch("/admin/?refresh_login_csrf=1",{credentials:"same-origin",cache:"no-store",headers:{"Accept":"application/json"}});if(r.ok){const x=await r.json();if(x&&typeof x.csrf==="string"&&/^[a-f0-9]{48}$/.test(x.csrf))f.elements.csrf.value=x.csrf;}}catch(_e){}f.submit();});})();</script>';
    echo '</main></body></html>';
    exit;
}
$_SESSION['last_seen'] = time();
// All wedding media remains outside the webroot. Only authenticated organizers
// can load a gallery photo or an uploaded guest photo (including pending).
if(isset($_GET['media'])){
    if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET'){
        http_response_code(405);exit;
    }
    $kind=(string)$_GET['media'];
    $id=(string)($_GET['id']??'');
    if(!in_array($kind,['gallery','guest'],true)||
       !preg_match('/^[a-f0-9-]{36}$/',$id)){
        http_response_code(404);exit;
    }
    try{
        require_once $private.'/backend/src/core.php';
        $db=\Wedding\db();
        if($kind==='gallery'){
            $entry=\Wedding\one($db,'SELECT filename FROM gallery_assets WHERE id=?',[$id]);
            $dir=$private.'/gallery-media';
        }else{
            $entry=\Wedding\one($db,'SELECT filename FROM photos WHERE id=?',[$id]);
            $dir=$private.'/uploads';
        }
        if(!$entry||!preg_match('/^[a-f0-9-]{36}\.jpg$/',(string)$entry['filename'])){
            http_response_code(404);exit;
        }
        $path=$dir.'/'.$entry['filename'];
        if(!is_file($path)||!is_readable($path)){
            http_response_code(404);exit;
        }
        header('Content-Type: image/jpeg');
        header('Content-Length: '.filesize($path));
        header('Cache-Control: private, no-store');
        readfile($path);
    }catch(Throwable $e){
        error_log('Wedding protected media error: '.$e->getMessage());
        http_response_code(503);
    }
    exit;
}
// Private organizer data API shares this already-authenticated admin session.
// Guest-facing API remains disabled and is never reachable through this gateway.
if (isset($_GET['api'])) {
    header('Content-Type: application/json; charset=UTF-8', true);
    $route = (string)($_GET['api'] ?? '');
    $method = (string)($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($route === 'auth/session' && $method === 'GET') {
        echo json_encode(['ok'=>true,'role'=>'admin','csrf'=>(string)$_SESSION['csrf']],
          JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }
    if (!preg_match('~^admin/[a-z][a-z0-9/-]{0,70}$~', $route) ||
        !in_array($method, ['GET','POST','PATCH'], true)) {
        http_response_code(404);
        echo '{"ok":false,"error":"not_found"}';
        exit;
    }
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '') {
        $parts = parse_url($origin);
        if (!is_array($parts) ||
            ($parts['scheme'] ?? '') !== 'https' ||
            !in_array(strtolower((string)($parts['host'] ?? '')),
                ['nikitakristina.ru','www.nikitakristina.ru'], true)) {
            http_response_code(403);
            echo '{"ok":false,"error":"bad_origin"}';
            exit;
        }
    }
    if ($method !== 'GET') {
        $csrfToken = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($csrfToken === '' || !hash_equals((string)$_SESSION['csrf'], $csrfToken)) {
            http_response_code(403);
            echo '{"ok":false,"error":"csrf"}';
            exit;
        }
    }
    try {
        $backend = $private.'/backend/src/api.php';
        if (!is_file($backend)) throw new RuntimeException('Backend not installed');
        // Fail closed rather than echoing PHP source if a broken deployment
        // accidentally removes the opening PHP tag.
        $prefix = file_get_contents($backend, false, null, 0, 5);
        if ($prefix !== '<?php') throw new RuntimeException('Malformed backend PHP entrypoint');
        require_once $backend;
        $database = \Wedding\db();
        \Wedding\adminRoute($database, $login, $route, $method, \Wedding\config());
    } catch (Throwable $error) {
        error_log('Wedding admin API error: '.$error->getMessage());
        http_response_code(503);
        echo '{"ok":false,"error":"admin_backend_unavailable","message":"База данных временно недоступна"}';
        exit;
    }
}
$types = [
    'index.html' => 'text/html; charset=UTF-8',
    'src/admin-app.js' => 'text/javascript; charset=UTF-8',
    'src/admin-toast.js' => 'text/javascript; charset=UTF-8',
    'src/admin-data-ui.js' => 'text/javascript; charset=UTF-8',
    'src/admin-program.js' => 'text/javascript; charset=UTF-8',
    'src/admin-settings.js' => 'text/javascript; charset=UTF-8',
    'src/admin-photos.js' => 'text/javascript; charset=UTF-8',
    'src/venue-files-ui.js' => 'text/javascript; charset=UTF-8',
    'src/admin-guests.js' => 'text/javascript; charset=UTF-8',
    'src/data.js' => 'text/javascript; charset=UTF-8',
    'src/venues.js' => 'text/javascript; charset=UTF-8',
    'src/venues-data.js' => 'text/javascript; charset=UTF-8',
    'src/venue-detail-ui.js' => 'text/javascript; charset=UTF-8',
    'src/venues-pricing.js' => 'text/javascript; charset=UTF-8',
    'src/venue-evaluation.js' => 'text/javascript; charset=UTF-8',
    'src/venue-transcript-costs.js' => 'text/javascript; charset=UTF-8',
    'src/venue-budget-coverage.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-1.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-2.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-3.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-4.js' => 'text/javascript; charset=UTF-8',
    'src/venues-photos-5.js' => 'text/javascript; charset=UTF-8',
    'src/styles.css' => 'text/css; charset=UTF-8',
    'src/venues.css' => 'text/css; charset=UTF-8',
    'src/venue-detail-ui.css' => 'text/css; charset=UTF-8',
    'src/admin-data.css' => 'text/css; charset=UTF-8',
    'src/admin-program.css' => 'text/css; charset=UTF-8',
    'src/admin-photos.css' => 'text/css; charset=UTF-8',
    'src/venue-files-ui.css' => 'text/css; charset=UTF-8',
    'src/admin-guests.css' => 'text/css; charset=UTF-8',
    'src/admin-heading.css' => 'text/css; charset=UTF-8',
];
$asset = $_GET['asset'] ?? 'index.html';
if (!is_string($asset) || !isset($types[$asset])) {
    http_response_code(404);
    exit;
}
$path = $private.'/admin-release/'.$asset;
if (!is_file($path) || !is_readable($path)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=UTF-8', true);
    exit('Admin bundle unavailable');
}
header('Content-Type: '.$types[$asset], true);
readfile($path);
