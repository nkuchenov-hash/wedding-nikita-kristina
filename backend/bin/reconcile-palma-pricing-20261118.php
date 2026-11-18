<?php
declare(strict_types=1);
namespace Wedding;

use PDO;
use Throwable;

require_once __DIR__.'/../src/core.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit(1); }

// Correct only the exact placeholder that our own previous supplement inserted.
// A modified or organizer-authored description is not touched.
$old = <<<'OLD'
Коммерческое предложение 2027: аренда Парадного зала и welcome-зоны на субботу 19 июня — 360 000 ₽ (09:00–23:00, плюс 2 часа демонтажа). Звук, свет, сцена и техперсонал до 8 часов включены. Меню не рассчитано, сервис 10%; итог для 80 гостей пока не известен. ВС–ЧТ аренда 290 000 ₽.
OLD;
$new = <<<'NEW'
Расчёт на 80 гостей при выборе Eat Catering (банкет №1): аренда 360 000 ₽ + 4 700 × 80 = 376 000 ₽ + сервис 10% = 37 600 ₽ → 773 600 ₽. Без приветственного фуршета, алкоголя и прочих расходов. Тарифы банкета Eat Catering: 4 700 / 5 700 / 6 700 / 7 700 ₽ за гостя; фуршет 2 700 / 3 500 / 4 200 / 5 000 / 5 700 ₽ за гостя. FurChef: банкет 5 900 / 6 900 / 8 900 ₽, фуршет 1 500 / 2 200 / 3 300 ₽; отдельно официанты от 8 000 ₽/чел. Royal Catering: банкет 5 500 / 6 700 / 8 600 / 9 600 ₽ без НДС, сервис 10% отдельно, приветственный коктейль от 850 ₽. Аренда 19 июня 09:00–23:00 + 2 часа демонтажа, техника до 8 часов включена. Стоимость меню и услуги требуют окончательного согласования.
NEW;

$db = db();
$db->beginTransaction();
$patched = 0;
$kept = 0;
try {
    $rows = $db->query("SELECT id,details_json FROM venues")->fetchAll(PDO::FETCH_ASSOC);
    $set = $db->prepare("UPDATE venues SET details_json=?,updated_at=datetime('now')
                        WHERE id=? AND details_json=?");
    foreach ($rows as $row) {
        $entry = json_decode((string)$row['details_json'],true,512,JSON_THROW_ON_ERROR);
        if (!is_array($entry)) continue;
        $key = $entry['wedding_comparison_id']??($entry['public']['id']??$row['id']);
        if ($key!=='palma') continue;
        $overrides = $entry['overrides']??[];
        if (!is_array($overrides) || ($overrides['costSummary']??null)!==$old) {
            $kept++; continue;
        }
        $overrides['costSummary']=$new;
        $entry['overrides']=$overrides;
        $next=json_encode($entry,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        $set->execute([$next,$row['id'],$row['details_json']]);
        if($set->rowCount()!==1)throw new \RuntimeException('Concurrent venue edit; rollback');
        $patched++;
    }
    $db->commit();
} catch(Throwable $e) {
    if($db->inTransaction())$db->rollBack();
    throw $e;
}
echo "PALMA_LEGACY_PLACEHOLDER_RECONCILED patched=$patched untouched=$kept\n";
