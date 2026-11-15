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
$db->exec('VACUUM INTO '.$db->quote($target));
chmod($target,0600);
$sourceCount=(int)$db->query("SELECT COUNT(*) FROM guests")->fetchColumn();
$copy=new \PDO('sqlite:'.$target);
$copyCount=(int)$copy->query("SELECT COUNT(*) FROM guests")->fetchColumn();
if($sourceCount!==$copyCount){unlink($target);throw new \RuntimeException('Backup integrity mismatch');}
$check=$copy->query('PRAGMA integrity_check')->fetchColumn();
if($check!=='ok'){unlink($target);throw new \RuntimeException('Backup integrity check failed');}
echo "BACKUP_OK ".basename($target)." (database only; photos require independent backups)\n";
