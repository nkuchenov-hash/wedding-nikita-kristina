<?php
declare(strict_types=1);
namespace Wedding;

use PDO;
use Throwable;
require_once __DIR__.'/../src/core.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit(1); }

// Sync source facts from the current source-controlled Santa Gloria venue
// while retaining every organizer-entered override and unrelated record.
$seed=json_decode((string)file_get_contents(__DIR__.'/../seed/venues.json'),true,512,JSON_THROW_ON_ERROR);
$source=null;
foreach($seed as $row){
  if(($row['id']??'')!=='santa-gloria')continue;
  $detail=json_decode((string)($row['details_json']??'{}'),true,512,JSON_THROW_ON_ERROR);
  $source=$detail['source']??null;
  break;
}
if(!is_array($source)||!isset($source['costSummary'],$source['quotes']))
  throw new \RuntimeException('Updated Santa Gloria source not prepared');
$db=db();
$rows=$db->query('SELECT id,details_json,quote_source FROM venues')->fetchAll(PDO::FETCH_ASSOC);
$set=$db->prepare("UPDATE venues SET details_json=?,quote_source=?,updated_at=datetime('now') WHERE id=? AND details_json=? AND quote_source=?");
$applied=0;
$db->beginTransaction();
try{
 foreach($rows as $row){
  $detail=json_decode((string)$row['details_json'],true);
  if(!is_array($detail))continue;
  $id=$detail['wedding_comparison_id']??($detail['public']['id']??$row['id']);
  if($id!=='santa-gloria')continue;
  $prev=(string)$row['details_json'];
  $oldLink=(string)$row['quote_source'];
  $link=$oldLink?:((string)($source['quoteSource']??''));
  $detail['source']=$source; // never write into 'overrides'
  $next=json_encode($detail,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
  if($next===$prev&&$link===$oldLink)continue;
  $set->execute([$next,$link,$row['id'],$prev,$oldLink]);
  if($set->rowCount()!==1)throw new \RuntimeException('Concurrent Santa Gloria edit');
  $applied++;
 }
 $db->commit();
 echo "SANTA_GLORIA_SOURCE_SYNCED records=$applied\n";
}catch(Throwable $error){
 if($db->inTransaction())$db->rollBack();
 throw $error;
}
