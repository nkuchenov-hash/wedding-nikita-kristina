<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$file=__DIR__.'/../seed/venues.json';
if(!is_file($file))throw new \RuntimeException('Venue seed JSON missing');
$rows=json_decode((string)file_get_contents($file),true,512,JSON_THROW_ON_ERROR);
if(!is_array($rows)||count($rows)<20)throw new \RuntimeException('Incomplete venue seed');
$db=db();
$cols=['id','name','area','address','website','capacity_min','capacity_max','quoted_total_rub',
'quote_guests','desired_date_status','contact_name','contact_email','contact_phone','quote_source',
'pros','cons','notes','details_json','photo_refs_json'];
$insert=$db->prepare('INSERT OR IGNORE INTO venues('.implode(',',$cols).') VALUES('.implode(',',array_fill(0,count($cols),'?')).')');
$added=0;
$db->beginTransaction();
try{
 foreach($rows as $item){
   if(!is_array($item)||empty($item['id'])||empty($item['name']))throw new \RuntimeException('Bad venue record');
   $values=[];
   foreach($cols as $col){
     $v=$item[$col]??null;
     if(!is_null($v)&&!is_scalar($v))throw new \RuntimeException('Invalid venue field '.$col);
     $values[]=$v;
   }
   $insert->execute($values);
   $added+=$insert->rowCount();
 }
 $db->commit();
}catch(\Throwable $e){$db->rollBack();throw $e;}
echo 'VENUE_SEED_OK source='.count($rows).' inserted='.$added.' retained_existing='.(count($rows)-$added)."\n";
