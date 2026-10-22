const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const admin = fs.readFileSync(path.join(__dirname, '../admin.js'), 'utf8');
const customer = fs.readFileSync(path.join(__dirname, '../custom.js'), 'utf8');
const syncCode = admin.slice(admin.indexOf('async function finalConfirmSync()'), admin.indexOf('function discardLocalChanges()'));
function harness(queues, fetch, businessCommands = null) {
  const store = new Map(Object.entries(queues).map(([k,v])=>[k, JSON.stringify(v)]));
  const chain = {prop(){return this;},html(){return this;},fadeOut(){return this;}};
  const events = [];
  const ctx = {businessCommands,window:{},navigator:{},console:{error(){}},fetch,scriptURL:'https://test.invalid',
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    $:()=>chain,showToast:(...v)=>events.push(v),renderSyncList(){},updateSyncButtonUI(){},fetchDashboardDataBg(){},
    scannedTrackers:[],bootstrap:{Modal:{getInstance:()=>({hide(){}})}},document:{getElementById:()=>({})}};
  vm.createContext(ctx);vm.runInContext(syncCode,ctx);
  return {ctx,store,events,queue:k=>JSON.parse(store.get(k)||'[]')};
}
const ok = data=>({ok:true,json:async()=>data});
test('HTTP 200 application error preserves pending changes',async()=>{
 const h=harness({pendingUpdates:[{oid:'K1',action:'status',status:'Paid'}]},async()=>ok({result:'error'}));
 await h.ctx.finalConfirmSync();assert.equal(h.queue('pendingUpdates').length,1);assert.equal(h.ctx.window.kafakSyncInProgress,false);
});
test('HTTP failure and invalid JSON preserve pending data',async()=>{
 for(const response of [{ok:false,status:503},{ok:true,json:async()=>{throw Error('bad JSON');}}]){
 const h=harness({pendingExpenses:[{id:'E1'}]},async()=>response);await h.ctx.finalConfirmSync();assert.equal(h.queue('pendingExpenses').length,1);}
});
test('Partial success clears only acknowledged jobs',async()=>{
 const h=harness({pendingUpdates:[{oid:'K1',action:'status',status:'Paid'}],pendingExpenses:[{id:'E1'}]},async(_url,options)=>{
 const p=JSON.parse(options.body);return ok(p.action==='bulkUpdateStatus'?{result:'success',count:1}:{result:'error'});});
 await h.ctx.finalConfirmSync();assert.equal(h.queue('pendingUpdates').length,0);assert.equal(h.queue('pendingExpenses').length,1);
});
test('Edits changed or added while uploading survive acknowledgement',async()=>{
 const a={oid:'K1',action:'status',status:'Paid'};let h;
 h=harness({pendingUpdates:[a]},async()=>{h.store.set('pendingUpdates',JSON.stringify([{...a,status:'Dispatched'},{oid:'K2',action:'status',status:'Paid'}]));return ok({result:'success',count:1});});
 await h.ctx.finalConfirmSync();assert.equal(h.queue('pendingUpdates').length,2);assert.equal(h.queue('pendingUpdates')[0].status,'Dispatched');
});
test('Bulk partial count does not drop unconfirmed orders',async()=>{
 const h=harness({pendingUpdates:[{oid:'K1',action:'status'},{oid:'K2',action:'status'}]},async()=>ok({result:'success',count:1}));
 await h.ctx.finalConfirmSync();assert.equal(h.queue('pendingUpdates').length,2);
});
test('A repeated click cannot submit the same batch twice',async()=>{
 let resolve,calls=0;const pending=new Promise(r=>resolve=r);
 const h=harness({pendingUpdates:[{oid:'K1',action:'status'}]},async()=>{calls++;await pending;return ok({result:'success',count:1});});
 const first=h.ctx.finalConfirmSync();await h.ctx.finalConfirmSync();assert.equal(calls,1);resolve();await first;
});
test('Logout keeps all kinds of unsynced changes',()=>{
 const code=admin.slice(admin.indexOf('window.logoutAdmin ='),admin.indexOf('// INITIALIZATION'));
 for(const key of ['pendingUpdates','pendingExpenses','pendingPostalTrackers','offlineRevertTrackers']){
 const h=harness({[key]:[{id:1}]},()=>{});h.ctx.confirmAction=()=>assert.fail('Logout must be blocked');vm.runInContext(code,h.ctx);h.ctx.window.logoutAdmin();assert.equal(h.queue(key).length,1);
 }
});
test('Customer application failure closes loader and reports failure',async()=>{
 const code=customer.slice(customer.indexOf('function postOrder(data)'),customer.indexOf('// 2. Updated fetchCourierRates Function'));
 let hidden=false,notice='';const ctx={renderPendingRecovery(){},showLoader(){},window:{},stopOrderAnimation(){},sc:'https://test.invalid',fetch:async()=>ok({result:'error'}),$(){return {fadeOut(){hidden=true;},data(k,v){assert.equal(v,false);return this;},prop(k,v){assert.equal(v,false);return this;}}},checkForChanges(){},showAlert:s=>notice=s};
 vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.postOrder({});assert(hidden);assert.equal(ctx.window.orderSuccess,false);assert.match(notice,/could not be confirmed/);
});

test('Server confirmation signals presentation instead of skipping the video',async()=>{
 const code=customer.slice(customer.indexOf('function postOrder(data)'),customer.indexOf('// 2. Updated fetchCourierRates Function'));
 let signalled=false;
 const ctx={renderPendingRecovery(){},window:{},sc:'https://test.invalid',fetch:async()=>ok({result:'success',orderid:'K-test'}),currentLoginPhone:null,localUsersMap:{},SafeStorage:{setItem(){}},STORAGE_KEY:'test',finishOrderPresentation(){signalled=true;},stopOrderAnimation(){assert.fail('Do not interrupt video');},showAlert:message=>assert.fail(message)};
 vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.postOrder({name:'Test',phone:'0000000000'});
 assert(signalled);assert.equal(ctx.window.orderSuccess,true);
});

test('Cached quantity options come from product prices, not courier metadata',async()=>{
 const code=customer.slice(customer.indexOf('let courierRatesRequest = null;'),customer.indexOf('function renderQtyDropdowns()'));
 const ctx={window:{},sc:'https://test.invalid',translations:{en:{}},$(){return {val:()=> 'en',html(){}}},SafeStorage:{getItem:()=>JSON.stringify({KERALA:{baseRate:'1:62',serviceCharge:'1:18'},prices:{1:650,2:1300}})},renderQtyDropdowns(){},fetch:async()=>{throw Error('offline');}};
 vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.fetchCourierRates();assert.deepEqual(Array.from(ctx.globalQtyList),[1,2]);
});
test('India Post metadata wrapper retains existing print-tag cleanup',()=>{
 let observed;
 const ctx={window:{updateAdminMeta:()=>{observed=ctx.allOrders[0].adminMeta;}},allOrders:[{orderid:'K1',adminMeta:'W P_3'}],localStorage:{setItem(){}}};vm.createContext(ctx);
 const first=admin.slice(admin.indexOf('let originalUpdateAdminMeta ='),admin.indexOf('// 🔥 OPEN WHATSAPP CHAT ONLY'));
 const start=admin.indexOf('const updateAdminMetaBeforeIndiaPost =');const end=admin.indexOf('// ==========================================',start);
 vm.runInContext(first+'\n'+admin.slice(start,end),ctx);ctx.window.updateAdminMeta('K1','printed');assert.equal(observed,'W');
});

test('Phone search accepts country codes and formatting in every contact field', () => {
 const code = admin.slice(admin.indexOf('function normalizePhoneSearch('), admin.indexOf('window.filterOrders ='));
 const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
 for (const key of ['phone','whatsapp','altphone','paidNum']) {
  for (const stored of ['3232232321', '+91 3232 232321', '0091-3232-232321', '03232232321']) {
   for (const query of ['3232232321', '+91 3232 232321', '(+91) 3232-232321', '0091 3232232321', '03232232321']) {
    assert.equal(ctx.matchesOrderSearch({[key]:stored},query),true,`${key}: ${stored} / ${query}`);
   }
  }
 }
 assert.equal(ctx.matchesOrderSearch({phone:'9999999999'},'+91 3232 232321'),false);
 assert.equal(ctx.matchesOrderSearch({_searchStr:'customer abc123'},'abc123'),true);
});

test('Edit-page invoice uses the new order data and selected recipient', async () => {
 const code = customer.slice(customer.indexOf('async function sendToWhatsapp('), customer.indexOf('function renderEditView('));
 const ctx = {KafakBusinessOrder:require('../business-order.js'),successData:{orderid:'STALE'},savedOrderData:{orderid:'OLD'},adminPhone:'7788990313',
  localStorage:{getItem:()=> 'true'},$:()=>({val:()=> 'en'}),translations:{en:{wa_check_status:'Check order',txt_gpay:'GPay'}},
  isOutOfStock:false,window:{kafakStorage:{getItem:()=> 'true'},location:{href:''}},showAlert:()=>{throw Error('Invalid phone');}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 await ctx.sendToWhatsapp({orderid:'NEW123',product:'Cheruthen',quantity:1,name:'Customer',phone:'3232232321'},'+91 3232 232321');
 const url = new URL(ctx.window.location.href);
 assert.equal(url.pathname,'/913232232321');
 assert.match(url.searchParams.get('text'),/oid=NEW123/);
 assert.match(url.searchParams.get('text'),/Cheruthen/);
 assert.doesNotMatch(url.searchParams.get('text'),/oid=OLD|oid=STALE/);
 assert.ok(customer.includes('sendToWhatsapp(newData, getSelectedWAPhone(newData))'));
 assert.ok(!customer.includes("sendWA(orderIdx, 'pending')"));
});

test('Render lookup preserves first pending update and calculates dates once per order', () => {
 const start = admin.indexOf('    const pendingById = new Map();');
 const end = admin.indexOf('    window.paidRankMap = {};', start);
 const ctx = {pendingUpdates:[{oid:'K1',action:'meta'}, {oid:'K1',status:'Paid'}, {oid:'K1',status:'Sent'}]};
 vm.createContext(ctx);
 vm.runInContext(admin.slice(start,end)+'\nthis.lookup = getOrderInfo;',ctx);
 let reads=0;
 const order={orderid:'K1',Status:'Pending',get timestamp(){reads++;return '2026-10-14T10:00:00Z';}};
 const first=ctx.lookup(order);const initialReads=reads;
 for(let i=0;i<100;i++) assert.equal(ctx.lookup(order),first);
 assert.equal(reads,initialReads);assert.equal(first.status,'Paid');
});

test('Concurrent courier rate loads share a request and allow a later refresh', async () => {
 const start=customer.indexOf('let courierRatesRequest = null;');
 const end=customer.indexOf('function renderQtyDropdowns()',start);
 let calls=0,resolve;
 const chain={val:()=>'',html(){return this;}};
 const ctx={window:{},$:()=>chain,translations:{en:{}},SafeStorage:{getItem:()=>null},sc:'https://test.invalid',
 fetch:()=>{calls++;return new Promise(r=>resolve=r);}};
 vm.createContext(ctx);vm.runInContext(customer.slice(start,end),ctx);
 const a=ctx.fetchCourierRates(),b=ctx.fetchCourierRates();
 assert.equal(a,b);assert.equal(calls,1);
 resolve({json:async()=>({result:'error'})});await a;
 const c=ctx.fetchCourierRates();assert.equal(calls,2);
 resolve({json:async()=>({result:'error'})});await c;
});

test('Customer history index matches existing status and quantity rules', () => {
 const code=admin.slice(admin.indexOf('function buildCustomerStats('),admin.indexOf('function createCardHTML('));
 const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
 const rows=[{phone:'+91 3232 232321',quantity:2,Status:'Paid'},
 {Phone:'3232232321',Quantity:3,status:'Delivered'},
 ...['Refunded','Archive','Cancelled'].map(Status=>({phone:'3232232321',quantity:50,Status})),
 {phone:'3232232321',Status:'Pending'}, {phone:'9999999999',quantity:4,Status:'Sent'}];
 const stats=ctx.buildCustomerStats(rows);
 assert.equal(stats.get('3232232321').orders,3);
 assert.equal(stats.get('3232232321').bottles,6);
 assert.equal(stats.get('9999999999').bottles,4);
 rows[0].Status='Refunded';
 assert.equal(ctx.buildCustomerStats(rows).get('3232232321').orders,2);
});

test('admin today grouping follows IST and history defaults to 50',()=>{
 const code=admin.slice(admin.indexOf('function adminDayKey(value)'),admin.indexOf('window.loadMoreCards ='));
 const ctx={window:{},Intl,Date};vm.createContext(ctx);vm.runInContext(code,ctx);
 assert.equal(ctx.adminDayKey(new Date('2026-10-13T18:29:59Z')),'2026-10-13');
 assert.equal(ctx.adminDayKey(new Date('2026-10-13T18:30:00Z')),'2026-10-14');
 assert(Object.values(ctx.window.tabLimits).every(n=>n===50));
});

test('Success tick waits for video, name and server in every completion order',()=>{
 const code=customer.slice(customer.indexOf('function finishOrderPresentation()'),customer.indexOf('function playVideoAnimation('));
 for(const sequence of [['videoDone','nameDone','saved'],['saved','nameDone','videoDone'],['nameDone','videoDone','saved']]){
  let ticks=0,closed=0;const timers=[];
  const ctx={showLoader(){},orderPresentation:{videoDone:false,nameDone:false,finished:false},window:{orderSuccess:false},orderAnimationTimers:[],setTimeout(fn){timers.push(fn);return timers.length;},stopOrderAnimation(){},updateFooterButtons(){},sendToWhatsapp(){},$(selector){return {addClass(){if(selector==='#finalCheck')ticks++;},fadeOut(){closed++;},hide(){},fadeIn(){}}}};
  vm.createContext(ctx);vm.runInContext(code,ctx);
  sequence.forEach((event,index)=>{if(event==='saved')ctx.window.orderSuccess=true;else ctx.orderPresentation[event]=true;ctx.finishOrderPresentation();assert.equal(ticks,index===2?1:0);});
  ctx.finishOrderPresentation();assert.equal(ticks,1);assert.equal(closed,0);timers[0]();timers[1]();assert.equal(closed,1);
 }
});

test('Admin cards retain stored historical prices instead of current product hardcodes',()=>{
 const start=admin.indexOf('function calculatePriceInfo('),end=admin.indexOf('// ==========================================',start);
 let pending=[];const ctx={localStorage:{getItem:()=>JSON.stringify(pending)}};vm.createContext(ctx);vm.runInContext(admin.slice(start,end),ctx);
 assert.equal(ctx.calculatePriceInfo({product:'Cheruthen',Product_Amount:3900,Courier_Charge:140,Grand_Total:4040},2).total,'₹4040/-');
 assert.equal(ctx.calculatePriceInfo({product:'Old product',Courier_Charge:80,Grand_Total:730},1).total,'₹730/-');
 assert.match(ctx.calculatePriceInfo({Courier_Charge:80,Grand_Total:730},1).breakdownText,/650 \+ 80/);
 assert.equal(ctx.calculatePriceInfo({},1).total,'—');
 pending=[{oid:'K1',action:'meta',charge:150,total:4050}];assert.equal(ctx.calculatePriceInfo({orderid:'K1',Product_Amount:3900,Courier_Charge:140,Grand_Total:4040},2).total,'₹4050/-');
});

test('business queue batches at 100, preserves failed jobs and acknowledges only after removal',async()=>{
 const updates=Array.from({length:101},(_,i)=>({oid:'K'+i,action:'status',status:'Paid'}));let h,calls=0,acks=0;
 h=harness({pendingUpdates:updates},()=>assert.fail('Legacy writer must not run'),{send:async p=>{calls++;if(calls===2)throw Error('connection lost');assert.equal(p.updates.length,100);return {result:'success',count:100};},acknowledge:async()=>{acks++;assert.equal(h.queue('pendingUpdates').length,1);}});
 await h.ctx.finalConfirmSync();assert.equal(calls,2);assert.equal(acks,1);assert.equal(h.queue('pendingUpdates')[0].oid,'K100');
});

test('failed reads stop the status spinner and offer order-link help or retry without enabling stale edits',()=>{
 const code=customer.slice(customer.indexOf('function showOrderLoadError(error)'),customer.indexOf('function fetchOrder('));
 for(const status of [401,503]){
  const nodes=new Map();let hidden=false;const ctx={editingOrderId:'K-test',encodeURIComponent,showLoader:value=>hidden=value===false,$:selector=>{if(!nodes.has(selector))nodes.set(selector,{prop(k,v){this[k]=v;return this;},text(v){this.content=v;return this;},html(v){this.content=v;return this;},show(){return this;},hide(){this.hidden=true;return this;}});return nodes.get(selector);}};
  vm.createContext(ctx);vm.runInContext(code,ctx);ctx.showOrderLoadError({status});assert(hidden);assert.equal(nodes.get('.btn-update-sage').disabled,true);assert.equal(nodes.get('#admin-action-bar').hidden,true);assert.match(nodes.get('#status-area').content,status===401?/complete order link/:/Retry/);
 }
});
