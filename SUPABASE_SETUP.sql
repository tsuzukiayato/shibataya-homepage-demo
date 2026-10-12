-- Supabase SQL Editorで実行。事前に Authentication > Users でスタッフアカウントを作成。
-- 画像は公開ストレージ。個人情報・患者情報をアップロードしないこと。
create table if not exists public.cms_editors (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.parking_content (
 parking_id integer primary key check (parking_id between 1 and 4),
 description text not null default '' check (length(description)<=500),
 photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=3),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.cms_editors enable row level security;
alter table public.parking_content enable row level security;
-- 一般閲覧は駐車場コンテンツのみ。
create policy "cms_editors_self_read" on public.cms_editors for select to authenticated using (user_id=auth.uid());
create policy "parking_public_read" on public.parking_content for select to anon,authenticated using (true);
create policy "parking_editor_insert" on public.parking_content for insert to authenticated with check (exists(select 1 from public.cms_editors where user_id=auth.uid()) and updated_by=auth.uid());
create policy "parking_editor_update" on public.parking_content for update to authenticated using (exists(select 1 from public.cms_editors where user_id=auth.uid())) with check (exists(select 1 from public.cms_editors where user_id=auth.uid()) and updated_by=auth.uid());
insert into public.parking_content(parking_id) values (1),(2),(3),(4) on conflict do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('parking-photos','parking-photos',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "parking_photo_public_read" on storage.objects for select to anon,authenticated using (bucket_id='parking-photos');
create policy "parking_photo_editor_upload" on storage.objects for insert to authenticated with check (bucket_id='parking-photos' and exists(select 1 from public.cms_editors where user_id=auth.uid()));
-- スタッフを編集者として登録する際は、認証ユーザーのUUIDを確認し、下記を別途実行：
-- insert into public.cms_editors(user_id) values ('スタッフのauth.users.id');
-- ※このSQLは新規プロジェクト向け。既存ポリシーがある場合は重複実行しない。
