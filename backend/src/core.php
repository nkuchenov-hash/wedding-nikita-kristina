<?php
declare(strict_types=1);

namespace Wedding;

use PDO;
use RuntimeException;
use Throwable;

const PRIVATE_ROOT = '/var/www/u3728035/data/wedding-private';

function uuid(): string {
    $hex = bin2hex(random_bytes(16));
    return substr($hex,0,8).'-'.substr($hex,8,4).'-4'.substr($hex,13,3).'-'.
        dechex((hexdec($hex[16]) & 3) | 8).substr($hex,17,3).'-'.substr($hex,20,12);
}
function config(): array {
    $file = PRIVATE_ROOT.'/wedding-config.json';
    if (!is_file($file)) throw new RuntimeException('Wedding backend has not been initialized');
    $cfg = json_decode((string)file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($cfg) || !isset($cfg['pepper'])) throw new RuntimeException('Invalid backend configuration');
    return $cfg;
}
function db(): PDO {
    static $connection = null;
    if ($connection instanceof PDO) return $connection;
    if (!extension_loaded('pdo_sqlite')) throw new RuntimeException('PDO SQLite extension is required');
    $connection = new PDO('sqlite:'.PRIVATE_ROOT.'/wedding.sqlite3', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $connection->exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    return $connection;
}
function statement(PDO $db, string $sql, array $values=[]): \PDOStatement {
    $stmt=$db->prepare($sql);
    $stmt->execute($values);
    return $stmt;
}
function one(PDO $db, string $sql, array $values=[]): ?array {
    $item = statement($db,$sql,$values)->fetch();
    return $item === false ? null : $item;
}
function all(PDO $db, string $sql, array $values=[]): array {
    return statement($db,$sql,$values)->fetchAll();
}
function json(mixed $payload, int $status=200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex, nofollow');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    exit;
}
function fail(int $status, string $code, string $message): never {
    json(['ok'=>false,'error'=>$code,'message'=>$message],$status);
}
function payload(int $maxBytes=65536): array {
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>$maxBytes) fail(413,'too_large','Слишком большой запрос');
    $raw=file_get_contents('php://input', false, null, 0, $maxBytes+1);
    if ($raw===false || strlen($raw)>$maxBytes) fail(413,'too_large','Слишком большой запрос');
    try { $result=json_decode($raw,true,32,JSON_THROW_ON_ERROR); }
    catch (Throwable $e) { fail(400,'invalid_json','Некорректный JSON'); }
    if (!is_array($result) || array_is_list($result)) fail(400,'invalid_json','Ожидался JSON-объект');
    return $result;
}
function strval(array $data,string $key,int $limit=255,bool $required=false): string {
    $v=$data[$key]??'';
    if (!is_string($v)) fail(422,'invalid_field','Недопустимое поле '.$key);
    $v=trim($v);
    if ($required && $v==='') fail(422,'required_field','Не заполнено поле '.$key);
    if (mb_strlen($v)>$limit) fail(422,'field_too_long','Слишком длинное поле '.$key);
    return $v;
}
function boolval(array $d,string $key,bool $default=false): bool {
    if (!array_key_exists($key,$d)) return $default;
    if (!is_bool($d[$key])) fail(422,'invalid_field','Поле '.$key.' должно быть логическим');
    return $d[$key];
}
function intvalField(array $d,string $key,int $min,int $max,int $default=0): int {
    $v=$d[$key]??$default;
    if (!is_int($v) || $v<$min || $v>$max) fail(422,'invalid_field','Недопустимое значение '.$key);
    return $v;
}
function choice(array $d,string $key,array $allowed,string $default): string {
    $v=strval($d,$key,60);
    if ($v==='') $v=$default;
    if (!in_array($v,$allowed,true)) fail(422,'invalid_choice','Недопустимое значение '.$key);
    return $v;
}
function tokenHash(string $raw, array $cfg): string {
    return hash_hmac('sha256',$raw,(string)$cfg['pepper']);
}
function sessionStart(): void {
    $cfg=config();
    $path=PRIVATE_ROOT.'/sessions';
    if (!is_dir($path)) throw new RuntimeException('Session storage missing');
    ini_set('session.save_path',$path);
    ini_set('session.use_strict_mode','1');
    ini_set('session.use_only_cookies','1');
    ini_set('session.cookie_httponly','1');
    ini_set('session.cookie_secure','1');
    ini_set('session.cookie_samesite','Lax');
    session_name('wedding_sid');
    session_set_cookie_params([
      'lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax'
    ]);
    session_start();
    if (!isset($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(24));
}
function csrf(): void {
    $value=$_SERVER['HTTP_X_CSRF_TOKEN']??'';
    if (!is_string($value) || !isset($_SESSION['csrf']) ||
        !hash_equals((string)$_SESSION['csrf'],$value)) fail(403,'csrf','Проверка формы не пройдена');
}
function requireRole(string $role): string {
    $sid=$_SESSION[$role.'_id']??null;
    if (!is_string($sid) || $sid==='') fail(401,'login_required','Требуется авторизация');
    if (!empty($_SESSION['last_active']) && time()-(int)$_SESSION['last_active']>28800) {
        $_SESSION=[]; session_regenerate_id(true); fail(401,'session_expired','Сессия истекла');
    }
    $_SESSION['last_active']=time();
    return $sid;
}
function requireAdmin(PDO $db): string {
    $id=requireRole('admin');
    if (!one($db,'SELECT id FROM admins WHERE id=? AND disabled=0',[$id])) {
        unset($_SESSION['admin_id']); fail(401,'login_required','Требуется авторизация');
    }
    return $id;
}
function requireGuest(PDO $db): string {
    $id=requireRole('guest');
    if (!one($db,"SELECT id FROM guests WHERE id=? AND status!='archived'",[$id])) {
        unset($_SESSION['guest_id']); fail(401,'login_required','Требуется авторизация');
    }
    return $id;
}
function audit(PDO $db,string $who,string $actor,string $action,string $entity,string $id,array $details=[]): void {
    statement($db,'INSERT INTO audit_log(actor_type,actor_id,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)',
        [$who,$actor,$action,$entity,$id,json_encode($details,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
}
function throttle(PDO $db,string $bucket,int $limit=10,int $window=900): void {
    $key=hash('sha256',$bucket);
    $now=time();
    $row=one($db,'SELECT attempts,window_start FROM throttle WHERE key_hash=?',[$key]);
    if (!$row || $now-(int)$row['window_start']>$window) {
        statement($db,'INSERT INTO throttle(key_hash,attempts,window_start) VALUES(?,1,?) ON CONFLICT(key_hash) DO UPDATE SET attempts=1,window_start=excluded.window_start',[$key,$now]);
        return;
    }
    if ((int)$row['attempts']>=$limit) fail(429,'rate_limited','Слишком много попыток. Повторите позже');
    statement($db,'UPDATE throttle SET attempts=attempts+1 WHERE key_hash=?',[$key]);
}
function requestIp(): string {
    // Do not trust user-controlled X-Forwarded-For on shared hosting.
    return substr((string)($_SERVER['REMOTE_ADDR']??'unknown'),0,64);
}
function requireSafeOrigin(): void {
    $host=strtolower((string)($_SERVER['HTTP_HOST']??''));
    $origin=(string)($_SERVER['HTTP_ORIGIN']??'');
    if ($origin==='') return;
    $url=parse_url($origin);
    if (!is_array($url) || ($url['scheme']??'')!=='https' ||
        !in_array(strtolower((string)($url['host']??'')),['nikitakristina.ru','www.nikitakristina.ru'],true))
        fail(403,'origin','Недопустимый источник запроса');
    if (!in_array($host,['nikitakristina.ru','www.nikitakristina.ru'],true))
        fail(403,'host','Неверный домен');
}
function secureTransport(): bool {
    return ($_SERVER['HTTPS']??'')==='on' || (int)($_SERVER['SERVER_PORT']??0)===443;
}
function privatePhotoPath(string $filename): string {
    if (!preg_match('/^[a-f0-9-]{36}\.jpg$/',$filename)) throw new RuntimeException('Unsafe photo filename');
    return PRIVATE_ROOT.'/uploads/'.$filename;
}
