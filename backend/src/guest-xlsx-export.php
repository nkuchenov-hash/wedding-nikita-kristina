<?php
declare(strict_types=1);
namespace Wedding;

/** One-sheet, live, organizer-only Excel download from SQLite.
 *  Does not write data to the repository or accept spreadsheet imports.
 */
function streamLiveGuestXlsx(\PDO $db): never {
    if (!class_exists(\ZipArchive::class)) {
        fail(503,'xlsx_unavailable','Excel-выписка временно недоступна');
    }
    $db->beginTransaction();
    try {
        $people=all($db,"SELECT g.id,g.display_name,g.side,g.community,g.city,g.country,g.origin_place,g.origin_country,g.birth_city,g.birth_country,g.phone,g.email,g.about,
          g.about_en,g.private_notes,g.planning_status,g.age_group,p.source_person_id,p.name_en,
          p.relation_to_couple,p.decision,p.seating_group,
          r.attendance,t.invitation_sent_at
          FROM guests g
          LEFT JOIN guest_profile_details p ON p.guest_id=g.id
          LEFT JOIN rsvps r ON r.guest_id=g.id
          LEFT JOIN guest_progress t ON t.guest_id=g.id
          ORDER BY CASE WHEN p.source_person_id GLOB 'P[0-9]*' THEN 0 ELSE 1 END,
            p.source_person_id,g.display_name,g.id");
        $links=all($db,"SELECT guest_id_1,guest_id_2,relation_type,relation_1_to_2,relation_2_to_1
          FROM guest_relationships");
        $db->commit();
    }catch(\Throwable $err){$db->rollBack();throw $err;}
    if(!$people||count($people)>1500)throw new \RuntimeException('Unexpected live guest count');
    $names=[];$relations=[];
    foreach($people as $p)$names[(string)$p['id']]=(string)$p['display_name'];
    foreach($links as $l){
        $a=(string)$l['guest_id_1'];$b=(string)$l['guest_id_2'];
        if(!isset($names[$a],$names[$b]))continue;
        $relations[$a][]=$names[$b].' — '.(string)($l['relation_1_to_2']?:$l['relation_type']);
        $relations[$b][]=$names[$a].' — '.(string)($l['relation_2_to_1']?:$l['relation_type']);
    }
    $headers=['Гость','Name EN','Сторона','Круг общения','Кем приходится','Связанные гости',
      'Откуда родом','Страна происхождения','Где живёт сейчас','Страна проживания',
      'Профиль гостя (RU)','Guest profile (EN)','Заметки организатора',
      'Состав','Возраст','Решение о приглашении','RSVP','Приглашение отправлено',
      'Рассадка','Телефон','Email','ID',
      'Город рождения (по происхождению)','Страна рождения (по происхождению)'];
    $rows=[$headers];
    $sides=['groom'=>'Никита','bride'=>'Кристина','both'=>'Общие','other'=>'Не определено'];
    $ages=['unknown'=>'Не уточнено','adult'=>'Взрослый','child'=>'Ребёнок','infant'=>'Младенец'];
    $attendance=['yes'=>'Будет','no'=>'Не придёт','maybe'=>'Под вопросом'];
    foreach($people as $p){
        $rows[]=[
          $p['display_name'],$p['name_en'],$sides[(string)$p['side']]??'Не определено',
          $p['community'],$p['relation_to_couple'],
          implode('; ',array_unique($relations[(string)$p['id']]??[])),
          $p['origin_place'],$p['origin_country'],$p['city'],$p['country'],
          $p['about'],$p['about_en'],$p['private_notes'],
          ($p['planning_status']==='reserve'?'Резерв':'Основной'),
          $ages[(string)$p['age_group']]??'Не уточнено',$p['decision'],
          $attendance[(string)($p['attendance']??'')]??'Нет ответа',
          ($p['invitation_sent_at']?'Да · '.substr((string)$p['invitation_sent_at'],0,10):'Нет'),
          $p['seating_group'],$p['phone'],$p['email'],$p['source_person_id']?:$p['id'],
          $p['birth_city'],$p['birth_country']
        ];
    }
    $xmlText=static function($value):string{
        $v=(string)($value??'');
        $v=(string)preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/','',$v);
        return htmlspecialchars($v,ENT_XML1|ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    };
    $cellName=static function(int $index):string{
        $result='';
        while($index>0){$index--;$result=chr(65+$index%26).$result;$index=intdiv($index,26);}
        return $result;
    };
    $last=count($rows);
    $columns=[24,22,12,19,23,35,23,20,23,18,52,48,36,13,15,22,16,20,26,19,27,15,22,20];
    $cols='<cols>';
    foreach($columns as $i=>$width)$cols.='<col min="'.($i+1).'" max="'.($i+1).'" width="'.$width.'" customWidth="1"/>';
    $cols.='</cols>';
    $sheetRows='';
    foreach($rows as $i=>$cells){
        $n=$i+1;
        $sheetRows.='<row r="'.$n.'" ht="'.($n===1?32:50).'" customHeight="1">';
        foreach($cells as $j=>$value){
            $address=$cellName($j+1).$n;
            $sheetRows.='<c r="'.$address.'" s="'.($n===1?1:2).'" t="inlineStr"><is><t xml:space="preserve">'.
              $xmlText($value).'</t></is></c>';
        }
        $sheetRows.='</row>';
    }
    $sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'.
      '<dimension ref="A1:X'.$last.'"/>'.
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'.
      $cols.'<sheetData>'.$sheetRows.'</sheetData>'.
      '<autoFilter ref="A1:X'.$last.'"/></worksheet>';
    $types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'.
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'.
      '<Default Extension="xml" ContentType="application/xml"/>'.
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'.
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'.
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'.
      '</Types>';
    $rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'.
      '</Relationships>';
    $workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '.
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'.
      '<sheets><sheet name="Гости" sheetId="1" r:id="rId1"/></sheets></workbook>';
    $workbookRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'.
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'.
      '</Relationships>';
    $styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'.
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'.
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'.
      '<fills count="3"><fill><patternFill patternType="none"/></fill>'.
      '<fill><patternFill patternType="gray125"/></fill>'.
      '<fill><patternFill patternType="solid"><fgColor rgb="FF22553B"/><bgColor indexed="64"/></patternFill></fill></fills>'.
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'.
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'.
      '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'.
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>'.
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>'.
      '</styleSheet>';
    $path=tempnam(sys_get_temp_dir(),'wgxlsx_');
    if($path===false)throw new \RuntimeException('Cannot create spreadsheet');
    $zip=new \ZipArchive();
    if($zip->open($path,\ZipArchive::OVERWRITE)!==true){
        @unlink($path);throw new \RuntimeException('Cannot create Excel archive');
    }
    foreach([
      '[Content_Types].xml'=>$types,'_rels/.rels'=>$rels,'xl/workbook.xml'=>$workbook,
      'xl/_rels/workbook.xml.rels'=>$workbookRels,'xl/styles.xml'=>$styles,
      'xl/worksheets/sheet1.xml'=>$sheet
    ] as $name=>$bytes)$zip->addFromString($name,$bytes);
    if(!$zip->close()){@unlink($path);throw new \RuntimeException('Cannot finalize Excel archive');}
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="wedding-guests-'.gmdate('Y-m-d').'.xlsx"');
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('Content-Length: '.filesize($path));
    readfile($path);
    @unlink($path);
    exit;
}
