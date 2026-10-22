const {chromium}=require('C:/Users/Abdul Samad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'), token='a'.repeat(43),id='K-TEST-RETURN';
const row={orderid:id,version:1,status:'Pending',name:'Return Flow Test',phone:'9999999999',whatsapp:'9999999999',house:'Test house',place:'Test place',postoffice:'Test PO',district:'Ernakulam',state:'Kerala',pincode:'682001',product:'Vanthen',quantity:1,productAmount:650,courierAmount:80,total:730,date:'2026-10-22T06:00:00Z'};
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
for(const mode of ['valid','missing','expired','retry','new']){
 const context=await browser.newContext({serviceWorkers:"block"});const page=await context.newPage();page.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()));let reads=0,fail=mode==='retry',writes=0;const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
 await page.route('https://www.kafaklife.com/**',async r=>{const u=new URL(r.request().url());let f=path.join(root,decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile()){
 let body=fs.readFileSync(f);if(u.pathname==='/backend-api.js')body=Buffer.from(body.toString().replace('https://production.kafaklife.com/kafak-business/api','https://www.kafaklife.com/kafak-business/api'));if(mode==='baseline'&&u.pathname==='/custom.js')body=execFileSync('git',['show','HEAD:custom.js'],{cwd:root});
 await r.fulfill({body,contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':undefined});}else await r.continue();});
 await page.route('**/kafak-business/api/**',async r=>{const u=new URL(r.request().url());const fulfill=data=>r.fulfill({...data,headers:{'Access-Control-Allow-Origin':'https://www.kafaklife.com','Access-Control-Allow-Credentials':'true'}});if(r.request().method()!=='GET'){writes++;return r.abort();}if(u.pathname.endsWith('/public/order')){reads++;return fulfill({status:['expired','missing'].includes(mode)?401:fail?503:200,json:['expired','missing'].includes(mode)||fail?{error:'Test unavailable'}:row});}if(u.pathname.endsWith('/public/catalog'))return fulfill({json:[{sku:'TEST-HN',name:'Vanthen',units:1,price:650,variant:'650 g'}]});if(u.pathname.endsWith('/public/settings'))return fulfill({json:{contactPhone:'9999999998',stockStatus:'yes',acceptingOrders:true}});return fulfill({json:{}});});
 const url='https://www.kafaklife.com/order.html'+(mode==='new'?'':'?oid='+id+(mode==='missing'?'':'#access='+token));
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof handlePhoneNext==='function');
 if(mode==='baseline'||mode==='new'){await page.locator('#phone').waitFor({state:'visible'});await page.locator('#phone').fill('9999999999');await page.locator('#btn-group-0 button').click({timeout:5000});}
 if(mode==='baseline'){await page.locator('#wizard-view').waitFor({state:'visible'});assert.equal(reads,0);}
 else if(mode==='valid'){await page.locator('#returning-user-view').waitFor({state:'visible'});assert.equal(await page.locator('#edit-phone').inputValue(),'9999999999');assert.ok(reads>0);}
 else if(mode==='expired'||mode==='missing'){await page.locator('#order-entry-error').waitFor({state:'visible'});assert.match(await page.locator('#order-entry-error').innerText(),/complete order link/);assert.equal(await page.locator('#wizard-view').isVisible(),false);}
 else if(mode==='retry'){await page.locator('#order-entry-error').waitFor({state:'visible'});fail=false;await page.locator('#order-entry-error button').click();await page.locator('#returning-user-view').waitFor({state:'visible'});}
 else await page.locator('#wizard-view').waitFor({state:'visible'});
 assert.equal(writes,0);assert.deepEqual(errors,[]);console.log(mode+': PASS, order reads='+reads+', writes='+writes);await context.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});









