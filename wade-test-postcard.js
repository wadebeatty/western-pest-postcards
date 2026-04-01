const sharp = require('sharp');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const API_KEY = 'AIzaSyA5L5yGAII6vmygM_1IZrdl9IwDu5vEWCY';
const TRUCK = '/Users/max/Library/Mobile Documents/com~apple~CloudDocs/openclaw/westernmarketing/4.1 Pictures/2025 Pictures/Vehicle/Truck with Zion in background.jpg';
const SHIELD = '/Users/max/Library/Mobile Documents/com~apple~CloudDocs/openclaw/westernmarketing/0.1 Logo Externally Shared /Shared Externally/W Shield -signature.png';
const STAFF_DIR = '/Users/max/.openclaw/workspace-weston/assets/staff-photos';
const OUT = '/Users/max/.openclaw/workspace-weston/assets/movein-postcards/send-ready';
fs.mkdirSync(OUT, { recursive: true });

const W = 1100, H = 600;
const PHONE = '(435) 635-1456';  // UPDATED PHONE

const ALL_REVIEWS = [
  { text: '"Not all heroes wear capes. Some wear Western Pest Control pinstriped shirts. God Bless you!"', author: 'Mark Z., St. George' },
  { text: '"They will also come back for free if you need a respray. Best pest company in Southern Utah."', author: 'Kilee F.' },
  { text: '"Austin noticed ant activity and treated for it without me showing or asking him first."', author: 'Mark Christensen' },
  { text: '"I\'ve been using Western Pest for several years. We almost never see a pest of any kind."', author: 'L. Starr, St. George' },
  { text: '"Our technician remembered our preferences and never missed a beat. That\'s real service."', author: 'Rob H., St. George' },
  { text: '"This operation is exceptional. Our trust level is high. Our satisfaction level is high."', author: 'Dennis F.' },
  { text: '"Called on Friday and they had someone out by Monday morning. Fast, professional, no drama."', author: 'Verified Reviewer' },
  { text: '"Brighton put our Amazon packages in the garage while we were out of town. Above and beyond."', author: 'Kathy M., St. George' },
];

const FIELD_TECHS = ['austin','scott','silver','chris','adam','chadein','lincoln','craig'];

const PEOPLE = [
  { name: 'Wade Beatty', addr: '191 N 755 W', city: 'Hurricane', st: 'UT', zip: '84737' },
];

function wrapLines(t,max){const w=t.split(' ');const l=[];let c='';for(const x of w){const s=c?c+' '+x:x;if(s.length<=max){c=s;}else{if(c)l.push(c);c=x;}}if(c)l.push(c);return l;}
function fetchBestSV(a,c,s){const hs=[0,45,90,135,180,225,270,315];return Promise.all(hs.map(h=>new Promise((res)=>{const q=encodeURIComponent(`${a},${c},${s}`);const u=`https://maps.googleapis.com/maps/api/streetview?size=900x200&location=${q}&key=${API_KEY}&fov=75&heading=${h}&pitch=5&source=outdoor`;const ch=[];https.get(u,(r)=>{r.on('data',d=>ch.push(d));r.on('end',()=>{const b=Buffer.concat(ch);res({buf:b.length>12000?b:null,size:b.length});});}).on('error',()=>res({buf:null,size:0}));}))).then(r=>{const v=r.filter(x=>x.buf);v.sort((a,b)=>b.size-a.size);return v.length?v[0].buf:null;});}
async function makeCircle(src,size){const ib=await sharp(src).resize(size,size,{fit:'cover',position:'top'}).toBuffer();const m=Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);const md=await sharp(ib).composite([{input:m,blend:'dest-in'}]).png().toBuffer();const ring=size+8;const b=Buffer.from(`<svg width="${ring}" height="${ring}"><circle cx="${ring/2}" cy="${ring/2}" r="${ring/2}" fill="#c8870a"/></svg>`);return sharp({create:{width:ring,height:ring,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:b},{input:md,top:4,left:4}]).png().toBuffer();}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&apos;');}
function upload(f){try{const r=execSync(`curl -s -F "reqtype=fileupload" -F "fileToUpload=@${f}" https://catbox.moe/user/api.php`,{timeout:30000}).toString().trim();return r.startsWith('https://')?r:null;}catch(e){return null;}}

async function buildOne(p,i){
  const slug=p.name.replace(/[^a-z0-9]/gi,'-').toLowerCase();
  const ff=path.join(OUT,`${String(i+1).padStart(2,'0')}-${slug}-front-print.jpg`);
  const bf=path.join(OUT,`${String(i+1).padStart(2,'0')}-${slug}-back-print.jpg`);
  const sv=await fetchBestSV(p.addr,p.city,p.st);
  const shield=await sharp(SHIELD).resize(80,80,{fit:'contain'}).png().toBuffer();
  const sm=await sharp(SHIELD).resize(36,36,{fit:'contain'}).png().toBuffer();
  const tn=FIELD_TECHS[i%FIELD_TECHS.length];
  const td=tn.charAt(0).toUpperCase()+tn.slice(1);
  const port=await makeCircle(path.join(STAFF_DIR,`${tn}.jpg`),90);
  const qr=await(require('qrcode').toBuffer('https://wpest.com?utm_source=postcard&utm_medium=movein',{width:62,margin:1,color:{dark:'#1a3a6b',light:'#ffffff'}}));
  const en=esc(p.name);const al=esc(p.addr+', '+p.city+', UT');
  let rs='';
  for(let r=0;r<8;r++){
    const col=r%4,row=r<4?0:1,x=8+col*162,y=166+row*88;
    const rev=ALL_REVIEWS[(i+r)%8];const ls=wrapLines(rev.text,26);
    rs+=`<rect x="${x}" y="${y}" width="158" height="84" rx="4" fill="#f5f7ff" stroke="#dde" stroke-width="1"/><text x="${x+5}" y="${y+13}" font-family="Arial,sans-serif" font-size="11" fill="#c8870a">★★★★★</text><text x="${x+5}" y="${y+26}" font-family="Arial,sans-serif" font-size="9" fill="#333" font-style="italic">${esc(ls[0]||'')}</text><text x="${x+5}" y="${y+38}" font-family="Arial,sans-serif" font-size="9" fill="#333" font-style="italic">${esc(ls[1]||'')}</text><text x="${x+5}" y="${y+50}" font-family="Arial,sans-serif" font-size="9" fill="#333" font-style="italic">${esc(ls[2]||'')}</text><text x="${x+5}" y="${y+79}" font-family="Arial,sans-serif" font-size="8" fill="#1a3a6b" font-weight="bold">— ${esc(rev.author)}</text>`;
  }
  const sf=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="black" stop-opacity="0.48"/><stop offset="100%" stop-color="black" stop-opacity="0"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.9"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#t)"/><rect width="${W}" height="${H}" fill="url(#b)"/><text x="100" y="46" font-family="Arial Black,sans-serif" font-size="26" fill="white" letter-spacing="3">WESTERN</text><text x="100" y="70" font-family="Arial,sans-serif" font-size="17" font-weight="bold" fill="#FFD700" letter-spacing="2">PEST CONTROL</text><text x="100" y="90" font-family="Arial,sans-serif" font-size="11" fill="rgba(255,255,255,0.75)">Here For Good Since 2001</text><rect x="670" y="15" width="415" height="88" rx="8" fill="#1a3a6b" opacity="0.95"/><text x="878" y="42" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">WELCOME TO THE</text><text x="878" y="66" font-family="Arial Black,sans-serif" font-size="21" fill="#FFD700" text-anchor="middle">NEIGHBORHOOD</text><text x="878" y="90" font-family="Arial,sans-serif" font-size="12" fill="rgba(255,255,255,0.85)" text-anchor="middle">${en}</text><text x="28" y="400" font-family="Arial,sans-serif" font-size="14" fill="#FFD700" font-weight="bold">🏆 NEW NEIGHBOR SPECIAL — CALL BEFORE APRIL 15</text><text x="28" y="448" font-family="Arial Black,sans-serif" font-size="42" fill="white">Award-Winning</text><text x="28" y="496" font-family="Arial Black,sans-serif" font-size="42" fill="white">Pest Service.</text><text x="28" y="540" font-family="Arial Black,sans-serif" font-size="34" fill="#FFD700">&#36;45/month</text><text x="28" y="578" font-family="Arial,sans-serif" font-size="19" fill="white" opacity="0.9">${PHONE}  ·  wpest.com</text></svg>`);
  const tmpF='/tmp/front-tmp.jpg';
  await sharp(TRUCK).resize(W,H).composite([{input:sf,top:0,left:0},{input:shield,top:10,left:10}]).jpeg({quality:93}).toFile(tmpF);
  await sharp(tmpF).resize(3375,1875,{fit:'fill'}).jpeg({quality:95}).toFile(ff);

  const sb=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="152" width="664" height="448" fill="white"/><rect x="664" y="0" width="436" height="${H}" fill="white"/><rect x="8" y="8" width="648" height="142" fill="none" stroke="#eee" stroke-width="1" rx="3"/><rect x="8" y="108" width="648" height="42" fill="rgba(10,20,50,0.82)"/><text x="116" y="124" font-family="Arial,sans-serif" font-size="9" fill="white">Your Service Professional:</text><text x="116" y="142" font-family="Arial Black,sans-serif" font-size="11" fill="#FFD700">${td}</text><text x="340" y="124" font-family="Arial,sans-serif" font-size="9" fill="rgba(255,255,255,0.9)" font-weight="bold">PROTECT YOUR HOME</text><text x="340" y="142" font-family="Arial,sans-serif" font-size="9" fill="rgba(255,255,255,0.8)">${al}</text><line x1="664" y1="8" x2="664" y2="592" stroke="#eeeeee" stroke-width="1"/><text x="8" y="162" font-family="Arial Black,sans-serif" font-size="11" fill="#1a3a6b">WHAT YOUR NEIGHBORS SAY:</text><text x="295" y="162" font-family="Arial,sans-serif" font-size="9" fill="#888">3,000+ Five-Star Reviews  ·  25 Years  ·  97% Retention</text>${rs}<rect x="8" y="342" width="648" height="22" rx="3" fill="#1a3a6b"/><text x="14" y="357" font-family="Arial,sans-serif" font-size="9" fill="white">🏆 Green Pro  ✅ Quality Pro  🛡️ BBB Accredited  🐾 Pet Friendly  🌿 EPA-Approved  ⚡ 5-Hr Response  📋 100% Guarantee</text><rect x="8" y="370" width="648" height="42" rx="3" fill="#c8870a"/><text x="14" y="388" font-family="Arial Black,sans-serif" font-size="15" fill="white">NEW NEIGHBOR SPECIAL — &#36;45/month — CALL BEFORE APRIL 15</text><text x="14" y="404" font-family="Arial,sans-serif" font-size="10" fill="rgba(255,255,255,0.92)">Free re-treatment  ·  No hidden fees  ·  5-hour response  ·  Pet friendly  ·  EPA-approved</text><text x="8" y="432" font-family="Arial Black,sans-serif" font-size="13" fill="#c8870a">CALL NOW ▶</text><text x="116" y="432" font-family="Arial Black,sans-serif" font-size="21" fill="#1a3a6b">${PHONE}  ·  wpest.com</text><text x="8" y="460" font-family="Arial Black,sans-serif" font-size="17" fill="#1a3a6b">Western Pest Control — Here for Good!</text><rect x="806" y="12" width="140" height="44" rx="3" fill="none" stroke="#ccc" stroke-width="1" stroke-dasharray="4,3"/><text x="876" y="30" font-family="Arial,sans-serif" font-size="10" fill="#bbb" text-anchor="middle">POSTAGE</text><text x="876" y="46" font-family="Arial,sans-serif" font-size="10" fill="#bbb" text-anchor="middle">HERE</text><text x="674" y="80" font-family="Arial,sans-serif" font-size="9.5" fill="#666">Western Pest Control</text><text x="674" y="94" font-family="Arial,sans-serif" font-size="9.5" fill="#666">553 W. Calle Del Sol Ste A101</text><text x="674" y="108" font-family="Arial,sans-serif" font-size="9.5" fill="#666">Washington, UT 84780</text><text x="674" y="218" font-family="Arial,sans-serif" font-size="9" fill="#1a3a6b" font-weight="bold">Scan for New Neighbor Deal:</text><line x1="674" y1="316" x2="1085" y2="316" stroke="#ccc" stroke-width="1"/><line x1="674" y1="344" x2="1085" y2="344" stroke="#ccc" stroke-width="1"/><line x1="674" y1="372" x2="1085" y2="372" stroke="#ccc" stroke-width="1"/><line x1="674" y1="400" x2="1085" y2="400" stroke="#ccc" stroke-width="1"/><text x="674" y="336" font-family="Arial,sans-serif" font-size="13" fill="#111">${en}</text><text x="674" y="364" font-family="Arial,sans-serif" font-size="13" fill="#111">${p.addr}</text><text x="674" y="392" font-family="Arial,sans-serif" font-size="13" fill="#111">${p.city} ${p.st}  ${p.zip}</text></svg>`);
  const bl=[];
  if(sv){const s=await sharp(sv).resize(648,142,{fit:'cover'}).jpeg({quality:90}).toBuffer();bl.push({input:s,top:8,left:8});}
  else{const ph=await sharp({create:{width:648,height:142,channels:3,background:{r:235,g:240,b:250}}}).jpeg().toBuffer();bl.push({input:ph,top:8,left:8});}
  bl.push({input:sb,top:0,left:0});bl.push({input:sm,top:10,left:618});bl.push({input:port,top:12,left:10});bl.push({input:qr,top:230,left:674});
  const tmpB='/tmp/back-tmp.jpg';
  await sharp({create:{width:W,height:H,channels:3,background:{r:255,g:255,b:255}}}).composite(bl).jpeg({quality:93}).toFile(tmpB);
  await sharp(tmpB).resize(3375,1875,{fit:'fill'}).jpeg({quality:95}).toFile(bf);

  const fu=upload(ff), bu=upload(bf);
  console.log(`✓ ${i+1}/41 ${p.name} (${td}) built — SV:${sv?'Y':'N'} upload:${fu?'OK':'FAIL'}`);
  return {p,fu,bu};
}

async function run(){
  const results=[];
  for(let i=0;i<PEOPLE.length;i++){
    const r=await buildOne(PEOPLE[i],i);
    if(r) results.push(r);
    await new Promise(x=>setTimeout(x,600));
  }
  fs.writeFileSync('/tmp/lob-ready.json', JSON.stringify(results,null,2));
  console.log('ALL BUILT — ready for Lob send');
}
run().catch(console.error);
