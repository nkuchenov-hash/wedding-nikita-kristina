<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

/**
 * Read a private Google Sheets export from local, protected CSV files.
 * No personal records ever enter GitHub Actions logs or git history.
 * Import is idempotent and preserves manual edits.
 */
function csvRecords(string $path, array $required): array {
    if (!is_file($path) || filesize($path) > 8*1024*1024)
        throw new \RuntimeException('Missing or oversized private source CSV');
    $f=fopen($path,'rb');
    if(!$f)throw new \RuntimeException('Cannot read private CSV');
    $header=fgetcsv($f,0,',','"','\\');
    if(!$header){fclose($f);throw new \RuntimeException('Empty spreadsheet export');}
    $header=array_map(fn($x)=>trim(preg_replace('/^\xEF\xBB\xBF/','',(string)$x)),$header);
    foreach($required as $label)if(!in_array($label,$header,true))
        throw new \RuntimeException('Unexpected sheet structure: missing required column');
    $result=[];
    while(($row=fgetcsv($f,0,',','"','\\'))!==false){
        if(count($result)>1500)throw new \RuntimeException('Unexpected row count');
        if(count($row)===1&&trim((string)$row[0])==='')continue;
        $item=[];
        foreach($header as $i=>$field)$item[$field]=trim((string)($row[$i]??''));
        $result[]=$item;
    }
    fclose($f);
    return $result;
}
function deterministicUuid(string $key): string {
    $hex=hash('sha256','wedding-import-v1:'.$key);
    return substr($hex,0,8).'-'.substr($hex,8,4).'-5'.substr($hex,13,3).
           '-a'.substr($hex,17,3).'-'.substr($hex,20,12);
}
function sourceId(string $value): string {
    if(!preg_match('/^P[0-9]{3,4}$/',$value))throw new \RuntimeException('Invalid source person key');
    return $value;
}
$dir=$argv[1]??'';
$root=realpath(PRIVATE_ROOT);
$dirReal=$dir?realpath($dir):false;
if(!$dirReal||!$root||!str_starts_with($dirReal,$root.'/imports'))
    throw new \RuntimeException('Private import path required');
$people=csvRecords($dirReal.'/people.csv',['ID человека','Имя','Фамилия','Отображаемое имя','Сторона','Тип записи']);
$invite=csvRecords($dirReal.'/invitations.csv',['ID человека','Решение о приглашении','Приглашение','RSVP']);
$relations=csvRecords($dirReal.'/relations.csv',['ID связи','ID человека 1','ID человека 2']);
$translations=csvRecords($dirReal.'/profiles.csv',['ID','Имя RU','Name EN']);
$english=csvRecords($dirReal.'/english.csv',['Person ID','Display name (EN draft)']);
if(count($people)<100||count($people)>250)throw new \RuntimeException('Unexpected count in source people table');
$db=db();
$db->exec("CREATE TABLE IF NOT EXISTS guest_profile_details (
    guest_id TEXT PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
    source_person_id TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL DEFAULT '',
    source_people_json TEXT NOT NULL DEFAULT '{}',
    source_invitation_json TEXT NOT NULL DEFAULT '{}',
    source_profile_json TEXT NOT NULL DEFAULT '{}',
    source_english_json TEXT NOT NULL DEFAULT '{}',
    seating_group TEXT NOT NULL DEFAULT '',
    decision TEXT NOT NULL DEFAULT '',
    base_count TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)");
$db->exec("CREATE TABLE IF NOT EXISTS guest_relationships (
    id TEXT PRIMARY KEY,
    guest_id_1 TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    guest_id_2 TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    relation_1_to_2 TEXT NOT NULL DEFAULT '',
    relation_2_to_1 TEXT NOT NULL DEFAULT '',
    relation_type TEXT NOT NULL DEFAULT '',
    source_json TEXT NOT NULL DEFAULT '{}'
)");
$invites=[];
foreach($invite as $row){
    $key=$row['ID человека']??'';
    if(preg_match('/^P[0-9]{3,4}$/',$key))$invites[$key]=$row;
}
$profiles=[];
foreach($translations as $row){
    $key=$row['ID']??'';
    if(preg_match('/^P[0-9]{3,4}$/',$key))$profiles[$key]=$row;
}
$englishById=[];
foreach($english as $row){
    $key=$row['Person ID']??'';
    if(preg_match('/^P[0-9]{3,4}$/',$key))$englishById[$key]=$row;
}
$db->beginTransaction();
$added=0;$profileRows=0;$linkRows=0;$candidates=0;$preserved=0;
try {
    $insertGuest=$db->prepare('INSERT OR IGNORE INTO guests
        (id,first_name,last_name,display_name,side,relationship,city,status,invited)
        VALUES (?,?,?,?,?,?,?,\'draft\',0)');
    $insertProfile=$db->prepare('INSERT OR IGNORE INTO guest_profile_details
        (guest_id,source_person_id,name_en,source_people_json,source_invitation_json,
         source_profile_json,source_english_json,seating_group,decision,base_count)
        VALUES(?,?,?,?,?,?,?,?,?,?)');
    $valid=[];
    foreach($people as $row){
        $person=$row['ID человека']??'';
        if(!preg_match('/^P[0-9]{3,4}$/',$person))continue;
        if(in_array($person,['P000','P999'],true))continue; // The couple are not invitees.
        $type=$row['Тип записи']??'';
        if($type==='Организатор')continue;
        $name=trim((string)($row['Отображаемое имя']??''));
        if($name===''||mb_strlen($name)>255)throw new \RuntimeException('Missing guest display name');
        $first=mb_substr((string)($row['Имя']??''),0,120);
        $last=mb_substr((string)($row['Фамилия']??''),0,120);
        $side=match($row['Сторона']??''){
            'Никита'=>'groom','Кристина'=>'bride','Оба','Общие'=>'both',default=>'other'
        };
        $id=deterministicUuid($person);
        $valid[$person]=$id;
        $insertGuest->execute([$id,$first,$last,$name,$side,
          mb_substr((string)($row['Кем приходится / связи']??''),0,255),
          mb_substr((string)($row['Город / страна']??''),0,255)]);
        $added+=$insertGuest->rowCount();
        $rowInvite=$invites[$person]??[];
        $rowProfile=$profiles[$person]??[];
        $rowEnglish=$englishById[$person]??[];
        $decision=(string)($rowInvite['Решение о приглашении']??'');
        if(mb_stripos($decision,'вопрос')!==false)$candidates++;
        $encode=fn($v)=>json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        $insertProfile->execute([$id,$person,
          mb_substr((string)($rowEnglish['Display name (EN draft)']??$rowProfile['Name EN']??''),0,255),
          $encode($row),$encode($rowInvite),$encode($rowProfile),$encode($rowEnglish),
          (string)($rowInvite['Группа рассадки (черновик)']??''),$decision,
          (string)($rowInvite['В базовом подсчёте']??'')]);
        $profileRows+=$insertProfile->rowCount();
    }
    if(count($valid)<100)throw new \RuntimeException('Insufficient valid people found');
    $insertRelation=$db->prepare('INSERT OR IGNORE INTO guest_relationships
        (id,guest_id_1,guest_id_2,relation_1_to_2,relation_2_to_1,relation_type,source_json)
        VALUES(?,?,?,?,?,?,?)');
    foreach($relations as $row){
        $a=(string)($row['ID человека 1']??'');
        $b=(string)($row['ID человека 2']??'');
        if(!isset($valid[$a],$valid[$b])||$a===$b)continue;
        $source=(string)($row['ID связи']??$a.'-'.$b);
        $insertRelation->execute([deterministicUuid('relationship:'.$source),
          $valid[$a],$valid[$b],(string)($row['Кем 1 приходится 2']??''),
          (string)($row['Кем 2 приходится 1']??''),
          (string)($row['Тип связи']??''),
          json_encode($row,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        $linkRows+=$insertRelation->rowCount();
    }
    $total=(int)$db->query("SELECT COUNT(*) FROM guest_profile_details")->fetchColumn();
    if($total<count($valid))throw new \RuntimeException('Imported profile count mismatch');
    $db->commit();
} catch (\Throwable $e){$db->rollBack();throw $e;}
$recordCount=(int)$db->query('SELECT COUNT(*) FROM guests')->fetchColumn();
$relationCount=(int)$db->query('SELECT COUNT(*) FROM guest_relationships')->fetchColumn();
$profileCount=(int)$db->query('SELECT COUNT(*) FROM guest_profile_details')->fetchColumn();
echo "PRIVATE_GUEST_IMPORT_OK people=$recordCount profiles=$profileCount relationships=$relationCount inserted=$added potential=$candidates invited_sent=0 rsvp_confirmed=0\n";
