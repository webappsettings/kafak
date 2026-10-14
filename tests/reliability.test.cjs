const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const admin = fs.readFileSync(path.join(__dirname, '../admin.js'), 'utf8');
const customer = fs.readFileSync(path.join(__dirname, '../custom.js'), 'utf8');
const syncCode = admin.slice(admin.indexOf('async function finalConfirmSync()'), admin.indexOf('function discardLocalChanges()'));
function harness(queues, fetch) {
  const store = new Map(Object.entries(queues).map(([k,v])=>[k, JSON.stringify(v)]));
  const chain = {prop(){return this;},html(){return this;},fadeOut(){return this;}};
  const events = [];
  const ctx = {window:{},navigator:{},console:{error(){}},fetch,scriptURL:'https://test.invalid',
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
 let hidden=false,notice='';const ctx={window:{},sc:'https://test.invalid',fetch:async()=>ok({result:'error'}),$(){return {fadeOut(){hidden=true;}}},showAlert:s=>notice=s};
 vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.postOrder({});assert(hidden);assert.equal(ctx.window.orderSuccess,false);assert.match(notice,/could not be confirmed/);
});
test('Cached quantity options come from product prices, not courier metadata',async()=>{
 const code=customer.slice(customer.indexOf('function fetchCourierRates()'),customer.indexOf('function renderQtyDropdowns()'));
 const ctx={sc:'https://test.invalid',translations:{en:{}},$(){return {val:()=> 'en',html(){}}},SafeStorage:{getItem:()=>JSON.stringify({KERALA:{baseRate:'1:62',serviceCharge:'1:18'},prices:{1:650,2:1300}})},renderQtyDropdowns(){},fetch:async()=>{throw Error('offline');}};
 vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.fetchCourierRates();assert.deepEqual(Array.from(ctx.globalQtyList),[1,2]);
});
test('India Post metadata wrapper retains existing print-tag cleanup',()=>{
 let observed;
 const ctx={window:{updateAdminMeta:()=>{observed=ctx.allOrders[0].adminMeta;}},allOrders:[{orderid:'K1',adminMeta:'W P_3'}],localStorage:{setItem(){}}};vm.createContext(ctx);
 const first=admin.slice(admin.indexOf('let originalUpdateAdminMeta ='),admin.indexOf('// 🔥 OPEN WHATSAPP CHAT ONLY'));
 const start=admin.indexOf('const updateAdminMetaBeforeIndiaPost =');const end=admin.indexOf('// ==========================================',start);
 vm.runInContext(first+'\n'+admin.slice(start,end),ctx);ctx.window.updateAdminMeta('K1','printed');assert.equal(observed,'W');
});
