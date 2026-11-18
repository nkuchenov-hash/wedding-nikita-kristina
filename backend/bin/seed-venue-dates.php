<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';

if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$file=__DIR__.'/../seed/venue-dates.json';
if(!is_file($file))throw new \RuntimeException('Venue dates seed missing');
$rows=json_decode((string)file_get_contents($file),true,512,JSON_THROW_ON_ERROR);
if(!is_array($rows)||count($rows)===0)throw new \RuntimeException('Venue dates seed is empty');
$db=db();
$insert=$db->prepare('INSERT OR IGNORE INTO venue_date_status(venue_id,day,status) VALUES(?,?,?)');
$allowed=['unknown','pending','available','unavailable'];
$seen=[];
$added=0;
$db->beginTransaction();
try{
 foreach($rows as $row){
  $id=$row['venue_id']??null;
  $day=$row['day']??null;
  $status=$row['status']??null;
  if(!is_string($id)||!preg_match('/^[a-z0-9-]{2,36}$/',$id)||
     !in_array($day,['2027-06-18','2027-06-19','2027-06-20'],true)||
     !in_array($status,$allowed,true))
   throw new \RuntimeException('Invalid venue availability seed');
  $key=$id.'|'.$day;
  if(isset($seen[$key]))throw new \RuntimeException('Duplicate venue day');
  $seen[$key]=true;
  $insert->execute([$id,$day,$status]);
  $added+=$insert->rowCount();
 }
 $db->commit();
}catch(\Throwable $e){$db->rollBack();throw $e;}
echo 'VENUE_DATES_SEED_OK rows='.count($rows).' newly_inserted='.$added.
  ' retained_existing='.(count($rows)-$added)."\n";
