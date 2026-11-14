// Holdout Squad: always fetch the newest page and version, cache everything else by version tag
const C='hs-cache';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  const fresh=r.mode==='navigate'||/(index\.html|version\.json|manifest\.json|\/)$/.test(u.pathname);
  if(fresh){e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r.mode==='navigate'?'./':r,cp));return res;}).catch(()=>caches.match(r.mode==='navigate'?'./':r)));return;}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})));
});
