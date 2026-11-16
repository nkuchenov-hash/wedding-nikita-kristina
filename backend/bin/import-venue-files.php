<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}
$root=PRIVATE_ROOT;
$bundlePath=__DIR__.'/../seed/venue-documents.bundle.json';
if(!is_file($bundlePath))throw new \RuntimeException('Encrypted venue manifest missing');
$bundle=json_decode((string)file_get_contents($bundlePath),true,16,JSON_THROW_ON_ERROR);
if(($bundle['version']??null)!==2)throw new \RuntimeException('Unrecognized encrypted venue manifest');
$wrapped=base64_decode((string)($bundle['wrapped_key']??''),true);
$nonce=base64_decode((string)($bundle['nonce']??''),true);
$sealed=base64_decode((string)($bundle['ciphertext']??''),true);
if($wrapped===false||$sealed===false||strlen($sealed)<32||$nonce===false||strlen($nonce)!==12)
  throw new \RuntimeException('Invalid encrypted manifest envelope');
$command=['openssl','pkeyutl','-decrypt','-inkey',$root.'/guest-import.key',
  '-pkeyopt','rsa_padding_mode:oaep','-pkeyopt','rsa_oaep_md:sha256'];
$pipes=[];
$process=proc_open($command,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
if(!is_resource($process))throw new \RuntimeException('Cannot decrypt manifest');
fwrite($pipes[0],$wrapped);fclose($pipes[0]);
$key=stream_get_contents($pipes[1]);fclose($pipes[1]);
$err=stream_get_contents($pipes[2]);fclose($pipes[2]);
if(proc_close($process)!==0||strlen((string)$key)!==32)
  throw new \RuntimeException('Manifest key decryption failed');
$tag=substr($sealed,-16);$ciphertext=substr($sealed,0,-16);
$plaintext=openssl_decrypt($ciphertext,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$nonce,$tag);
unset($key,$wrapped,$ciphertext);
if($plaintext===false)throw new \RuntimeException('Authenticated manifest decryption failed');
$json=gzuncompress($plaintext,200000);
unset($plaintext);
if(!is_string($json))throw new \RuntimeException('Manifest zlib decoding failed');
$entries=json_decode($json,true,32,JSON_THROW_ON_ERROR);
unset($json);
if(!is_array($entries)||count($entries)!==51)throw new \RuntimeException('Source file count mismatch');
$knownMime=['doc','pdf','xlsx','docx','jpg','mp4','folder'];
$db=db();
$db->beginTransaction();
$inserted=0;$documents=0;$videos=0;$archives=0;
try{
 $insert=$db->prepare('INSERT OR IGNORE INTO venue_files(id,venue_id,title,mime,file_id,source_url,type)
 VALUES(?,?,?,?,?,?,?)');
 foreach($entries as $entry){
   if(!is_array($entry)||!isset($entry['venue_id'],$entry['mime'],$entry['title'],$entry['file_id'],$entry['type']))
      throw new \RuntimeException('Incomplete venue file');
   $venue=(string)$entry['venue_id'];$mime=(string)$entry['mime'];$file=(string)$entry['file_id'];
   $title=(string)$entry['title'];$type=(string)$entry['type'];
   if(!preg_match('/^[a-z0-9-]{2,36}$/',$venue)||!in_array($mime,$knownMime,true)||
      !preg_match('/^[a-zA-Z0-9_-]{20,80}$/',$file)||mb_strlen($title)>300)
      throw new \RuntimeException('Bad venue document metadata');
   if(!in_array($type,['document','video','archive'],true))throw new \RuntimeException('Invalid type');
   if($venue!=='archive'&&!one($db,'SELECT id FROM venues WHERE id=?',[$venue]))
      throw new \RuntimeException('Unknown venue in document inventory');
   $base=$mime==='doc'?'https://docs.google.com/document/d/':
      ($mime==='folder'?'https://drive.google.com/drive/folders/':'https://drive.google.com/file/d/');
   $url=$base.$file.($mime==='doc'?'/edit':($mime==='folder'?'':'/view'));
   $id=substr(hash('sha256','venue-drive-file-'.$file),0,36);
   $insert->execute([$id,$venue,$title,$mime,$file,$url,$type]);
   $inserted+=$insert->rowCount();
   if($type==='video')$videos++;
   elseif($type==='archive')$archives++;
   else $documents++;
 }
 $db->commit();
}catch(\Throwable $e){$db->rollBack();throw $e;}
echo "VENUE_SOURCE_INVENTORY_OK total=".count($entries)." documents=$documents videos=$videos archives=$archives inserted=$inserted\n";
