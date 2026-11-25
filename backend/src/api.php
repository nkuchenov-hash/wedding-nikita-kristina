<?php
declare(strict_types=1);
namespace Wedding;
require_once __DIR__.'/core.php';

use PDO;
use Throwable;
use RuntimeException;

function handle(): never {
    try {
        $route=trim((string)($_GET['r']??''),'/');
        if (!preg_match('/^[a-z0-9_\\/.-]{1,80}$/',$route)) fail(404,'not_found','Неизвестный адрес');
        if ($route==='health') {
            $cfg=null;
            try { $cfg=config(); } catch(Throwable $ignored) {}
            json(['ok'=>true,'service'=>'wedding-api','configured'=>$cfg!==null,'accepting_private_data'=>(bool)($cfg['enabled']??false)]);
        }
        if (!secureTransport()) fail(503,'https_required','Защищённое соединение ещё не настроено');
        $cfg=config();
        if (($cfg['enabled']??false)!==true) fail(503,'not_ready','Анкеты и авторизация ещё не включены');
        requireSafeOrigin();
        sessionStart();
        $method=(string)($_SERVER['REQUEST_METHOD']??'GET');
        $db=db();
        $mutating=in_array($method,['POST','PUT','PATCH','DELETE'],true);
        if ($mutating && !in_array($route,['auth/admin','auth/invite'],true)) csrf();

        if ($route==='auth/session' && $method==='GET') {
            $role=isset($_SESSION['admin_id'])?'admin':(isset($_SESSION['guest_id'])?'guest':'anonymous');
            json(['ok'=>true,'role'=>$role,'csrf'=>$_SESSION['csrf']]);
        }
        if ($route==='auth/admin' && $method==='POST') {
            throttle($db,'admin:'.requestIp(),8,900);
            $data=payload(4096); $login=strval($data,'login',100,true);
            $password=strval($data,'password',400,true);
            $user=one($db,'SELECT id,password_hash,disabled FROM admins WHERE login=?',[$login]);
            if (!$user || (int)$user['disabled']!==0 || !password_verify($password,$user['password_hash']))
                fail(401,'invalid_credentials','Неверный логин или пароль');
            session_regenerate_id(true);
            $_SESSION=['admin_id'=>$user['id'],'csrf'=>bin2hex(random_bytes(24)),'last_active'=>time()];
            statement($db,"UPDATE admins SET last_login_at=datetime('now') WHERE id=?",[$user['id']]);
            audit($db,'admin',$user['id'],'login','admin',$user['id']);
            json(['ok'=>true,'role'=>'admin','csrf'=>$_SESSION['csrf']]);
        }
        if ($route==='auth/invite' && $method==='POST') {
            throttle($db,'invite:'.requestIp(),12,900);
            $d=payload(4096);
            $token=strval($d,'token',140,true);
            if (!preg_match('/^[a-f0-9]{64}$/i',$token)) fail(401,'invalid_invite','Приглашение не найдено');
            $hash=tokenHash(strtolower($token),$cfg);
            $invite=one($db,"SELECT i.id,i.guest_id FROM invitations i
               JOIN guests g ON g.id=i.guest_id
               WHERE i.token_hash=? AND i.revoked_at IS NULL
                 AND (i.expires_at IS NULL OR i.expires_at>datetime('now'))
                 AND g.status!='archived' AND g.planning_status='main'",[$hash]);
            if (!$invite) fail(401,'invalid_invite','Приглашение недействительно или срок истёк');
            if(!childrenEnabled($db) && one($db,"SELECT id FROM guests WHERE id=? AND age_group IN ('child','infant')",[$invite['guest_id']]))
                fail(403,'children_disabled','Участие детей временно отключено организаторами');
            statement($db,"UPDATE invitations SET used_at=COALESCE(used_at,datetime('now')) WHERE id=?",[$invite['id']]);
            // Opening a link is not a completed registration or a confirmed RSVP.
            statement($db,"INSERT INTO guest_progress(guest_id,first_opened_at,last_opened_at)
              VALUES(?,datetime('now'),datetime('now'))
              ON CONFLICT(guest_id) DO UPDATE SET
                first_opened_at=COALESCE(guest_progress.first_opened_at,excluded.first_opened_at),
                last_opened_at=excluded.last_opened_at,updated_at=datetime('now')",[$invite['guest_id']]);
            session_regenerate_id(true);
            $_SESSION=['guest_id'=>$invite['guest_id'],'csrf'=>bin2hex(random_bytes(24)),'last_active'=>time()];
            audit($db,'guest',$invite['guest_id'],'login','invitation',$invite['id']);
            json(['ok'=>true,'role'=>'guest','csrf'=>$_SESSION['csrf']]);
        }
        if ($route==='auth/logout' && $method==='POST') {
            $_SESSION=[];
            session_regenerate_id(true);
            json(['ok'=>true]);
        }

        if (str_starts_with($route,'admin/')) {
            $actor=requireAdmin($db);
            adminRoute($db,$actor,$route,$method,$cfg);
        }
        if (str_starts_with($route,'guest/') || $route==='media/photo') {
            $actor=isset($_SESSION['admin_id']) ? requireAdmin($db) : requireGuest($db);
            guestRoute($db,$actor,$route,$method);
        }
        fail(404,'not_found','Неизвестный адрес');
    } catch (Throwable $e) {
        error_log('Wedding API failure: '.get_class($e).': '.$e->getMessage());
        fail(500,'server_error','Внутренняя ошибка. Данные не сохранены');
    }
}

function guestLifecycleCounts(PDO $db): array {
    $eligible="g.status!='archived' AND g.planning_status='main'";
    if(!childrenEnabled($db))$eligible.=" AND g.age_group NOT IN ('child','infant')";
    return one($db,"SELECT
          COUNT(*) total,
          COALESCE(SUM(CASE WHEN EXISTS(SELECT 1 FROM invitations i
            WHERE i.guest_id=g.id AND i.revoked_at IS NULL
            AND (i.expires_at IS NULL OR i.expires_at>datetime('now'))) THEN 1 ELSE 0 END),0) prepared,
          COALESCE(SUM(CASE WHEN p.invitation_sent_at IS NOT NULL THEN 1 ELSE 0 END),0) sent,
          COALESCE(SUM(CASE WHEN p.first_opened_at IS NOT NULL THEN 1 ELSE 0 END),0) opened,
          COALESCE(SUM(CASE WHEN p.profile_completed_at IS NOT NULL THEN 1 ELSE 0 END),0) registered,
          COALESCE(SUM(CASE WHEN r.guest_id IS NOT NULL THEN 1 ELSE 0 END),0) responded,
          COALESCE(SUM(CASE WHEN r.attendance='yes' THEN 1 ELSE 0 END),0) attending,
          COALESCE(SUM(CASE WHEN pd.decision LIKE '%вопрос%' THEN 1 ELSE 0 END),0) undecided_invitation,
          COALESCE(SUM(CASE WHEN trim(g.display_name)='' OR lower(trim(g.display_name)) IN ('(имя не указано)','имя не указано','name not provided') THEN 1 ELSE 0 END),0) name_missing,
          COALESCE(SUM(CASE WHEN r.attendance='yes' AND p.profile_completed_at IS NOT NULL THEN 1 ELSE 0 END),0) confirmed,
          COALESCE(SUM(CASE WHEN r.attendance='no' THEN 1 ELSE 0 END),0) declined,
          COALESCE(SUM(CASE WHEN r.attendance='maybe' THEN 1 ELSE 0 END),0) tentative,
          COALESCE(SUM(CASE WHEN r.attendance='yes' AND p.profile_completed_at IS NOT NULL
            AND g.profile_visible=1 AND g.consent_at IS NOT NULL THEN 1 ELSE 0 END),0) public_visible
          FROM guests g
          LEFT JOIN guest_progress p ON p.guest_id=g.id
          LEFT JOIN rsvps r ON r.guest_id=g.id
          LEFT JOIN guest_profile_details pd ON pd.guest_id=g.id
          WHERE ".$eligible);
}

function confirmedGuestDirectory(PDO $db): array {
    return all($db,"SELECT g.id,g.display_name,g.city,g.about FROM guests g
          INNER JOIN rsvps r ON r.guest_id=g.id AND r.attendance='yes'
          INNER JOIN guest_progress p ON p.guest_id=g.id AND p.profile_completed_at IS NOT NULL
          WHERE g.profile_visible=1 AND g.consent_at IS NOT NULL AND g.status='registered'
          AND g.planning_status='main'".(childrenEnabled($db)?'':" AND g.age_group NOT IN ('child','infant')")."
          ORDER BY g.display_name LIMIT 1000");
}

// Generated budget rows are a projection of production records, never an independent estimate.
function syncProductionBudget(PDO $db,string $collection,array $record,?int $guestCount=null): void {
    $id=$record['id'];$d=json_decode($record['details_json']??'{}',true);
    if(!is_array($d))$d=[];
    $active=in_array($record['status'],['selected','ordered','ready'],true);
    $paid=max(0,(int)($d['paid']??0));$amount=0;
    if($collection==='decor_items'){
        $count=($d['unit']??'')==='guest'?($guestCount??(int)guestLifecycleCounts($db)['total']):
            (($d['unit']??'')==='fixed'?1:max(0,(int)($d['quantity']??0)));
        $amount=max(0,(int)($d['unitPrice']??0))*$count+max(0,(int)($d['install']??0))+max(0,(int)($d['delivery']??0));
    }else{
        $hasBreakdown=false;
        foreach(['fee','travel','hotel','food','equipment','extras'] as $k){if(array_key_exists($k,$d))$hasBreakdown=true;$amount+=max(0,(int)($d[$k]??0));}
        if(!$hasBreakdown)$amount=max(0,(int)($record['estimate_rub']??0));
    }
    $included=$collection==='decor_items'&&!empty($d['included']);
    foreach(($d['venues']??[]) as $v){
        if(!is_array($v)||empty($d['venue'])||($v['id']??'')!==$d['venue'])continue;
        if(($v['mode']??'')==='included')$included=true;
        else $amount+=max(0,(int)($v['extra']??0));
        break;
    }
    if($included)$amount=0;
    $amount=max($amount,$paid);
    $budgetId='prod-'.$id;
    if(($active&&(!$included||$paid>0))||$paid>0){
        statement($db,'INSERT INTO budget_lines(id,category,description,planned_rub,committed_rub,paid_rub,vendor_id,notes) VALUES(?,?,?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET category=excluded.category,description=excluded.description,planned_rub=excluded.planned_rub,committed_rub=excluded.committed_rub,paid_rub=excluded.paid_rub,notes=excluded.notes',
          [$budgetId,$collection==='vendors'?'Подрядчики':'Декор',$record['name'],$active?$amount:$paid,$active&&!empty($d['agreed'])?$amount:$paid,$paid,$collection==='vendors'?$id:null,'Автоматически из карточки; неизвестные расходы не включены']);
    }else statement($db,'DELETE FROM budget_lines WHERE id=?',[$budgetId]);
}
function refreshProductionBudget(PDO $db): void {
    $count=(int)guestLifecycleCounts($db)['total'];
    foreach(['vendors','decor_items'] as $c)
        foreach(all($db,"SELECT * FROM $c") as $r)syncProductionBudget($db,$c,$r,$count);
}
function adminCollections(): array {
    return [
      'venues'=>['name','area','address','website','capacity_min','capacity_max','quoted_total_rub','quote_guests','desired_date_status','contact_name','contact_email','contact_phone','quote_source','pros','cons','notes','details_json','photo_refs_json'],
      'vendors'=>['category','name','contact','website','status','estimate_rub','contract_ref','notes','details_json'],
      'decor_items'=>['category','name','status','estimate_rub','notes','details_json'],
      'budget_lines'=>['category','description','planned_rub','committed_rub','paid_rub','due_at','vendor_id','notes'],
      'tasks'=>['title','description','status','priority','owner','due_at'],
      'schedule_items'=>['title','start_at','end_at','place','notes','is_public','sort_order','venue_id','is_confirmed','stage','activity_type','duration_min','gap_before_min','activity_date','tags_json'],
      'menu_options'=>['category','title','description','allergens','active','sort_order'],
      'documents'=>['category','label','reference','visibility'],
    ];
}
function adminRoute(PDO $db,string $actor,string $route,string $method,array $cfg): never {
    if(str_starts_with($route,'admin/gallery')){
        require_once __DIR__.'/gallery.php';
        adminGallery($db,$actor,$route,$method);
    }
    if ($route==='admin/settings' && $method==='GET') {
        $entries=all($db,'SELECT key,value_json,updated_at FROM event_settings ORDER BY key');
        $settings=[];
        foreach($entries as $item)$settings[$item['key']]=json_decode($item['value_json'],true);
        json(['ok'=>true,'settings'=>$settings]);
    }
    if ($route==='admin/settings' && $method==='POST') {
        $d=payload(16384);
        $allowed=['event_date','event_time','event_venue','venue_address','rsvp_deadline',
          'dress_code','transport_info','public_notes','menu_open','directory_open',
          'photos_open','guest_rsvp_open','stories_open','date_confirmed','place_confirmed','children_enabled','guest_table_columns','guest_table_layout','guest_sort_mode','activity_types','activity_tags','program_day_hours','venue_rating_rules','budget_limit_rub','selected_venue_id','venue_table_layout'];
        $key=choice($d,'key',$allowed,'');
        if(!array_key_exists('value',$d))
            fail(422,'field','Значение настройки недопустимо');
        $value=$d['value'];
        if(in_array($key,['activity_types','activity_tags'],true)){
            if(!is_array($value)||!array_is_list($value)||count($value)>30)
                fail(422,'field','Неверный список типов активности');
            $seen=[];
            foreach($value as $type){
                if(!is_array($type)||!isset($type['id'],$type['label'],$type['color'])||
                   !is_string($type['id'])||!preg_match('/^[a-z][a-z0-9_-]{0,31}$/',$type['id'])||
                   !is_string($type['label'])||mb_strlen(trim($type['label']))<1||mb_strlen($type['label'])>60||
                   !is_string($type['color'])||!preg_match('/^#[0-9a-fA-F]{6}$/',$type['color'])||
                   isset($seen[$type['id']]))fail(422,'field','Некорректный тип активности');
                $seen[$type['id']]=true;
            }
        } elseif($key==='venue_rating_rules'){
            $keys=['date','cost','capacity','city','includedEquipment','outdoorArea','entrance'];
            if(!is_array($value)||array_is_list($value)||
               count($value)!==5||
               array_diff(array_keys($value),['weights','alternativeDatePercent',
                 'priceLimits','pricePercents','includeWorkingBudgets'])||
               !isset($value['weights'],$value['alternativeDatePercent'],
                 $value['priceLimits'],$value['pricePercents'],$value['includeWorkingBudgets']))
                fail(422,'field','Некорректные правила рейтинга');
            $weights=$value['weights'];
            if(!is_array($weights)||array_is_list($weights)||count($weights)!==count($keys)||
               array_diff(array_keys($weights),$keys))
                fail(422,'field','Неизвестные критерии рейтинга');
            $sum=0;
            foreach($keys as $k){
                $w=$weights[$k]??null;
                if(!is_int($w)||$w<0||$w>100)fail(422,'field','Неверный вес критерия');
                $sum+=$w;
            }
            if($sum!==100)fail(422,'field','Сумма весов должна составлять 100 баллов');
            $alt=$value['alternativeDatePercent'];
            if(!is_int($alt)||$alt<0||$alt>100)fail(422,'field','Неверный вес альтернативной даты');
            $limits=$value['priceLimits'];$percents=$value['pricePercents'];
            if(!is_array($limits)||!array_is_list($limits)||count($limits)!==4||
               !is_array($percents)||!array_is_list($percents)||count($percents)!==5)
                fail(422,'field','Неверные ценовые диапазоны');
            $last=0;
            foreach($limits as $x){
                if(!is_int($x)||$x<10000||$x>100000000||$x<=$last)
                    fail(422,'field','Ценовые пороги должны возрастать');
                $last=$x;
            }
            $last=100;
            foreach($percents as $x){
                if(!is_int($x)||$x<0||$x>100||$x>$last)
                    fail(422,'field','Доли баллов за бюджет должны не возрастать');
                $last=$x;
            }
            if(!is_bool($value['includeWorkingBudgets']))
                fail(422,'field','Неверная настройка рабочих смет');
        } elseif($key==='venue_table_layout'){
            $min=['name'=>260,'date'=>195,'visit'=>120,'price'=>160,'capacity'=>125,'score'=>120,'archive'=>120];
            if(!is_array($value)||array_is_list($value)||array_diff(array_keys($value),['row_height','truncate','widths'])||
                !isset($value['row_height'],$value['truncate'],$value['widths'])||
                !in_array($value['row_height'],[96,128,160,192,0],true)||!is_bool($value['truncate'])||!is_array($value['widths'])||count($value['widths'])>count($min))
                fail(422,'field','Некорректные параметры таблицы площадок');
            foreach($value['widths'] as $column=>$width)if(!isset($min[$column])||!is_int($width)||$width<$min[$column]||$width>1000)fail(422,'field','Недопустимая ширина столбца');
        } elseif($key==='guest_table_layout'){
            $allowedHeights=[56,72,96,128,0];
            $allowedFields=['display_name','side','community','relation_to_couple','about',
                'about_en','city','country','origin_place','origin_country','planning_status',
                'age_group','decision','attendance','seating_group','phone','email',
                'birth_city','birth_country'];
            if(!is_array($value)||array_is_list($value)||
                array_diff(array_keys($value),['row_height','truncate','widths'])||
                !isset($value['row_height'],$value['truncate'],$value['widths'])||
                !in_array($value['row_height'],$allowedHeights,true)||
                !is_bool($value['truncate'])||!is_array($value['widths'])||
                count($value['widths'])>count($allowedFields))
                fail(422,'field','Некорректные параметры таблицы гостей');
            foreach($value['widths'] as $column=>$width){
                if(!is_string($column)||!in_array($column,$allowedFields,true)||
                    !is_int($width)||$width<100||$width>900)
                    fail(422,'field','Недопустимая ширина столбца');
            }
        } elseif($key==='guest_sort_mode'){
            if(!in_array($value,['alphabetical','connections'],true))
                fail(422,'field','Недопустимый порядок гостей');
        } elseif($key==='guest_table_columns'){
            $columns=['display_name','first_name','last_name','name_en','planning_status','age_group',
                'side','relation_to_couple','relationship','community','seating_group','decision',
                'invitation_sent_at','attendance','adults','children','plus_one_allowed','city','country','origin_place','origin_country','birth_city','birth_country',
                'phone','email','language','about','about_en','private_notes','source_person_id',
                'status','created_at','updated_at','profile_completed_at','first_opened_at',
                'last_opened_at','invite_prepared_at','response_source','dietary_notes','other_notes'];
            if(!is_array($value)||!array_is_list($value)||count($value)>count($columns)||
                count($value)<1||$value[0]!=='display_name'||
                count($value)!==count(array_unique($value)))
                fail(422,'field','Некорректный набор столбцов');
            foreach($value as $column){
                if(!is_string($column)||!in_array($column,$columns,true))
                    fail(422,'field','Недопустимое поле таблицы гостей');
            }
        } elseif($key==='program_day_hours'){
            $days=['2027-06-17','2027-06-18','2027-06-19','2027-06-20','2027-06-21'];
            if(!is_array($value)||array_is_list($value)||count($value)!==count($days)||
               array_diff(array_keys($value),$days)||array_diff($days,array_keys($value)))
                fail(422,'field','Для каждого дня задайте начало и конец отображения');
            foreach($days as $date){
                $hours=$value[$date];
                if(!is_array($hours)||!isset($hours['from'],$hours['to'])||
                   count($hours)!==2||!is_string($hours['from'])||!is_string($hours['to'])||
                   !preg_match('/^([01][0-9]|2[0-3]):[0-5][0-9]$/',$hours['from'])||
                   !preg_match('/^([01][0-9]|2[0-3]):[0-5][0-9]$/',$hours['to']))
                    fail(422,'field','Укажите корректные часы начала и окончания');
                $from=(int)substr($hours['from'],0,2)*60+(int)substr($hours['from'],3,2);
                $to=(int)substr($hours['to'],0,2)*60+(int)substr($hours['to'],3,2);
                if($to-$from<60)
                    fail(422,'field','Диапазон отображения должен составлять не менее часа');
            }
        } elseif(!is_scalar($value) && $value!==null)
            fail(422,'field','Значение настройки недопустимо');
        if($key==='selected_venue_id' && $value!==null && (!is_string($value)||!preg_match('/^[a-z0-9-]{2,36}$/',$value)||!one($db,'SELECT venue_id FROM venue_date_status WHERE venue_id=? LIMIT 1',[$value])))fail(422,'field','Неизвестная площадка');
        if($key==='budget_limit_rub' && $value!==null && (!is_int($value)||$value<0||$value>100000000))fail(422,'field','Некорректный лимит бюджета');
        if($key==='children_enabled' && !is_bool($value))fail(422,'field','Участие детей должно быть включено или выключено');
        if(is_string($value)&&mb_strlen($value)>5000)fail(422,'field','Слишком длинное значение');
        $encoded=json_encode($value,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        statement($db,"INSERT INTO event_settings(key,value_json) VALUES(?,?)
          ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=datetime('now')",
          [$key,$encoded]);
        audit($db,'admin',$actor,'update','event_setting',$key);
        json(['ok'=>true,'key'=>$key]);
    }
    if ($route==='admin/companions' && $method==='GET') {
        $id=(string)($_GET['guest_id']??'');
        if(!preg_match('/^[a-f0-9-]{36}$/',$id))fail(422,'guest_id','Не указан гость');
        json(['ok'=>true,'companions'=>all($db,'SELECT * FROM guest_companions WHERE guest_id=? ORDER BY created_at',[$id])]);
    }
    if ($route==='admin/companions' && $method==='POST') {
        $d=payload(4096);$guestId=strval($d,'guest_id',40,true);
        if(!one($db,'SELECT id FROM guests WHERE id=?',[$guestId]))fail(404,'guest','Гость не найден');
        $id=uuid();$name=strval($d,'display_name',255,true);
        $age=choice($d,'age_group',['adult','child','infant'],'adult');
        statement($db,'INSERT INTO guest_companions(id,guest_id,display_name,age_group) VALUES(?,?,?,?)',
          [$id,$guestId,$name,$age]);
        audit($db,'admin',$actor,'create','companion',$id,['guest_id'=>$guestId]);
        json(['ok'=>true,'id'=>$id],201);
    }
    // A companion belongs to exactly one invitation group. Delete never affects a guest record.
    if ($route==='admin/companions' && $method==='DELETE') {
        $d=payload(2048);$id=strval($d,'id',40,true);$guestId=strval($d,'guest_id',40,true);
        if(!one($db,'SELECT id FROM guest_companions WHERE id=? AND guest_id=?',[$id,$guestId]))
            fail(404,'companion','Сопровождающий не найден');
        statement($db,'DELETE FROM guest_companions WHERE id=? AND guest_id=?',[$id,$guestId]);
        audit($db,'admin',$actor,'delete','companion',$id,['guest_id'=>$guestId]);
        json(['ok'=>true]);
    }
    // Organiser-editable relationships are linked by stable guest IDs, never by names.
    if ($route==='admin/guest/connections' && $method==='POST') {
        $d=payload(4096);
        $a=strval($d,'guest_id',40,true);$b=strval($d,'other_guest_id',40,true);
        if($a===$b)fail(422,'relation','Нельзя связать человека с самим собой');
        foreach([$a,$b] as $id)if(!one($db,"SELECT id FROM guests WHERE id=? AND status!='archived'",[$id]))
            fail(404,'guest','Гость не найден');
        $before=one($db,'SELECT id FROM guest_relationships WHERE (guest_id_1=? AND guest_id_2=?) OR (guest_id_1=? AND guest_id_2=?)',[$a,$b,$b,$a]);
        if($before)fail(409,'relation_exists','Эта связь уже есть. Измените существующую.');
        $forward=strval($d,'relation_to_other',120,true);
        $reverse=strval($d,'other_relation_to_guest',120);
        $type=choice($d,'relation_type',['family','couple','friend','other'],'other');
        $id=uuid();
        statement($db,'INSERT INTO guest_relationships(id,guest_id_1,guest_id_2,relation_1_to_2,relation_2_to_1,relation_type,source_json) VALUES(?,?,?,?,?,?,?)',
          [$id,$a,$b,$forward,$reverse,$type,'{}']);
        audit($db,'admin',$actor,'create','guest_relationship',$id,['guest_id'=>$a,'other_guest_id'=>$b]);
        json(['ok'=>true,'id'=>$id],201);
    }
    if ($route==='admin/guest/connections' && $method==='PATCH') {
        $d=payload(4096);$id=strval($d,'id',40,true);
        if(!one($db,'SELECT id FROM guest_relationships WHERE id=?',[$id]))
            fail(404,'relation','Связь не найдена');
        $forward=strval($d,'relation_1_to_2',120,true);
        $reverse=strval($d,'relation_2_to_1',120);
        statement($db,'UPDATE guest_relationships SET relation_1_to_2=?,relation_2_to_1=? WHERE id=?',[$forward,$reverse,$id]);
        audit($db,'admin',$actor,'update','guest_relationship',$id);
        json(['ok'=>true]);
    }
    if ($route==='admin/guest/connections' && $method==='DELETE') {
        $d=payload(2048);$id=strval($d,'id',40,true);
        if(!one($db,'SELECT id FROM guest_relationships WHERE id=?',[$id]))
            fail(404,'relation','Связь не найдена');
        statement($db,'DELETE FROM guest_relationships WHERE id=?',[$id]);
        audit($db,'admin',$actor,'delete','guest_relationship',$id);
        json(['ok'=>true]);
    }
    // Small, atomic, authenticated changes; no site build and no rewrite of venue JSON.
    if($route==='admin/venue-dates' && $method==='GET'){
        $rows=all($db,'SELECT venue_id,day,status,updated_at
            FROM venue_date_status ORDER BY venue_id,day LIMIT 1000');
        json(['ok'=>true,'dates'=>$rows]);
    }
    if($route==='admin/venue-dates' && $method==='PATCH'){
        $d=payload(1024);
        $id=strval($d,'venue_id',40,true);
        if(!preg_match('/^[a-z0-9-]{2,36}$/',$id))
            fail(422,'venue_id','Некорректная площадка');
        $day=choice($d,'day',['2027-06-18','2027-06-19','2027-06-20'],'');
        $status=choice($d,'status',['unknown','pending','available','unavailable'],'');
        $existing=one($db,'SELECT status FROM venue_date_status WHERE venue_id=? AND day=?',[$id,$day]);
        if(!$existing)fail(404,'venue_day','Дата площадки не найдена в базе');
        statement($db,"UPDATE venue_date_status SET status=?,updated_at=datetime('now')
           WHERE venue_id=? AND day=?",[$status,$id,$day]);
        audit($db,'admin',$actor,'update','venue_date_status',$id,['day'=>$day,'previous'=>$existing['status'],'status'=>$status]);
        json(['ok'=>true,'venue_id'=>$id,'day'=>$day,'status'=>$status]);
    }
    if($route==='admin/venue-files' && $method==='GET'){
        $venue=(string)($_GET['venue_id']??'');
        if($venue!==''&&!preg_match('/^[a-z0-9-]{2,36}$/',$venue))
            fail(422,'venue_id','Некорректная площадка');
        if($venue===''){
            $rows=all($db,"SELECT id,venue_id,title,mime,source_url,type FROM venue_files
                ORDER BY CASE type WHEN 'document' THEN 0 WHEN 'video' THEN 1 ELSE 2 END, venue_id,title LIMIT 500");
        }else{
            $rows=all($db,"SELECT id,venue_id,title,mime,source_url,type FROM venue_files
                WHERE venue_id=? ORDER BY type,title LIMIT 200",[$venue]);
        }
        json(['ok'=>true,'files'=>$rows]);
    }
    if ($route==='admin/overview' && $method==='GET') {
        $guest=guestLifecycleCounts($db);
        $guest['reserved']=(int)$db->query("SELECT COUNT(*) FROM guests WHERE status!='archived' AND planning_status='reserve'")->fetchColumn();
        $guest['children_total']=(int)$db->query("SELECT COUNT(*) FROM guests WHERE status!='archived' AND age_group IN ('child','infant')")->fetchColumn();
        $guest['children_enabled']=childrenEnabled($db);
        $guest['confirmed_adults']=(int)$db->query("SELECT COALESCE(SUM(r.adults),0) FROM rsvps r JOIN guests g ON g.id=r.guest_id WHERE r.attendance='yes' AND g.status!='archived' AND g.planning_status='main' AND g.age_group NOT IN ('child','infant')")->fetchColumn();
        $guest['confirmed_children']=childrenEnabled($db) ? (int)$db->query("SELECT COALESCE(SUM(CASE WHEN g.age_group IN ('child','infant') THEN 1 ELSE r.children END),0) FROM rsvps r JOIN guests g ON g.id=r.guest_id WHERE r.attendance='yes' AND g.status!='archived' AND g.planning_status='main'")->fetchColumn() : 0;
        $rsvps=all($db,'SELECT attendance,COUNT(*) AS total FROM rsvps GROUP BY attendance');
        $pendingPhotos=one($db,"SELECT COUNT(*) AS n FROM photos WHERE status='pending'");
        $pendingStories=one($db,"SELECT COUNT(*) AS n FROM stories WHERE status='pending'");
        refreshProductionBudget($db);
        $budget=one($db,'SELECT COALESCE(SUM(planned_rub),0) planned,COALESCE(SUM(committed_rub),0) committed,COALESCE(SUM(paid_rub),0) paid FROM budget_lines');
        $tasks=one($db,"SELECT COUNT(*) total,SUM(CASE WHEN status!='done' THEN 1 ELSE 0 END) open FROM tasks");
        $activity=all($db,"SELECT a.action,a.entity_type,a.actor_type,a.created_at,
          g.display_name AS guest_name
          FROM audit_log a
          LEFT JOIN guests g ON g.id=CASE WHEN a.actor_type='guest' THEN a.actor_id
            WHEN a.entity_type='guest' THEN a.entity_id ELSE NULL END
          WHERE (a.actor_type='guest' AND a.action IN ('login','update','submit'))
            OR (a.actor_type='admin' AND a.action IN ('mark_sent','mark_not_sent'))
          ORDER BY a.id DESC LIMIT 25");
        $dashboardActivity=all($db,"SELECT a.action,a.entity_type,a.entity_id,a.created_at,
          CASE WHEN a.entity_type IN ('guest','guest_profile','rsvp','profile') THEN g.id ELSE NULL END AS guest_id,
          COALESCE(t.title,s.title,g.display_name,v.name) AS entity_label
          FROM audit_log a
          LEFT JOIN tasks t ON a.entity_type='tasks' AND t.id=a.entity_id
          LEFT JOIN schedule_items s ON a.entity_type='schedule_items' AND s.id=a.entity_id
          LEFT JOIN guests g ON a.entity_type IN ('guest','guest_profile','rsvp','profile') AND g.id=a.entity_id
          LEFT JOIN venues v ON a.entity_type='venues' AND v.id=a.entity_id
          WHERE a.action!='login' AND a.entity_type IN ('tasks','schedule_items','guest','guest_profile','rsvp','profile','venues','venue_date_status','event_setting','budget_lines','vendors','decor_items','menu_options','menu','gallery_photo','photo','guest_relationship','companion','invitation')
          ORDER BY a.id DESC LIMIT 50");
        json(['ok'=>true,'dashboard_activity'=>$dashboardActivity,'guests'=>$guest,'rsvp'=>$rsvps,'photos_pending'=>(int)$pendingPhotos['n'],
          'stories_pending'=>(int)$pendingStories['n'],'budget'=>$budget,'tasks'=>$tasks,
          'recent_activity'=>$activity]);
    }
    // Lightweight revision check lets open organiser pages follow other devices
    // without refetching 114 private guest records on every heartbeat.
    if ($route==='admin/guests/revision' && $method==='GET') {
        $revision=(int)$db->query('SELECT COALESCE(MAX(id),0) FROM audit_log')->fetchColumn();
        json(['ok'=>true,'revision'=>$revision]);
    }
    if ($route==='admin/guests/excel' && $method==='GET') {
        require_once __DIR__.'/guest-xlsx-export.php';
        streamLiveGuestXlsx($db);
    }
    if ($route==='admin/guests' && $method==='GET') {
        $items=all($db,"SELECT g.*,r.attendance,r.adults,r.children,r.transport_needed,r.arrival_notes,r.dietary_notes,
            r.other_notes,r.response_source,r.submitted_at,p.source_person_id,p.name_en,p.relation_to_couple,p.seating_group,p.decision,p.base_count,
            t.invitation_sent_at,t.first_opened_at,t.last_opened_at,t.profile_completed_at,
            (SELECT i.id FROM invitations i WHERE i.guest_id=g.id AND i.revoked_at IS NULL
              AND (i.expires_at IS NULL OR i.expires_at>datetime('now'))
              ORDER BY i.created_at DESC LIMIT 1) AS active_invite_id,
            (SELECT i.created_at FROM invitations i WHERE i.guest_id=g.id AND i.revoked_at IS NULL
              AND (i.expires_at IS NULL OR i.expires_at>datetime('now'))
              ORDER BY i.created_at DESC LIMIT 1) AS invite_prepared_at
            FROM guests g LEFT JOIN rsvps r ON r.guest_id=g.id
            LEFT JOIN guest_profile_details p ON p.guest_id=g.id
            LEFT JOIN guest_progress t ON t.guest_id=g.id
            ORDER BY g.display_name LIMIT 1500");
        // Only links between existing records. No private relationship narratives are exposed.
        $links=all($db,"SELECT r.guest_id_1,r.guest_id_2,r.relation_type,
            r.relation_1_to_2,r.relation_2_to_1
            FROM guest_relationships r
            JOIN guests a ON a.id=r.guest_id_1
            JOIN guests b ON b.id=r.guest_id_2
            ORDER BY r.id LIMIT 3000");
        json(['ok'=>true,'guests'=>$items,'relationships'=>$links,'children_enabled'=>childrenEnabled($db),
           'revision'=>(int)$db->query('SELECT COALESCE(MAX(id),0) FROM audit_log')->fetchColumn()]);
    }
    if($route==='admin/guest-profile' && $method==='GET'){
        $id=(string)($_GET['guest_id']??'');
        if(!preg_match('/^[a-f0-9-]{36}$/',$id))fail(422,'guest','Неверный ID гостя');
        $item=one($db,"SELECT g.*,p.source_person_id,p.name_en,p.relation_to_couple,p.seating_group,p.decision,p.base_count,
          p.source_people_json,p.source_invitation_json,p.source_profile_json,p.source_english_json,
          t.invitation_sent_at,t.first_opened_at,t.last_opened_at,t.profile_completed_at,
          (SELECT i.id FROM invitations i WHERE i.guest_id=g.id AND i.revoked_at IS NULL
            AND (i.expires_at IS NULL OR i.expires_at>datetime('now'))
            ORDER BY i.created_at DESC LIMIT 1) AS active_invite_id
          ,r.attendance,r.adults,r.children,r.transport_needed,r.arrival_notes,r.dietary_notes,r.other_notes,r.response_source
          FROM guests g LEFT JOIN guest_profile_details p ON p.guest_id=g.id
          LEFT JOIN guest_progress t ON t.guest_id=g.id
          LEFT JOIN rsvps r ON r.guest_id=g.id WHERE g.id=?",[$id]);
        if(!$item)fail(404,'guest','Гость не найден');
        foreach(['source_people_json','source_invitation_json','source_profile_json','source_english_json'] as $key)
            $item[$key]=json_decode($item[$key]??'{}',true)?:[];
        $relations=all($db,"SELECT r.*,
          (SELECT display_name FROM guests WHERE id=r.guest_id_1) AS person_one,
          (SELECT display_name FROM guests WHERE id=r.guest_id_2) AS person_two
          FROM guest_relationships r WHERE r.guest_id_1=? OR r.guest_id_2=? ORDER BY r.relation_type LIMIT 100",[$id,$id]);
        json(['ok'=>true,'guest'=>$item,'relations'=>$relations]);
    }
    if ($route==='admin/guests' && $method==='POST') {
        $d=payload(8192);
        $first=strval($d,'first_name',120,true);
        $last=strval($d,'last_name',120);
        $name=strval($d,'display_name',255) ?: trim($first.' '.$last);
        $side=choice($d,'side',['bride','groom','both','other'],'other');
        $planning=choice($d,'planning_status',['main','reserve'],'main');
        $age=choice($d,'age_group',['unknown','adult','child','infant'],'unknown');
        $id=uuid();
        statement($db,'INSERT INTO guests(id,first_name,last_name,display_name,side,relationship,city,email,phone,plus_one_allowed,children_count,planning_status,age_group) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [$id,$first,$last,$name,$side,strval($d,'relationship',255),strval($d,'city',255),
           strval($d,'email',320),strval($d,'phone',64),
           1,intvalField($d,'children_count',0,15),$planning,$age]);
        audit($db,'admin',$actor,'create','guest',$id);
        json(['ok'=>true,'id'=>$id],201);
    }
    if($route==='admin/guest-profile/update' && $method==='PATCH'){
       $data=payload(4096);
       $id=strval($data,'id',40,true);
       if(!one($db,'SELECT guest_id FROM guest_profile_details WHERE guest_id=?',[$id]))
           fail(404,'guest','Профиль не найден');
       $fields=[];
       $params=[];
       foreach(['name_en','seating_group'] as $key){
           if(array_key_exists($key,$data)){
               $fields[]=$key.'=?';
               $params[]=strval($data,$key,$key==='name_en'?255:120);
           }
       }
       if(!$fields)fail(422,'fields','Нет изменений');
       $params[]=$id;
       statement($db,'UPDATE guest_profile_details SET '.implode(',',$fields).",updated_at=datetime('now') WHERE guest_id=?",$params);
       audit($db,'admin',$actor,'update','guest_profile',$id,['fields'=>array_keys(array_intersect_key($data,array_flip(['name_en','seating_group'])))]);
       json(['ok'=>true]);
    }
    if($route==='admin/guest/fields' && $method==='PATCH'){
        $data=payload(40000);
        $id=strval($data,'id',40,true);
        $values=$data['fields']??null;
        if(!is_array($values)||array_is_list($values)||!count($values)||count($values)>24)
            fail(422,'fields','Нужно передать изменённые поля гостя');
        if(!one($db,'SELECT id FROM guests WHERE id=?',[$id]))
            fail(404,'guest','Гость не найден');
        $profileFields=['name_en','relation_to_couple','seating_group','decision','base_count'];
        $guestFields=['first_name','last_name','display_name','side','relationship','city','country','origin_place','origin_country','birth_city','birth_country',
            'email','phone','language','about','about_en','community','private_notes','children_count','planning_status','age_group'];
        $setGuest=[];$argsGuest=[];$setProfile=[];$argsProfile=[];
        foreach($values as $key=>$value){
            if(!is_string($key)||!in_array($key,array_merge($guestFields,$profileFields),true))
                fail(422,'field','Это поле нельзя редактировать напрямую');
            if(is_bool($value))$value=$value?1:0;
            if(!is_string($value)&&!is_numeric($value))
                fail(422,'field','Недопустимый тип значения');
            if($key==='planning_status'&&!in_array($value,['main','reserve'],true))
                fail(422,'field','Список: основной или резерв');
            if($key==='age_group'&&!in_array($value,['unknown','adult','child','infant'],true))
                fail(422,'field','Возрастная категория не поддерживается');
            if($key==='side'&&!in_array($value,['groom','bride','both','other'],true))
                fail(422,'field','Некорректная сторона');
            if($key==='children_count' && (!preg_match('/^\d{1,2}$/',(string)$value)||
                (int)$value>15))fail(422,'field','Допустимо от 0 до 15 детей');
            if($key==='email' && $value!=='' && !filter_var($value,FILTER_VALIDATE_EMAIL))
                fail(422,'email','Некорректный email');
            if($key==='language' && !in_array($value,['ru','en','de','other'],true))
                fail(422,'language','Язык должен быть ru, en, de или other');
            if($key==='display_name' && trim((string)$value)==='')
                fail(422,'name','Имя не может быть пустым');
            $max=320;
            if($key==='private_notes')$max=12000;
            elseif(in_array($key,['about','about_en'],true))$max=5000;
            elseif($key==='phone')$max=64;
            elseif($key==='seating_group')$max=160;
            if(mb_strlen((string)$value)>$max)fail(422,'field','Слишком длинное значение');
            if($key==='children_count')$value=(int)$value;
            if(in_array($key,$guestFields,true)){
                $setGuest[]=$key.'=?';$argsGuest[]=$value;
            }else{
                $setProfile[]=$key.'=?';$argsProfile[]=$value;
            }
        }
        $db->beginTransaction();
        try{
            if($setGuest){
                $argsGuest[]=$id;
                statement($db,"UPDATE guests SET ".implode(',',$setGuest).",updated_at=datetime('now') WHERE id=?",$argsGuest);
            }
            if($setProfile){
                statement($db,"INSERT OR IGNORE INTO guest_profile_details(guest_id,source_person_id)
                  VALUES(?,?)",[$id,'manual:'.$id]);
                $argsProfile[]=$id;
                statement($db,"UPDATE guest_profile_details SET ".implode(',',$setProfile).
                  ",updated_at=datetime('now') WHERE guest_id=?",$argsProfile);
            }
            audit($db,'admin',$actor,'update','guest',$id,['fields'=>array_keys($values)]);
            $db->commit();
        }catch(Throwable $err){$db->rollBack();throw $err;}
        json(['ok'=>true,'updated'=>array_keys($values)]);
    }
    // Manual correction by an organiser is recorded separately from a
    // response submitted by a guest. No automatic registration is fabricated.
    if($route==='admin/guest/rsvp' && $method==='PATCH'){
        $d=payload(8192);
        $id=strval($d,'id',40,true);
        $g=one($db,'SELECT id,plus_one_allowed,children_count,planning_status,age_group FROM guests WHERE id=?',[$id]);
        if(!$g)fail(404,'guest','Гость не найден');
        $attendance=choice($d,'attendance',['yes','no','maybe',''],'');
        if(in_array($attendance,['yes','maybe'],true) && $g['planning_status']!=='main')
            fail(422,'reserve','Гость в резерве. Сначала перенесите его в основной список');
        if(in_array($attendance,['yes','maybe'],true) && !childrenEnabled($db) && in_array($g['age_group'],['child','infant'],true))
            fail(422,'children_disabled','Участие детей отключено');
        if($attendance===''){
            statement($db,'DELETE FROM rsvps WHERE guest_id=?',[$id]);
            audit($db,'admin',$actor,'clear','rsvp',$id,['manual'=>true]);
            json(['ok'=>true,'attendance'=>null]);
        }
        $adults=intvalField($d,'adults',0,2,1);
        $previous=one($db,'SELECT children,transport_needed,arrival_notes FROM rsvps WHERE guest_id=?',[$id])?:[];
        $children=intvalField($d,'children',0,childrenEnabled($db)?16:0,0);
        // When children are disabled, exclude them from live counts but retain saved historical RSVP details.
        if(!childrenEnabled($db))$children=(int)($previous['children']??0);
        if($attendance==='no'){$adults=0;$children=0;}
        // Transfer/arrival fields are retired from the form. Preserve previous information
        // when the organiser updates unrelated RSVP fields.
        $transport=array_key_exists('transport_needed',$d) ? (boolval($d,'transport_needed')?1:0) : (int)($previous['transport_needed']??0);
        $diet=strval($d,'dietary_notes',1000);
        $arrival=array_key_exists('arrival_notes',$d) ? strval($d,'arrival_notes',1000) : (string)($previous['arrival_notes']??'');
        $notes=strval($d,'other_notes',1200);
        statement($db,"INSERT INTO rsvps(guest_id,attendance,adults,children,transport_needed,
          arrival_notes,dietary_notes,other_notes,response_source)
          VALUES(?,?,?,?,?,?,?,?,?)
          ON CONFLICT(guest_id) DO UPDATE SET
            attendance=excluded.attendance,adults=excluded.adults,children=excluded.children,
            transport_needed=excluded.transport_needed,arrival_notes=excluded.arrival_notes,
            dietary_notes=excluded.dietary_notes,other_notes=excluded.other_notes,
            response_source='admin',updated_at=datetime('now')",
          [$id,$attendance,$adults,$children,$transport,$arrival,$diet,$notes,'admin']);
        audit($db,'admin',$actor,'submit','rsvp',$id,['attendance'=>$attendance,'source'=>'admin']);
        json(['ok'=>true,'attendance'=>$attendance,'source'=>'admin']);
    }
    if ($route==='admin/guest/update' && $method==='POST') {
        $d=payload(8192);$id=strval($d,'id',40,true);
        if (!one($db,'SELECT id FROM guests WHERE id=?',[$id])) fail(404,'not_found','Гость не найден');
        $fields=['first_name','last_name','display_name','side','relationship','city','email','phone','language','about','children_count','invited','status'];
        $set=[];$values=[];
        foreach($fields as $key){
            if(!array_key_exists($key,$d))continue;
            if($key==='invited') $v=boolval($d,$key)?1:0;
            elseif($key==='children_count')$v=intvalField($d,$key,0,15);
            elseif($key==='side')$v=choice($d,$key,['bride','groom','both','other'],'other');
            elseif($key==='status')$v=choice($d,$key,['draft','invited','registered','archived'],'draft');
            else $v=strval($d,$key,($key==='about'?1000:320));
            $set[]="$key=?";$values[]=$v;
        }
        if (!$set)fail(422,'empty_update','Нет изменений');
        $values[]=$id;
        statement($db,'UPDATE guests SET '.implode(',',$set).",updated_at=datetime('now') WHERE id=?",$values);
        audit($db,'admin',$actor,'update','guest',$id,['fields'=>array_keys(array_intersect_key($d,array_flip($fields)))]);
        json(['ok'=>true]);
    }
    if ($route==='admin/invitations' && $method==='POST') {
        $d=payload(4096);$guestId=strval($d,'guest_id',40,true);
        $candidate=one($db,"SELECT id,age_group FROM guests WHERE id=? AND status!='archived' AND planning_status='main'",[$guestId]);
        if (!$candidate)
            fail(422,'reserve','Нельзя подготовить приглашение гостю из резерва');
        if(!childrenEnabled($db) && in_array($candidate['age_group'],['child','infant'],true))
            fail(422,'children_disabled','Участие детей отключено');
        $raw=bin2hex(random_bytes(32));$hash=tokenHash($raw,$cfg);
        $expires=gmdate('Y-m-d H:i:s',time()+60*60*24*365);$id=uuid();
        statement($db,"UPDATE invitations SET revoked_at=datetime('now') WHERE guest_id=? AND revoked_at IS NULL",[$guestId]);
        statement($db,'INSERT INTO invitations(id,guest_id,token_hash,expires_at) VALUES(?,?,?,?)',[$id,$guestId,$hash,$expires]);
        // A link is generated, NOT delivered. Never count this as a sent invitation.
        statement($db,"INSERT INTO guest_progress(guest_id,invitation_sent_at) VALUES(?,NULL)
          ON CONFLICT(guest_id) DO UPDATE SET invitation_sent_at=NULL,updated_at=datetime('now')",[$guestId]);
        audit($db,'admin',$actor,'issue','invitation',$id,['guest_id'=>$guestId]);
        // Link is intentionally not emailed; delivery and domain TLS must be verified first.
        json(['ok'=>true,'id'=>$id,'token'=>$raw,'expires_at'=>$expires],201);
    }
    if ($route==='admin/invitations/sent' && $method==='POST') {
        $d=payload(4096);
        $guestId=strval($d,'guest_id',40,true);
        $sent=boolval($d,'sent');
        $existing=one($db,'SELECT id,planning_status,age_group FROM guests WHERE id=? AND status!=?',[$guestId,'archived']);
        if($sent && $existing && $existing['planning_status']!=='main')fail(422,'reserve','Нельзя отправить приглашение гостю из резерва');
        if($sent && $existing && !childrenEnabled($db) && in_array($existing['age_group'],['child','infant'],true))
            fail(422,'children_disabled','Участие детей отключено');
        if(!$existing)fail(404,'guest','Гость не найден');
        $active=one($db,"SELECT id FROM invitations WHERE guest_id=? AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at>datetime('now')) ORDER BY created_at DESC LIMIT 1",[$guestId]);
        if($sent&&!$active)fail(422,'invite_missing','Сначала подготовьте персональную ссылку');
        statement($db,"INSERT INTO guest_progress(guest_id,invitation_sent_at) VALUES(?,?)
          ON CONFLICT(guest_id) DO UPDATE SET invitation_sent_at=excluded.invitation_sent_at,updated_at=datetime('now')",
          [$guestId,$sent?gmdate('Y-m-d H:i:s'):null]);
        if($sent){
            statement($db,"UPDATE guests SET invited=1,status=CASE WHEN status='draft' THEN 'invited' ELSE status END,
              updated_at=datetime('now') WHERE id=?",[$guestId]);
        }else{
            statement($db,"UPDATE guests SET invited=0,status=CASE WHEN status='invited' THEN 'draft' ELSE status END,
              updated_at=datetime('now') WHERE id=?",[$guestId]);
        }
        audit($db,'admin',$actor,$sent?'mark_sent':'mark_not_sent','guest',$guestId);
        json(['ok'=>true,'sent'=>$sent]);
    }

    if ($route==='admin/schedule/delete' && $method==='POST') {
        $d=payload(4096);
        $id=strval($d,'id',40,true);
        $record=one($db,'SELECT id FROM schedule_items WHERE id=?',[$id]);
        if(!$record)fail(404,'not_found','Активность не найдена');
        statement($db,'DELETE FROM schedule_items WHERE id=?',[$id]);
        audit($db,'admin',$actor,'delete','schedule_items',$id);
        json(['ok'=>true,'id'=>$id]);
    }

    // Edit one calendar slot independently. Overlap is intentional: simultaneous
    // activities are displayed in adjacent lanes rather than shifting other events.
    if ($route==='admin/schedule/slot' && $method==='POST') {
        $d=payload(4096);
        $id=strval($d,'id',40,true);
        $day=strval($d,'day',10,true);
        $start=strval($d,'start_time',5,true);
        $length=intvalField($d,'duration_min',5,600);
        if(!in_array($day,['2027-06-17','2027-06-18','2027-06-19','2027-06-20','2027-06-21'],true)||
           !preg_match('/^([01]\\d|2[0-3]):[0-5]\\d$/',$start))
            fail(422,'schedule','Некорректные дата или время');
        $first=(int)substr($start,0,2)*60+(int)substr($start,3,2);
        if($first+$length>=1440)
            fail(422,'schedule','Мероприятие должно закончиться до полуночи');
        $begin=$day.'T'.sprintf('%02d:%02d:00',intdiv($first,60),$first%60);
        $last=$first+$length;
        $finish=$day.'T'.sprintf('%02d:%02d:00',intdiv($last,60),$last%60);
        $db->beginTransaction();
        try{
            $event=one($db,'SELECT id,start_at,activity_date,stage FROM schedule_items WHERE id=?',[$id]);
            if(!$event||$event['stage']!=='program'||
               $event['activity_date']!==$day||substr((string)$event['start_at'],0,10)!==$day){
                $db->rollBack();
                fail(409,'schedule_changed','Мероприятие отсутствует в программе выбранного дня');
            }
            statement($db,'UPDATE schedule_items SET start_at=?,end_at=?,duration_min=?,sort_order=?,gap_before_min=0 WHERE id=?',
                [$begin,$finish,$length,$first,$id]);
            audit($db,'admin',$actor,'edit_slot','schedule_items',$id,
                ['day'=>$day,'start'=>$start,'duration_min'=>$length]);
            $db->commit();
        }catch(Throwable $e){
            if($db->inTransaction())$db->rollBack();
            throw $e;
        }
        json(['ok'=>true,'id'=>$id,'start_at'=>$begin,'end_at'=>$finish,'duration_min'=>$length]);
    }

    // Atomic server-side reorder: all events in one day move together, and end times
    // are derived from their durations. Never perform partial client-side PATCH loops.
    if ($route==='admin/schedule/arrange' && $method==='POST') {
        $d=payload(18000);
        $day=strval($d,'day',10,true);
        $start=strval($d,'start_time',5,true);
        $ids=$d['ids']??null;
        if(!in_array($day,['2027-06-17','2027-06-18','2027-06-19','2027-06-20','2027-06-21'],true)||
           !preg_match('/^([01]\\d|2[0-3]):[0-5]\\d$/',$start)||
           !is_array($ids)||!array_is_list($ids)||count($ids)>250||
           count($ids)!==count(array_unique($ids,SORT_REGULAR)))
            fail(422,'schedule','Неверные параметры расписания');
        $all=all($db,"SELECT id,duration_min,gap_before_min FROM schedule_items
            WHERE stage='program' AND activity_date=? AND substr(start_at,1,10)=?",[$day,$day]);
        $byId=[];foreach($all as $event)$byId[$event['id']]=$event;
        if(count($ids)!==count($byId))fail(409,'schedule_changed','Программа изменилась. Обновите страницу');
        foreach($ids as $id)if(!is_string($id)||!isset($byId[$id]))
            fail(409,'schedule_changed','Программа изменилась. Обновите страницу');
        $minute=(int)substr($start,0,2)*60+(int)substr($start,3,2);
        $updates=[];
        foreach($ids as $index=>$id){
            if($index>0)$minute+=(int)$byId[$id]['gap_before_min'];
            $duration=(int)$byId[$id]['duration_min'];
            if($duration<5||$duration>600||$minute+$duration>=1440)
                fail(422,'schedule','События не помещаются в выбранный день');
            $finish=$minute+$duration;
            $updates[]=[$day.'T'.sprintf('%02d:%02d:00',intdiv($minute,60),$minute%60),
                $day.'T'.sprintf('%02d:%02d:00',intdiv($finish,60),$finish%60),
                ($index+1)*10,$id];
            $minute=$finish;
        }
        $db->beginTransaction();
        try{
            foreach($updates as $u)statement($db,
                'UPDATE schedule_items SET start_at=?,end_at=?,sort_order=? WHERE id=?',$u);
            audit($db,'admin',$actor,'arrange','schedule_items',$day,['count'=>count($updates)]);
            $db->commit();
        }catch(Throwable $e){$db->rollBack();throw $e;}
        json(['ok'=>true,'day'=>$day,'count'=>count($updates)]);
    }

    if ($route==='admin/production-images' && $method==='GET') {
        $item=(string)($_GET['item']??'');
        json(['ok'=>true,'items'=>all($db,'SELECT id,mime,data FROM production_images WHERE item_id=? ORDER BY created_at',[$item])]);
    }
    if ($route==='admin/production-images' && $method==='POST') {
        $d=payload(2800000);$item=strval($d,'item',40,true);
        if(!one($db,'SELECT id FROM decor_items WHERE id=?',[$item]))fail(404,'not_found','Позиция не найдена');
        $data=$d['data']??'';
        if(!is_string($data)||strlen($data)>2700000)fail(422,'image','Изображение слишком большое');
        $raw=base64_decode($data,true);
        $info=$raw===false?false:@getimagesizefromstring($raw);
        if(!$info||!in_array($info['mime'],['image/jpeg','image/png','image/webp'],true)||$info[0]*$info[1]>24000000)
            fail(422,'image','Допустимы JPEG, PNG и WebP');
        $id=uuid();
        statement($db,'INSERT INTO production_images(id,item_id,mime,data) VALUES(?,?,?,?)',[$id,$item,$info['mime'],$data]);
        json(['ok'=>true,'id'=>$id],201);
    }
    if ($route==='admin/production-images' && $method==='DELETE') {
        $d=payload(4096);$id=strval($d,'id',40,true);
        statement($db,'DELETE FROM production_images WHERE id=?',[$id]);
        json(['ok'=>true]);
    }
    // Stable per-venue finance record; the live quote is projected by the admin UI.
    if($route==='admin/venue-budget' && $method==='POST'){
        $d=payload(4096);$venue=strval($d,'venue_id',36,true);
        if(!preg_match('/^[a-z0-9-]{2,36}$/',$venue)||!one($db,'SELECT venue_id FROM venue_date_status WHERE venue_id=? LIMIT 1',[$venue]))fail(422,'field','Неизвестная площадка');
        $name=strval($d,'description',255,true);
        foreach(['committed_rub','paid_rub'] as $k)if(!isset($d[$k])||!is_int($d[$k])||$d[$k]<0||$d[$k]>100000000)fail(422,'field','Некорректная сумма');
        $due=$d['due_at']??null;if($due!==null&&(!is_string($due)||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$due)))fail(422,'field','Некорректная дата');
        $id='venue-'.md5($venue);
        statement($db,'INSERT INTO budget_lines(id,category,description,planned_rub,committed_rub,paid_rub,due_at,notes) VALUES(?,?,?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET committed_rub=excluded.committed_rub,paid_rub=excluded.paid_rub,due_at=excluded.due_at,updated_at=datetime(\'now\')',
          [$id,'Площадка',$name,0,$d['committed_rub'],$d['paid_rub'],$due,'План площадки: '.$venue.';']);
        audit($db,'admin',$actor,'update','budget_lines',$id);
        json(['ok'=>true,'id'=>$id]);
    }
    if ($route==='admin/records' && $method==='GET') {
        $collection=(string)($_GET['collection']??'');
        if (!isset(adminCollections()[$collection]))fail(404,'collection','Коллекция не найдена');
        if($collection==='budget_lines')refreshProductionBudget($db);
        json(['ok'=>true,'collection'=>$collection,'items'=>all($db,'SELECT * FROM '.$collection.' ORDER BY created_at DESC LIMIT 1000')]);
    }
    if ($route==='admin/records' && in_array($method,['POST','PATCH'],true)) {
        $d=payload(32768);
        $collection=strval($d,'collection',40,true);
        $allowed=adminCollections()[$collection]??null;
        if(!$allowed)fail(404,'collection','Коллекция не найдена');
        $fields=$d['fields']??null;
        if(!is_array($fields)||array_is_list($fields))fail(422,'fields','Поля отсутствуют');
        $set=[];$values=[];
        foreach($fields as $field=>$value){
            if(!in_array($field,$allowed,true))fail(422,'field','Недопустимое поле');
            if(is_string($value) && mb_strlen($value)>10000)fail(422,'field_too_long','Слишком длинное поле');
            if(!(is_string($value)||is_int($value)||is_bool($value)||$value===null))
                fail(422,'field','Недопустимый тип поля');
            if($field==='details_json'||$field==='photo_refs_json'){
                if(!is_string($value))fail(422,'field','Ожидается JSON-строка');
                try {json_decode($value,true,32,JSON_THROW_ON_ERROR);}
                catch(Throwable $e){fail(422,'field','Некорректный JSON');}
            }
            if(in_array($collection,['vendors','decor_items'],true)){
                if($field==='status'&&!in_array($value,$collection==='vendors'?['candidate','negotiating','selected','archived']:['candidate','negotiating','selected','ordered','ready','archived'],true))
                    fail(422,'field','Неизвестный статус');
                if($field==='estimate_rub'&&$value!==null&&(!is_int($value)||$value<0))
                    fail(422,'field','Некорректная стоимость');
                if($field==='name'&&(!is_string($value)||trim($value)===''))
                    fail(422,'field','Укажите название');
            }
            if($collection==='schedule_items'){
                if($field==='activity_date' &&
                   (!is_string($value)||!in_array($value,['2027-06-17','2027-06-18','2027-06-19','2027-06-20','2027-06-21'],true)))
                    fail(422,'field','Выберите день свадьбы');
                if($field==='tags_json'){
                    if(!is_string($value))fail(422,'field','Неверный набор тегов');
                    try{$tags=json_decode($value,true,16,JSON_THROW_ON_ERROR);}
                    catch(Throwable $e){fail(422,'field','Неверный набор тегов');}
                    if(!is_array($tags)||!array_is_list($tags)||count($tags)>30||
                        count(array_unique($tags,SORT_REGULAR))!==count($tags))
                        fail(422,'field','Неверный набор тегов');
                    foreach($tags as $tag)if(!is_string($tag)||
                      !preg_match('/^[a-z][a-z0-9_-]{0,31}$/',$tag))
                        fail(422,'field','Неверный идентификатор тега');
                }
                if($field==='stage' && !in_array($value,['idea','program'],true))
                    fail(422,'field','Неизвестный статус активности');
                if($field==='activity_type' && (!is_string($value)||!preg_match('/^[a-z][a-z0-9_-]{0,31}$/',$value)))
                    fail(422,'field','Неверный тип активности');
                if($field==='gap_before_min' && (!is_int($value)||$value<0||$value>240))
                    fail(422,'field','Пауза от 0 до 240 минут');
                if($field==='duration_min' && (!is_int($value)||$value<5||$value>600))
                    fail(422,'field','Длительность от 5 до 600 минут');
                if(in_array($field,['start_at','end_at'],true) && $value!==null &&
                   (!is_string($value)||($value!==''&&!preg_match('/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:00$/',$value))))
                    fail(422,'field','Некорректное время');
            }
            if(is_bool($value))$value=$value?1:0;
            $set[]=$field;$values[]=$value;
        }
        if(!$set)fail(422,'fields','Нет изменений');
        $id=$method==='PATCH'?strval($d,'id',40,true):uuid();
        if($collection==='budget_lines'&&str_starts_with($id,'prod-'))fail(422,'field','Измените расходы в карточке подрядчика или декора');
        $production=in_array($collection,['vendors','decor_items'],true);
        if($production)$db->beginTransaction();
        try{
        if($method==='POST'){
            $keys=implode(',',array_merge(['id'],$set));
            $holders=implode(',',array_fill(0,count($set)+1,'?'));
            statement($db,"INSERT INTO $collection ($keys) VALUES ($holders)",array_merge([$id],$values));
        } else {
            if(!one($db,"SELECT id FROM $collection WHERE id=?",[$id]))fail(404,'not_found','Запись не найдена');
            $sql=implode(',',array_map(fn($key)=>"$key=?",$set));
            statement($db,"UPDATE $collection SET $sql WHERE id=?",array_merge($values,[$id]));
        }
        if($production)syncProductionBudget($db,$collection,one($db,"SELECT * FROM $collection WHERE id=?",[$id]));
        audit($db,'admin',$actor,$method==='POST'?'create':'update',$collection,$id,['fields'=>$set]);
        if($production)$db->commit();
        }catch(Throwable $e){if($production&&$db->inTransaction())$db->rollBack();throw $e;}
        json(['ok'=>true,'id'=>$id],$method==='POST'?201:200);
    }
    if ($route==='admin/review' && $method==='POST') {
        $d=payload(4096);$type=choice($d,'type',['photos','stories'],'photos');
        $id=strval($d,'id',40,true);$status=choice($d,'status',['approved','rejected'],'approved');
        if(!one($db,"SELECT id FROM $type WHERE id=?",[$id]))fail(404,'not_found','Материал не найден');
        statement($db,"UPDATE $type SET status=?,reviewed_at=datetime('now') WHERE id=?",[$status,$id]);
        audit($db,'admin',$actor,'moderate',$type,$id,['status'=>$status]);
        json(['ok'=>true]);
    }
    if ($route==='admin/moderation' && $method==='GET') {
        json(['ok'=>true,
          'photos'=>all($db,"SELECT p.*,g.display_name FROM photos p JOIN guests g ON g.id=p.guest_id WHERE p.status='pending' ORDER BY p.created_at DESC LIMIT 200"),
          'stories'=>all($db,"SELECT s.*,g.display_name FROM stories s JOIN guests g ON g.id=s.guest_id WHERE s.status='pending' ORDER BY s.created_at DESC LIMIT 200")]);
    }
    fail(404,'not_found','Неизвестное действие администратора');
}

function featureOpen(PDO $db,string $key): bool {
    $row=one($db,'SELECT value_json FROM event_settings WHERE key=?',[$key]);
    if(!$row)return false; // Fail closed until organizers explicitly open each feature.
    return json_decode($row['value_json'],true)===true;
}
function requireFeature(PDO $db,string $key): void {
    if(!featureOpen($db,$key))
        fail(403,'feature_closed','Этот раздел ещё не открыт организаторами');
}

function guestRoute(PDO $db,string $actor,string $route,string $method): never {
    $isAdmin=isset($_SESSION['admin_id']);
    if ($route==='guest/me' && $method==='GET') {
        if($isAdmin)fail(403,'role','Только для гостей');
        $guest=one($db,'SELECT g.id,g.first_name,g.last_name,g.display_name,g.city,g.side,g.about,g.email,g.phone,g.profile_visible,g.consent_at,1 AS plus_one_allowed,g.children_count,p.profile_completed_at
          FROM guests g LEFT JOIN guest_progress p ON p.guest_id=g.id WHERE g.id=?',[$actor]);
        $rsvp=one($db,'SELECT * FROM rsvps WHERE guest_id=?',[$actor]);
        $choices=all($db,'SELECT category,option_id FROM menu_choices WHERE guest_id=?',[$actor]);
        json(['ok'=>true,'guest'=>$guest,'rsvp'=>$rsvp,'choices'=>$choices,'children_enabled'=>childrenEnabled($db),'csrf'=>$_SESSION['csrf']]);
    }
    if ($route==='guest/event' && $method==='GET') {
        $keys=['event_date','event_time','event_venue','venue_address','rsvp_deadline',
               'dress_code','transport_info','public_notes','date_confirmed','place_confirmed','children_enabled'];
        $rows=all($db,'SELECT key,value_json FROM event_settings WHERE key IN ('.
          implode(',',array_fill(0,count($keys),'?')).')',$keys);
        $public=[];
        foreach($rows as $row)$public[$row['key']]=json_decode($row['value_json'],true);
        $schedule=all($db,"SELECT title,start_at,end_at,place,notes FROM schedule_items WHERE is_public=1 AND stage='program' ORDER BY start_at,sort_order");
        json(['ok'=>true,'settings'=>$public,'schedule'=>$schedule]);
    }
    if ($route==='guest/companions' && $method==='GET') {
        if($isAdmin)fail(403,'role','Только для гостей');
        json(['ok'=>true,'companions'=>all($db,
          'SELECT id,display_name,age_group,attendance FROM guest_companions WHERE guest_id=? ORDER BY created_at',[$actor])]);
    }
    if ($route==='guest/companions' && $method==='POST') {
        if($isAdmin)fail(403,'role','Только для гостей');
        $d=payload(10000);$items=$d['companions']??null;
        if(!is_array($items)||!array_is_list($items)||count($items)>16)
            fail(422,'companions','Некорректный список сопровождающих');
        $g=one($db,'SELECT plus_one_allowed,children_count FROM guests WHERE id=?',[$actor]);
        $maxAdults=1;$maxChildren=childrenEnabled($db)?16:0;
        $adultCount=0;$childCount=0;$valid=[];
        foreach($items as $item){
            if(!is_array($item))fail(422,'companion','Неверная запись');
            $name=strval($item,'display_name',120,true);
            $age=choice($item,'age_group',['adult','child','infant'],'adult');
            $attendance=choice($item,'attendance',['yes','no','maybe','unknown'],'unknown');
            if($age==='adult')$adultCount++;else $childCount++;
            $valid[]=[$name,$age,$attendance];
        }
        if($adultCount>$maxAdults||$childCount>$maxChildren)
            fail(422,'companions','Число сопровождающих превышает количество в приглашении');
        $db->beginTransaction();
        try{
            // Keep earlier child companions if the global children switch is off.
            if(childrenEnabled($db))statement($db,'DELETE FROM guest_companions WHERE guest_id=?',[$actor]);
            else statement($db,"DELETE FROM guest_companions WHERE guest_id=? AND age_group='adult'",[$actor]);
            foreach($valid as [$name,$age,$attendance]){
                statement($db,'INSERT INTO guest_companions(id,guest_id,display_name,age_group,attendance) VALUES(?,?,?,?,?)',
                  [uuid(),$actor,$name,$age,$attendance]);
            }
            audit($db,'guest',$actor,'update','companions',$actor,['count'=>count($valid)]);
            $db->commit();
        }catch(Throwable $e){$db->rollBack();throw $e;}
        json(['ok'=>true,'count'=>count($valid)]);
    }
    if ($route==='guest/directory' && $method==='GET') {
        requireFeature($db,'directory_open');
        $guests=confirmedGuestDirectory($db);
        json(['ok'=>true,'guests'=>$guests]);
    }
    if ($route==='guest/menu' && $method==='GET') {
        requireFeature($db,'menu_open');
        json(['ok'=>true,'options'=>all($db,'SELECT id,category,title,description,allergens FROM menu_options WHERE active=1 ORDER BY category,sort_order,title')]);
    }
    if ($route==='guest/profile' && $method==='PATCH') {
        if($isAdmin)fail(403,'role','Только для гостей');
        $d=payload(8000);
        $city=strval($d,'city',255);
        $about=strval($d,'about',1200);
        $email=strval($d,'email',320);
        $phone=strval($d,'phone',64);
        if($email!=='' && !filter_var($email,FILTER_VALIDATE_EMAIL))fail(422,'email','Некорректный email');
        $display=strval($d,'display_name',255,true);
        $visible=boolval($d,'profile_visible');
        $consent=boolval($d,'consent');
        if($visible && !$consent)fail(422,'consent_required','Нужно согласие на видимость карточки');
        statement($db,"UPDATE guests SET city=?,about=?,display_name=?,email=?,phone=?,profile_visible=?,
          consent_at=CASE WHEN ?=1 THEN COALESCE(consent_at,datetime('now')) ELSE NULL END,
          updated_at=datetime('now') WHERE id=?",
          [$city,$about,$display,$email,$phone,$visible?1:0,$visible&&$consent?1:0,$actor]);
        statement($db,"INSERT INTO guest_progress(guest_id,profile_completed_at) VALUES(?,datetime('now'))
          ON CONFLICT(guest_id) DO UPDATE SET
            profile_completed_at=COALESCE(guest_progress.profile_completed_at,excluded.profile_completed_at),
            updated_at=datetime('now')",[$actor]);
        statement($db,"UPDATE guests SET status='registered',updated_at=datetime('now')
          WHERE id=? AND status!='archived'",[$actor]);
        audit($db,'guest',$actor,'update','profile',$actor,['visible'=>$visible]);
        json(['ok'=>true]);
    }
    if ($route==='guest/rsvp' && $method==='POST') {
        requireFeature($db,'guest_rsvp_open');
        if($isAdmin)fail(403,'role','Только для гостей');
        $d=payload(10000);$att=choice($d,'attendance',['yes','no','maybe'],'maybe');
        if($att==='yes'&&!one($db,"SELECT guest_id FROM guest_progress WHERE guest_id=? AND profile_completed_at IS NOT NULL",[$actor]))
            fail(422,'complete_profile','Сначала сохраните карточку гостя');
        $guest=one($db,'SELECT plus_one_allowed,children_count FROM guests WHERE id=?',[$actor]);
        $maxAdults=2;
        $adults=intvalField($d,'adults',0,$maxAdults,1);
        $children=intvalField($d,'children',0,childrenEnabled($db)?16:0,0);
        if(!childrenEnabled($db)){
            $previous=one($db,'SELECT children FROM rsvps WHERE guest_id=?',[$actor]);
            $children=(int)($previous['children']??0);
        }
        if($att==='no'){$adults=0;$children=0;}
        statement($db,"INSERT INTO rsvps(guest_id,attendance,adults,children,transport_needed,arrival_notes,dietary_notes,other_notes)
         VALUES(?,?,?,?,?,?,?,?)
         ON CONFLICT(guest_id) DO UPDATE SET attendance=excluded.attendance,adults=excluded.adults,
         children=excluded.children,transport_needed=excluded.transport_needed,
         arrival_notes=excluded.arrival_notes,dietary_notes=excluded.dietary_notes,
         other_notes=excluded.other_notes,response_source='guest',updated_at=datetime('now')",
          [$actor,$att,$adults,$children,boolval($d,'transport_needed')?1:0,
           strval($d,'arrival_notes',1000),strval($d,'dietary_notes',1000),strval($d,'other_notes',1200)]);
        audit($db,'guest',$actor,'submit','rsvp',$actor,['attendance'=>$att]);
        json(['ok'=>true,'attendance'=>$att]);
    }
    if ($route==='guest/menu-choice' && $method==='POST') {
        requireFeature($db,'menu_open');
        if($isAdmin)fail(403,'role','Только для гостей');
        $d=payload(4096);$id=strval($d,'option_id',40,true);
        $option=one($db,'SELECT id,category FROM menu_options WHERE id=? AND active=1',[$id]);
        if(!$option)fail(404,'option','Вариант меню не найден');
        statement($db,"INSERT INTO menu_choices(guest_id,category,option_id) VALUES(?,?,?)
            ON CONFLICT(guest_id,category) DO UPDATE SET option_id=excluded.option_id,updated_at=datetime('now')",
            [$actor,$option['category'],$id]);
        audit($db,'guest',$actor,'choose','menu',$id);
        json(['ok'=>true]);
    }
    if ($route==='guest/story' && $method==='POST') {
        requireFeature($db,'stories_open');
        if($isAdmin)fail(403,'role','Только для гостей');
        throttle($db,'stories:'.$actor,10,86400);
        $d=payload(6000);$content=strval($d,'content',2000,true);$id=uuid();
        statement($db,'INSERT INTO stories(id,guest_id,content) VALUES(?,?,?)',[$id,$actor,$content]);
        audit($db,'guest',$actor,'submit','story',$id);
        json(['ok'=>true,'id'=>$id,'status'=>'pending'],201);
    }
    if ($route==='guest/photos' && $method==='POST') {
        requireFeature($db,'photos_open');
        if($isAdmin)fail(403,'role','Только для гостей');
        uploadPhoto($db,$actor);
    }
    if ($route==='guest/photos' && $method==='GET') {
        json(['ok'=>true,'items'=>all($db,"SELECT id,caption,status,created_at,width,height FROM photos
          WHERE guest_id=? ORDER BY created_at DESC LIMIT 100",[$actor])]);
    }
    if ($route==='media/photo' && $method==='GET') {
        $id=(string)($_GET['id']??'');
        if(!preg_match('/^[a-f0-9-]{36}$/',$id))fail(404,'not_found','Фото не найдено');
        $photo=one($db,'SELECT guest_id,filename,status FROM photos WHERE id=?',[$id]);
        if(!$photo || ($photo['status']!=='approved' && !$isAdmin && $photo['guest_id']!==$actor))
            fail(404,'not_found','Фото не найдено');
        $path=privatePhotoPath($photo['filename']);
        if(!is_file($path))fail(404,'not_found','Фото не найдено');
        header('Content-Type: image/jpeg');
        header('Content-Length: '.filesize($path));
        header('Cache-Control: private, no-store');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    }
    fail(404,'not_found','Неизвестный адрес');
}

function uploadPhoto(PDO $db,string $guestId): never {
    if(!extension_loaded('gd')||!extension_loaded('fileinfo'))
        fail(503,'upload_unavailable','Обработка фотографий пока недоступна');
    throttle($db,'photos:'.$guestId,25,86400);
    $num=one($db,'SELECT COUNT(*) AS n FROM photos WHERE guest_id=?',[$guestId]);
    if((int)$num['n']>=100)fail(422,'quota','Достигнут лимит фотографий');
    $used=one($db,'SELECT COALESCE(SUM(bytes),0) AS total FROM photos');
    if((int)$used['total'] >= 8*1024*1024*1024)
        fail(507,'storage_full','Хранилище фотографий заполнено');
    $file=$_FILES['photo']??null;
    if(!is_array($file)||($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)
        fail(422,'photo','Не удалось загрузить фотографию');
    $size=(int)($file['size']??0);
    if($size<100||$size>10*1024*1024)fail(413,'photo_size','Размер фото: до 10 МБ');
    $path=(string)($file['tmp_name']??'');
    if(!is_uploaded_file($path))fail(422,'photo','Недопустимая загрузка');
    $mime=(new \finfo(FILEINFO_MIME_TYPE))->file($path);
    if(!in_array($mime,['image/jpeg','image/png','image/webp'],true))
        fail(415,'photo_type','Разрешены JPG, PNG и WebP');
    $dims=@getimagesize($path);
    if(!is_array($dims)||$dims[0]<100||$dims[1]<100||
       $dims[0]>10000||$dims[1]>10000||$dims[0]*$dims[1]>35_000_000)
        fail(422,'photo_dimensions','Неподдерживаемый размер фотографии');
    $src=match($mime){
        'image/jpeg'=>@imagecreatefromjpeg($path),
        'image/png'=>@imagecreatefrompng($path),
        'image/webp'=>@imagecreatefromwebp($path),
        default=>false,
    };
    if(!$src)fail(422,'photo_invalid','Изображение повреждено');
    $width=(int)$dims[0];$height=(int)$dims[1];
    $scale=min(1,2400/max($width,$height));
    $newW=max(1,(int)round($width*$scale));$newH=max(1,(int)round($height*$scale));
    $out=imagecreatetruecolor($newW,$newH);
    $white=imagecolorallocate($out,255,255,255);
    imagefill($out,0,0,$white);
    imagecopyresampled($out,$src,0,0,0,0,$newW,$newH,$width,$height);
    imagedestroy($src);
    $id=uuid();$filename=$id.'.jpg';$destination=privatePhotoPath($filename);
    $directory=dirname($destination);
    if(!is_dir($directory))mkdir($directory,0700,true);
    if(!imagejpeg($out,$destination,86)){
        imagedestroy($out);fail(500,'photo_write','Не удалось сохранить фото');
    }
    imagedestroy($out);chmod($destination,0600);
    $bytes=filesize($destination);
    $hash=hash_file('sha256',$destination);
    $duplicate=one($db,'SELECT id FROM photos WHERE guest_id=? AND sha256=?',[$guestId,$hash]);
    if($duplicate){
        unlink($destination);
        json(['ok'=>true,'id'=>$duplicate['id'],'duplicate'=>true],200);
    }
    $caption=trim((string)($_POST['caption']??''));
    if(mb_strlen($caption)>500){unlink($destination);fail(422,'caption','Слишком длинная подпись');}
    try{
        statement($db,'INSERT INTO photos(id,guest_id,filename,mime,bytes,width,height,sha256,caption) VALUES(?,?,?,?,?,?,?,?,?)',
         [$id,$guestId,$filename,'image/jpeg',$bytes,$newW,$newH,$hash,$caption]);
        audit($db,'guest',$guestId,'submit','photo',$id);
    }catch(Throwable $e){unlink($destination);throw $e;}
    // Re-encoding strips GPS EXIF and metadata; photos remain private until approved.
    json(['ok'=>true,'id'=>$id,'status'=>'pending'],201);
}
