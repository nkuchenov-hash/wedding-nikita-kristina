<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/api.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}
function checkGuestStage(bool $condition,string $message): void {
    if(!$condition)throw new \RuntimeException('Guest lifecycle test: '.$message);
}
$db=new \PDO('sqlite::memory:',null,null,[
    \PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION,
    \PDO::ATTR_DEFAULT_FETCH_MODE=>\PDO::FETCH_ASSOC,
]);
$db->exec('PRAGMA foreign_keys=ON');
$schema=file_get_contents(__DIR__.'/../schema.sql');
checkGuestStage(is_string($schema),'schema missing');
$db->exec($schema);
$profileColumns=$db->query('PRAGMA table_info(guest_profile_details)')->fetchAll(\PDO::FETCH_ASSOC);
checkGuestStage(in_array('relation_to_couple',array_column($profileColumns,'name'),true),
  'Missing separate couple relationship column');
statement($db,"INSERT INTO guests(id,first_name,display_name) VALUES(?,?,?)",
    ['guest-a','Guest','Guest A']);
statement($db,"INSERT INTO guests(id,first_name,display_name) VALUES(?,?,?)",
    ['guest-b','Guest','Guest B']);
$count=guestLifecycleCounts($db);
checkGuestStage((int)$count['total']===2,'both original guests counted');
checkGuestStage((int)$count['sent']===0 && (int)$count['registered']===0 &&
    (int)$count['confirmed']===0,'uninvited does not imply confirmed');
statement($db,"INSERT INTO invitations(id,guest_id,token_hash) VALUES(?,?,?)",
    ['i-a','guest-a','test-hash-a']);
$count=guestLifecycleCounts($db);
checkGuestStage((int)$count['prepared']===1 && (int)$count['sent']===0,
    'prepared link is not automatically sent');
statement($db,"INSERT INTO guest_progress(guest_id,invitation_sent_at)
    VALUES(?,datetime('now'))",['guest-a']);
$count=guestLifecycleCounts($db);
checkGuestStage((int)$count['sent']===1 && (int)$count['opened']===0,
    'sent invitation is not yet opened');
statement($db,"UPDATE invitations SET used_at=datetime('now') WHERE id=?",['i-a']);
statement($db,"UPDATE guest_progress SET first_opened_at=datetime('now') WHERE guest_id=?",
    ['guest-a']);
$count=guestLifecycleCounts($db);
checkGuestStage((int)$count['opened']===1 && (int)$count['registered']===0,
    'opening invitation never confirms participation');
statement($db,"UPDATE guest_progress SET profile_completed_at=datetime('now') WHERE guest_id=?",
    ['guest-a']);
statement($db,"UPDATE guests SET status='registered' WHERE id=?",['guest-a']);
$count=guestLifecycleCounts($db);
checkGuestStage((int)$count['registered']===1 && (int)$count['confirmed']===0,
    'profile saved but RSVP not submitted');
statement($db,"INSERT INTO rsvps(guest_id,attendance) VALUES(?,?)",
    ['guest-a','yes']);
$count=guestLifecycleCounts($db);
checkGuestStage((int)$count['responded']===1 && (int)$count['confirmed']===1 &&
    (int)$count['public_visible']===0,'RSVP yes confirms attendance, no publication');
checkGuestStage(count(confirmedGuestDirectory($db))===0,
    'guest directory must be empty without explicit profile consent');
statement($db,"UPDATE guests SET profile_visible=1,consent_at=datetime('now') WHERE id=?",
    ['guest-a']);
$count=guestLifecycleCounts($db);
checkGuestStage((int)$count['public_visible']===1,'confirmed consented guest is publishable');
$directory=confirmedGuestDirectory($db);
checkGuestStage(count($directory)===1 && $directory[0]['display_name']==='Guest A',
    'confirmed directory includes only approved guest');
checkGuestStage(!array_key_exists('email',$directory[0]) &&
    !array_key_exists('phone',$directory[0]) &&
    !array_key_exists('dietary_notes',$directory[0]),
    'private details never leak to directory');
statement($db,"UPDATE rsvps SET attendance='no' WHERE guest_id=?",['guest-a']);
$count=guestLifecycleCounts($db);
checkGuestStage((int)$count['confirmed']===0 && (int)$count['declined']===1 &&
    (int)$count['public_visible']===0 && count(confirmedGuestDirectory($db))===0,
    'declined guest vanishes from confirmed and visible list');
echo "GUEST_LIFECYCLE_STATES_OK original=2 prepared=1 sent=1 opened=1 registered=1 declined=1 directory=0\n";
