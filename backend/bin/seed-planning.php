<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
$path=__DIR__.'/../seed/planning.json';
$seed=json_decode((string)file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
$db=db();
$db->beginTransaction();
$vendors=0;$tasks=0;
try {
    $insertVendor=$db->prepare('INSERT OR IGNORE INTO vendors(id,category,name,contact,website,status,notes) VALUES(?,?,?,?,?,?,?)');
    foreach($seed['vendors'] as $v) {
        $insertVendor->execute([$v['id'],$v['category'],$v['name'],$v['contact'],$v['website'],$v['status'],$v['notes']]);
        $vendors+=$insertVendor->rowCount();
    }
    $insertTask=$db->prepare('INSERT OR IGNORE INTO tasks(id,title,description,status,priority) VALUES(?,?,?,?,?)');
    foreach($seed['tasks'] as $task) {
        $insertTask->execute([$task['id'],$task['title'],$task['description'],$task['status'],$task['priority']]);
        $tasks+=$insertTask->rowCount();
    }
    // Remove only the six untouched generic draft rows from the original seed.
    // Never delete an organizer-edited event or an event with an assigned date.
    $obsolete=[
        ['draft-schedule-arrival','Сбор гостей','Время и место будут определены после выбора площадки.'],
        ['draft-schedule-ceremony','Церемония','Дата, время и формат ещё требуют подтверждения.'],
        ['draft-schedule-welcome','Приветственный фуршет','Согласовать с площадкой и кейтерингом.'],
        ['draft-schedule-dinner','Свадебный банкет','Время и меню после согласования договора.'],
        ['draft-schedule-first-dance','Первый танец','Песня и постановка ещё не утверждены.'],
        ['draft-schedule-final','Завершение вечера','Трансфер, такси и время окончания уточняются.']
    ];
    $removeOld=$db->prepare('DELETE FROM schedule_items WHERE id=? AND title=? AND notes=? AND start_at IS NULL AND is_public=0');
    foreach($obsolete as $row) $removeOld->execute($row);
    $insertSchedule=$db->prepare('INSERT OR IGNORE INTO schedule_items(id,title,start_at,place,notes,is_public,sort_order) VALUES(?,?,?,?,?,?,?)');
    $scheduleAdded=0;
    foreach($seed['schedule']??[] as $item) {
        $insertSchedule->execute([$item['id'],$item['title'],$item['start_at'],$item['place'],$item['notes'],$item['is_public'],$item['sort_order']]);
        $scheduleAdded+=$insertSchedule->rowCount();
    }
    $insertDoc=$db->prepare('INSERT OR IGNORE INTO documents(id,category,label,reference,visibility) VALUES(?,?,?,?,?)');
    foreach($seed['documents']??[] as $item) {
        $insertDoc->execute([$item['id'],$item['category'],$item['label'],$item['reference'],$item['visibility']]);
    }
    $insertSetting=$db->prepare('INSERT OR IGNORE INTO event_settings(key,value_json) VALUES(?,?)');
    foreach($seed['event_settings']??[] as $key=>$value){
        $insertSetting->execute([$key,json_encode($value,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    }
    $db->commit();
} catch (\Throwable $e) {
    $db->rollBack();
    throw $e;
}
echo 'WEDDING_PLANNING_SEED_OK schedule_added='.$scheduleAdded.' tasks_added='.$tasks." (existing organizer edits preserved)\n";
