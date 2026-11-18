<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
// One-time inference only from explicit source child-of relationships.
// A kinship label does not prove legal age; organiser can correct any category.
$db=db();$version=2026111802;
if(one($db,'SELECT version FROM schema_migrations WHERE version=?',[$version])){
    echo "WEDDING_CHILD_CATEGORIES_ALREADY_REVIEWED\n";exit;
}
$rows=all($db,"SELECT g.id,g.age_group,p.source_people_json
    FROM guests g JOIN guest_profile_details p ON p.guest_id=g.id");
$changes=0;
$db->beginTransaction();
try{
    $update=$db->prepare("UPDATE guests SET age_group='child',updated_at=datetime('now')
      WHERE id=? AND age_group='unknown'");
    foreach($rows as $row){
        if($row['age_group']!=='unknown')continue;
        $src=json_decode((string)$row['source_people_json'],true);
        if(!is_array($src))continue;
        $relation=trim((string)($src['Кем приходится / связи']??''));
        // Only records whose *entire* source relationship consists of
        // "сын [person]" or "дочь [person]" segments are selected.
        // Adult kinship entries with spouses, siblings, cousins are not selected.
        if($relation!=='' &&
           preg_match('/^(?:(?:сын|дочь)\\s+[^;]+)(?:;\\s*(?:сын|дочь)\\s+[^;]+)*$/u',$relation)===1){
            $update->execute([$row['id']]);
            $changes+=$update->rowCount();
        }
    }
    statement($db,'INSERT INTO schema_migrations(version) VALUES(?)',[$version]);
    $db->commit();
}catch(\Throwable $e){$db->rollBack();throw $e;}
echo "WEDDING_CHILD_CATEGORIES_BACKFILLED count=$changes review_possible=true\n";
