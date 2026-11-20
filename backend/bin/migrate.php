<?php
declare(strict_types=1);
namespace Wedding;
use PDO;
require_once __DIR__.'/../src/core.php';

if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
if (!extension_loaded('pdo_sqlite') || !extension_loaded('sqlite3')) {
    fwrite(STDERR,"ERROR: SQLite modules unavailable in this PHP binary.\n");exit(2);
}
$root=PRIVATE_ROOT;
foreach([$root,$root.'/uploads',$root.'/sessions',$root.'/backups',$root.'/backend'] as $dir) {
    if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))
        throw new \RuntimeException('Cannot create private storage directory');
    chmod($dir,0700);
}
$cfgFile=$root.'/wedding-config.json';
if(!is_file($cfgFile)){
    $cfg=['version'=>1,'enabled'=>false,'pepper'=>bin2hex(random_bytes(32)),
      'created_at'=>gmdate('c'),'note'=>'Enable only after trusted HTTPS and auth review'];
    $temp=$cfgFile.'.'.bin2hex(random_bytes(4)).'.tmp';
    file_put_contents($temp,json_encode($cfg,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR),LOCK_EX);
    chmod($temp,0600);
    if(!rename($temp,$cfgFile))throw new \RuntimeException('Config install failed');
}
chmod($cfgFile,0600);
$database=db();
$database->exec('PRAGMA journal_mode = WAL');
$schema=file_get_contents(__DIR__.'/../schema.sql');
if($schema===false)throw new \RuntimeException('Schema missing');
$database->exec($schema);
// Existing wedding.sqlite3 predates the editable couple relationship field.
$cols=$database->query('PRAGMA table_info(guest_profile_details)')->fetchAll(PDO::FETCH_ASSOC);
if(!in_array('relation_to_couple',array_column($cols,'name'),true))
    $database->exec("ALTER TABLE guest_profile_details ADD COLUMN relation_to_couple TEXT NOT NULL DEFAULT ''");
$columns=$database->query('PRAGMA table_info(rsvps)')->fetchAll(PDO::FETCH_ASSOC);
if(!in_array('response_source',array_column($columns,'name'),true))
    $database->exec("ALTER TABLE rsvps ADD COLUMN response_source TEXT NOT NULL DEFAULT 'guest'");
$guestColumns=$database->query('PRAGMA table_info(guests)')->fetchAll(PDO::FETCH_ASSOC);
if(!in_array('about_en',array_column($guestColumns,'name'),true))
    $database->exec("ALTER TABLE guests ADD COLUMN about_en TEXT NOT NULL DEFAULT ''");
if(!in_array('community',array_column($guestColumns,'name'),true))
    $database->exec("ALTER TABLE guests ADD COLUMN community TEXT NOT NULL DEFAULT ''");
if(!in_array('private_notes',array_column($guestColumns,'name'),true))
    $database->exec("ALTER TABLE guests ADD COLUMN private_notes TEXT NOT NULL DEFAULT ''");
if(!in_array('planning_status',array_column($guestColumns,'name'),true))
    $database->exec("ALTER TABLE guests ADD COLUMN planning_status TEXT NOT NULL DEFAULT 'main' CHECK(planning_status IN ('main','reserve'))");
if(!in_array('age_group',array_column($guestColumns,'name'),true))
    $database->exec("ALTER TABLE guests ADD COLUMN age_group TEXT NOT NULL DEFAULT 'unknown' CHECK(age_group IN ('unknown','adult','child','infant'))");
foreach(['country','origin_place','origin_country','birth_city','birth_country'] as $field){
    if(!in_array($field,array_column($guestColumns,'name'),true))
        $database->exec("ALTER TABLE guests ADD COLUMN ".$field." TEXT NOT NULL DEFAULT ''");
}
$database->exec('CREATE INDEX IF NOT EXISTS idx_guests_planning_age ON guests(planning_status,age_group)');
$scheduleColumns=$database->query('PRAGMA table_info(schedule_items)')->fetchAll(PDO::FETCH_ASSOC);
if(!in_array('venue_id',array_column($scheduleColumns,'name'),true))
    $database->exec("ALTER TABLE schedule_items ADD COLUMN venue_id TEXT NOT NULL DEFAULT ''");
if(!in_array('is_confirmed',array_column($scheduleColumns,'name'),true))
    $database->exec("ALTER TABLE schedule_items ADD COLUMN is_confirmed INTEGER NOT NULL DEFAULT 0");

if(!in_array('stage',array_column($scheduleColumns,'name'),true)){
    $database->exec("ALTER TABLE schedule_items ADD COLUMN stage TEXT NOT NULL DEFAULT 'idea'");
    // Preserve timed existing events as scheduled; date-only notes stay in the idea pool.
    $database->exec("UPDATE schedule_items SET stage='program' WHERE start_at GLOB '????-??-??T??:??*'");
}
if(!in_array('activity_type',array_column($scheduleColumns,'name'),true))
    $database->exec("ALTER TABLE schedule_items ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'other'");
if(!in_array('duration_min',array_column($scheduleColumns,'name'),true))
    $database->exec("ALTER TABLE schedule_items ADD COLUMN duration_min INTEGER NOT NULL DEFAULT 30");
if(!in_array('gap_before_min',array_column($scheduleColumns,'name'),true))
    $database->exec("ALTER TABLE schedule_items ADD COLUMN gap_before_min INTEGER NOT NULL DEFAULT 0");

if(!in_array('activity_date',array_column($scheduleColumns,'name'),true)){
    $database->exec("ALTER TABLE schedule_items ADD COLUMN activity_date TEXT NOT NULL DEFAULT '2027-06-19'");
    // Preserve the wedding date of timed events and date-only legacy ideas.
    $database->exec("UPDATE schedule_items SET activity_date=substr(start_at,1,10)
      WHERE substr(start_at,1,10) IN ('2027-06-17','2027-06-18','2027-06-19')");
}
// Restore day ownership after the obsolete shared pool. Existing dated ideas keep
// their original day; legacy undated ideas default to the main celebration, June 19.
$database->exec("UPDATE schedule_items SET activity_date=CASE
  WHEN substr(start_at,1,10) IN ('2027-06-17','2027-06-18','2027-06-19')
  THEN substr(start_at,1,10) ELSE '2027-06-19' END
  WHERE stage='idea' AND (activity_date='' OR activity_date IS NULL)");
if(!in_array('tags_json',array_column($scheduleColumns,'name'),true))
    $database->exec("ALTER TABLE schedule_items ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'");
$database->exec("CREATE INDEX IF NOT EXISTS idx_schedule_stage_day ON schedule_items(stage,activity_date,start_at,sort_order)");

$tables=(int)$database->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchColumn();
chmod($root.'/wedding.sqlite3',0600);
foreach(['-wal','-shm'] as $suffix)if(is_file($root.'/wedding.sqlite3'.$suffix))
    chmod($root.'/wedding.sqlite3'.$suffix,0600);
echo "BACKEND_MIGRATION_OK tables={$tables}; enabled=false by default; data is stored outside document root\n";
