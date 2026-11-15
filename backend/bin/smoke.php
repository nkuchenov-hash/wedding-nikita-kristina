<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(2);
if(!extension_loaded('pdo_sqlite')){fwrite(STDERR,"PDO SQLite missing\n");exit(2);}
$pdo=new \PDO('sqlite::memory:');
$pdo->setAttribute(\PDO::ATTR_ERRMODE,\PDO::ERRMODE_EXCEPTION);
$pdo->exec(file_get_contents(__DIR__.'/../schema.sql'));
function assertSql(bool $ok,string $message):void{if(!$ok)throw new \RuntimeException($message);}
$tables=(int)$pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchColumn();
assertSql($tables>=20,'Missing expected tables');
$pdo->exec("PRAGMA foreign_keys=ON");
$pdo->exec("INSERT INTO guests(id,first_name,display_name) VALUES('sample','Test','Sample Guest')");
$pdo->exec("INSERT INTO rsvps(guest_id,attendance) VALUES('sample','yes')");
assertSql((int)$pdo->query("SELECT COUNT(*) FROM rsvps")->fetchColumn()===1,'RSVP insert failed');
try {$pdo->exec("INSERT INTO rsvps(guest_id,attendance) VALUES('unknown','yes')");throw new \RuntimeException('FK not enforced');}
catch(\PDOException $expected){}
try {$pdo->exec("INSERT INTO rsvps(guest_id,attendance) VALUES('sample','unexpected')");throw new \RuntimeException('Status constraint not enforced');}
catch(\PDOException $expected){}
$pdo->exec("DELETE FROM guests WHERE id='sample'");
assertSql((int)$pdo->query('SELECT COUNT(*) FROM rsvps')->fetchColumn()===0,'Cascade failed');
echo "BACKEND_SCHEMA_TEST_OK tables={$tables}, FK, RSVP validation, cascades\n";
