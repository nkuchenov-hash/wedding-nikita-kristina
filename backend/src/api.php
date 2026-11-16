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
}function confirmedGuestDirectory(PDO $db): array {
    return all($db,"SELECT g.id,g.display_name,g.city,g.about FROM guests g
          INNER JOIN rsvps r ON r.guest_id=g.id AND r.attendance='yes'
          INNER JOIN guest_progress p ON p.guest_id=g.id AND p.profile_completed_at IS NOT NULL
          WHERE g.profile_visible=1 AND g.consent_at IS NOT NULL AND g.status='registered'
          ORDER BY g.display_name LIMIT 1000");
}


