const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const pw=require('C:/Users/Abdul Samad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),token='a'.repeat(43),oid='K-261014195632';
(async()=>{const browser=await pw[process.env.ENGINE||'chromium'].launch({headless:true});try{for(const width of [390,1280]){
 const c=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),p=await c.newPage();let writes=0,recoveries=0;
 const row={orderid:oid,version:1,status:'Pending',name:'Recovery Test',phone:'9999999999',whatsapp:'9999999999',house:'Test house',place:'Test place',postoffice:'Test PO',district:'Ernakulam',state:'KERALA',pincode:'682001',product:'Vanthen',quantity:1,productAmount:650,courierAmount:80,total:730,date:'2026-10-22T06:00:00Z'};
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://www.kafaklife.com/**',r=>{const u=new URL(r.request().url()),file=path.join(root,u.pathname);if(/\.(mp4|webm)$/.test(file))return r.abort();if(fs.existsSync(file)&&fs.statSync(file).isFile())return r.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.gif')?'image/gif':undefined});return r.abort();});
 await p.route('**/kafak-business/api/**',r=>{const req=r.request(),u=new URL(req.url()),send=(x,status=200)=>r.fulfill({status,json:x,headers:{'Access-Control-Allow-Origin':'https://www.kafaklife.com','Access-Control-Allow-Credentials':'true'}});
 if(u.pathname.endsWith('/public/order-recovery')){recoveries++;const d=req.postDataJSON();return d.oid===oid&&d.phone===row.phone?send({orderid:oid,accessToken:token}):send({error:'Check the phone number used for this order.'},403);}
 if(u.pathname.endsWith('/public/order')){if(req.headers().authorization!=='Bearer '+token)return send({error:'Use private link'},401);if(req.method()==='POST'){writes++;Object.assign(row,req.postDataJSON().data);row.version++;return send({result:'success',order:row});}return send(row);}
 if(u.pathname.endsWith('/public/catalog'))return send([{sku:'TEST-HN',name:'Vanthen',units:1,price:650,variant:'650 g'}]);
 if(u.pathname.endsWith('/public/settings'))return send({contactPhone:'9999999997',stockStatus:'yes',acceptingOrders:true});return send({});});
 await p.goto('https://www.kafaklife.com/order.html?oid='+oid);await p.locator('#full-loader').waitFor({state:'hidden'});
 assert.equal(await p.locator('#order-entry-error').count(),0);assert.equal(await p.locator('#step-0').isVisible(),true);
 assert(await p.locator('#full-loader img').evaluate(el=>el.complete&&el.naturalWidth>0&&el.style.display==='block'));
 await p.locator('#phone').fill('9999999998');await p.locator('#btn-group-0 button').click();await p.locator('#order-entry-error').waitFor();assert.equal(await p.locator('#returning-user-view').isVisible(),false);
 await p.locator('#phone').fill(row.phone);await p.locator('#btn-group-0 button').click();await p.locator('#returning-user-view').waitFor();await p.locator('#full-loader').waitFor({state:'hidden'});
 assert.equal(await p.locator('#order-entry-error').count(),0);await p.locator('#btn-edit-addr').click();await p.locator('#edit-house').fill('Updated house');await p.locator('#address-edit-box button').click();await p.waitForFunction(()=>window.orderSuccess===true);assert.equal(writes,1);assert.equal(row.house,'Updated house');
 await p.reload();await p.locator('#full-loader').waitFor({state:'hidden'});await p.locator('#returning-user-view').waitFor();assert.equal(recoveries,2);assert.deepEqual(errors,[]);
 await p.evaluate(()=>{const el=document.querySelector('#full-loader img');el.dispatchEvent(new Event('error'));});assert.equal(await p.locator('#loader-fallback').evaluate(el=>el.style.display),'inline-block');
 console.log(JSON.stringify({engine:process.env.ENGINE||'chromium',width,phoneRecovery:true,wrongPhoneDenied:true,editSaved:true,reloadRetained:true,gifAndFallback:true,writes,errors}));await c.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
