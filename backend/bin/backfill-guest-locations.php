<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/../src/core.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}
$db=db();
$map=[
 'Сочи'=>'Россия','Санкт-Петербург'=>'Россия','Архангельск'=>'Россия',
 'Северодвинск'=>'Россия','Москва'=>'Россия','Подмосковье'=>'Россия',
 'Калининград'=>'Россия','Грозный'=>'Россия',
 'Дубай'=>'ОАЭ','Мерсин'=>'Турция','Бейрут'=>'Ливан',
 'Вена'=>'Австрия','Мюнхен'=>'Германия','Шварцвальд'=>'Германия',
 'Дублин'=>'Ирландия','София'=>'Болгария',
 'Ирландия'=>'Ирландия','Финляндия'=>'Финляндия',
 'Швейцария'=>'Швейцария','Германия'=>'Германия',
 'Австрия'=>'Австрия','Кипр'=>'Кипр'
];
$countryOnly=['Ирландия'=>1,'Финляндия'=>1,'Швейцария'=>1,
 'Германия'=>1,'Австрия'=>1,'Кипр'=>1];
$birthCityNames=['Москве'=>'Москва','Северодвинске'=>'Северодвинск'];

/* Hometown and nationality explicitly supplied by the organizer.
   Hometown is tracked separately from place of residence; for the wedding
   planning list we also use it as a *provisional* birthplace when unknown. */
$origins=[
 'P020'=>['Архангельск','Россия'],
 'P023'=>['Северодвинск','Россия'],
 'P025'=>['Северодвинск','Россия'],
 'P030'=>['Северодвинск','Россия'],
 'P033'=>['Северодвинск','Россия'],
 'P048'=>['Москва','Россия'],
 'P049'=>['Москва','Россия'],
 'P050'=>['','Болгария'],
 'P051'=>['','Австрия'],
 'P054'=>['','Канада'],
 'P056'=>['','Германия'],
 'P058'=>['','Германия'],
 'P060'=>['','Румыния'],
 'P061'=>['','Франция'],
 'P063'=>['София','Болгария'],
 'P065'=>['Москва','Россия'],
 'P066'=>['Мурманск','Россия'],
 'P067'=>['Шварцвальд','Германия'],
 'P068'=>['','Украина'],
 'P102'=>['Северодвинск','Россия'],
 'P105'=>['Северодвинск','Россия'],
 'P109'=>['Северодвинск','Россия'],
 'P110'=>['Северодвинск','Россия'],
 'P111'=>['Северодвинск','Россия'],
 'P113'=>['Северодвинск','Россия'],
 'P114'=>['Северодвинск','Россия'],
 'P115'=>['Санкт-Петербург','Россия'],
 'P118'=>['','Кыргызстан'],
 'P119'=>['','Сербия'],
 'P121'=>['Мерсин','Турция'],
 'P122'=>['','Турция / Палестина'],
 'P124'=>['Пермь','Россия'],
 'P125'=>['Чечня','Россия'],
 'P127'=>['','Ливан'],
 'P128'=>['','Сирия'],
 'P129'=>['Санкт-Петербург','Россия']
];

$guests=all($db,'SELECT g.id,g.city,g.country,g.origin_place,g.origin_country,g.birth_city,g.birth_country,g.about,p.source_person_id
 FROM guests g LEFT JOIN guest_profile_details p ON p.guest_id=g.id');
$updates=0;$countryUpdates=0;$birthUpdates=0;$cityCleared=0;$unresolved=0;
$db->beginTransaction();
try{
 foreach($guests as $g){
    $id=(string)$g['id'];
    $city=trim((string)$g['city']);
    $country=trim((string)$g['country']);
    $birthCity=trim((string)$g['birth_city']);
    $birthCountry=trim((string)$g['birth_country']);
    $originPlace=trim((string)$g['origin_place']);
    $originCountry=trim((string)$g['origin_country']);
    $sourceId=trim((string)($g['source_person_id']??''));
    $changes=[];
    // Never overwrite a city/country already edited through the site.
    if(isset($origins[$sourceId])){
       [$from,$originNation]=$origins[$sourceId];
       if(!$originPlace && $from!==''){$originPlace=$from;$changes['origin_place']=$from;}
       if(!$originCountry && $originNation!==''){$originCountry=$originNation;$changes['origin_country']=$originNation;}
    }
    // Location that was explicitly provided by the organizer, not nationality.
    if($sourceId==='P117'&&$country===''){
       $country='Индия';$changes['country']=$country;
    }

    if($country===''&&isset($map[$city])){
       $country=$map[$city];$changes['country']=$country;$countryUpdates++;
    }
    // Legacy city entries containing *only a country* must not be presented as cities.
    if(isset($countryOnly[$city])&&$country===$city){
        $city='';$changes['city']=$city;$cityCleared++;
    }
    if($birthCity===''
       &&preg_match('/(?:родился|родилась)\s+в\s+(Москве|Северодвинске)/iu',(string)$g['about'],$m)){
       $match=mb_strtolower($m[1]);
       foreach($birthCityNames as $case=>$name){
         if(mb_strtolower($case)===$match){
           $birthCity=$name;$changes['birth_city']=$name;$birthUpdates++;break;
         }
       }
    }
    if($birthCountry===''&&in_array($birthCity,['Москва','Северодвинск'],true)){
       $birthCountry='Россия';$changes['birth_country']='Россия';
    }
    // User asked to count hometown as provisional birthplace if no exact birth record exists.
    if($birthCity===''&&$originPlace!==''){
       $birthCity=$originPlace;
       $changes['birth_city']=$originPlace;
    }
    if($birthCountry===''&&$originCountry!==''&&!str_contains($originCountry,'/')){
       $birthCountry=$originCountry;
       $changes['birth_country']=$originCountry;
    }
    if($country==='')$unresolved++;
    if(!$changes)continue;
    $parts=[];$params=[];
    foreach($changes as $key=>$value){$parts[]=$key.'=?';$params[]=$value;}
    $params[]=$id;
    statement($db,'UPDATE guests SET '.implode(',',$parts).",updated_at=datetime('now') WHERE id=?",$params);
    audit($db,'system','guest-location-backfill','update','guest',$id,['fields'=>array_keys($changes)]);
    $updates++;
 }
 $db->commit();
}catch(\Throwable $error){$db->rollBack();throw $error;}
$counts=one($db,"SELECT COUNT(*) total,
 SUM(CASE WHEN trim(country)!='' THEN 1 ELSE 0 END) known_countries,
 SUM(CASE WHEN trim(city)!='' THEN 1 ELSE 0 END) known_cities,
 SUM(CASE WHEN trim(birth_city)!='' THEN 1 ELSE 0 END) known_birth_cities
 FROM guests");
echo "GUEST_LOCATIONS_BACKFILL_OK updated=$updates countries=".$counts['known_countries'].
 " cities=".$counts['known_cities']." births=".$counts['known_birth_cities'].
 " unknown_countries=$unresolved moved_country_only=$cityCleared\n";
