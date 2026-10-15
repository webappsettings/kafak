const test=require('node:test'),assert=require('node:assert/strict'),Transport=require('../business-admin-transport.js');
const post=payload=>({method:'POST',body:JSON.stringify(payload)});
test('existing admin writes use the durable database command and never fall back to Sheets',async()=>{
 const calls=[];const payload={action:'deleteOrder',oid:'test'};
 const t=new Transport({}, {send:async p=>{calls.push(['send',p]);return {result:'success'};},acknowledge:async p=>calls.push(['ack',p])},()=>{throw Error('Unexpected Sheet write');});
 assert.equal((await (await t.fetch('legacy',post(payload))).json()).result,'success');assert.deepEqual(calls,[['send',payload],['ack',payload]]);
});
test('failed commands retain their journal and do not contact the old writer',async()=>{
 let acknowledgements=0;const t=new Transport({}, {send:async()=>{throw Error('Unconfirmed request');},acknowledge:async()=>acknowledgements++},()=>{throw Error('Unexpected fallback');});
 await assert.rejects(t.fetch('legacy',post({action:'addExpense'})),/Unconfirmed/);assert.equal(acknowledgements,0);
});
test('inventory and tracker reads use authenticated GET routes',async()=>{
 const paths=[];const t=new Transport({request:async p=>{paths.push(p);return {result:'success',data:{}};}},{send:()=>{throw Error('Not a write');}},()=>{throw Error('Not Sheets');});
 await t.fetch('legacy',post({action:'getInventory'}));await t.fetch('legacy',post({action:'getTrackingBalance'}));assert.deepEqual(paths,['/admin/inventory','/admin/tracking-balance']);
});
test('postal booking uses durable server commands without Apps Script',async()=>{
 const calls=[];const t=new Transport({}, {send:async p=>{calls.push(p);return {result:'success'};},acknowledge:async()=>{}},()=>{throw Error('Apps Script must not be called');});
 await t.fetch('legacy',post({action:'bulkIndiaPostBooking',orders:[]}));assert.equal(calls[0].action,'bulkIndiaPostBooking');
});
test('before cutover the original request remains unchanged',async()=>{
 const options=post({action:'oldAction'});const t=new Transport(null,null,async(u,o)=>{assert.equal(u,'legacy');assert.equal(o,options);return 'original';});assert.equal(await t.fetch('legacy',options),'original');
});
