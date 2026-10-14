const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8');
const restore=source.slice(source.indexOf('async function restoreBusinessSession()'),source.indexOf('// Beep Sound for Scanner'));
function harness(api){const saved=new Map([['kafakAdmin','true'],['allOrdersCache','stale private records']]),message={innerText:''};const context={businessApi:api,localStorage:{setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},document:{getElementById:()=>message}};vm.createContext(context);vm.runInContext(restore,context);return {context,saved,message};}
test('business session accepts the server identity, not a cached admin flag',async()=>{const h=harness({me:async()=>({username:'verified-user',role:'viewer'})});await h.context.restoreBusinessSession();assert.equal(h.saved.get('kafakAdminUser'),'verified-user');assert.equal(h.saved.get('kafakAdminRole'),'viewer');});
test('expired session clears locally cached private records',async()=>{const h=harness({me:async()=>{throw Object.assign(Error('Sign in required'),{status:401});}});await h.context.restoreBusinessSession();assert.equal(h.saved.has('kafakAdmin'),false);assert.equal(h.saved.has('allOrdersCache'),false);});
test('network errors cannot reuse a cached authenticated state',async()=>{const h=harness({me:async()=>{throw Error('Connection unavailable');}});await h.context.restoreBusinessSession();assert.equal(h.saved.has('kafakAdmin'),false);assert.equal(h.message.innerText,'Connection unavailable');});
test('UUID order IDs cannot rewrite accounting years or months',()=>{
 const code=source.slice(source.indexOf('window.parseOrderDate = function'),source.indexOf('// 🔥 UPDATE DASHBOARD MAIN CARDS'));
 const context={window:{},Date};vm.createContext(context);vm.runInContext(code,context);
 const timestamp='2026-10-14T10:00:00Z';
 for(const oid of ['K-260101ab-1234-4567-8901-123456789012','K-99010100-1234-4567-8901-123456789012'])assert.equal(context.window.parseOrderDate(timestamp,oid).toISOString(),timestamp.replace('Z','.000Z'));
});
