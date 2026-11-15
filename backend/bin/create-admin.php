<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$login=$argv[1]??'';
if(!preg_match('/^[a-z][a-z0-9_-]{3,30}$/i',$login)){
    fwrite(STDERR,"Usage: php create-admin.php username (run interactively after trusted HTTPS setup)\n");exit(2);
}
$db=db();
if(one($db,'SELECT id FROM admins WHERE login=?',[$login]))throw new \RuntimeException('Admin already exists');
$password=rtrim(strtr(base64_encode(random_bytes(24)),'+/','-_'),'=');
$id=uuid();
statement($db,'INSERT INTO admins(id,login,password_hash) VALUES(?,?,?)',
    [$id,$login,password_hash($password,PASSWORD_DEFAULT)]);
echo "ADMIN_CREATED user=".$login."\n";
echo "ONE_TIME_PASSWORD ".$password."\n";
echo "Store the password in a password manager. Never execute this command in publicly readable CI logs.\n";
