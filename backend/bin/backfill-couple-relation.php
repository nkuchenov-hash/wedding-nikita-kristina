<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}
/**
 * The source "Кем приходится / связи" is not a relationship to the couple.
 * It mixes kinship, spouses, friends and children's parents. Extract only
 * explicit, unambiguous wording directly about Nikita or Kristina.
 * Existing manually edited relations are never overwritten.
 */
function relationToCouple(string $raw,string $side): string {
    $roles=[
      'мама'=>'Мама','папа'=>'Папа','бабушка'=>'Бабушка','дедушка'=>'Дедушка',
      'дядя'=>'Дядя','тётя'=>'Тётя','двоюродный дядя'=>'Двоюродный дядя',
      'двоюродная тётя'=>'Двоюродная тётя','брат'=>'Брат','сестра'=>'Сестра',
      'крёстный'=>'Крёстный','крёстная'=>'Крёстная',
      'друг / знакомый'=>'Друг / знакомый','друг / знакомая'=>'Подруга / знакомая',
    ];
    foreach(explode(';',$raw) as $part){
        $part=trim($part);
        if(!preg_match('/^(.+?)\s+(Никита|Кристина)$/ui',$part,$matches))continue;
        $role=mb_strtolower(trim($matches[1]));
        if(!isset($roles[$role]))continue; // Reject ambiguous 'отец Никита' (other child).
        if(($matches[2]==='Никита'&&$side!=='groom')||
           ($matches[2]==='Кристина'&&$side!=='bride'))continue;
        return $roles[$role].' '.($matches[2]==='Никита'?'Никиты':'Кристины');
    }
    return '';
}
$db=db();
$items=all($db,"SELECT g.id,g.relationship,g.side,p.relation_to_couple
  FROM guests g JOIN guest_profile_details p ON p.guest_id=g.id");
$updated=0;$notSpecified=0;
$update=$db->prepare("UPDATE guest_profile_details SET relation_to_couple=?,
  updated_at=datetime('now') WHERE guest_id=? AND relation_to_couple=''");
foreach($items as $item){
    if(trim((string)$item['relation_to_couple'])!=='')continue;
    $relation=relationToCouple((string)$item['relationship'],(string)$item['side']);
    if($relation===''){$notSpecified++;continue;}
    $update->execute([$relation,$item['id']]);
    $updated+=$update->rowCount();
}
echo "GUEST_COUPLE_RELATION_BACKFILL_OK inferred=$updated needs_review=$notSpecified\n";
