<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$db=db();
$columns=array_column($db->query('PRAGMA table_info(guests)')->fetchAll(\PDO::FETCH_ASSOC),'name');
foreach(['community','about','about_en','private_notes','planning_status','age_group'] as $field)
    if(!in_array($field,$columns,true))throw new \RuntimeException('Missing unified guest field');
$stats=one($db,"SELECT COUNT(*) total,
  SUM(CASE WHEN trim(coalesce(g.community,''))!='' THEN 1 ELSE 0 END) communities,
  SUM(CASE WHEN trim(coalesce(g.about,''))!='' THEN 1 ELSE 0 END) russian_profiles,
  SUM(CASE WHEN trim(coalesce(g.about_en,''))!='' THEN 1 ELSE 0 END) english_profiles,
  SUM(CASE WHEN trim(coalesce(g.private_notes,''))!='' THEN 1 ELSE 0 END) notes,
  SUM(CASE WHEN p.source_person_id IS NOT NULL THEN 1 ELSE 0 END) imported
  FROM guests g LEFT JOIN guest_profile_details p ON p.guest_id=g.id");
if((int)$stats['total']<114||(int)$stats['imported']<114)
    throw new \RuntimeException('Original guest records missing');
foreach(['communities','russian_profiles','english_profiles'] as $key)
    if((int)$stats[$key]<100)throw new \RuntimeException('Guest profiles were not backfilled: '.$key);
if((int)$stats['notes']<80)throw new \RuntimeException('Original private notes were not backfilled');
$bad=(int)$db->query('SELECT COUNT(*) FROM guests WHERE trim(display_name)=""')->fetchColumn();
if($bad!==0)throw new \RuntimeException('Unnamed guest display records');
$childCandidates=(int)$db->query("SELECT COUNT(*) FROM guests WHERE age_group='child'")->fetchColumn();
if($childCandidates<12)throw new \RuntimeException('Original child guest records not identified; children switch would do nothing');
$reserved=(int)$db->query("SELECT COUNT(*) FROM guests WHERE planning_status='reserve'")->fetchColumn();
$hasSettingsTable=(int)$db->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='event_settings'")->fetchColumn();
if(!$hasSettingsTable)throw new \RuntimeException('Children switch has no persistent settings table');
// Reserve remains a separate planning classification and never destroys RSVPs.
// Verify the switch reads the same SQLite setting used by the invitation API.
$before=childrenEnabled($db);
$db->beginTransaction();
try{
    statement($db,"INSERT INTO event_settings(key,value_json) VALUES('children_enabled','false')
       ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json");
    if(childrenEnabled($db)!==false)throw new \RuntimeException('Children toggle OFF did not affect database state');
    statement($db,"UPDATE event_settings SET value_json='true' WHERE key='children_enabled'");
    if(childrenEnabled($db)!==true)throw new \RuntimeException('Children toggle ON did not affect database state');
}finally{$db->rollBack();}
if(childrenEnabled($db)!==$before)throw new \RuntimeException('Settings test did not restore previous state');
$relationships=(int)$db->query('SELECT COUNT(*) FROM guest_relationships')->fetchColumn();
if($relationships<71)throw new \RuntimeException('Guest relationship links missing');
$foreign=$db->query('PRAGMA foreign_key_check')->fetchAll(\PDO::FETCH_ASSOC);
if($foreign)throw new \RuntimeException('Foreign key integrity failure');
echo "UNIFIED_GUESTS_OK guests=".$stats['total']." imports=".$stats['imported'].
  " communities=".$stats['communities']." ru=".$stats['russian_profiles'].
  " en=".$stats['english_profiles']." notes=".$stats['notes'].
  " relationships=".$relationships." children=".$childCandidates." reserve=".$reserved."\n";
