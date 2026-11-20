<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
$path=__DIR__.'/../seed/planning.json';
$seed=json_decode((string)file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
$db=db();
$db->beginTransaction();
$tasks=0;
try {
    // Remove eight unrequested initial research rows only when the baseline
    // matches exactly. Never remove organizer-created supplier records.
    $existingVendors=(int)$db->query('SELECT COUNT(*) FROM vendors')->fetchColumn();
    $baseline=(int)$db->query("SELECT COUNT(*) FROM vendors WHERE status='research'")->fetchColumn();
    if($existingVendors===8 && $baseline===8) $db->exec('DELETE FROM vendors');
    // Remove the legacy price-study pointer, not the Drive source document.
    $db->exec("DELETE FROM documents WHERE category NOT IN
        ('archive','venue','quote','contract','invoice','legal','other','photo','reference')");
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
        ['draft-schedule-welcome','Приветственный фуршет','Согласовать с площадкой и менеджером банкета.'],
        ['draft-schedule-dinner','Свадебный банкет','Время и меню после согласования договора.'],
        ['draft-schedule-first-dance','Первый танец','Песня и постановка ещё не утверждены.'],
        ['draft-schedule-final','Завершение вечера','Трансфер, такси и время окончания уточняются.']
    ];
    $removeOld=$db->prepare('DELETE FROM schedule_items WHERE id=? AND title=? AND notes=? AND start_at IS NULL AND is_public=0');
    foreach($obsolete as $row) $removeOld->execute($row);
    $insertSchedule=$db->prepare('INSERT OR IGNORE INTO schedule_items(id,title,start_at,place,notes,is_public,sort_order,stage,activity_type,duration_min) VALUES(?,?,?,?,?,?,?,?,?,?)');
    $scheduleAdded=0;
    foreach($seed['schedule']??[] as $item) {
        $insertSchedule->execute([$item['id'],$item['title'],$item['start_at'],$item['place'],$item['notes'],$item['is_public'],$item['sort_order'],str_contains((string)$item['start_at'],'T')?'program':'idea','ceremony',30]);
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
