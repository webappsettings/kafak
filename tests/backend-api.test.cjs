const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const BusinessApi = require('../backend-api.js');
const ok = body => ({ ok: true, json: async () => body });
test('authenticated reads use encoded queries, cookie credentials and bounded pages', async () => {
 let call; const api = new BusinessApi('https://test.invalid', async (...args) => { call = args; return ok({data:[]}); });
 await api.orders({q:'+91 3232 232321'});
 assert.equal(new URL(call[0]).searchParams.get('q'),'+91 3232 232321');assert.equal(new URL(call[0]).searchParams.get('limit'),'50');assert.equal(call[1].credentials,'include');
});
test('double submission shares the same request and rejects changed pending data', async () => {
 let resolve,calls=0; const waiting=new Promise(r=>resolve=r);
 const api=new BusinessApi('https://test.invalid',async()=>{calls++;await waiting;return ok({orderid:'test'});});
 const id=randomUUID(),data={sku:'example',expectedTotal:10};const first=api.submitOrder(data,id),second=api.submitOrder(data,id);
 await assert.rejects(api.submitOrder({...data,expectedTotal:20},id),/different data/);assert.equal(calls,1);resolve();assert.deepEqual(await first,await second);
});
test('uncertain submission can retry using its original request ID', async () => {
 const keys=[];let calls=0;
 const api=new BusinessApi('https://test.invalid',async (_url,options)=>{keys.push(options.headers['Idempotency-Key']);if(++calls===1)throw new TypeError('network');return ok({orderid:'test'});});
 const id=randomUUID(),data={sku:'example',expectedTotal:10};await assert.rejects(api.submitOrder(data,id),e=>e.uncertain===true);await api.submitOrder(data,id);assert.deepEqual(keys,[id,id]);
});
test('missing quote or request identity never sends an order', async () => {
 const api=new BusinessApi('https://test.invalid',()=>assert.fail('must not send'));
 await assert.rejects(api.submitOrder({sku:'example'},randomUUID()),/Review/);await assert.rejects(api.submitOrder({sku:'example',expectedTotal:10},''),/request ID/);
});
