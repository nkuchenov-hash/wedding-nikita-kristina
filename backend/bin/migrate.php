<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';

if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
if (!extension_loaded('pdo_sqlite') || !extension_loaded('sqlite3')) {
    fwrite(STDERR,"ERROR: SQLite modules unavailable in this PHP binary.\n");exit(2);
}
$root=PRIVATE_ROOT;
foreach([$root,$root.'/uploads',$root.'/sessions',$root.'/backups',$root.'/backend'] as $dir) {
    if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))
        throw new \RuntimeException('Cannot create private storage directory');
    chmod($dir,0700);
}
$cfgFile=$root.'/wedding-config.json';
if(!is_file($cfgFile)){
    $cfg=['version'=>1,'enabled'=>false,'pepper'=>bin2hex(random_bytes(32)),
      'created_at'=>gmdate('c'),'note'=>'Enable only after trusted HTTPS and auth review'];
    $temp=$cfgFile.'.'.bin2hex(random_bytes(4)).'.tmp';
    file_put_contents($temp,json_encode($cfg,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR),LOCK_EX);
    chmod($temp,0600);
    if(!rename($temp,$cfgFile))throw new \RuntimeException('Config install failed');
}
chmod($cfgFile,0600);
$database=db();
$database->exec('PRAGMA journal_mode = WAL');
$schema=file_get_contents(__DIR__.'/../schema.sql');
if($schema===false)throw new \RuntimeException('Schema missing');
$database->exec($schema);
$tables=(int)$database->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchColumn();
chmod($root.'/wedding.sqlite3',0600);
foreach(['-wal','-shm'] as $suffix)if(is_file($root.'/wedding.sqlite3'.$suffix))
    chmod($root.'/wedding.sqlite3'.$suffix,0600);
echo "BACKEND_MIGRATION_OK tables={$tables}; enabled=false by default; data is stored outside document root\n";
