const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../business-order-editor-ui.js'),'utf8');
function setup(changed=false){
 const calls=[],current={orderid:'old',version:1,Status:'Paid',quantity:1,product:'',state:'KERALA',Grand_Total:730};
 class Editor{constructor(){this.current=current;}async save(data,options){calls.push(options);return {...current,...data,version:2};}}
 const ctx={window:{KAFAK_BACKEND:'business',kafakCheckoutUI:{productChanged:changed,checkout:{priced:{sku:'vanthen-one',state:'KERALA',quote:{total:780}}}}},KafakBusinessApi:class{},KafakBusinessOrderEditor:Editor,localStorage:{getItem:()=>null},document:{querySelector:()=>({selectedOptions:[{dataset:{sku:'vanthen-one'}}]})},location:{hash:'',search:''},URLSearchParams};
 vm.createContext(ctx);vm.runInContext(source,ctx);return {ui:ctx.window.kafakOrderEditorUI,calls,current};
}
test('imported paid address edits retain historical pricing even when the rendered select has a default SKU',async()=>{
 const {ui,calls,current}=setup();await ui.save({...current,product:'Vanthen',house:'Updated address'});
 assert.equal(calls[0].sku,undefined);assert.equal(calls[0].expectedTotal,undefined);
});
test('an explicitly changed product still carries the reviewed SKU and quote',async()=>{
 const {ui,calls,current}=setup(true);await ui.save({...current,product:'Vanthen'});assert.equal(calls[0].sku,'vanthen-one');assert.equal(calls[0].expectedTotal,780);
});

test('address-only edits of current SKU orders retain the saved price',async()=>{
 const {ui,calls,current}=setup();current.sku='vanthen-one';
 await ui.save({...current,house:'Address only'});
 assert.equal(calls[0].sku,undefined);assert.equal(calls[0].expectedTotal,undefined);
});
test('missing editor state hydrates only the displayed version',async()=>{
 const {ui,calls,current}=setup();
 ui.editor.current=null;
 await assert.rejects(ui.save({...current,house:'New'}),/Refresh the order status/);
 assert.equal(calls.length,0);
});

test('expired admin state falls back to the customer private link without login',async()=>{
 const calls=[],removed=[],token='a'.repeat(43);
 class Editor{async load(id,options){calls.push(options);if(options.admin)throw Object.assign(Error('expired'),{status:401});this.current={orderid:id,version:1,quantity:1};return this.current;}}
 const ctx={window:{KAFAK_BACKEND:'business'},KafakBusinessApi:class{},KafakBusinessOrderEditor:Editor,localStorage:{getItem:key=>key==='kafakAdmin'?'true':null,removeItem:key=>removed.push(key)},location:{hash:'#access='+token,search:'?oid=test'},URLSearchParams};
 vm.createContext(ctx);vm.runInContext(source,ctx);const result=await ctx.window.kafakOrderEditorUI.read('test');
 assert.equal(result.data.orderid,'test');assert.equal(result.data.accessToken,token);assert.equal(calls[1].token,token);assert.deepEqual(removed,['kafakAdmin']);
});
