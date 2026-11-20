<?php
declare(strict_types=1);
namespace Wedding;

use PDO;

require_once __DIR__.'/../src/core.php';

if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$path=__DIR__.'/../seed/kristina-ideas-20261120.json';
$data=json_decode((string)file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
if(!is_array($data)||($data['activity_date']??null)!=='2027-06-19'||
   ($data['status']??null)!=='idea'||!is_array($data['ideas']??null)||
   !is_array($data['tags']??null))throw new \RuntimeException('Kristina idea seed is invalid');
$db=db();
$added=0;
$skipped=0;
$db->beginTransaction();
try{
    // Add tag definitions once, without replacing any organizer-managed tags.
    // This marker also prevents bringing back tags deleted by the organizer later.
    $marker='kristina_ideas_20261120_tags_initialized';
    $existingMarker=one($db,'SELECT key FROM event_settings WHERE key=?',[$marker]);
    if($existingMarker===null){
        $existing=one($db,"SELECT value_json FROM event_settings WHERE key='activity_tags'");
        $current=$existing?json_decode((string)$existing['value_json'],true):[];
        if(!is_array($current)||!array_is_list($current))$current=[];
        $ids=[];
        foreach($current as $tag)if(is_array($tag)&&isset($tag['id'])&&is_string($tag['id']))
            $ids[$tag['id']]=true;
        foreach($data['tags'] as $tag){
            if(!is_array($tag)||!isset($tag['id'],$tag['label'],$tag['color']))continue;
            if(count($current)>=30)break;
            if(!isset($ids[$tag['id']])){
                $current[]=['id'=>(string)$tag['id'],
                    'label'=>(string)$tag['label'],'color'=>(string)$tag['color']];
                $ids[$tag['id']]=true;
            }
        }
        statement($db,"INSERT INTO event_settings(key,value_json) VALUES('activity_tags',?)
          ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=datetime('now')",
          [json_encode($current,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        statement($db,'INSERT INTO event_settings(key,value_json) VALUES(?,?)',[$marker,'true']);
    }
    // Only attach tags currently defined in the organizer's editable tag list.
    $tagRow=one($db,"SELECT value_json FROM event_settings WHERE key='activity_tags'");
    $definitions=$tagRow?json_decode((string)$tagRow['value_json'],true):[];
    $allowed=[];
    if(is_array($definitions))foreach($definitions as $tag){
        if(is_array($tag)&&isset($tag['id'])&&is_string($tag['id']))$allowed[$tag['id']]=true;
    }
    $find=$db->prepare('SELECT id FROM schedule_items WHERE id=? OR (activity_date=? AND title=?) LIMIT 1');
    $insert=$db->prepare("INSERT OR IGNORE INTO schedule_items
      (id,title,start_at,end_at,place,notes,is_public,sort_order,venue_id,is_confirmed,
        stage,activity_type,duration_min,gap_before_min,activity_date,tags_json)
      VALUES(?,?,NULL,NULL,'',?,0,0,'',0,'idea',?, ?,0,?,?)");
    $validTypes=['ceremony','social','dance','speech','music','food','game','other'];
    foreach($data['ideas'] as $item){
        if(!is_array($item))throw new \RuntimeException('Invalid idea record');
        $id=$item['id']??null;$title=$item['title']??null;
        $notes=$item['notes']??null;$minutes=$item['duration_min']??null;
        $type=$item['activity_type']??null;$day=$item['activity_date']??null;
        $tags=$item['tags']??null;
        if(!is_string($id)||!preg_match('/^[a-z0-9-]{1,40}$/',$id)||
           !is_string($title)||trim($title)===''||mb_strlen($title)>220||
           !is_string($notes)||mb_strlen($notes)>3000||
           !is_int($minutes)||$minutes<5||$minutes>600||
           !is_string($type)||!in_array($type,$validTypes,true)||
           $day!=='2027-06-19'||!is_array($tags)||!array_is_list($tags))
            throw new \RuntimeException('Invalid Kristina idea: '.(is_scalar($id)?(string)$id:'unknown'));
        $find->execute([$id,$day,$title]);
        if($find->fetch(PDO::FETCH_ASSOC)!==false){$skipped++;continue;}
        $filtered=[];
        foreach($tags as $tag){
            if(is_string($tag)&&isset($allowed[$tag])&&!in_array($tag,$filtered,true))
                $filtered[]=$tag;
        }
        $insert->execute([$id,$title,$notes,$type,$minutes,$day,
            json_encode($filtered,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        $added+=$insert->rowCount();
    }
    $db->commit();
}catch(\Throwable $error){$db->rollBack();throw $error;}
echo "KRISTINA_WEDDING_IDEAS_OK day=2027-06-19 added={$added} existing={$skipped}; stage=idea; no program times set\n";
