<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$db=db();
$version=20261118;
if(one($db,'SELECT version FROM schema_migrations WHERE version=?',[$version])){
    echo "GUEST_PROFILE_BACKFILL_ALREADY_APPLIED\n";exit(0);
}
$total=(int)$db->query('SELECT COUNT(*) FROM guests')->fetchColumn();
if($total===0){echo "GUEST_PROFILE_BACKFILL_NO_GUESTS\n";exit(0);}
$rows=all($db,'SELECT g.id,g.about,g.about_en,g.community,g.private_notes,
    p.source_people_json,p.source_invitation_json,p.source_profile_json
    FROM guests g JOIN guest_profile_details p ON p.guest_id=g.id');
function obj(string $raw): array {
    $x=json_decode($raw,true);
    return is_array($x)?$x:[];
}
function safe(string $text,int $length=1900): string {
    return mb_substr(trim($text),0,$length);
}
$db->beginTransaction();
$changed=0;$notes=0;$communities=0;$profiles=0;$english=0;
try{
    $upd=$db->prepare("UPDATE guests SET about=?,about_en=?,community=?,private_notes=?,
      updated_at=datetime('now') WHERE id=?");
    foreach($rows as $row){
        $person=obj((string)$row['source_people_json']);
        $inv=obj((string)$row['source_invitation_json']);
        $profile=obj((string)$row['source_profile_json']);
        $ru=(string)$row['about'];
        $en=(string)$row['about_en'];
        $community=(string)$row['community'];
        $private=(string)$row['private_notes'];
        if(trim($ru)===''){
            $candidate=safe((string)($person['Информация о человеке']??$profile['Короткое описание RU']??''));
            if($candidate!==''){$ru=$candidate;$profiles++;}
        }
        if(trim($en)===''){
            $candidate=safe((string)($profile['Short bio EN']??''));
            if($candidate!==''){$en=$candidate;$english++;}
        }
        if(trim($community)===''){
            $candidate=safe((string)($person['Теги']??$profile['Круг RU']??''),320);
            if($candidate!==''){$community=$candidate;$communities++;}
        }
        if(trim($private)===''){
            $items=[];
            foreach([
                'Исходные заметки'=>(string)($person['Приватные заметки']??''),
                'Приглашение'=>(string)($inv['Примечание']??''),
                'Общение'=>(string)($profile['Текущее общение RU']??'')
            ] as $label=>$value){
                $value=trim($value);
                if($value!==''&&!in_array($value,$items,true))$items[]=$label.': '.$value;
            }
            $candidate=safe(implode("\n",$items));
            if($candidate!==''){$private=$candidate;$notes++;}
        }
        if($ru!==(string)$row['about']||$en!==(string)$row['about_en']||
          $community!==(string)$row['community']||$private!==(string)$row['private_notes']){
            $upd->execute([$ru,$en,$community,$private,$row['id']]);
            $changed++;
        }
    }
    statement($db,'INSERT INTO schema_migrations(version) VALUES(?)',[$version]);
    $db->commit();
}catch(\Throwable $e){$db->rollBack();throw $e;}
echo "GUEST_PROFILE_BACKFILL_OK total=$total updated=$changed notes=$notes communities=$communities ru=$profiles en=$english\n";
