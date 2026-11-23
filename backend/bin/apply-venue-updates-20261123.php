<?php
declare(strict_types=1);
namespace Wedding;

use PDO;
use Throwable;
require_once __DIR__.'/../src/core.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit(1); }

// Only update known stale seeded values once; preserve organizer edits across devices.
$db=db();
$marker='venue_batch:2026-11-23-telegram-review-v1';
$db->beginTransaction();
try {
  $check=$db->prepare('SELECT value_json FROM event_settings WHERE key=?');
  $check->execute([$marker]);
  if($check->fetchColumn()!==false){
    $db->commit();echo "VENUE_REVIEW_ALREADY_APPLIED\n";exit;
  }
  $changes=[
    ['vinity','2027-06-18','unknown','available'],
    ['vinity','2027-06-19','available','unknown'],
    ['royal','2027-06-20','unknown','available'],
    ['petr','2027-06-18','unknown','available'],
    ['petr','2027-06-19','available','unavailable'],
    ['petr','2027-06-20','unknown','unavailable'],
    ['panorama','2027-06-18','unknown','available'],
    ['panorama','2027-06-19','unknown','available'],
    ['panorama','2027-06-20','unknown','available']
  ];
  $q=$db->prepare("UPDATE venue_date_status SET status=?,updated_at=datetime('now') WHERE venue_id=? AND day=? AND status=?");
  $dates=0;
  foreach($changes as [$id,$day,$old,$new]){$q->execute([$new,$id,$day,$old]);$dates+=$q->rowCount();}
  $rows=$db->query('SELECT id,details_json FROM venues')->fetchAll(PDO::FETCH_ASSOC);
  $save=$db->prepare("UPDATE venues SET details_json=?,updated_at=datetime('now') WHERE id=? AND details_json=?");
  $patched=0;
  $putilov='Особняк Путилова, Крестовский остров. По индивидуальному предложению от 15.11.2026 аренда без уличной территории 430 000 ₽, с территорией 550 000 ₽; банкет от 7 500 ₽/гость с обслуживанием, технический пакет от 170 000 ₽. Для 80 гостей минимальный сценарий 1 200 000 ₽ до дополнительных услуг. Скидка 10% действовала только при бронировании 14–15.11.2026 и сейчас не применяется. 20 июня было свободно по сообщению 18.11; 18 и 19 июня не подтверждены.';
  foreach($rows as $row){
    $data=json_decode((string)$row['details_json'],true);
    if(!is_array($data))continue;
    $key=$data['wedding_comparison_id']??($data['public']['id']??$row['id']);
    $overrides=$data['overrides']??[];
    if(!is_array($overrides))continue;
    $changed=false;
    if($key==='putilov'&&str_contains((string)($overrides['summary']??''),'На официальном сайте индивидуальные цены не опубликованы')){
      $overrides['summary']=$putilov;$changed=true;
    }
    if($key==='royal'&&str_contains((string)($overrides['summary']??''),'18 и 20 июня пока уточняются')){
      $overrides['summary']='Павильон у воды с террасой. По уточнению 18.11 свободно только 20 июня; 19 июня занято. Сметы на 80 и 100 гостей сохранены.';$changed=true;
    }
    if(!$changed)continue;
    $data['overrides']=$overrides;
    $next=json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $save->execute([$next,$row['id'],$row['details_json']]);
    if($save->rowCount()!==1)throw new \RuntimeException('Concurrent edit while updating venue');
    $patched++;
  }
  $db->prepare('INSERT INTO event_settings(key,value_json) VALUES(?,?)')->execute([$marker,json_encode(['dates'=>$dates,'records'=>$patched],JSON_THROW_ON_ERROR)]);
  $db->commit();
  echo "VENUE_REVIEW_APPLIED dates=$dates records=$patched\n";
}catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
