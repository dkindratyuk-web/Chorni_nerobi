const C='pwvault-v2',A=['./','index.html','app.js','manifest.webmanifest','xlsx.mini.min.js','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>Promise.allSettled(A.map(u=>c.add(u)))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request)))});
