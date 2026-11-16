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
    $insertSchedule=$db->prepare('INSERT OR IGNORE INTO schedule_items(id,title,notes,is_public,sort_order) VALUES(?,?,?,?,?)');
    foreach($seed['schedule']??[] as $item) {
        $insertSchedule->execute([$item['id'],$item['title'],$item['notes'],$item['is_public'],$item['sort_order']]);
    }
    $insertDoc=$db->prepare('INSERT OR IGNORE INTO documents(id,category,label,reference,visibility) VALUES(?,?,?,?,?)');
    foreach($seed['documents']??[] as $item) {
        $insertDoc->execute([$item['id'],$item['category'],$item['label'],$item['reference'],$item['visibility']]);
    }
    $db->commit();
} catch (\Throwable $e) {
    $db->rollBack();
    throw $e;
}
echo 'WEDDING_PLANNING_SEED_OK catering='.$vendors.' tasks='.$tasks." (existing edits preserved)\n";
