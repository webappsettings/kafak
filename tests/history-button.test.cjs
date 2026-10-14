const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../admin.js'),'utf8');
const fn=source.slice(source.indexOf('function hasOlderOrdersForTab('),source.indexOf('window.loadMoreCards = async'));
test('history button checks the current tab, product, state and remaining cursor',()=>{
 const ctx={businessApi:{},businessHistoryNext:'100',businessHistoryGroups:[{tab:'sent',product:'Honey',state:'KERALA'}],window:{activeProducts:new Set(['Honey'])},defaultProductName:()=> 'Honey'};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 assert.equal(ctx.hasOlderOrdersForTab('new'),false);assert.equal(ctx.hasOlderOrdersForTab('sent'),true);
 ctx.window.activeStateFilter='TN';assert.equal(ctx.hasOlderOrdersForTab('sent'),false);
 ctx.window.activeStateFilter=null;ctx.window.activeProducts=new Set(['Dates']);assert.equal(ctx.hasOlderOrdersForTab('sent'),false);
 ctx.window.activeProducts=new Set(['Honey']);ctx.businessHistoryNext=null;assert.equal(ctx.hasOlderOrdersForTab('sent'),false);
});
