<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli')exit(1);
$key=PRIVATE_ROOT.'/guest-import.key';
$input=__DIR__.'/../seed/production-source.enc';
if(!is_readable($key))throw new \RuntimeException('Private import key unavailable');
$buffer='';
foreach(file($input,FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line){
 $raw=base64_decode($line,true);
 if($raw===false||strlen($raw)!==384)throw new \RuntimeException('Encrypted import invalid');
 $process=proc_open(['openssl','pkeyutl','-decrypt','-inkey',$key,'-pkeyopt','rsa_padding_mode:oaep','-pkeyopt','rsa_oaep_md:sha256','-pkeyopt','rsa_mgf1_md:sha256'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 if(!is_resource($process))throw new \RuntimeException('Decryption unavailable');
 fwrite($pipes[0],$raw);fclose($pipes[0]);$chunk=stream_get_contents($pipes[1]);fclose($pipes[1]);stream_get_contents($pipes[2]);fclose($pipes[2]);if(proc_close($process)!==0)throw new \RuntimeException('Decryption failed');$buffer.=$chunk;
}
$source=json_decode(gzuncompress($buffer),true,32,JSON_THROW_ON_ERROR);
if(($source['format']??'')!=='wedding-production-v1')throw new \RuntimeException('Invalid import format');
$db=db();$db->beginTransaction();$added=0;
try{
 foreach($source['records'] as $i=>$record){
  $c=$record['collection'];$f=$record['fields'];
  if(!in_array($c,['vendors','decor_items'],true))throw new \RuntimeException('Invalid collection');
  $id='production-seed-20261125-'.($i+1);
  if(one($db,"SELECT id FROM $c WHERE id=? OR name=?",[$id,$f['name']]))continue;
  statement($db,"INSERT INTO $c(id,name,category,status,estimate_rub,notes,details_json) VALUES(?,?,?,?,?,?,?)",[$id,$f['name'],$f['category'],$f['status'],$f['estimate_rub'],$f['notes'],$f['details_json']]);$added++;
 }
 $imagePath=__DIR__.'/../seed/production-reference.enc';
 if(is_readable($imagePath)&&!one($db,"SELECT key FROM event_settings WHERE key='production_reference_seed_20261125'")){
  $record=$source['records'][3]['fields'];$item=one($db,'SELECT id FROM decor_items WHERE id=? OR name=?',['production-seed-20261125-4',$record['name']]);
  if(!$item)throw new \RuntimeException('Reference target missing');
  $encrypted=file_get_contents($imagePath);
  if(strlen($encrypted)!==458710)throw new \RuntimeException('Encrypted image length invalid');
  $process=proc_open(['openssl','pkeyutl','-decrypt','-inkey',$key,'-pkeyopt','rsa_padding_mode:oaep','-pkeyopt','rsa_oaep_md:sha256','-pkeyopt','rsa_mgf1_md:sha256'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
  if(!is_resource($process))throw new \RuntimeException('Decryption unavailable');
  fwrite($pipes[0],substr($encrypted,0,384));fclose($pipes[0]);$imageKey=stream_get_contents($pipes[1]);fclose($pipes[1]);stream_get_contents($pipes[2]);fclose($pipes[2]);
  if(proc_close($process)!==0||strlen($imageKey)!==32)throw new \RuntimeException('Image decryption key invalid');
  $raw=openssl_decrypt(substr($encrypted,396,-16),'aes-256-gcm',$imageKey,OPENSSL_RAW_DATA,substr($encrypted,384,12),substr($encrypted,-16));
  if($raw===false||strlen($raw)!==458298||!($info=@getimagesizefromstring($raw))||$info['mime']!=='image/png')throw new \RuntimeException('Reference image invalid');
  $data=base64_encode($raw);
  if(!one($db,'SELECT id FROM production_images WHERE item_id=? AND data=?',[$item['id'],$data]))
   statement($db,'INSERT INTO production_images(id,item_id,mime,data) VALUES(?,?,?,?)',['production-reference-20261125',$item['id'],'image/png',$data]);
  statement($db,"INSERT INTO event_settings(key,value_json) VALUES('production_reference_seed_20261125','true')",[]);
 }
 $db->commit();
}catch(\Throwable $e){$db->rollBack();throw $e;}
echo 'PRODUCTION_IMPORT_OK added='.$added.' vendors='.(int)$db->query('SELECT COUNT(*) FROM vendors')->fetchColumn().' decor='.(int)$db->query('SELECT COUNT(*) FROM decor_items')->fetchColumn()."\n";
