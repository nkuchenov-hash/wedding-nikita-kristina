<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli')exit(2);
$cfg=config();
if(($cfg['enabled']??false)!==false){
    fwrite(STDERR,"Backend is enabled; automatic deployment will not change authorization state.\n");
}else{
    echo "BACKEND_STORED_PRIVATE_AND_DISABLED_UNTIL_TLS\n";
}
$counts=(int)db()->query("SELECT COUNT(*) FROM schema_migrations")->fetchColumn();
if($counts<1)throw new \RuntimeException('No schema version installed');
echo "SCHEMA_VERSION_OK\n";
