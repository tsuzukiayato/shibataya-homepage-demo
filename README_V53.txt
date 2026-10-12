Ver.53 / OZ WEB MANAGER ワンタップ公開（Supabase接続待ち）

1. ZIPはフォルダなし、すべてリポジトリ最上位へアップロード。
2. Supabaseプロジェクトを作成し、SUPABASE_SETUP.sqlをSQL Editorで実行。
3. Authentication > Users でスタッフユーザーを作成。
4. SQLで cms_editors にスタッフの auth.users.id を登録。
5. oz-cms-config.js にProject URLとPublishable/anon keyを記入（service_role keyは絶対に入れない）。
6. oz-manager.html でログインし、写真と説明文を編集して「公開する」。
7. access.html で公開内容が反映される（閲覧時に最新DBを読み込み）。

現段階は接続先未設定。ファイルをGitHubにアップロードするだけでは即時公開機能は動きません。
認証済み編集者は承認なしで直接公開できます。公開前に内容確認ダイアログあり。
注意：管理アプリのURLは公開されますが、編集はSupabase認証+RLSで制御。
過去版の?edit=1は無効化し、スタッフ用oz-manager.htmlに一本化。
既存のVer.50地図SVG・経路・アニメーションは保持。
