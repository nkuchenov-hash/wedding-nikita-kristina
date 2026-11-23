<?php
declare(strict_types=1);
namespace Wedding;

use PDO;
use Throwable;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}
// Refresh attached factual sources only. Never overwrite organizer 'overrides'.
$ids=['roof18','milyutin','glukhovsky','repino-riviera','petr'];
$seed=json_decode((string)file_get_contents(__DIR__.'/../seed/venues.json'),true,512,JSON_THROW_ON_ERROR);
$sourceById=[];
foreach($seed as $x){
 if(!in_array(($x['id']??''),$ids,true))continue;
 $d=json_decode((string)($x['details_json']??'{}'),true,512,JSON_THROW_ON_ERROR);
 if(!is_array($d['source']??null))throw new \RuntimeException('Missing prepared venue source '.$x['id']);
 $sourceById[$x['id']]=$d['source'];
}
if(count($sourceById)!==count($ids))throw new \RuntimeException('Incomplete source catalogue for planning');
$db=db();
$rows=$db->query('SELECT id,details_json FROM venues')->fetchAll(PDO::FETCH_ASSOC);
$update=$db->prepare("UPDATE venues SET details_json=?,updated_at=datetime('now') WHERE id=? AND details_json=?");
$changed=0;
$db->beginTransaction();
try{
 foreach($rows as $row){
  $d=json_decode((string)$row['details_json'],true);
  if(!is_array($d))continue;
  $id=$d['wedding_comparison_id']??($d['public']['id']??$row['id']);
  if(!isset($sourceById[$id]))continue;
  $before=(string)$row['details_json'];
  $d['source']=$sourceById[$id];
  $after=json_encode($d,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
  if($after===$before)continue;
  $update->execute([$after,$row['id'],$before]);
  if($update->rowCount()!==1)throw new \RuntimeException('Concurrent venue edit: '.$id);
  $changed++;
 }
 $db->commit();
 echo "WEDDING_VENUE_WORKING_SOURCES_SYNCED records=$changed\n";
}catch(Throwable $e){
 if($db->inTransaction())$db->rollBack();
 throw $e;
}
