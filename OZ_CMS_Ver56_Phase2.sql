-- OZ CMS Ver.56 Phase 2: authenticated draft, submit, admin review
-- Execute only after Phase 1 succeeded. Existing published content is preserved.
begin;

-- Keep browser roles read-only for submission rows and published rows.
revoke insert, update, delete on public.cms_parking_submissions from anon, authenticated;
revoke insert, update, delete on public.parking_content from anon, authenticated;

-- Submissions: editor may save only their own draft or returned request.
create or replace function public.cms_save_parking_draft(
  p_parking_id integer, p_description text, p_photos jsonb, p_submission_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_old public.cms_parking_submissions%rowtype;
begin
  if v_uid is null or not exists (
    select 1 from public.cms_staff where auth_user_id=v_uid and active=true
  ) then raise exception '編集権限がありません'; end if;
  if p_parking_id not between 1 and 4 or p_description is null or length(p_description)>500
     or p_photos is null or jsonb_typeof(p_photos)<>'array' or jsonb_array_length(p_photos)>3
     or exists (select 1 from jsonb_array_elements(p_photos) x
       where jsonb_typeof(x)<>'object'
         or jsonb_typeof(x->'path')<>'string'
         or length(x->>'path')>250
         or (x->>'path') !~ '^p[1-4]/[a-zA-Z0-9._/-]+$'
         or (x->>'path') not like 'p'||p_parking_id||'/%'
         or (x ? 'caption' and (jsonb_typeof(x->'caption')<>'string' or length(x->>'caption')>200))
     )
  then raise exception '説明文または写真の形式が不正です'; end if;
  if p_submission_id is null then
    insert into public.cms_parking_submissions(parking_id,description,photos,status,created_by)
    values(p_parking_id,p_description,p_photos,'draft',v_uid) returning id into v_id;
  else
    select * into v_old from public.cms_parking_submissions where id=p_submission_id for update;
    if not found or v_old.created_by<>v_uid or v_old.parking_id<>p_parking_id
       or v_old.status not in ('draft','rejected') then
      raise exception 'この下書きは編集できません'; end if;
    update public.cms_parking_submissions
      set description=p_description,photos=p_photos,status='draft',reviewed_by=null,
          review_note=null,reviewed_at=null,submitted_at=null,updated_at=now()
      where id=p_submission_id returning id into v_id;
  end if;
  insert into public.cms_audit_log(staff_id,auth_user_id,action,parking_id,detail)
    select staff_id,v_uid,'下書き保存',p_parking_id,pg_catalog.jsonb_build_object('submission_id',v_id)
    from public.cms_staff where auth_user_id=v_uid;
  return v_id;
end $$;

create or replace function public.cms_submit_parking_draft(p_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_row public.cms_parking_submissions%rowtype;
begin
  if v_uid is null or not exists(select 1 from public.cms_staff where auth_user_id=v_uid and active=true)
    then raise exception '編集権限がありません'; end if;
  select * into v_row from public.cms_parking_submissions where id=p_submission_id for update;
  if not found or v_row.created_by<>v_uid or v_row.status<>'draft' then
    raise exception '申請できない下書きです'; end if;
  update public.cms_parking_submissions set status='pending',submitted_at=now(),updated_at=now()
    where id=p_submission_id;
  insert into public.cms_audit_log(staff_id,auth_user_id,action,parking_id,detail)
    select staff_id,v_uid,'公開申請',v_row.parking_id,pg_catalog.jsonb_build_object('submission_id',p_submission_id)
    from public.cms_staff where auth_user_id=v_uid;
end $$;

create or replace function public.cms_review_parking_submission(
 p_submission_id uuid, p_approve boolean, p_note text default ''
) returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_row public.cms_parking_submissions%rowtype;
begin
  if v_uid is null or not exists (
    select 1 from public.cms_staff where auth_user_id=v_uid and active=true and is_admin=true
  ) then raise exception '管理者権限が必要です'; end if;
  if p_note is null or length(p_note)>1000 then raise exception 'コメントが長すぎます'; end if;
  select * into v_row from public.cms_parking_submissions where id=p_submission_id for update;
  if not found or v_row.status<>'pending' then raise exception '申請は処理済みか存在しません'; end if;
  if p_approve then
    insert into public.parking_content(parking_id,description,photos,updated_by,updated_at)
    values(v_row.parking_id,v_row.description,v_row.photos,v_uid,now())
    on conflict(parking_id) do update set
      description=excluded.description,photos=excluded.photos,
      updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  end if;
  update public.cms_parking_submissions set
    status=case when p_approve then 'approved' else 'rejected' end,
    reviewed_by=v_uid,review_note=p_note,reviewed_at=now(),updated_at=now()
    where id=p_submission_id;
  insert into public.cms_audit_log(staff_id,auth_user_id,action,parking_id,detail)
    select staff_id,v_uid,case when p_approve then '申請承認' else '申請差戻し' end,
      v_row.parking_id,pg_catalog.jsonb_build_object('submission_id',p_submission_id,'note',p_note)
    from public.cms_staff where auth_user_id=v_uid;
end $$;

revoke all on function public.cms_save_parking_draft(integer,text,jsonb,uuid) from public,anon;
revoke all on function public.cms_submit_parking_draft(uuid) from public,anon;
revoke all on function public.cms_review_parking_submission(uuid,boolean,text) from public,anon;
grant execute on function public.cms_save_parking_draft(integer,text,jsonb,uuid) to authenticated;
grant execute on function public.cms_submit_parking_draft(uuid) to authenticated;
grant execute on function public.cms_review_parking_submission(uuid,boolean,text) to authenticated;
commit;
