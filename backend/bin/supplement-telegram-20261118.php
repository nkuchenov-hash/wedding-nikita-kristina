<?php
declare(strict_types=1);
namespace Wedding;

use PDO;
use RuntimeException;
use Throwable;

require_once __DIR__.'/../src/core.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit(1); }

// Supplemental facts are written only where the organizer has left a field empty.
// Values entered in the live site, including date status and pricing, always win.
function telegramMissing(mixed $value): bool {
    return $value === null || $value === '' || $value === [];
}

$db = db();
$db->beginTransaction();
$changed = 0;
$documentsAdded = 0;
$dateAdded = 0;
$found = 0;

try {
    $rows = $db->query('SELECT id,details_json FROM venues')->fetchAll(PDO::FETCH_ASSOC);
    $update = $db->prepare("UPDATE venues SET details_json=?, updated_at=datetime('now')
                            WHERE id=? AND details_json=?");

    $supplement = [
        'contactName'=>'Татьяна Агуреева — менеджер Парадного зала',
        'capacityNote'=>'Парадный зал 256 м², welcome-зона 86 м²; 180 деревянных стульев и 15 круглых столов диаметром 1,5 м без текстиля. Число стульев не является подтверждением банкетной вместимости.',
        'costSummary'=>'Коммерческое предложение 2027: аренда Парадного зала и welcome-зоны на субботу 19 июня — 360 000 ₽ (09:00–23:00, плюс 2 часа демонтажа). Звук, свет, сцена и техперсонал до 8 часов включены. Меню не рассчитано, сервис 10%; итог для 80 гостей пока не известен. ВС–ЧТ аренда 290 000 ₽.',
        'included'=>[
            'Аренда Парадного зала и welcome-зоны с 09:00 до 23:00, затем 2 часа на демонтаж',
            'Свет, звук, сцена и работа технических специалистов до 8 часов',
            'Поддерживающая уборка во время мероприятия',
            '180 деревянных стульев и 15 круглых столов диаметром 1,5 м, без текстиля'
        ],
        'excluded'=>[
            'Гардероб с 1 гардеробщиком — 16 000 ₽, с 2 — 20 000 ₽ (до 8 часов)',
            'Продление после 23:00 — 35 000 ₽/час',
            'LED-экран 2,5 × 4 м с видеоинженером до 8 часов — 85 000 ₽',
            'Пробковый сбор — 250–500 ₽/гость',
            'Сторонний кейтеринг — дополнительный сбор 50 000 ₽'
        ],
        'questions'=>[
            'Получить точное меню и полную смету на 80–100 гостей; сервисный сбор 10%',
            'Подтвердить банкетную вместимость при выбранной рассадке',
            'Уточнить включённые часы техники и гардероба, условия своего алкоголя',
            'Сравнить меню партнёров Eat catering, FurChef и Royal Catering'
        ],
        'cateringContacts'=>[
            ['company'=>'Eat catering','name'=>'Антон','phone'=>'89110271378'],
            ['company'=>'FurChef','name'=>'Ирина','phone'=>'+7 999 518 2961'],
            ['company'=>'Royal Catering','name'=>'Екатерина','phone'=>'+7 967 974 9680']
        ]
    ];
    $supplementCost = ['rent'=>360000,'service'=>10,'extension'=>35000];

    foreach ($rows as $row) {
        $data = json_decode((string)$row['details_json'], true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($data)) continue;
        $id = $data['wedding_comparison_id'] ?? ($data['public']['id'] ?? $row['id']);
        if ($id !== 'palma') continue;
        $found++;
        $overrides = $data['overrides'] ?? [];
        if (!is_array($overrides) || (array_is_list($overrides) && count($overrides)>0))
            throw new RuntimeException('Unexpected venue overrides');
        $public = is_array($data['public'] ?? null) ? $data['public'] : [];
        $source = is_array($data['source'] ?? null) ? $data['source'] : [];
        $dirty = false;

        foreach ($supplement as $key=>$value) {
            if (!telegramMissing($overrides[$key] ?? null)
                || !telegramMissing($source[$key] ?? null)
                || !telegramMissing($public[$key] ?? null)) continue;
            $overrides[$key] = $value;
            $dirty = true;
        }
        $cost = is_array($overrides['cost'] ?? null) ? $overrides['cost'] : [];
        foreach ($supplementCost as $key=>$value) {
            if (!telegramMissing($cost[$key] ?? null)
                || !telegramMissing($source['cost'][$key] ?? null)
                || !telegramMissing($public['cost'][$key] ?? null)
                || !telegramMissing($public['publiclyAdvertised'][$key] ?? null)) continue;
            $cost[$key] = $value;
            $dirty = true;
        }
        if ($cost) $overrides['cost'] = $cost;
        if ($dirty) {
            $data['overrides'] = $overrides;
            $encoded = json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
            $update->execute([$encoded,$row['id'],$row['details_json']]);
            if ($update->rowCount() !== 1) throw new RuntimeException('Concurrent venue edit detected; no update applied');
            $changed++;
        }
    }
    if (!$found) throw new RuntimeException('Palma venue not found; database unchanged');

    // Keep the date chosen by the organizer, even when it is pending or unavailable.
    $date = $db->prepare("UPDATE venue_date_status SET status='available',updated_at=datetime('now')
                          WHERE venue_id='palma' AND day='2027-06-19' AND status='unknown'");
    $date->execute();
    $dateAdded = $date->rowCount();

    $files = [
        ['1bCA8XbsjWOUcPPH6uwlV7J5RIib3YlEo','Фуршетное меню — FurChef','pdf'],
        ['1DFhG3jtA3DZFTnZIN_W86D4ry73gzfeR','Банкетное меню — FurChef','pdf'],
        ['1u_daEfjBhf_zoFdF_CftI7qxtSw9EA7S','Фуршетное меню 2025 — Royal Catering','pdf'],
        ['1jmMACAhe3vCIq00Zs7ByO7KNj0mF1U83','Меню от 40 персон 2025 — Royal Catering','pdf'],
        ['1x1otP1jADRPi71YGIkzITB69oQQr7gK_','Банкет — Eat catering','docx'],
        ['1uDAT_vkZ6o5-i2HknR6XxGIb82s5rJfR','Фуршет — Eat catering','docx']
    ];
    $exists = $db->prepare('SELECT id FROM venue_files WHERE venue_id=? AND file_id=?');
    $add = $db->prepare('INSERT OR IGNORE INTO venue_files
                       (id,venue_id,title,mime,file_id,source_url,type)
                       VALUES(?,?,?,?,?,?,?)');
    foreach ($files as [$fileId,$title,$ext]) {
        $exists->execute(['palma',$fileId]);
        if ($exists->fetchColumn() !== false) continue;
        $docId = substr(hash('sha256','venue-drive-file-'.$fileId),0,36);
        $url = $ext === 'docx'
            ? 'https://docs.google.com/document/d/'.$fileId.'/edit'
            : 'https://drive.google.com/file/d/'.$fileId.'/view';
        $add->execute([$docId,'palma',$title,$ext,$fileId,$url,'document']);
        $documentsAdded += $add->rowCount();
    }
    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    throw $e;
}
echo "VENUE_SUPPLEMENT_OK venue=palma changed=$changed dates=$dateAdded documents=$documentsAdded\n";
