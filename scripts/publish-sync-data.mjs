import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';

const FILES = {
  cc: ['assets/js/site-data.js','assets/data/creations-history.csv',
    'assets/data/creations-mod-daily.csv','assets/data/paid-creations-library-history.csv',
    'assets/data/site-version.json'],
  nexus: ['assets/data/nexus-mods.json','assets/data/nexus-history.csv',
    'assets/data/nexus-latest.json','assets/js/site-data.js']
};
const CSV_KEY = {
  'creations-history.csv':['timestamp'],
  'creations-mod-daily.csv':['date','title'],
  'paid-creations-library-history.csv':['timestamp'],
  'nexus-history.csv':['date','platform','mod_id']
};
const METRICS = new Set(['views','likes','bookmarks','downloads','plays',
  'libraryAdds','endorsements','total_downloads','unique_downloads','daily_downloads',
  'total_likes','total_plays','total_library_adds','total_paid_library_adds']);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const number=x=>Number(String(x??0).replace(/,/g,''))||0;
const maxMetric=(a,b)=>Math.max(number(a),number(b));
const dateMs=x=>{
  const t=String(x||'');
  const normalized=t.includes('T')?t:t.replace(' ','T')+'Z';
  return Date.parse(normalized)||0;
};
function parseCsv(source){
  const rows=[];let cells=[],cell='',quote=false;
  for(let i=0;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(c==='"'&&quote&&next==='"'){cell+='"';i++;}
    else if(c==='"')quote=!quote;
    else if(c===','&&!quote){cells.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quote){
      if(c==='\r'&&next==='\n')i++;
      cells.push(cell);cell='';
      if(cells.some(v=>v.trim()))rows.push(cells);
      cells=[];
    }else cell+=c;
  }
  if(quote)throw Error('Invalid quoted CSV');
  if(cell||cells.length){cells.push(cell);rows.push(cells);}
  const fields=rows.shift()||[];
  return {fields,rows:rows.map(values=>Object.fromEntries(fields.map((f,i)=>[f,values[i]??''])))};
}
function toCsv(fields,records){
  const escape=v=>{
    const s=String(v??'');
    return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
  };
  return [fields.join(','),...records.map(r=>fields.map(f=>escape(r[f])).join(','))].join('\n')+'\n';
}
function mergeCsv(file,base,remote,local){
  const a=parseCsv(base),b=parseCsv(remote),c=parseCsv(local);
  if(!eq(a.fields,b.fields)||!eq(a.fields,c.fields))throw Error('CSV columns changed: '+file);
  const columns=CSV_KEY[path.basename(file)];
  if(!columns)throw Error('Unsupported CSV: '+file);
  const key=r=>columns.map(k=>String(r[k]||'').trim().toLowerCase()).join('\0');
  const baseMap=new Map(a.rows.map(r=>[key(r),r]));
  const out=new Map(b.rows.map(r=>[key(r),r]));
  for(const row of c.rows){
    const k=key(row),old=baseMap.get(k),curr=out.get(k);
    if(!curr){out.set(k,row);continue;}
    const merged={...curr};
    for(const field of a.fields){
      if(METRICS.has(field)){
        merged[field]=String(Math.max(number(curr[field]),number(row[field]),number(old?.[field])));
      }else if(curr[field]===old?.[field]&&row[field]!==old?.[field]){
        merged[field]=row[field];
      }else if(field==='last_updated'&&dateMs(row[field])>dateMs(curr[field])){
        merged[field]=row[field];
      }
    }
    out.set(k,merged);
  }
  return toCsv(a.fields,[...out.entries()].sort(([a],[b])=>a.localeCompare(b))
    .map(([,row])=>row));
}
function parseSite(src){
  const context={window:{}};
  vm.runInNewContext(src,context,{timeout:3000,filename:'site-data.js'});
  return context.window.siteData;
}
function arrayReplace(src,name,items){
  const m=new RegExp('(?:^|\\n)  '+name+': \\[').exec(src);
  if(!m)throw Error('Site array not found: '+name);
  const start=m.index+m[0].lastIndexOf('[');
  let quote='',escaped=false,level=0,end=-1;
  for(let i=start;i<src.length;i++){
    const x=src[i];
    if(quote){
      if(escaped)escaped=false;
      else if(x==='\\')escaped=true;
      else if(x===quote)quote='';
    }else if(x==='"'||x==="'"||x===String.fromCharCode(96))quote=x;
    else if(x==='[')level++;
    else if(x===']'&&--level===0){end=i;break;}
  }
  if(end<0)throw Error('Unclosed site array: '+name);
  return src.slice(0,start)+JSON.stringify(items,null,2).replace(/\n/g,'\n  ')+src.slice(end+1);
}
function itemKey(x,mode){
  if(mode==='cc'){
    const u=x?.links?.find(l=>/creations\.bethesda\.net/.test(l.url||''))?.url||'';
    return (u.match(/\/details\/([0-9a-f-]{36})/i)?.[1]||x.title||'').toLowerCase();
  }
  const u=x?.links?.find(l=>/nexusmods\.com/.test(l.url||''))?.url||'';
  return String(x.mod_id||u.match(/\/mods\/(\d+)/)?.[1]||x.title||x.name||'').toLowerCase();
}
function mergeRecords(oldRecords,remoteRecords,localRecords,mode){
  const base=new Map(oldRecords.map(x=>[itemKey(x,mode),x]));
  const merged=new Map(remoteRecords.map(x=>[itemKey(x,mode),x]));
  for(const fresh of localRecords){
    const k=itemKey(fresh,mode),old=base.get(k),curr=merged.get(k);
    if(!k)continue;
    if(!curr){merged.set(k,fresh);continue;}
    const out={...curr};
    for(const [field,value] of Object.entries(fresh)){
      if(METRICS.has(field)){
        const n=Math.max(number(curr[field]),number(value),number(old?.[field]));
        out[field]=typeof value==='string'||typeof curr[field]==='string'?
          n.toLocaleString('en-US'):n;
      }else if(!(field in curr))out[field]=value;
      else if(eq(curr[field],old?.[field]))out[field]=value;
      else if(field==='updatedAt'||field==='last_updated'){
        out[field]=dateMs(value)>dateMs(curr[field])?value:curr[field];
      }else if(mode==='cc'&&dateMs(fresh.updatedAt)>dateMs(curr.updatedAt)){
        out[field]=value;
      }
    }
    merged.set(k,out);
  }
  return [...merged.values()];
}
function mergeSite(mode,base,remote,local){
  const key=mode==='cc'?'creations':'mods';
  const a=parseSite(base),b=parseSite(remote),c=parseSite(local);
  if(!Array.isArray(a?.[key])||!Array.isArray(b?.[key])||!Array.isArray(c?.[key]))
    throw Error('Invalid site-data '+key);
  return arrayReplace(remote,key,mergeRecords(a[key],b[key],c[key],mode));
}
function mergeJson(file,base,remote,local){
  const a=JSON.parse(base),b=JSON.parse(remote),c=JSON.parse(local);
  if(file.endsWith('site-version.json')){
    return JSON.stringify(dateMs(b.updatedAt)>=dateMs(c.updatedAt)?b:c,null,2)+'\n';
  }
  if(!Array.isArray(b.mods)||!Array.isArray(c.mods)||!Array.isArray(a.mods))
    throw Error('Expected mods array in '+file);
  const value={...b,mods:mergeRecords(a.mods,b.mods,c.mods,'nexus')};
  if(file.endsWith('nexus-latest.json')){
    const currentNewer=dateMs(b.updatedAt)>=dateMs(c.updatedAt);
    value.updatedAt=currentNewer?b.updatedAt:c.updatedAt;
    // Daily downloads are per-day, NOT lifetime counters. Across different
    // statistical days they must reset rather than taking the lifetime max.
    const statisticalDay=stamp=>new Date(dateMs(stamp)-4*3600000)
      .toISOString().slice(0,10);
    if(statisticalDay(b.updatedAt)!==statisticalDay(c.updatedAt)){
      const currentById=new Map(b.mods.map(x=>[String(x.mod_id),x]));
      const freshById=new Map(c.mods.map(x=>[String(x.mod_id),x]));
      for(const item of value.mods){
        const latest=(currentNewer?currentById:freshById).get(String(item.mod_id));
        if(latest&&Object.hasOwn(latest,'daily_downloads'))
          item.daily_downloads=latest.daily_downloads;
      }
    }
  }
  return JSON.stringify(value,null,2)+'\n';
}
function mergeFile(mode,file,base,remote,local){
  if(remote===base)return local;
  if(local===base)return remote;
  if(file.endsWith('.csv'))return mergeCsv(file,base,remote,local);
  if(file==='assets/js/site-data.js')return mergeSite(mode,base,remote,local);
  if(file.endsWith('.json'))return mergeJson(file,base,remote,local);
  throw Error('Cannot merge unknown file: '+file);
}
const git=(args,cwd)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const tryGit=(args,cwd)=>spawnSync('git',args,{cwd,encoding:'utf8'});
function selfTest(){
  const file='assets/data/paid-creations-library-history.csv';
  const base='timestamp,total_paid_library_adds\n2026-10-28 10:00,100\n';
  const r=base+'2026-10-28 10:30,105\n';
  const l=base+'2026-10-28 10:20,103\n';
  const rows=parseCsv(mergeFile('cc',file,base,r,l)).rows;
  assert.equal(rows.length,3);
  assert.deepEqual(rows.map(x=>x.total_paid_library_adds),['100','103','105']);
  const daily='assets/data/creations-mod-daily.csv';
  const d='date,title,downloads,daily_downloads,last_updated\n2026-10-28,A,100,1,2026-10-28 10:00\n';
  const m=parseCsv(mergeFile('cc',daily,d,d.replace('100,1,','104,5,'),
    d.replace('100,1,','102,3,'))).rows[0];
  assert.equal(m.downloads,'104');
  const site=rows=>'window.siteData = {\n  mods: [],\n  creations: '+JSON.stringify(rows)+',\n  socials: []\n};\n';
  const e=(views,time)=>({title:'A',views:String(views),updatedAt:time});
  const record=parseSite(mergeSite('cc',site([e(10,'2026-10-28 10:00')]),
    site([e(15,'2026-10-28 10:30')]),
    site([e(13,'2026-10-28 10:20')]))).creations[0];
  assert.equal(record.views,'15');
  assert.equal(record.updatedAt,'2026-10-28 10:30');
  const o=JSON.stringify({updatedAt:'2026-10-28T10:00:00Z',mods:[{mod_id:'1',total_downloads:10}]});
  const n=JSON.stringify({updatedAt:'2026-10-28T10:30:00Z',mods:[{mod_id:'1',total_downloads:15}]});
  const f=JSON.stringify({updatedAt:'2026-10-28T10:20:00Z',mods:[{mod_id:'1',total_downloads:12},{mod_id:'2',total_downloads:1}]});
  const data=JSON.parse(mergeJson('nexus-latest.json',o,n,f));
  assert.equal(data.mods[0].total_downloads,15);
  assert.equal(data.mods.length,2);
  const overnightRemote=JSON.stringify({updatedAt:'2026-10-29T04:20:00Z',
    mods:[{mod_id:'1',total_downloads:16,daily_downloads:0}]});
  const overnightLocal=JSON.stringify({updatedAt:'2026-10-28T08:20:00Z',
    mods:[{mod_id:'1',total_downloads:15,daily_downloads:8}]});
  const overnight=JSON.parse(mergeJson('nexus-latest.json',o,overnightRemote,overnightLocal));
  assert.equal(overnight.mods[0].daily_downloads,0);
  console.log('[SYNC_PUBLISH] All merge self-tests passed');
}
async function publish(mode){
  const files=FILES[mode];
  if(!files)throw Error('Specify cc or nexus');
  const origin=process.cwd(),baseline=git(['rev-parse','HEAD'],origin);
  const harvested=new Map(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
  const base=new Map(files.map(f=>[f,execFileSync('git',['show',baseline+':'+f],
    {cwd:origin,encoding:'utf8'})]));
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tgg-sync-'));
  const work=path.join(temp,'checkout');
  let attached=false;
  try{
    for(let attempt=1;attempt<=5;attempt++){
      git(['fetch','--no-tags','origin','main'],origin);
      const remoteSha=git(['rev-parse','FETCH_HEAD'],origin);
      if(!attached){
        git(['worktree','add','--detach',work,remoteSha],origin);
        attached=true;
      }else git(['reset','--hard',remoteSha],work);
      for(const f of files){
        const dest=path.join(work,f);
        const remote=fs.readFileSync(dest,'utf8');
        const content=mergeFile(mode,f,base.get(f),remote,harvested.get(f));
        if(content!==remote)fs.writeFileSync(dest,content);
      }
      git(['add','--',...files],work);
      const diff=tryGit(['diff','--cached','--quiet'],work);
      if(diff.status===0){console.log('[SYNC_PUBLISH] No new data to publish');return;}
      if(diff.status!==1)throw Error('Cannot inspect staged changes');
      git(['-c','user.name=github-actions[bot]',
        '-c','user.email=41898282+github-actions[bot]@users.noreply.github.com',
        'commit','-m',mode==='cc'?'Update Creations stats and covers':
          'Update Nexus dashboard data'],work);
      const pushed=tryGit(['push','origin','HEAD:main'],work);
      if(pushed.status===0){
        console.log('[SYNC_PUBLISH] Published '+mode+' (attempt '+attempt+')');
        return;
      }
      git(['fetch','--no-tags','origin','main'],origin);
      if(git(['rev-parse','FETCH_HEAD'],origin)===remoteSha)
        throw Error('Push rejected without new remote commit: '+pushed.stderr);
      console.warn('[SYNC_PUBLISH] main advanced, merging again ('+attempt+'/5)');
    }
    throw Error('Five merge attempts exhausted; no forced push performed');
  }finally{
    if(attached)tryGit(['worktree','remove','--force',work],origin);
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
if(process.argv.includes('--self-test'))selfTest();
else publish(process.argv[2]).catch(e=>{
  console.error('[SYNC_PUBLISH] '+e.message);
  process.exitCode=1;
});
