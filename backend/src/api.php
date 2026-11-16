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
                 AND g.status!='archived'",[$hash]);
            if (!$invite) fail(401,'invalid_invite','Приглашение недействительно или срок истёк');
            statement($db,"UPDATE invitations SET used_at=COALESCE(used_at,datetime('now')) WHERE id=?",[$invite['id']]);
            statement($db,"UPDATE guests SET status='registered',invited=1,updated_at=datetime('now') WHERE id=?",[$invite['guest_id']]);
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

function adminCollections(): array {
    return [
      'venues'=>['name','area','address','website','capacity_min','capacity_max','quoted_total_rub','quote_guests','desired_date_status','contact_name','contact_email','contact_phone','quote_source','pros','cons','notes','details_json','photo_refs_json'],
      'vendors'=>['category','name','contact','website','status','estimate_rub','contract_ref','notes'],
      'budget_lines'=>['category','description','planned_rub','committed_rub','paid_rub','due_at','vendor_id','notes'],
      'tasks'=>['title','description','status','priority','owner','due_at'],
      'schedule_items'=>['title','start_at','end_at','place','notes','is_public','sort_order'],
      'menu_options'=>['category','title','description','allergens','active','sort_order'],
      'documents'=>['category','label','reference','visibility'],
    ];
}
function adminRoute(PDO $db,string $actor,string $route,string $method,array $cfg): never {
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
          'photos_open','guest_rsvp_open','stories_open','date_confirmed','place_confirmed'];
        $key=choice($d,'key',$allowed,'');
        if(!array_key_exists('value',$d) || (!is_scalar($d['value']) && $d['value']!==null))
            fail(422,'field','Значение настройки недопустимо');
        $value=$d['value'];
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
    if ($route==='admin/overview' && $method==='GET') {
        $guest=one($db,"SELECT COUNT(*) total,
             SUM(CASE WHEN status='registered' THEN 1 ELSE 0 END) registered FROM guests");
        $rsvps=all($db,'SELECT attendance,COUNT(*) AS total FROM rsvps GROUP BY attendance');
        $pendingPhotos=one($db,"SELECT COUNT(*) AS n FROM photos WHERE status='pending'");
        $pendingStories=one($db,"SELECT COUNT(*) AS n FROM stories WHERE status='pending'");
        $budget=one($db,'SELECT COALESCE(SUM(planned_rub),0) planned,COALESCE(SUM(committed_rub),0) committed,COALESCE(SUM(paid_rub),0) paid FROM budget_lines');
        $tasks=one($db,"SELECT COUNT(*) total,SUM(CASE WHEN status!='done' THEN 1 ELSE 0 END) open FROM tasks");
        json(['ok'=>true,'guests'=>$guest,'rsvp'=>$rsvps,'photos_pending'=>(int)$pendingPhotos['n'],
          'stories_pending'=>(int)$pendingStories['n'],'budget'=>$budget,'tasks'=>$tasks]);
    }
    if ($route==='admin/guests' && $method==='GET') {
        $items=all($db,"SELECT g.*,r.attendance,r.adults,r.children,r.transport_needed,r.dietary_notes,
            r.other_notes,r.submitted_at FROM guests g LEFT JOIN rsvps r ON r.guest_id=g.id
            ORDER BY g.display_name LIMIT 1500");
        json(['ok'=>true,'guests'=>$items]);
    }
    if ($route==='admin/guests' && $method==='POST') {
        $d=payload(8192);
        $first=strval($d,'first_name',120,true);
        $last=strval($d,'last_name',120);
        $name=strval($d,'display_name',255) ?: trim($first.' '.$last);
        $side=choice($d,'side',['bride','groom','both','other'],'other');
        $id=uuid();
        statement($db,'INSERT INTO guests(id,first_name,last_name,display_name,side,relationship,city,email,phone,plus_one_allowed,children_count) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          [$id,$first,$last,$name,$side,strval($d,'relationship',255),strval($d,'city',255),
           strval($d,'email',320),strval($d,'phone',64),
           boolval($d,'plus_one_allowed')?1:0,intvalField($d,'children_count',0,15)]);
        audit($db,'admin',$actor,'create','guest',$id);
        json(['ok'=>true,'id'=>$id],201);
    }
    if ($route==='admin/guest/update' && $method==='POST') {
        $d=payload(8192);$id=strval($d,'id',40,true);
        if (!one($db,'SELECT id FROM guests WHERE id=?',[$id])) fail(404,'not_found','Гость не найден');
        $fields=['first_name','last_name','display_name','side','relationship','city','email','phone','language','about','plus_one_allowed','children_count','invited','status'];
        $set=[];$values=[];
        foreach($fields as $key){
            if(!array_key_exists($key,$d))continue;
            if(in_array($key,['plus_one_allowed','invited'],true)) $v=boolval($d,$key)?1:0;
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
        if (!one($db,"SELECT id FROM guests WHERE id=? AND status!='archived'",[$guestId]))
            fail(404,'not_found','Гость не найден');
        $raw=bin2hex(random_bytes(32));$hash=tokenHash($raw,$cfg);
        $expires=gmdate('Y-m-d H:i:s',time()+60*60*24*90);$id=uuid();
        statement($db,"UPDATE invitations SET revoked_at=datetime('now') WHERE guest_id=? AND revoked_at IS NULL",[$guestId]);
        statement($db,'INSERT INTO invitations(id,guest_id,token_hash,expires_at) VALUES(?,?,?,?)',[$id,$guestId,$hash,$expires]);
        statement($db,"UPDATE guests SET invited=1,status='invited',updated_at=datetime('now') WHERE id=? AND status='draft'",[$guestId]);
        audit($db,'admin',$actor,'issue','invitation',$id,['guest_id'=>$guestId]);
        // Link is intentionally not emailed; delivery and domain TLS must be verified first.
        json(['ok'=>true,'id'=>$id,'token'=>$raw,'expires_at'=>$expires],201);
    }
    if ($route==='admin/records' && $method==='GET') {
        $collection=(string)($_GET['collection']??'');
        if (!isset(adminCollections()[$collection]))fail(404,'collection','Коллекция не найдена');
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
            if(is_bool($value))$value=$value?1:0;
            $set[]=$field;$values[]=$value;
        }
        if(!$set)fail(422,'fields','Нет изменений');
        $id=$method==='PATCH'?strval($d,'id',40,true):uuid();
        if($method==='POST'){
            $keys=implode(',',array_merge(['id'],$set));
            $holders=implode(',',array_fill(0,count($set)+1,'?'));
            statement($db,"INSERT INTO $collection ($keys) VALUES ($holders)",array_merge([$id],$values));
        } else {
            if(!one($db,"SELECT id FROM $collection WHERE id=?",[$id]))fail(404,'not_found','Запись не найдена');
            $sql=implode(',',array_map(fn($key)=>"$key=?",$set));
            statement($db,"UPDATE $collection SET $sql WHERE id=?",array_merge($values,[$id]));
        }
        audit($db,'admin',$actor,$method==='POST'?'create':'update',$collection,$id,['fields'=>$set]);
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
        $guest=one($db,'SELECT id,first_name,last_name,display_name,city,side,about,email,phone,profile_visible,consent_at,plus_one_allowed,children_count FROM guests WHERE id=?',[$actor]);
        $rsvp=one($db,'SELECT * FROM rsvps WHERE guest_id=?',[$actor]);
        $choices=all($db,'SELECT category,option_id FROM menu_choices WHERE guest_id=?',[$actor]);
        json(['ok'=>true,'guest'=>$guest,'rsvp'=>$rsvp,'choices'=>$choices,'csrf'=>$_SESSION['csrf']]);
    }
    if ($route==='guest/event' && $method==='GET') {
        $keys=['event_date','event_time','event_venue','venue_address','rsvp_deadline',
               'dress_code','transport_info','public_notes','date_confirmed','place_confirmed'];
        $rows=all($db,'SELECT key,value_json FROM event_settings WHERE key IN ('.
          implode(',',array_fill(0,count($keys),'?')).')',$keys);
        $public=[];
        foreach($rows as $row)$public[$row['key']]=json_decode($row['value_json'],true);
        $schedule=all($db,'SELECT title,start_at,end_at,place,notes FROM schedule_items WHERE is_public=1 ORDER BY sort_order,start_at');
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
        $maxAdults=(int)$g['plus_one_allowed'];$maxChildren=(int)$g['children_count'];
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
            statement($db,'DELETE FROM guest_companions WHERE guest_id=?',[$actor]);
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
        $guests=all($db,"SELECT id,display_name,city,side,relationship,about FROM guests
          WHERE profile_visible=1 AND consent_at IS NOT NULL AND status='registered'
          ORDER BY display_name LIMIT 1000");
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
        audit($db,'guest',$actor,'update','profile',$actor,['visible'=>$visible]);
        json(['ok'=>true]);
    }
    if ($route==='guest/rsvp' && $method==='POST') {
        requireFeature($db,'guest_rsvp_open');
        if($isAdmin)fail(403,'role','Только для гостей');
        $d=payload(10000);$att=choice($d,'attendance',['yes','no','maybe'],'maybe');
        $guest=one($db,'SELECT plus_one_allowed,children_count FROM guests WHERE id=?',[$actor]);
        $maxAdults=1+(int)$guest['plus_one_allowed'];
        $adults=intvalField($d,'adults',0,$maxAdults,1);
        $children=intvalField($d,'children',0,(int)$guest['children_count'],0);
        if($att==='no'){$adults=0;$children=0;}
        statement($db,"INSERT INTO rsvps(guest_id,attendance,adults,children,transport_needed,arrival_notes,dietary_notes,other_notes)
         VALUES(?,?,?,?,?,?,?,?)
         ON CONFLICT(guest_id) DO UPDATE SET attendance=excluded.attendance,adults=excluded.adults,
         children=excluded.children,transport_needed=excluded.transport_needed,
         arrival_notes=excluded.arrival_notes,dietary_notes=excluded.dietary_notes,
         other_notes=excluded.other_notes,updated_at=datetime('now')",
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
