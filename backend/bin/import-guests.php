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

// Reconcile spreadsheet changes with imported values, leaving human-edited fields alone.
// The *previous* source snapshots make it possible to recognize manual overrides.
function sourceSide(array $row): string {
    return match($row['Сторона']??''){
        'Никита'=>'groom','Кристина'=>'bride','Оба','Общие'=>'both',default=>'other'
    };
}
function sourceGuestFields(array $row): array {
    return [
        'first_name'=>mb_substr((string)($row['Имя']??''),0,120),
        'last_name'=>mb_substr((string)($row['Фамилия']??''),0,120),
        'display_name'=>trim((string)($row['Отображаемое имя']??'')),
        'side'=>sourceSide($row),
        'relationship'=>mb_substr((string)($row['Кем приходится / связи']??''),0,255),
        'city'=>mb_substr((string)($row['Город / страна']??''),0,255),
    ];
}
function sourceProfileFields(array $invite,array $profile,array $english): array {
    return [
        'name_en'=>mb_substr((string)($english['Display name (EN draft)']??$profile['Name EN']??''),0,255),
        'seating_group'=>(string)($invite['Группа рассадки (черновик)']??''),
        'decision'=>(string)($invite['Решение о приглашении']??''),
        'base_count'=>(string)($invite['В базовом подсчёте']??''),
    ];
}
function decodeImportSnapshot(?string $value): array {
    if(!$value)return [];
    $decoded=json_decode($value,true);
    return is_array($decoded)?$decoded:[];
}
function syncImportedFields(\PDO $db,string $table,string $id,array $existing,array $before,array $after,int &$preserved): int {
    $changes=[];
    foreach($after as $field=>$value){
        if(!array_key_exists($field,$before))continue;
        if((string)($existing[$field]??'')===(string)$before[$field]){
            if((string)($existing[$field]??'')!==(string)$value)$changes[$field]=$value;
        }elseif((string)($existing[$field]??'')!==(string)$value){
            $preserved++;
        }
    }
    if(!$changes)return 0;
    $assignments=array_map(fn($field)=>$field.'=?',array_keys($changes));
    $column=$table==='guests'?'id':'guest_id';
    $sql='UPDATE '.$table.' SET '.implode(',',$assignments).",updated_at=datetime('now') WHERE ".$column.'=?';
    $db->prepare($sql)->execute([...array_values($changes),$id]);
    return count($changes);
}

$db->beginTransaction();
$added=0;$profileRows=0;$linkRows=0;$candidates=0;$preserved=0;$changed=0;
try {
    $insertGuest=$db->prepare('INSERT OR IGNORE INTO guests
        (id,first_name,last_name,display_name,side,relationship,city,status,invited)
        VALUES (?,?,?,?,?,?,?,\'draft\',0)');
    $existingLookup=$db->prepare('SELECT g.first_name,g.last_name,g.display_name,g.side,g.relationship,g.city,
      p.name_en,p.seating_group,p.decision,p.base_count,
      p.source_people_json,p.source_invitation_json,p.source_profile_json,p.source_english_json
      FROM guests g LEFT JOIN guest_profile_details p ON p.guest_id=g.id WHERE g.id=?');
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
        $newGuest=sourceGuestFields($row);
        $id=deterministicUuid($person);
        $valid[$person]=$id;
        $existingLookup->execute([$id]);
        $existing=$existingLookup->fetch(\PDO::FETCH_ASSOC)?:null;
        $insertGuest->execute([$id,$newGuest['first_name'],$newGuest['last_name'],$name,$newGuest['side'],
          $newGuest['relationship'],$newGuest['city']]);
        $added+=$insertGuest->rowCount();
        $rowInvite=$invites[$person]??[];
        $rowProfile=$profiles[$person]??[];
        $rowEnglish=$englishById[$person]??[];
        $decision=(string)($rowInvite['Решение о приглашении']??'');
        if(mb_stripos($decision,'вопрос')!==false)$candidates++;
        $newProfile=sourceProfileFields($rowInvite,$rowProfile,$rowEnglish);
        $encode=fn($v)=>json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        if($existing){
            $oldPeople=decodeImportSnapshot($existing['source_people_json']??null);
            $oldInvite=decodeImportSnapshot($existing['source_invitation_json']??null);
            $oldProfile=decodeImportSnapshot($existing['source_profile_json']??null);
            $oldEnglish=decodeImportSnapshot($existing['source_english_json']??null);
            if($oldPeople){
                $changed+=syncImportedFields($db,'guests',$id,$existing,
                    sourceGuestFields($oldPeople),$newGuest,$preserved);
            }
            // Missing original source snapshots are not proof that a field is unedited.
            if($existing['source_people_json']!==null && $oldPeople){
                $changed+=syncImportedFields($db,'guest_profile_details',$id,$existing,
                    sourceProfileFields($oldInvite,$oldProfile,$oldEnglish),$newProfile,$preserved);
            }
        }
        $insertProfile->execute([$id,$person,$newProfile['name_en'],
          $encode($row),$encode($rowInvite),$encode($rowProfile),$encode($rowEnglish),
          $newProfile['seating_group'],$newProfile['decision'],$newProfile['base_count']]);
        $profileRows+=$insertProfile->rowCount();
        // Update imported source snapshots on every run; do not overwrite manual fields.
        if($existing && $existing['source_people_json']!==null){
            $db->prepare("UPDATE guest_profile_details SET source_people_json=?,
                source_invitation_json=?,source_profile_json=?,source_english_json=?,
                updated_at=datetime('now') WHERE guest_id=?")
              ->execute([$encode($row),$encode($rowInvite),$encode($rowProfile),$encode($rowEnglish),$id]);
        }
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
echo "PRIVATE_GUEST_IMPORT_OK people=$recordCount profiles=$profileCount relationships=$relationCount inserted=$added changed_fields=$changed preserved_manual=$preserved potential=$candidates invited_sent=0 rsvp_confirmed=0\n";
