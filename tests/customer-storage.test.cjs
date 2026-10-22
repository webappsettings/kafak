const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../order-customer-storage');
function store(initial={}){const values=new Map(Object.entries(initial));return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),requirePersistent(){},values};}
const row={orderid:'K-test',name:'A',phone:'9999999999',house:'Same house',quantity:1,accessToken:'private'};
test('verified matching cache is retired only after retaining its private link; drafts and journal remain',()=>{
 const s=store({kafakCustomerData:JSON.stringify({9999999999:row,draft:{name:'Unsent'}}),'kafak-draft-v1:new':'unchanged','pendingUpdates':'unchanged'});
 assert(policy.retire(s,row));assert.deepEqual(JSON.parse(s.getItem('kafakCustomerData')),{draft:{name:'Unsent'}});
 assert.equal(policy.links(s)['K-test'].accessToken,'private');assert.equal(s.getItem('kafak-draft-v1:new'),'unchanged');assert.equal(s.getItem('pendingUpdates'),'unchanged');
});
test('unverified differences and pending saves are never deleted by cache migration',()=>{
 for(const extra of [{},{'kafak-business-edit:K-test':'pending'},{kafakAdmin:'true'}]){
  const old={...row,house:'Unsaved change'},raw=JSON.stringify({9999999999:old}),s=store({kafakCustomerData:raw,...extra});
  assert.equal(policy.retire(s,row),false);assert.equal(s.getItem('kafakCustomerData'),raw);
 }
});
test('customer UI reads links, not stale address copies, while new draft writes preserve unverified records',()=>{
 const s=store({kafakCustomerData:JSON.stringify({9999999999:row})});const map=policy.customerMap(s);
 assert.equal(map['9999999999'].house,undefined);assert.equal(map['9999999999'].accessToken,'private');
 policy.saveDraftMap(s,{draft:{name:'New draft'}});assert.deepEqual(JSON.parse(s.getItem('kafakCustomerData')),{9999999999:row,draft:{name:'New draft'}});
});
test('storage failure retains the original full cache',()=>{
 const raw=JSON.stringify({9999999999:row}),s=store({kafakCustomerData:raw});s.requirePersistent=()=>{throw Error('quota');};
 assert.throws(()=>policy.retire(s,row),/quota/);assert.equal(s.getItem('kafakCustomerData'),raw);
});
