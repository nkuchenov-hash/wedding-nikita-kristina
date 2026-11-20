<?php
declare(strict_types=1);
namespace Wedding;
// Organizer-only CLI export. Never serve this script from the public webroot.
require_once dirname(__DIR__).'/src/core.php';
if (PHP_SAPI!=='cli') { http_response_code(404); exit(1); }
$db=db();
$rows=all($db,"SELECT
 g.id,g.first_name,g.last_name,g.display_name,g.side,g.relationship,g.community,
 g.city,g.phone,g.email,g.language,g.about,g.about_en,g.private_notes,
 g.planning_status,g.age_group,g.status,g.plus_one_allowed,g.updated_at,
 p.source_person_id,p.name_en,p.relation_to_couple,p.decision,p.seating_group,p.base_count,
 r.attendance,r.adults,r.children,r.dietary_notes,r.other_notes,
 t.invitation_sent_at
 FROM guests g
 LEFT JOIN guest_profile_details p ON p.guest_id=g.id
 LEFT JOIN rsvps r ON r.guest_id=g.id
 LEFT JOIN guest_progress t ON t.guest_id=g.id
 ORDER BY CASE WHEN p.source_person_id GLOB 'P[0-9]*' THEN 0 ELSE 1 END,
 p.source_person_id,g.display_name,g.id");
$links=all($db,"SELECT guest_id_1,guest_id_2,relation_type,
 relation_1_to_2,relation_2_to_1 FROM guest_relationships");
$name=[];
foreach($rows as $g)$name[(string)$g['id']]=(string)$g['display_name'];
$relations=[];
foreach($links as $link){
  $one=(string)$link['guest_id_1'];$two=(string)$link['guest_id_2'];
  if(!isset($name[$one],$name[$two]))continue;
  $l1=(string)($link['relation_1_to_2']?:$link['relation_type']);
  $l2=(string)($link['relation_2_to_1']?:$link['relation_type']);
  $relations[$one][]=['with'=>$name[$two],'type'=>$l1];
  $relations[$two][]=['with'=>$name[$one],'type'=>$l2];
}
foreach($rows as &$g){
  $g['relations']=$relations[(string)$g['id']]??[];
}
unset($g);
$revision=(int)$db->query('SELECT COALESCE(MAX(id),0) FROM audit_log')->fetchColumn();
$payload=[
 'source'=>'private-wedding-sqlite',
 'exported_at'=>gmdate('c'),
 'revision'=>$revision,
 'guest_count'=>count($rows),
 'guests'=>$rows
];
fwrite(STDOUT,json_encode($payload,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE));
