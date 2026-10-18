const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8');
const start=src.indexOf('window.sendWA = function'),end=src.indexOf('//',src.indexOf('\n}',start)+2);
const code=src.slice(start,src.indexOf('// 🔥 SEND PAYMENT RECEIPT WA',start));
test('confirmation uses saved totals and target and does not ask paid orders to pay again',()=>{
 for(const Status of ['Pending','Sent','Paid','Dispatched','Delivered','Completed']){
 let opened;const order={orderid:'TEST',Status,quantity:1,whatsapp:'9999999999',Product_Amount:900,Courier_Charge:100};
 const context={window:{open:url=>opened=url},allOrders:[order],courierRates:{},getZoneKey:()=>'',KafakBusinessOrder:{privateLink:()=> 'https://kafaklife.com/o/#secure-test',contact:()=>({number:'9999999999'})},document:{getElementById:()=>null},formatWAPhone:n=>'91'+n,alert:m=>{throw Error(m);}};
 vm.runInNewContext(code,context);context.window.sendWA(0,'paid');const url=new URL(opened);const message=url.searchParams.get('text');assert.equal(url.pathname,'/919999999999');assert.match(message,/Total: ₹1000/);assert.match(message,/o\/#secure-test/);assert.equal(message.includes('GPay to:'),['Pending','Sent'].includes(Status));
 }
});
test('created-order popup offers WhatsApp without creating another order',()=>{
 const custom=fs.readFileSync(path.join(__dirname,'../custom.js'),'utf8');const popup=custom.slice(custom.indexOf("icon: 'success', title: 'Order Created!"),custom.indexOf("// --- ADMIN UPDATING AN EXISTING ORDER ---"));assert.match(popup,/Send WhatsApp/);assert.match(popup,/result.isDenied/);assert.match(popup,/sendToWhatsapp\(newData, getSelectedWAPhone\(newData\)\)/);
});
