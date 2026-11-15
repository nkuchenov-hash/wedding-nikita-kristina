<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';

if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$cfg=config();
$root=PRIVATE_ROOT.'/backups';
if(!is_dir($root))mkdir($root,0700,true);
$target=$root.'/wedding-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(3)).'.sqlite3';
$db=db();
$db->exec('PRAGMA wal_checkpoint(PASSIVE)');
// SQLite on shared hosting may predate the SQL "VACUUM INTO" command.
// The SQLite backup API copies a consistent live snapshot across older versions.
$source=new \SQLite3(PRIVATE_ROOT.'/wedding.sqlite3',SQLITE3_OPEN_READONLY);
$destination=new \SQLite3($target,SQLITE3_OPEN_READWRITE|SQLITE3_OPEN_CREATE);
$source->busyTimeout(5000);
if (!$source->backup($destination)) {
    $destination->close();
    $source->close();
    if(is_file($target))unlink($target);
    throw new \RuntimeException('SQLite backup API failed');
}
$destination->close();
$source->close();
chmod($target,0600);
$sourceCount=(int)$db->query("SELECT COUNT(*) FROM guests")->fetchColumn();
$copy=new \PDO('sqlite:'.$target);
$copyCount=(int)$copy->query("SELECT COUNT(*) FROM guests")->fetchColumn();
if($sourceCount!==$copyCount){unlink($target);throw new \RuntimeException('Backup integrity mismatch');}
$check=$copy->query('PRAGMA integrity_check')->fetchColumn();
if($check!=='ok'){unlink($target);throw new \RuntimeException('Backup integrity check failed');}
echo "BACKUP_OK ".basename($target)." (database only; photos require independent backups)\n";
