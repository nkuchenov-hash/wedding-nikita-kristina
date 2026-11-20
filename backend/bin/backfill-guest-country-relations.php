<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}

/*
 * Add geographic countries only where a location is evidenced by the existing
 * database. Name, ethnicity, language and citizenship are never inferred.
 * Do not replace any field an organiser has filled manually.
 */
function residenceGeo(string $input): array {
    $ru=[
        'россия','рф','санкт-петербург','санкт-петербурге','петербург','петербурге','спб','питер',
        'москва','москве','подмосковье','московская область','ленинградская область',
        'архангельск','архангельске','северодвинск','северодвинске',
        'сочи','сыктывкар','сыктывкаре','емва','емве','ижевск','ижевске','коми',
        'ухта','воркута','мурманск','мурманске','пермь','перми','киров',
        'калининград','грозный','чечня','казань','краснодар','новосибирск',
        'екатеринбург','уфа','самара','тюмень','красноярск','владивосток',
        'хабаровск','ростов-на-дону','тверь','ярославль','псков','петрозаводск'
    ];
    $sets=[
        'Россия'=>$ru,
        'Германия'=>['германия','берлин','берлине','мюнхен','мюнхене','гамбург','шварцвальд'],
        'Австрия'=>['австрия','вена','вене'],
        'Болгария'=>['болгария','софия','софии'],
        'Ирландия'=>['ирландия','дублин','дублине'],
        'Финляндия'=>['финляндия','хельсинки'],
        'Швейцария'=>['швейцария','цюрих'],
        'Турция'=>['турция','мерсин','стамбул','анталья'],
        'ОАЭ'=>['оаэ','дубай','абу-даби'],
        'Ливан'=>['ливан','бейрут'],
        'Сирия'=>['сирия','дамаск'],
        'Франция'=>['франция','париж','париже'],
        'Румыния'=>['румыния','бухарест'],
        'Сербия'=>['сербия','белград'],
        'Кыргызстан'=>['кыргызстан','бишкек'],
        'Канада'=>['канада','торонто','монреаль'],
        'Украина'=>['украина','киев','київ'],
        'Беларусь'=>['беларусь','минск'],
        'США'=>['сша','нью-йорк'],
        'Великобритания'=>['великобритания','лондон','лондоне'],
        'Кипр'=>['кипр','лимасол'],
        'Индия'=>['индия','дели','мумбаи']
    ];
    $raw=mb_strtolower(trim($input));
    if($raw==='')return [];
    $raw=preg_replace('/\b(?:город|гор\.|г\.)\s*/u','',$raw);
    $segments=preg_split('/[,;\/()]+/u',$raw)?:[];
    $matches=[];
    foreach($segments as $segment){
        $segment=trim($segment," \t\n\r\0\x0B.!");
        foreach($sets as $country=>$names){
            if(in_array($segment,$names,true))$matches[$country]=true;
        }
    }
    // Ambiguous or multi-country residence data require manual verification.
    return count($matches)===1?['country'=>(string)array_key_first($matches)]:[];
}
function countryFromBio(string $text,string $type): array {
    $pattern=$type==='birth'
        ?'/\b(?:родился|родилась)\s+(?:в|во)\s+([\p{L}-]+(?:\s+[\p{L}-]+){0,2})/iu'
        :'/\b(?:жив[её]т|живут|проживает|проживают)\b[^.?!\n]{0,85}?\b(?:в|во)\s+([\p{L}-]+(?:\s+[\p{L}-]+){0,2})/iu';
    if(!preg_match($pattern,$text,$m))return [];
    $parts=preg_split('/\s+/u',trim($m[1]))?:[];
    for($length=min(3,count($parts));$length>=1;$length--){
        $place=implode(' ',array_slice($parts,0,$length));
        $match=residenceGeo($place);
        if($match)return ['country'=>$match['country'],'city'=>$place];
    }
    return [];
}

$db=db();
$records=all($db,'SELECT id,city,country,origin_place,origin_country,birth_city,birth_country,about,age_group FROM guests');
$changed=0;$fromBio=0;$fromLocation=0;$fromRelations=0;
$db->beginTransaction();
try {
    foreach($records as $row){
        $changes=[];$reason=[];
        if(trim((string)$row['country'])===''){
            $place=residenceGeo((string)$row['city']);
            if($place){
                $changes['country']=$place['country'];$reason[]='residence_city';$fromLocation++;
            }else{
                $bio=countryFromBio((string)$row['about'],'residence');
                if($bio){
                    $changes['country']=$bio['country'];$reason[]='explicit_residence_in_biography';$fromBio++;
                    if(trim((string)$row['city'])==='')$changes['city']=$bio['city'];
                }
            }
        }
        if(trim((string)$row['origin_country'])===''&&trim((string)$row['origin_place'])!==''){
            $origin=residenceGeo((string)$row['origin_place']);
            if($origin){$changes['origin_country']=$origin['country'];$reason[]='origin_place';}
        }
        if(trim((string)$row['birth_city'])===''&&trim((string)$row['about'])!==''){
            $birth=countryFromBio((string)$row['about'],'birth');
            if($birth){
                $changes['birth_city']=$birth['city'];
                if(trim((string)$row['birth_country'])==='')$changes['birth_country']=$birth['country'];
                $reason[]='explicit_birthplace_in_biography';
            }
        }elseif(trim((string)$row['birth_country'])===''&&trim((string)$row['birth_city'])!==''){
            $birth=residenceGeo((string)$row['birth_city']);
            if($birth){$changes['birth_country']=$birth['country'];$reason[]='birth_city';}
        }
        if(!$changes)continue;
        $sql=[];$values=[];
        foreach($changes as $key=>$value){$sql[]=$key.'=?';$values[]=$value;}
        $values[]=$row['id'];
        statement($db,'UPDATE guests SET '.implode(',',$sql).",updated_at=datetime('now') WHERE id=?",$values);
        audit($db,'system','guest-country-backfill','update','guest',(string)$row['id'],
            ['fields'=>array_keys($changes),'evidence'=>$reason]);
        $changed++;
    }

    $current=all($db,'SELECT id,country,age_group,about FROM guests');
    $byId=[];foreach($current as $row)$byId[(string)$row['id']]=$row;
    $links=all($db,'SELECT guest_id_1,guest_id_2,relation_1_to_2,relation_2_to_1 FROM guest_relationships');
    $parents=[];$partners=[];
    foreach($links as $link){
        $sides=[
            [(string)$link['guest_id_1'],(string)$link['guest_id_2'],(string)$link['relation_1_to_2']],
            [(string)$link['guest_id_2'],(string)$link['guest_id_1'],(string)$link['relation_2_to_1']]
        ];
        foreach($sides as [$from,$to,$label]){
            if(preg_match('/(?:^|\s)(?:мама|папа|мать|отец|родитель|mother|father)(?:$|\s)/iu',trim($label)))
                $parents[$to][$from]=true;
            if(preg_match('/(?:^|\s)(?:муж|жена|супруг|супруга|husband|wife)(?:$|\s)/iu',trim($label)))
                $partners[$from][$to]=true;
        }
    }
    foreach($current as $person){
        $id=(string)$person['id'];
        if(trim((string)$person['country'])!=='')continue;
        $nation='';$evidence='';
        if(in_array($person['age_group'],['child','infant'],true)){
            $known=[];
            foreach(array_keys($parents[$id]??[]) as $parentId){
                $parent=$byId[$parentId]??null;
                if($parent&&trim((string)$parent['country'])!=='')
                    $known[$parentId]=trim((string)$parent['country']);
            }
            if(count($known)>=2&&count(array_unique(array_values($known)))===1){
                $nation=(string)reset($known);
                $evidence='two_independent_parent_residences';
            }
        }
        // A relationship alone is NOT a shared household. Require the
        // biography to explicitly say that the person lives with the spouse.
        if($nation===''&&preg_match('/жив[её]т\s+с\s+(?:мужем|женой|супругом|супругой)/iu',(string)$person['about'])){
            $countries=[];
            foreach(array_keys($partners[$id]??[]) as $partnerId){
                $partner=$byId[$partnerId]??null;
                if($partner&&trim((string)$partner['country'])!=='')
                    $countries[$partnerId]=trim((string)$partner['country']);
            }
            if(count($countries)===1){$nation=(string)reset($countries);$evidence='explicit_cohabitation_with_partner';}
        }
        if($nation==='')continue;
        statement($db,"UPDATE guests SET country=?,updated_at=datetime('now') WHERE id=? AND trim(country)=''",[$nation,$id]);
        audit($db,'system','guest-country-backfill','update','guest',$id,
            ['fields'=>['country'],'evidence'=>$evidence]);
        $fromRelations++;$changed++;
    }
    $db->commit();
}catch(\Throwable $exception){$db->rollBack();throw $exception;}
$stats=one($db,"SELECT COUNT(*) total, SUM(CASE WHEN trim(country)<>'' THEN 1 ELSE 0 END) known FROM guests");
echo 'GUEST_COUNTRY_BACKFILL_OK updated='.$changed.' from_city='.$fromLocation.
    ' from_bio='.$fromBio.' from_relations='.$fromRelations.
    ' known='.$stats['known'].' total='.$stats['total']."\n";
