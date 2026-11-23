<?php
declare(strict_types=1);
namespace Wedding;

use Throwable;
require_once __DIR__.'/../src/core.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit(1); }

// "Чаду" was mistakenly inferred from a route note, not a real venue.
// Remove only this fabricated ID. Preserve all other user-created records.
$db=db();
$db->beginTransaction();
try {
  $id='chadu';
  $files=$db->prepare('DELETE FROM venue_files WHERE venue_id=?');
  $files->execute([$id]);
  $dates=$db->prepare('DELETE FROM venue_date_status WHERE venue_id=?');
  $dates->execute([$id]);
  $events=$db->prepare("UPDATE schedule_items SET venue_id='' WHERE venue_id=?");
  $events->execute([$id]);
  $venues=$db->prepare("DELETE FROM venues WHERE id=? AND name='Чаду'");
  $venues->execute([$id]);
  $db->commit();
  echo 'INVALID_VENUE_REMOVED chadu rows='.$venues->rowCount().
    ' dates='.$dates->rowCount().' files='.$files->rowCount().
    ' schedule_unlinked='.$events->rowCount()."\n";
} catch (Throwable $error) {
  if ($db->inTransaction()) $db->rollBack();
  throw $error;
}
