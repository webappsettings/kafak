const test = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../business-order.js');
const storage = () => { const values = new Map(); return { getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k) }; };
const quote={sku:'variant',product:'Example',variant:'Pack',quantity:2,productAmount:3900,courierAmount:140,total:4040};
const fields={sku:'variant',state:'KERALA',name:'Test',phone:'9000000000'};
const settings={stockStatus:'yes',contactPhone:'9000000001',acceptingOrders:true};
const response={result:'success',orderid:'K-test',accessToken:'private-token',quote};
function api(submitOrder){return {catalog:async()=>[],settings:async()=>settings,quote:async()=>quote,submitOrder};}
test('reload after a lost response retries the exact order and UUID',async()=>{
 const saved=storage(),sent=[];
 let fail=true;
 const transport=api(async(data,id)=>{sent.push({data,id});if(fail)throw new TypeError('network lost');return response;});
 const first=new Order(transport,saved,()=> 'fixed-id');await first.load();await first.price(fields.sku,fields.state);
 await assert.rejects(first.submit(fields),/network/);
 const second=new Order(transport,saved,()=>assert.fail('must not allocate a new request'));
 await assert.rejects(second.submit({...fields,name:'changed'}),/previous submission/);
 fail=false;await second.retry();assert.deepEqual(sent[0],sent[1]);assert.equal(second.pending,null);
 assert.equal(JSON.parse(saved.getItem('kafak-business-last-order')).accessToken,'private-token');
});
test('late quote responses cannot replace a newer selection',async()=>{
 let slow;const transport=api();transport.quote=sku=>sku==='slow'?new Promise(r=>slow=r):Promise.resolve({...quote,sku});
 const order=new Order(transport,storage());const old=order.price('slow','KERALA');await order.price('new','KERALA');slow({...quote,sku:'slow'});assert.equal(await old,null);assert.equal(order.currentQuote.sku,'new');
});
test('changing destination or receiving a new price requires fresh review',async()=>{
 const order=new Order(api(async()=>{throw Object.assign(new Error('price changed'),{status:409});}),storage());await order.load();await order.price(fields.sku,fields.state);
 await assert.rejects(order.submit({...fields,state:'TAMIL NADU'}),/latest delivery/);
 await assert.rejects(order.submit(fields),/price changed/);assert.equal(order.pending,null);assert.equal(order.currentQuote,null);
});
test('private order token stays in the fragment; WhatsApp uses confirmed server amounts',()=>{
 const link=Order.privateLink('https://example.com/order.html?old=yes',response);
 assert.equal(new URL(link).searchParams.has('access'),false);assert.equal(new URL(link).hash,'#access=private-token');
 const message=new URL(Order.whatsapp(settings,response,fields,link)).searchParams.get('text');assert.match(message,/Total: ₹4040/);assert.match(message,/Delivery: ₹140/);
});
test('storage failure stops submission before contacting the server',async()=>{
 const saved=storage();saved.setItem=()=>{throw Error('quota');};
 const order=new Order(api(()=>assert.fail('must not submit')),saved);await order.load();await order.price(fields.sku,fields.state);await assert.rejects(order.submit(fields),/browser storage/);
});
test('staging previews cannot submit or create a pending request',async()=>{
 const transport=api(()=>assert.fail('must not submit'));transport.settings=async()=>({...settings,acceptingOrders:false});
 const order=new Order(transport,storage());await order.load();await order.price(fields.sku,fields.state);await assert.rejects(order.submit(fields),/preview/);assert.equal(order.pending,null);
});
test('a rate-limited retry after a lost response retains the original request identity',async()=>{
 const saved=storage();let calls=0;
 const transport=api(async()=>{if(++calls===1)throw new TypeError('lost response');throw Object.assign(new Error('rate limited'),{status:429});});
 const first=new Order(transport,saved,()=> 'original-key');await first.load();await first.price(fields.sku,fields.state);await assert.rejects(first.submit(fields));
 const reloaded=new Order(transport,saved);await assert.rejects(reloaded.retry(),/rate limited/);assert.equal(reloaded.pending.requestId,'original-key');assert(saved.getItem('kafak-business-pending-order'));
});
