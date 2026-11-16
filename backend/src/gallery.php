<?php
declare(strict_types=1);
namespace Wedding;

use PDO;
use Throwable;

function galleryCategory(string $value): string {
    if (!in_array($value,['couple','location','city','guide'],true))
        fail(422,'category','Недопустимая категория фотографий');
    return $value;
}
function approvedGalleryVenueIds(PDO $db): array {
    $rows=all($db,"SELECT DISTINCT s.venue_id FROM schedule_items s
       INNER JOIN venues v ON v.id=s.venue_id
       WHERE s.is_confirmed=1 AND s.venue_id IS NOT NULL AND s.venue_id!=''");
    return array_values(array_column($rows,'venue_id'));
}
function adminGallery(PDO $db,string $actor,string $route,string $method): never {
    $selected=approvedGalleryVenueIds($db);
    if($route==='admin/gallery'&&$method==='GET'){
        $assets=all($db,"SELECT id,category,venue_id,caption,is_public,created_at
          FROM gallery_assets ORDER BY created_at DESC LIMIT 1200");
        $guests=all($db,"SELECT p.id,p.caption,p.created_at,g.display_name AS author
          FROM photos p INNER JOIN guests g ON g.id=p.guest_id
          WHERE p.status='approved' ORDER BY p.created_at DESC LIMIT 600");
        $pending=all($db,"SELECT p.id,p.caption,p.created_at,g.display_name AS author
          FROM photos p INNER JOIN guests g ON g.id=p.guest_id
          WHERE p.status='pending' ORDER BY p.created_at DESC LIMIT 300");
        // Only confirmed places from the organizer's itinerary may appear
        // in the wedding gallery. Never return photos for research venues.
        $assets=array_values(array_filter($assets,function($a)use($selected){
            return $a['category']!=='location'||in_array($a['venue_id'],$selected,true);
        }));
        json(['ok'=>true,'assets'=>$assets,'guest_photos'=>$guests,
          'pending_guest_photos'=>$pending,'approved_venues'=>$selected]);
    }
    if($route==='admin/gallery/update'&&$method==='PATCH'){
        $data=payload(10000);
        $id=strval($data,'id',40,true);
        $asset=one($db,"SELECT id,category,venue_id FROM gallery_assets WHERE id=?",[$id]);
        if(!$asset)fail(404,'photo','Фото не найдено');
        $columns=[];$values=[];
        if(array_key_exists('caption',$data)){
            $columns[]='caption=?';$values[]=strval($data,'caption',500);
        }
        if(array_key_exists('is_public',$data)){
            $columns[]='is_public=?';$values[]=boolval($data,'is_public')?1:0;
        }
        if(!$columns)fail(422,'fields','Нет изменений');
        $values[]=$id;
        statement($db,'UPDATE gallery_assets SET '.implode(',',$columns).' WHERE id=?',$values);
        audit($db,'admin',$actor,'update','gallery_photo',$id,['fields'=>array_keys($data)]);
        json(['ok'=>true]);
    }
    if($route==='admin/gallery/upload'&&$method==='POST'){
        $category=galleryCategory((string)($_POST['category']??'couple'));
        $caption=trim((string)($_POST['caption']??''));
        if(mb_strlen($caption)>500)fail(422,'caption','Слишком длинная подпись');
        $venueId=trim((string)($_POST['venue_id']??''));
        if($category==='location'&&!in_array($venueId,$selected,true))
            fail(422,'venue','Для фотографий мероприятия выберите утверждённую площадку');
        if($category!=='location')$venueId='';
        if(!extension_loaded('gd')||!extension_loaded('fileinfo'))
            fail(503,'images','Обработка изображений недоступна');
        $f=$_FILES['photo']??null;
        if(!is_array($f)||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)
            fail(422,'photo','Выберите фотографию');
        $size=(int)($f['size']??0);
        if($size<100||$size>10*1024*1024)
            fail(413,'photo','Размер файла не более 10 МБ');
        $tmp=(string)($f['tmp_name']??'');
        if(!is_uploaded_file($tmp))fail(422,'photo','Недопустимый источник');
        $mime=(new \finfo(FILEINFO_MIME_TYPE))->file($tmp);
        if(!in_array($mime,['image/jpeg','image/png','image/webp'],true))
            fail(415,'photo','Поддерживаются JPEG, PNG и WebP');
        $dimensions=@getimagesize($tmp);
        if(!$dimensions||$dimensions[0]<100||$dimensions[1]<100||
          $dimensions[0]>10000||$dimensions[1]>10000||
          (float)$dimensions[0]*(float)$dimensions[1]>50000000)
            fail(422,'photo','Размеры изображения не поддерживаются');
        $total=(int)$db->query("SELECT COALESCE(SUM(bytes),0) FROM gallery_assets")->fetchColumn();
        if($total>2*1024*1024*1024)fail(507,'quota','Достигнут лимит хранилища');
        $src=match($mime){
            'image/jpeg'=>@imagecreatefromjpeg($tmp),
            'image/png'=>@imagecreatefrompng($tmp),
            'image/webp'=>@imagecreatefromwebp($tmp),
        };
        if(!$src)fail(422,'photo','Файл повреждён');
        $width=(int)$dimensions[0];$height=(int)$dimensions[1];
        $scale=min(1,2400/max($width,$height));
        $newWidth=max(1,(int)round($width*$scale));
        $newHeight=max(1,(int)round($height*$scale));
        $dest=imagecreatetruecolor($newWidth,$newHeight);
        if(!$dest){imagedestroy($src);fail(503,'images','Не удалось обработать фото');}
        imagefill($dest,0,0,imagecolorallocate($dest,255,255,255));
        imagecopyresampled($dest,$src,0,0,0,0,$newWidth,$newHeight,$width,$height);
        imagedestroy($src);
        $dir=PRIVATE_ROOT.'/gallery-media';
        if(!is_dir($dir)&&!@mkdir($dir,0700,true)&&!is_dir($dir)){
            imagedestroy($dest);fail(503,'media','Хранилище недоступно');
        }
        $id=uuid();$filename=$id.'.jpg';$path=$dir.'/'.$filename;
        if(!imagejpeg($dest,$path,85)){
            imagedestroy($dest);fail(503,'photo','Не удалось сохранить фотографию');
        }
        imagedestroy($dest);chmod($path,0600);
        $bytes=(int)filesize($path);
        $sha=hash_file('sha256',$path);
        $existing=one($db,'SELECT id FROM gallery_assets WHERE sha256=?',[$sha]);
        if($existing){
            @unlink($path);
            json(['ok'=>true,'id'=>$existing['id'],'duplicate'=>true]);
        }
        try{
            statement($db,"INSERT INTO gallery_assets(id,category,venue_id,caption,
                filename,mime,bytes,width,height,sha256,is_public)
                VALUES(?,?,?,?,?,'image/jpeg',?,?,?,?,0)",[
                $id,$category,$venueId,$caption,$filename,
                $bytes,$newWidth,$newHeight,$sha
            ]);
        }catch(Throwable $err){@unlink($path);throw $err;}
        audit($db,'admin',$actor,'upload','gallery_photo',$id,['category'=>$category]);
        json(['ok'=>true,'id'=>$id,'duplicate'=>false],201);
    }
    fail(404,'not_found','Неизвестная операция фотоархива');
}
