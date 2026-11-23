<?php
declare(strict_types=1);
namespace Wedding;
use PDO;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}

// Idempotently migrate old 10- or 6-criterion preferences to the current 7.
// Organizer's custom price thresholds, date alternatives and guest rules remain intact.
$db=db();
$row=$db->query("SELECT value_json FROM event_settings WHERE key='venue_rating_rules'")->fetch(PDO::FETCH_ASSOC);
if(!$row){echo "RATING_RULES_NOT_SAVED using_frontend_defaults=1\n";exit(0);}
$original=(string)$row['value_json'];
$v=json_decode($original,true);
$old10=['date'=>40,'cost'=>15,'capacity'=>10,'city'=>10,
 'singleHall'=>6,'indoorBackup'=>5,'includedEquipment'=>5,
 'until23'=>3,'ownAlcohol'=>3,'outdoorArea'=>3];
$old6=['date'=>45,'cost'=>20,'capacity'=>13,'city'=>10,
 'includedEquipment'=>7,'outdoorArea'=>5];
$updated=['date'=>45,'cost'=>18,'capacity'=>11,'city'=>9,
 'includedEquipment'=>6,'outdoorArea'=>3,'entrance'=>8];
if(!is_array($v)||!is_array($v['weights']??null)){
 echo "RATING_RULES_MIGRATION_SKIPPED malformed=1\n";exit(0);
}
$weights=$v['weights'];
$matches=static function(array $actual,array $model):bool{
 if(count($actual)!==count($model)||array_diff(array_keys($actual),array_keys($model)))
  return false;
 $sum=0;
 foreach($model as $k=>$w){
  $v=$actual[$k]??null;
  if(!is_int($v)||$v<0||$v>100)return false;
  $sum+=$v;
 }
 return $sum===100;
};
$distribute=static function(array $data,array $keys,int $points):?array{
 $total=0;
 foreach($keys as $key)$total+=$data[$key]??0;
 if($total<=0)return null;
 $next=[];$fractions=[];
 foreach($keys as $idx=>$key){
  $raw=$data[$key]*$points/$total;
  $next[$key]=(int)floor($raw);
  $fractions[]=['key'=>$key,'part'=>$raw-floor($raw),'index'=>$idx];
 }
 $missing=$points-array_sum($next);
 usort($fractions,static fn($a,$b)=>($b['part']<=>$a['part'])?:($a['index']<=>$b['index']));
 for($i=0;$i<$missing;$i++)$next[$fractions[$i]['key']]++;
 return $next;
};
if($matches($weights,$updated)){
 echo "RATING_RULES_ALREADY_CURRENT criteria=7\n";exit(0);
}
if($matches($weights,$old6)) {
 $previous=$weights;
} elseif($matches($weights,$old10)){
 $previous=$weights===$old10?$old6:$distribute($weights,array_keys($old6),100);
} else {
 echo "RATING_RULES_MIGRATION_SKIPPED unexpected_schema=1\n";exit(0);
}
if($previous===null){
 echo "RATING_RULES_MIGRATION_SKIPPED no_retained_weight=1\n";exit(0);
}
$defaults=true;
foreach($old6 as $key=>$baseline){
 if($previous[$key]!==$baseline){$defaults=false;break;}
}
$new=$defaults?array_intersect_key($updated,$old6):
 $distribute($previous,array_keys($old6),92);
if($new===null)throw new \RuntimeException('Could not redistribute old rating weights');
$new['entrance']=8;
if(array_sum($new)!==100)throw new \RuntimeException('Invalid migrated ranking weight total');
$v['weights']=$new;
$next=json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
$update=$db->prepare("UPDATE event_settings SET value_json=?,updated_at=datetime('now')
 WHERE key='venue_rating_rules' AND value_json=?");
$update->execute([$next,$original]);
if($update->rowCount()!==1)throw new \RuntimeException('Concurrent edit of shared rating rules');
echo "RATING_RULES_MIGRATED criteria=7 sum=".array_sum($new)." preferences_preserved=1\n";
