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
    echo '<meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light dark"><title>Вход — Никита и Кристина</title>';
    echo '<script id="login-auto-theme">(function(){function update(){const h=new Date().getHours();document.documentElement.toggleAttribute("data-login-night",h>=20||h<7)}update();setInterval(update,15000);document.addEventListener("visibilitychange",update);window.addEventListener("pageshow",update);window.addEventListener("focus",update)})();</script>';
    echo '<style>:root{color-scheme:light;--login-bg:#ffffff;--login-card:#fff;--login-text:#1b1b1b;--login-muted:#53675a;--login-border:#dce6dc;--login-input:#fff;--login-error:#c32232;--login-shadow:#173b2414}@media (prefers-color-scheme: dark){:root{color-scheme:dark;--login-bg:#151d18;--login-card:#202c24;--login-text:#edf4ed;--login-muted:#b7c7ba;--login-border:#3c4d40;--login-input:#151e19;--login-error:#ffaaa4;--login-shadow:#0005}}:root[data-login-night]{color-scheme:dark;--login-bg:#151d18;--login-card:#202c24;--login-text:#edf4ed;--login-muted:#b7c7ba;--login-border:#3c4d40;--login-input:#151e19;--login-error:#ffaaa4;--login-shadow:#0005}*,*:before,*:after{box-sizing:border-box}body{margin:0;min-height:100svh;background:var(--login-bg);color:var(--login-text);font:16px system-ui,Arial,sans-serif;display:grid;place-items:center;padding:20px}main{background:var(--login-card);padding:clamp(24px,5vw,44px);border-radius:20px;width:min(100%,450px);box-shadow:0 12px 48px var(--login-shadow)}h1{font-family:Georgia,serif;font-size:34px;font-weight:400;margin:8px 0 18px}p{font-size:16px;color:var(--login-muted);line-height:1.6}label{display:block;margin:15px 0;font-weight:600;font-size:16px}input{display:block;width:100%;margin-top:8px;padding:13px;border:1px solid var(--login-border);border-radius:10px;font:inherit;background:var(--login-input);color:var(--login-text)}button{background:#194b30;color:#fff;border:0;border-radius:10px;width:100%;padding:14px;margin-top:12px;font-weight:600;font:inherit;cursor:pointer}input:autofill{box-shadow:0 0 0 1000px var(--login-input) inset;color:var(--login-text)}input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px var(--login-input) inset;-webkit-text-fill-color:var(--login-text);caret-color:var(--login-text)} .login-art{height:180px;margin:-44px -44px 10px;background:linear-gradient(0deg,var(--login-card),transparent 50%),url("data:image/jpeg;base64,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") right 30%/auto 100% no-repeat;pointer-events:none}.login-heading{text-align:center;font:400 40px/1.12 Georgia,serif;margin:6px 0 12px}.login-caption{text-align:center;margin:0 0 24px}.login-form{width:100%}@media(max-width:500px){body{padding:0;display:block}main{width:100%;min-height:100svh;border-radius:0;box-shadow:none;padding:24px 24px 36px}.login-art{height:190px;margin:-24px -24px 12px}.login-heading{font-size:36px}}.error{color:var(--login-error)}</style>';
    echo '</head><body><main><div class="login-art" aria-hidden="true"></div><h1 class="login-heading">Никита<br>и Кристина</h1><p class="login-caption">Система организации свадьбы</p>';
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
