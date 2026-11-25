<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli')exit(1);

function relNorm(string $value): string {
    return trim(preg_replace('/\s+/u',' ',str_replace('ё','е',mb_strtolower($value)))??'');
}
function relRole(string $value): string {
    return match(relNorm($value)){
        'мать','мама','mother'=>'mother','отец','папа','father'=>'father',
        'сын','son'=>'son','дочь','дочка','daughter'=>'daughter',
        'муж','супруг','husband'=>'husband','жена','супруга','wife'=>'wife',
        'брат','brother'=>'brother','сестра','sister'=>'sister',
        'дедушка','дед','grandfather'=>'grandfather','бабушка','grandmother'=>'grandmother',
        'внук','grandson'=>'grandson','внучка','granddaughter'=>'granddaughter',
        'дядя','uncle'=>'uncle','тетя','aunt'=>'aunt',
        'племянник','nephew'=>'nephew','племянница','niece'=>'niece',
        'двоюродный брат'=>'male_cousin','двоюродная сестра'=>'female_cousin',
        default=>''
    };
}
function relSex(string $role): string {
    if(in_array($role,['father','son','husband','brother','grandfather','grandson','uncle','nephew','male_cousin'],true))return 'm';
    if(in_array($role,['mother','daughter','wife','sister','grandmother','granddaughter','aunt','niece','female_cousin'],true))return 'f';
    return '';
}
function relLabel(string $role): string {
    return ['mother'=>'Мать','father'=>'Отец','son'=>'Сын','daughter'=>'Дочь','husband'=>'Муж','wife'=>'Жена','brother'=>'Брат','sister'=>'Сестра','grandfather'=>'Дедушка','grandmother'=>'Бабушка','grandson'=>'Внук','granddaughter'=>'Внучка','uncle'=>'Дядя','aunt'=>'Тётя','nephew'=>'Племянник','niece'=>'Племянница','male_cousin'=>'Двоюродный брат','female_cousin'=>'Двоюродная сестра'][$role]??'';
}
function inferGuestRelationships(array $people,array $links): array {
    $byId=[];$names=[];$sex=[];$parents=[];$siblings=[];$partners=[];$occupied=[];$candidates=[];$conflicts=[];
    foreach($people as $p){
        $id=(string)$p['id'];$byId[$id]=$p;
        foreach(array_unique([relNorm((string)$p['display_name']),relNorm((string)$p['first_name'])]) as $name)
            if($name!=='')$names[$name][$id]=true;
    }
    $pair=static function(string $a,string $b): string {return strcmp($a,$b)<0?$a.'|'.$b:$b.'|'.$a;};
    $rememberSex=static function(string $id,string $role)use(&$sex):void{
        $s=relSex($role);if($s!=='')$sex[$id][$s]=true;
    };
    $knownSex=static function(string $id)use(&$sex):string{
        return count($sex[$id]??[])===1?(string)array_key_first($sex[$id]):'';
    };
    $genderRole=static function(string $id,string $male,string $female)use($knownSex):string{
        return match($knownSex($id)){'m'=>$male,'f'=>$female,default=>''};
    };
    $graph=static function(string $a,string $b,string $role)use(&$parents,&$siblings,&$partners,$rememberSex):void{
        $rememberSex($a,$role);
        if(in_array($role,['mother','father'],true))$parents[$b][$a]=true;
        if(in_array($role,['son','daughter'],true))$parents[$a][$b]=true;
        if(in_array($role,['brother','sister'],true)){$siblings[$a][$b]=true;$siblings[$b][$a]=true;}
        if(in_array($role,['husband','wife'],true)){$partners[$a][$b]=true;$partners[$b][$a]=true;}
    };
    foreach($links as $l){
        $a=(string)$l['guest_id_1'];$b=(string)$l['guest_id_2'];
        if(!isset($byId[$a],$byId[$b])||$a===$b)continue;
        $occupied[$pair($a,$b)]=true;
        $graph($a,$b,relRole((string)$l['relation_1_to_2']));
        $graph($b,$a,relRole((string)$l['relation_2_to_1']));
    }
    // Parse only the structured "Кем приходится / связи" field, never guesses
    // from surnames or a common seating group. Require a unique actual guest.
    $explicit=[];
    foreach($people as $p){
        $a=(string)$p['id'];
        foreach(explode(';',(string)$p['relationship']) as $part){
            $part=relNorm($part);
            if(!preg_match('/^(.+?)\s+(.+)$/u',$part))continue;
            foreach($names as $name=>$ids){
                if(count($ids)!==1||in_array($name,['никита','кристина'],true)||!str_ends_with($part,' '.$name))continue;
                $b=(string)array_key_first($ids);
                if($a===$b||$byId[$a]['side']!==$byId[$b]['side'])continue;
                $role=relRole(substr($part,0,-strlen(' '.$name)));
                if($role==='')continue;
                // Short first-name matches require an existing link to resolve
                // the identity; full display names must be exact.
                if($name!==relNorm((string)$byId[$b]['display_name']))continue;
                $explicit[]=[$a,$b,$role];
            }
        }
    }
    foreach($explicit as [$a,$b,$role])$graph($a,$b,$role);
    // Existing direct labels determine gender; never guess gender from a name.
    // A missing inverse is safe only if both roles can be determined.
    $add=static function(string $a,string $b,string $ab,string $ba,string $why)use(&$candidates,&$conflicts,$occupied,$pair):void{
        if($a===$b||$ab===''||$ba==='')return;
        $k=$pair($a,$b);if(isset($occupied[$k])||isset($conflicts[$k]))return;
        if(strcmp($a,$b)>0){[$a,$b]=[$b,$a];[$ab,$ba]=[$ba,$ab];}
        if(isset($candidates[$k])&&($candidates[$k]['ab']!==$ab||$candidates[$k]['ba']!==$ba)){
            unset($candidates[$k]);$conflicts[$k]=true;return;
        }
        $candidates[$k]=['a'=>$a,'b'=>$b,'ab'=>$ab,'ba'=>$ba,'evidence'=>$why];
    };
    foreach($explicit as [$a,$b,$role]){
        $reverse=match($role){
            'mother','father'=>$genderRole($b,'son','daughter'),
            'son','daughter'=>$genderRole($b,'father','mother'),
            'husband'=>'wife','wife'=>'husband',
            'brother','sister'=>$genderRole($b,'brother','sister'),
            'grandfather','grandmother'=>$genderRole($b,'grandson','granddaughter'),
            'grandson','granddaughter'=>$genderRole($b,'grandfather','grandmother'),
            'uncle','aunt'=>$genderRole($b,'nephew','niece'),
            'nephew','niece'=>$genderRole($b,'uncle','aunt'),
            'male_cousin','female_cousin'=>$genderRole($b,'male_cousin','female_cousin'),
            default=>''
        };
        if($reverse!==''&&$knownSex($b)!==''&&relSex($reverse)!==$knownSex($b))continue;
        $add($a,$b,$role,$reverse,'explicit_structured_relationship');
    }
    $children=[];
    foreach($parents as $child=>$ps)foreach(array_keys($ps) as $parent)$children[$parent][$child]=true;
    // One documented shared parent establishes siblinghood (not necessarily full siblings).
    foreach($children as $parent=>$cs){
        $ids=array_keys($cs);
        for($i=0;$i<count($ids);$i++)for($j=$i+1;$j<count($ids);$j++){
            $a=$ids[$i];$b=$ids[$j];$siblings[$a][$b]=true;$siblings[$b][$a]=true;
            $add($a,$b,$genderRole($a,'brother','sister'),$genderRole($b,'brother','sister'),'shared_documented_parent');
        }
    }
    foreach($parents as $child=>$ps)foreach(array_keys($ps) as $parent){
        foreach(array_keys($parents[$parent]??[]) as $grandparent)
            $add($grandparent,$child,$genderRole($grandparent,'grandfather','grandmother'),$genderRole($child,'grandson','granddaughter'),'two_documented_parent_edges');
        foreach(array_keys($siblings[$parent]??[]) as $sibling){
            $add($sibling,$child,$genderRole($sibling,'uncle','aunt'),$genderRole($child,'nephew','niece'),'documented_parent_and_sibling');
            foreach(array_keys($children[$sibling]??[]) as $cousin){
                // With a shared parent, the pair is siblings, never cousins.
                if(array_intersect_key($parents[$child]??[],$parents[$cousin]??[]))continue;
                $add($cousin,$child,$genderRole($cousin,'male_cousin','female_cousin'),$genderRole($child,'male_cousin','female_cousin'),'documented_sibling_parents');
            }
        }
    }
    return array_values($candidates);
}

function testGuestRelationshipInference(): void {
    $people=[];foreach(['g','p','q','c','d','x'] as $id)$people[]=['id'=>$id,'display_name'=>$id,'first_name'=>$id,'side'=>'groom','relationship'=>''];
    $links=[];
    foreach([['g','p','Отец','Сын'],['g','q','Отец','Дочь'],['p','c','Отец','Сын'],['q','d','Мать','Дочь']] as [$a,$b,$ab,$ba])
        $links[]=['guest_id_1'=>$a,'guest_id_2'=>$b,'relation_1_to_2'=>$ab,'relation_2_to_1'=>$ba];
    $out=inferGuestRelationships($people,$links);$pairs=[];
    foreach($out as $e)$pairs[$e['a'].'|'.$e['b']]=[$e['ab'],$e['ba']];
    if(($pairs['p|q']??null)!==['brother','sister']||($pairs['c|g']??null)!==['grandson','grandfather']||($pairs['c|d']??null)!==['male_cousin','female_cousin']||isset($pairs['g|p']))
        throw new \RuntimeException('Relationship inference regression');
    foreach($out as $e)if($e['a']==='x'||$e['b']==='x')throw new \RuntimeException('Unrelated guest linked');
}
testGuestRelationshipInference();
if(in_array('--test',$argv,true)){echo "GUEST_RELATION_INFERENCE_TEST_OK\n";exit;}
$db=db();
$marker='guest_relationship_backfill_20261125_v1';
$people=all($db,"SELECT id,display_name,first_name,side,relationship FROM guests WHERE status!='archived'");
$links=all($db,'SELECT id,guest_id_1,guest_id_2,relation_1_to_2,relation_2_to_1 FROM guest_relationships');
$before=count($links);$added=0;
$db->beginTransaction();
try{
    if(!one($db,'SELECT key FROM event_settings WHERE key=?',[$marker])){
        foreach(inferGuestRelationships($people,$links) as $e){
            $id=uuid();
            statement($db,'INSERT INTO guest_relationships(id,guest_id_1,guest_id_2,relation_1_to_2,relation_2_to_1,relation_type,source_json) VALUES(?,?,?,?,?,?,?)',
                [$id,$e['a'],$e['b'],relLabel($e['ab']),relLabel($e['ba']),'family',json_encode(['generated_by'=>$marker,'evidence'=>$e['evidence']],JSON_THROW_ON_ERROR)]);
            audit($db,'system',$marker,'create','guest_relationship',$id,['evidence'=>$e['evidence']]);
            $added++;
        }
        statement($db,'INSERT INTO event_settings(key,value_json) VALUES(?,?)',[$marker,json_encode(['added'=>$added],JSON_THROW_ON_ERROR)]);
    }
    $db->commit();
}catch(\Throwable $e){$db->rollBack();throw $e;}
$stats=one($db,"SELECT COUNT(*) total,SUM(CASE WHEN EXISTS(SELECT 1 FROM guest_relationships r JOIN guests other ON other.id=CASE WHEN r.guest_id_1=g.id THEN r.guest_id_2 ELSE r.guest_id_1 END WHERE (r.guest_id_1=g.id OR r.guest_id_2=g.id) AND other.status!='archived') THEN 1 ELSE 0 END) linked FROM guests g WHERE g.status!='archived'");
$after=(int)$db->query('SELECT COUNT(*) FROM guest_relationships')->fetchColumn();
if($after!==$before+$added)throw new \RuntimeException('Relationship count mismatch');
echo "GUEST_RELATION_BACKFILL_OK before=$before added=$added after=$after linked=".$stats['linked']." active=".$stats['total']."\n";
