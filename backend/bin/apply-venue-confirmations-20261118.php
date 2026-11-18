<?php
declare(strict_types=1);
namespace Wedding;
use PDO;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}

$source=__DIR__.'/../seed/venue-confirmations-20261118.json';
if(!is_file($source))throw new \RuntimeException('Missing one-time venue update source');
$data=json_decode((string)file_get_contents($source),true,512,JSON_THROW_ON_ERROR);
if(!is_array($data)||($data['batch']??'')!=='2026-11-18-venue-availability-harmony-offer')
 throw new \RuntimeException('Wrong venue update batch');
$dates=$data['availability']??null;
$overrides=$data['overrides']??null;
if(!is_array($dates)||count($dates)!==6||!is_array($overrides)||
   array_diff(array_keys($overrides),['eva','putilov','harmony']))
 throw new \RuntimeException('Unexpected batch shape');
$db=db();
$marker='venue_batch:2026-11-18-harmony-offer-v1';
$appliedDates=0;
$appliedRows=0;
$db->beginTransaction();
try{
 // Import newly supplied Harmony PDF as an actual venue document once.
 $documentMarker='venue_document:2026-11-18-harmony-presentation-v1';
 $pdfCheck=$db->prepare('SELECT value_json FROM event_settings WHERE key=?');
 $pdfCheck->execute([$documentMarker]);
 if($pdfCheck->fetchColumn()===false){
  $fileId='1PjAw62irJgQ6JgJ16Y9C1VHdz4jaXHUm';
  $docId=substr(hash('sha256','venue-drive-file-'.$fileId),0,36);
  $pdfUrl='https://drive.google.com/file/d/'.$fileId.'/view';
  $db->prepare('INSERT OR IGNORE INTO venue_files
      (id,venue_id,title,mime,file_id,source_url,type)
      VALUES(?,?,?,?,?,?,?)')
    ->execute([$docId,'harmony','Harmony — презентация площадки и меню 2026','pdf',
        $fileId,$pdfUrl,'document']);
  $found=$db->prepare('SELECT id FROM venue_files WHERE file_id=? AND venue_id=?');
  $found->execute([$fileId,'harmony']);
  if($found->fetchColumn()===false)throw new \\RuntimeException('Harmony PDF inventory insert failed');
  $db->prepare('INSERT INTO event_settings(key,value_json) VALUES(?,?)')
    ->execute([$documentMarker,json_encode(['file_id'=>$fileId],JSON_THROW_ON_ERROR)]);
  echo "HARMONY_PDF_SOURCE_REGISTERED\\n";
 }
 $once=$db->prepare('SELECT value_json FROM event_settings WHERE key=?');
 $once->execute([$marker]);
 if($once->fetchColumn()!==false){
  $db->commit();
  echo "VENUE_OFFER_ALREADY_APPLIED; no organizer edits overwritten\n";
  exit;
 }
 $find=$db->prepare('SELECT status FROM venue_date_status WHERE venue_id=? AND day=?');
 $setDate=$db->prepare("UPDATE venue_date_status SET status=?,updated_at=datetime('now')
     WHERE venue_id=? AND day=?");
 foreach($dates as $item){
  $id=$item['venue_id']??'';
  $day=$item['day']??'';
  $status=$item['status']??'';
  if(!in_array($id,['eva','putilov','harmony'],true)||
     !preg_match('/^2027-06-(18|19|20)$/',(string)$day)||
     $status!=='available')throw new \RuntimeException('Unexpected venue date status');
  $find->execute([$id,$day]);
  if($find->fetchColumn()===false)throw new \RuntimeException('Venue date missing: '.$id.' '.$day);
  $setDate->execute([$status,$id,$day]);
  $appliedDates++;
 }
 $all=$db->query('SELECT id,details_json FROM venues ORDER BY created_at DESC,id DESC')->fetchAll(PDO::FETCH_ASSOC);
 $setDetails=$db->prepare("UPDATE venues SET details_json=?,updated_at=datetime('now') WHERE id=?");
 foreach($overrides as $id=>$fields){
  if(!in_array($id,['eva','putilov','harmony'],true)||!is_array($fields)||!$fields)
   throw new \RuntimeException('Invalid venue override');
  $matches=0;
  foreach($all as $row){
   $entry=json_decode((string)($row['details_json']??'{}'),true);
   if(!is_array($entry))continue;
   $mapped=$entry['wedding_comparison_id']??($entry['public']['id']??$row['id']);
   if($mapped!==$id)continue;
   $previous=$entry['overrides']??[];
   if(!is_array($previous)||array_is_list($previous)&&count($previous)>0)
    throw new \RuntimeException('Unexpected venue override format');
   foreach($fields as $name=>$value){
    if($name==='cost'){
     $previous['cost']=array_merge(is_array($previous['cost']??null)?$previous['cost']:[],$value);
    }elseif($name==='quotes'||$name==='documents'){
     $existing=is_array($previous[$name]??null)?$previous[$name]:[];
     $incoming=is_array($value)?$value:[];
     $unique=[];
     foreach(array_merge($incoming,$existing) as $q){
      if(!is_array($q))continue;
      $fingerprint=$name==='quotes'
       ? implode('|',[(string)($q['guests']??''),(string)($q['total']??''),(string)($q['kind']??'')])
       : (string)($q['url']??json_encode($q));
      if(isset($unique[$fingerprint]))continue;
      $unique[$fingerprint]=$q;
     }
     $previous[$name]=array_values($unique);
    }else{
     $previous[$name]=$value;
    }
   }
   $entry['wedding_comparison_id']=$id;
   $entry['overrides']=$previous;
   $encoded=json_encode($entry,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
   $setDetails->execute([$encoded,$row['id']]);
   $appliedRows++;
   $matches++;
  }
  if($matches<1)throw new \RuntimeException('No venue record found for '.$id);
 }
 $db->prepare('INSERT INTO event_settings(key,value_json) VALUES(?,?)')
   ->execute([$marker,json_encode(['batch'=>$data['batch'],'dates'=>$appliedDates,'rows'=>$appliedRows],
     JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
 $db->commit();
}catch(\Throwable $e){
 if($db->inTransaction())$db->rollBack();
 throw $e;
}
echo 'VENUE_OFFER_APPLIED dates='.$appliedDates.' venue_rows='.$appliedRows."\n";
