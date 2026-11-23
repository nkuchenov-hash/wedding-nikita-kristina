<?php
declare(strict_types=1);
namespace Wedding;

use PDO;
use Throwable;
require_once __DIR__.'/../src/core.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit(1); }

// Idempotent refresh of documentary facts, preserving all organizer edits.
$seed=json_decode((string)file_get_contents(__DIR__.'/../seed/venues.json'),true,512,JSON_THROW_ON_ERROR);
$source=null;
foreach($seed as $row) {
  if(($row['id']??'')!=='alex-park') continue;
  $detail=json_decode((string)($row['details_json']??'{}'),true,512,JSON_THROW_ON_ERROR);
  $source=$detail['source']??null;
  break;
}
if(!is_array($source)||empty($source['technicalRiderNotes'])||empty($source['technicalRiderSource']))
  throw new \RuntimeException('Alexandrovsky technical rider is missing from prepared seed');

$db=db();
$rows=$db->query('SELECT id,details_json FROM venues')->fetchAll(PDO::FETCH_ASSOC);
$update=$db->prepare("UPDATE venues SET details_json=?,updated_at=datetime('now') WHERE id=? AND details_json=?");
$count=0;
$db->beginTransaction();
try {
  foreach($rows as $row) {
    $detail=json_decode((string)$row['details_json'],true);
    if(!is_array($detail))continue;
    $id=$detail['wedding_comparison_id']??($detail['public']['id']??$row['id']);
    if($id!=='alex-park')continue;
    $before=(string)$row['details_json'];
    $detail['source']=$source; // The 'overrides' section is never modified.
    $after=json_encode($detail,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if($after===$before)continue;
    $update->execute([$after,$row['id'],$before]);
    if($update->rowCount()!==1)throw new \RuntimeException('Concurrent Alexandrovsky update');
    $count++;
  }
  $db->commit();
  echo "ALEXANDROVSKY_TECH_RIDER_SYNCED records=$count\n";
} catch(Throwable $e) {
  if($db->inTransaction())$db->rollBack();
  throw $e;
}
