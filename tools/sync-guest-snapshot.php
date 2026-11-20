<?php
declare(strict_types=1);
/**
 * PRIVATE one-time reconciliation of the organizer's 20 Nov 2026 guest
 * corrections. Uses stable original P-IDs; never copies guest data into git
 * or logs. Fails closed if the live database has newer manual changes.
 */
namespace Wedding;
require_once '/var/www/u3728035/data/wedding-private/backend/src/core.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit(1); }
$csv=(string)($argv[1]??'');
$mode=(string)($argv[2]??'--dry-run');
if(!in_array($mode,['--dry-run','--apply'],true))throw new \RuntimeException('Invalid mode');
$real=realpath($csv);$private=realpath(PRIVATE_ROOT.'/imports');
if(!$real||!$private||!str_starts_with($real,$private.'/')||!is_file($real))
    throw new \RuntimeException('Private CSV required');
$bytes=filesize($real);
if(!$bytes||$bytes<200||$bytes>5000000)throw new \RuntimeException('Snapshot size invalid');
$f=fopen($real,'rb');
if(!$f)throw new \RuntimeException('Snapshot unreadable');
$header=fgetcsv($f,0,',','"','\\');
if(!$header)throw new \RuntimeException('Snapshot header missing');
$header=array_map(static fn($v)=>trim(preg_replace('/^\xEF\xBB\xBF/','',(string)$v)),$header);
$required=['ID','Гость','Имя EN (черновик)','Сторона','Круг / группа','Город','Краткий профиль RU','Краткий профиль EN','Рассадка','Приватные заметки'];
foreach($required as $col)if(!in_array($col,$header,true))
    throw new \RuntimeException('Snapshot columns changed');
$at=array_flip($header);$items=[];$sides=['Никита'=>0,'Кристина'=>0];
while(($r=fgetcsv($f,0,',','"','\\'))!==false){
    if(count($r)===1 && trim((string)$r[0])==='')continue;
    $v=[];
    foreach($required as $col)$v[$col]=trim((string)($r[$at[$col]]??''));
    if(!preg_match('/^P[0-9]{3,4}$/D',$v['ID'])||isset($items[$v['ID']])||!isset($sides[$v['Сторона']]))
        throw new \RuntimeException('Invalid or duplicated source person');
    $items[$v['ID']]=$v;$sides[$v['Сторона']]++;
    if(count($items)>125)throw new \RuntimeException('Unexpected guest count');
}
fclose($f);
if(count($items)!==114||$sides['Никита']!==93||$sides['Кристина']!==21)
    throw new \RuntimeException('Unexpected source totals');
function usableBio(string $v):bool {
    if($v===''||mb_strlen($v)<18)return false;
    return !preg_match('/^(Круг общения:|Из школьного круга|Из круга общения|Из круга CEMS|Social circle:|Part of Nick.s)/ui',$v);
}
$db=db();$db->beginTransaction();
try {
    $records=all($db,'SELECT p.source_person_id,p.guest_id,p.name_en,p.seating_group,g.display_name,g.city,g.community,g.about,g.about_en,g.private_notes,g.updated_at
      FROM guest_profile_details p JOIN guests g ON g.id=p.guest_id');
    $live=[];
    foreach($records as $g){
        if(isset($live[$g['source_person_id']]))throw new \RuntimeException('Duplicate DB person ID');
        $live[$g['source_person_id']]=$g;
    }
    if(count($live)!==114)throw new \RuntimeException('DB guest count has changed; manual review required');
    foreach($items as $pid=>$source)if(!isset($live[$pid]))throw new \RuntimeException('Source person missing from DB');
    $changed=0;$fields=0;$unchanged=0;$ignored=0;$conflicts=0;
    $saveGuest=$db->prepare("UPDATE guests SET display_name=?,city=?,community=?,about=?,about_en=?,private_notes=?,updated_at=datetime('now') WHERE id=?");
    $saveEn=$db->prepare("UPDATE guest_profile_details SET name_en=?,seating_group=?,updated_at=datetime('now') WHERE guest_id=?");
    // Organizer audit logs, not migration-touched timestamps, protect manual edits.
    $last=one($db,"SELECT value_json FROM event_settings WHERE key='guest_sheet_last_sync'");
    $lastObj=$last?json_decode((string)$last['value_json'],true):null;
    $cutoff=is_array($lastObj)&&isset($lastObj['synced_at'])
        ?(string)$lastObj['synced_at']:'2026-11-20 11:36:27';
    $manual=[];
    foreach(all($db,"SELECT entity_id FROM audit_log
             WHERE actor_type='admin' AND entity_type='guest' AND created_at>?",[$cutoff]) as $entry)
        $manual[(string)$entry['entity_id']]=true;
    $notesChanged=['P042'=>true,'P114'=>true,'P118'=>true,'P127'=>true,'P129'=>true];
    $seatingChanged=['P118'=>true,'P129'=>true];
    foreach($items as $pid=>$source){
        if($source['Сторона']!=='Никита')continue; // Kristina updates her own guests.
        $g=$live[$pid];
        $target=[
          'display_name'=>$source['Гость']?:$g['display_name'],
          'city'=>$source['Город']?:$g['city'],
          'community'=>$source['Круг / группа']?:$g['community'],
          'about'=>usableBio($source['Краткий профиль RU'])?$source['Краткий профиль RU']:$g['about'],
          'about_en'=>usableBio($source['Краткий профиль EN'])?$source['Краткий профиль EN']:$g['about_en'],
          'private_notes'=>isset($notesChanged[$pid])&&$source['Приватные заметки']!==''
              ?$source['Приватные заметки']:$g['private_notes'],
          'name_en'=>$source['Имя EN (черновик)']?:$g['name_en'],
          'seating_group'=>isset($seatingChanged[$pid])&&$source['Рассадка']!==''
              ?$source['Рассадка']:$g['seating_group'],
        ];
        if(!usableBio($source['Краткий профиль RU'])||!usableBio($source['Краткий профиль EN']))$ignored++;
        $different=0;
        foreach($target as $key=>$value)if((string)$value!==(string)($g[$key]??''))$different++;
        if(!$different){$unchanged++;continue;}
        if(isset($manual[(string)$g['guest_id']])){$conflicts++;continue;}
        $changed++;$fields+=$different;
        if($mode==='--apply'){
            $saveGuest->execute([$target['display_name'],$target['city'],$target['community'],$target['about'],$target['about_en'],$target['private_notes'],$g['guest_id']]);
            if($target['name_en']!==(string)$g['name_en']||$target['seating_group']!==(string)$g['seating_group'])
                $saveEn->execute([$target['name_en'],$target['seating_group'],$g['guest_id']]);
        }
    }
    if($conflicts)throw new \RuntimeException('More recent organizer changes in DB; no records overwritten. Conflict rows='.$conflicts);
    if($mode==='--apply'){
        statement($db,"INSERT INTO event_settings(key,value_json,updated_at) VALUES('guest_sheet_last_sync',?,datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=datetime('now')",
            [json_encode(['synced_at'=>gmdate('Y-m-d H:i:s'),'source_rows'=>114],JSON_THROW_ON_ERROR)]);
        $db->commit();
    }else $db->rollBack();
    echo "GUEST_RECONCILE_OK mode=$mode source=114 groom=93 bride_untouched=21 matched=114 changed=$changed fields=$fields unchanged=$unchanged skipped_placeholders=$ignored conflicts=0\n";
} catch(\Throwable $e){
    if($db->inTransaction())$db->rollBack();
    throw $e;
}
