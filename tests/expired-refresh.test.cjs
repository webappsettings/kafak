const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('expired refresh opens login and preserves pending drafts',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8');
 const start=source.indexOf('function fetchOrders(forceLoad = false)');
 const end=source.indexOf('// 🔥 RENDER TABS',start);
 const elements={};const saved=new Map([['pendingUpdates','draft'],['kafakAdmin','true']]);
 const context={businessFetchSerial:0,businessApi:{feed:()=>Promise.reject(Object.assign(Error('Sign in required'),{status:401}))},document:{getElementById:id=>elements[id]||(elements[id]={style:{}})},localStorage:{getItem:k=>saved.get(k),removeItem:k=>saved.delete(k)},console,alert:()=>assert.fail('must show login instead of network alert')};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);context.fetchOrders(true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(elements['login-section'].style.display,'flex');assert.equal(saved.get('pendingUpdates'),'draft');assert.equal(saved.has('kafakAdmin'),false);
});
