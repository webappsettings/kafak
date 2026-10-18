const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('pending preview loads an older order without writing or syncing drafts',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8');
 const start=source.indexOf('const syncPreviewOrders = new Map();'),end=source.indexOf('function renderSyncList()',start);
 let renders=0;const reads=[];
 const ctx={businessApi:{order:async id=>{reads.push(id);if(id==='missing')throw Object.assign(Error('missing'),{status:404});return {data:{name:'Older customer'}};}},renderSyncList:()=>renders++};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end)+';this.results=syncPreviewOrders;',ctx);
 await ctx.loadSyncPreviewOrders(['older','missing']);
 assert.deepEqual(reads,['older','missing']);assert.equal(ctx.results.get('older').name,'Older customer');assert.equal(ctx.results.get('missing').name,'Order unavailable');assert.equal(renders,1);
});
