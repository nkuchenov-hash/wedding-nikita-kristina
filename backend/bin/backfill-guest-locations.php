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
$guests=all($db,'SELECT id,city,country,birth_city,birth_country,about FROM guests');
$updates=0;$countryUpdates=0;$birthUpdates=0;$cityCleared=0;$unresolved=0;
$db->beginTransaction();
try{
 foreach($guests as $g){
    $id=(string)$g['id'];
    $city=trim((string)$g['city']);
    $country=trim((string)$g['country']);
    $birthCity=trim((string)$g['birth_city']);
    $birthCountry=trim((string)$g['birth_country']);
    $changes=[];
    if($country===''&&isset($map[$city])){
       $country=$map[$city];$changes['country']=$country;$countryUpdates++;
    }
    // Legacy city entries containing *only a country* must not be presented as cities.
    if(isset($countryOnly[$city])&&$country===$city){
        $city='';$changes['city']=$city;$cityCleared++;
    }
    if($birthCity===''
       &&preg_match('/(?:родился|родилась)\\s+в\\s+(Москве|Северодвинске)/iu',(string)$g['about'],$m)){
       $match=mb_strtolower($m[1]);
       foreach($birthCityNames as $case=>$name){
         if(mb_strtolower($case)===$match){
           $birthCity=$name;$changes['birth_city']=$name;$birthUpdates++;break;
         }
       }
    }
    if($birthCountry===''&&in_array($birthCity,['Москва','Северодвинск'],true))
       $changes['birth_country']='Россия';
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
}catch(\\Throwable $error){$db->rollBack();throw $error;}
$counts=one($db,"SELECT COUNT(*) total,
 SUM(CASE WHEN trim(country)!='' THEN 1 ELSE 0 END) known_countries,
 SUM(CASE WHEN trim(city)!='' THEN 1 ELSE 0 END) known_cities,
 SUM(CASE WHEN trim(birth_city)!='' THEN 1 ELSE 0 END) known_birth_cities
 FROM guests");
echo "GUEST_LOCATIONS_BACKFILL_OK updated=$updates countries=".$counts['known_countries'].
 " cities=".$counts['known_cities']." births=".$counts['known_birth_cities'].
 " unknown_countries=$unresolved moved_country_only=$cityCleared\n";
