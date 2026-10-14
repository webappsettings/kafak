const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const Commands=require('../business-admin-commands.js');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),m};};
const options={id:()=>require('node:crypto').randomUUID(),digest:async t=>createHash('sha256').update(t).digest('hex')};
test('lost response and reload reuse request and receipt identities without storing image data',async()=>{
 const store=storage(),calls=[],uploads=[];let fail=true;
 const api={uploadReceipt:async d=>{uploads.push(d);return {url:'https://drive.google.com/file/d/test'};},adminAction:async(d,id)=>{calls.push({d,id});if(fail){fail=false;throw Error('Connection lost');}return {result:'success',expId:'EXP-test'};}};
 const payload={action:'addExpense',data:{id:'EXP-test',amount:10,fileData:'data:image/png;base64,example',fileName:'receipt.png'}};
 await assert.rejects(new Commands(api,store,options).send(payload),/Connection lost/);
 const commands=new Commands(api,store,options);await commands.send(payload);await commands.send(payload);
 assert.equal(calls.length,2);assert.equal(calls[0].id,calls[1].id);assert.equal(uploads.length,1);assert.equal(calls[1].d.data.expId,'EXP-test');assert.equal(calls[1].d.data.proofUrl,'https://drive.google.com/file/d/test');assert(!Object.hasOwn(calls[1].d.data,'fileData'));assert(![...store.m.values()].join('').includes('base64'));
 await commands.acknowledge(payload);assert.equal(store.m.size,0);
});
test('concurrent equal commands share one request; acknowledgements permit a later distinct operation',async()=>{
 const store=storage();let count=0;const commands=new Commands({adminAction:async()=>{count++;return {result:'success'};}},store,options),payload={action:'deleteOrder',oid:'test'};
 await Promise.all([commands.send(payload),commands.send(payload)]);assert.equal(count,1);await commands.acknowledge(payload);await commands.send(payload);assert.equal(count,2);
});
test('unsupported actions, partial confirmation and unsafe receipt results never acknowledge success',async()=>{
 const store=storage(),commands=new Commands({adminAction:async()=>({result:'success',count:0}),uploadReceipt:async()=>({url:'https://example.com/x'})},store,options);
 await assert.rejects(commands.send({action:'bulkIndiaPostBooking'}),/not connected/);
 await assert.rejects(commands.send({action:'bulkUpdateStatus',updates:[{oid:'x'}]}),/whole batch/);
 await assert.rejects(commands.send({action:'addExpense',data:{fileData:'image',fileName:'a'}}),/not confirmed/);
});
