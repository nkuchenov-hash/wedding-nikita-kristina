<?php
declare(strict_types=1);
namespace Wedding;
use PDO;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}

// Convert previously saved 10-criterion weights to the six criteria retained by
// the organizer. Preserve personalized threshold, price and date preferences.
$db=db();
$row=$db->query("SELECT value_json FROM event_settings WHERE key='venue_rating_rules'")->fetch(PDO::FETCH_ASSOC);
if(!$row){echo "RATING_RULES_NOT_SAVED using_frontend_defaults=1\n";exit(0);}
$original=(string)$row['value_json'];
$v=json_decode($original,true);
$old=['date'=>40,'cost'=>15,'capacity'=>10,'city'=>10,
      'singleHall'=>6,'indoorBackup'=>5,'includedEquipment'=>5,
      'until23'=>3,'ownAlcohol'=>3,'outdoorArea'=>3];
$new=['date'=>45,'cost'=>20,'capacity'=>13,'city'=>10,'includedEquipment'=>7,'outdoorArea'=>5];
if(!is_array($v)||!is_array($v['weights']??null)){
 echo "RATING_RULES_MIGRATION_SKIPPED malformed=1\n";exit(0);
}
$weight=$v['weights'];
if(count($weight)===count($new)&&!array_diff(array_keys($weight),array_keys($new))){
 echo "RATING_RULES_ALREADY_CURRENT criteria=6\n";exit(0);
}
if(count($weight)!==count($old)||array_diff(array_keys($weight),array_keys($old))||
   array_sum($weight)!==100){
 echo "RATING_RULES_MIGRATION_SKIPPED unexpected_schema=1\n";exit(0);
}
foreach($old as $key=>$baseline){
 if(!isset($weight[$key])||!is_int($weight[$key])||$weight[$key]<0||$weight[$key]>100){
  echo "RATING_RULES_MIGRATION_SKIPPED invalid_weights=1\n";exit(0);
 }
}
$untouched=true;
foreach($old as $key=>$baseline){if($weight[$key]!==$baseline){$untouched=false;break;}}
if(!$untouched){
 $retained=array_keys($new);
 $total=0;foreach($retained as $key)$total+=$weight[$key];
 if($total>0){
  $new=[];$fraction=[];
  foreach($retained as $idx=>$key){
   $raw=$weight[$key]*100/$total;
   $new[$key]=(int)floor($raw);
   $fraction[]=['key'=>$key,'part'=>$raw-floor($raw),'index'=>$idx];
  }
  $missing=100-array_sum($new);
  usort($fraction,static fn($a,$b)=>($b['part']<=>$a['part'])?:($a['index']<=>$b['index']));
  for($i=0;$i<$missing;$i++)$new[$fraction[$i]['key']]++;
 }
}
$v['weights']=$new;
$next=json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
$update=$db->prepare("UPDATE event_settings SET value_json=?,updated_at=datetime('now')
 WHERE key='venue_rating_rules' AND value_json=?");
$update->execute([$next,$original]);
if($update->rowCount()!==1)throw new \RuntimeException('Concurrent change of shared rating settings');
echo "RATING_RULES_MIGRATED criteria=6 sum=".array_sum($new)." preferences_preserved=1\n";
