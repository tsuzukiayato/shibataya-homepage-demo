(()=>{'use strict';
const slotMap={'index.html':'top','clinic.html':'clinic','rehabilitation.html':'rehab','modalities.html':'modalities','exercise.html':'exercise','nutrition.html':'nutrition','dayrehab.html':'dayrehab'};
const page=location.pathname.split('/').pop()||'index.html',slot=slotMap[page];if(!slot)return;
const KEY='shibataya-v301-content';let db={schema:1,news:[],photos:{}};
try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old&&old.schema===1&&old.photos&&Array.isArray(old.news))db=old}catch(e){}
const style=document.createElement('style');style.textContent=`
.v302-editbar{position:fixed;z-index:99999;bottom:calc(14px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:#173b32;color:white;display:flex;align-items:center;gap:7px;padding:9px;border-radius:18px;box-shadow:0 10px 40px #0005;max-width:calc(100vw - 16px);font:12px -apple-system,sans-serif}
.v302-editbar button{font:inherit;white-space:nowrap;border:1px solid #ffffff55;border-radius:10px;background:#fff;color:#173b32;padding:10px 12px;cursor:pointer}
.v302-editbar button[aria-pressed=true]{background:#c9b07e;color:#173b32}
.v302-photo{position:relative;min-height:180px;overflow:hidden;background:#eee9df;display:grid;place-items:center}
.v302-photo img{width:100%;height:100%;object-fit:cover;display:block}
.v302-photo.is-portrait img{object-fit:contain}
.v302-photo .v302-trigger{display:none;position:absolute;inset:0;border:3px dashed #b89a60;background:#14382d77;color:#fff;font-weight:700;font-size:16px;cursor:pointer;place-items:center;text-shadow:0 1px 5px #000}
body.v302-editing .v302-photo .v302-trigger{display:grid}
.v302-placeholder{padding:45px 16px;text-align:center;color:#667a6d;font-size:14px}
.v302-modal{position:fixed;z-index:100001;inset:0;background:#071b16a8;display:none;align-items:center;justify-content:center;padding:14px}
.v302-modal.open{display:flex}.v302-dialog{background:#f7f5ef;color:#173b32;border-radius:16px;width:min(470px,100%);max-height:90svh;overflow:auto;padding:24px;font:14px -apple-system,sans-serif}
.v302-dialog h2{font-size:22px;margin:0 0 8px}.v302-dialog label{display:block;margin:15px 0 7px;font-weight:650}
.v302-dialog input[type=file],.v302-dialog input[type=text],.v302-dialog input[type=range]{width:100%;max-width:100%}
.v302-dialog input[type=text]{padding:12px;border:1px solid #bdc9bf;border-radius:8px}
.v302-dialog .v302-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:18px}
.v302-dialog button{border:1px solid #c9d0c8;background:white;border-radius:9px;padding:11px 14px;color:#173b32;cursor:pointer}
.v302-dialog button.primary{background:#173b32;color:white}
.v302-dialog .v302-hint{font-size:12px;line-height:1.7;color:#627268}
.v302-dialog .v302-crop{height:210px;overflow:hidden;background:#e6e6e0;display:grid;place-items:center;margin:12px 0;border-radius:9px}
.v302-dialog .v302-crop img{max-width:100%;max-height:100%;object-fit:contain;transform-origin:center}
`;document.head.append(style);
const bar=document.createElement('div');bar.className='v302-editbar';bar.innerHTML='<button type="button" id="v302-toggle" aria-pressed="false">✎ 編集する</button><button type="button" id="v302-preview">👁 プレビュー</button><button type="button" id="v302-manager">管理画面</button>';document.body.append(bar);
const modal=document.createElement('div');modal.className='v302-modal';modal.innerHTML='<div class="v302-dialog" role="dialog" aria-modal="true" aria-label="写真を編集"><h2>写真を直接編集</h2><p class="v302-hint">iPhoneの写真ライブラリから選択できます。下書きはこの端末内だけに保存され、公開されません。</p><label>新しい写真</label><input id="v302-file" type="file" accept="image/jpeg,image/png,image/webp"><div class="v302-crop"><img id="v302-img" alt="選択中の写真" hidden></div><label for="v302-zoom">拡大・縮小</label><input id="v302-zoom" type="range" min="100" max="200" value="100"><label for="v302-alt">写真の説明</label><input id="v302-alt" type="text" maxlength="160" placeholder="例：リハビリ室の様子"><p id="v302-msg" class="v302-hint" role="status"></p><div class="v302-actions"><button class="primary" id="v302-save">下書き保存</button><button id="v302-remove">写真を削除</button><button id="v302-close">閉じる</button></div></div>';document.body.append(modal);
const $=id=>document.getElementById(id);const isPortrait=page==='clinic.html';
let target=document.querySelector(isPortrait?'.portrait img':'main img');let wrap;
if(target){wrap=target.parentElement;wrap.classList.add('v302-photo');if(isPortrait)wrap.classList.add('is-portrait')}
else{wrap=document.createElement('div');wrap.className='v302-photo';wrap.style.cssText='max-width:980px;min-height:230px;margin:35px auto;border-radius:10px';const main=document.querySelector('main')||document.body;const anchor=main.querySelector('section:nth-of-type(2)')||main.querySelector('section');if(anchor)anchor.insertAdjacentElement('afterend',wrap);else main.prepend(wrap)}
const original=target?{src:target.getAttribute('src'),alt:target.alt}:null;
const trigger=document.createElement('button');trigger.className='v302-trigger';trigger.type='button';trigger.textContent='📷 この写真を変更';wrap.append(trigger);
function show(){const data=db.photos[slot];if(data?.src){if(!target){target=document.createElement('img');wrap.prepend(target)}target.src=data.src;target.alt=data.alt||'写真';target.style.transform=`scale(${Math.min(2,Math.max(1,data.zoom||1))})`;target.style.transformOrigin='center';wrap.querySelector('.v302-placeholder')?.remove()}else if(original){if(!target){target=document.createElement('img');wrap.prepend(target)}target.src=original.src;target.alt=original.alt;target.style.transform='';}else{target?.remove();target=null;if(!wrap.querySelector('.v302-placeholder')){const p=document.createElement('div');p.className='v302-placeholder';p.textContent='写真は後から追加できます';wrap.prepend(p)}}}
show();
let selected='';function open(){selected='';$('v302-file').value='';$('v302-msg').textContent='';$('v302-alt').value=db.photos[slot]?.alt||'';$('v302-zoom').value=Math.round((db.photos[slot]?.zoom||1)*100);$('v302-img').src=db.photos[slot]?.src||original?.src||'';$('v302-img').hidden=!$('v302-img').src;updateZoom();modal.classList.add('open')}
function updateZoom(){$('v302-img').style.transform=`scale(${$('v302-zoom').value/100})`}
$('v302-zoom').oninput=updateZoom;trigger.onclick=open;
$('v302-toggle').onclick=()=>{const active=!document.body.classList.contains('v302-editing');document.body.classList.toggle('v302-editing',active);$('v302-toggle').setAttribute('aria-pressed',String(active));$('v302-toggle').textContent=active?'✓ 編集中':'✎ 編集する'};
$('v302-preview').onclick=()=>{document.body.classList.remove('v302-editing');$('v302-toggle').setAttribute('aria-pressed','false');$('v302-toggle').textContent='✎ 編集する';bar.style.display='none';const back=document.createElement('button');back.textContent='編集に戻る';back.style.cssText='position:fixed;z-index:99999;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));background:#173b32;color:white;padding:12px;border:0;border-radius:10px';back.onclick=()=>{back.remove();bar.style.display='flex'};document.body.append(back)};
$('v302-manager').onclick=()=>{location.href='editor.html'};
$('v302-close').onclick=()=>modal.classList.remove('open');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
$('v302-file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)){ $('v302-msg').textContent='JPEG・PNG・WebPを選択してください';return}try{const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>{const im=new Image();im.onerror=reject;im.onload=()=>{const s=Math.min(1,1200/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.72))};im.src=r.result};r.readAsDataURL(f)});selected=src;$('v302-img').src=src;$('v302-img').hidden=false;$('v302-msg').textContent='プレビューを確認して保存してください'}catch(err){$('v302-msg').textContent='画像を読み込めませんでした'}};
$('v302-save').onclick=()=>{const src=selected||db.photos[slot]?.src||'';if(!src){$('v302-msg').textContent='先に写真を選択してください';return}const old=db.photos[slot];db.photos[slot]={src,alt:$('v302-alt').value.trim(),zoom:Number($('v302-zoom').value)/100};try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){if(old)db.photos[slot]=old;else delete db.photos[slot];$('v302-msg').textContent='保存容量不足です。画像を小さくしてください';return}show();modal.classList.remove('open')};
$('v302-remove').onclick=()=>{if(!confirm('このページの写真の下書きを削除しますか？'))return;delete db.photos[slot];try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}show();modal.classList.remove('open')};
if(new URLSearchParams(location.search).get('edit')==='1')$('v302-toggle').click();
})();