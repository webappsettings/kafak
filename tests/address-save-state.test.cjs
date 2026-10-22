const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../custom.js'),'utf8');
const code=src.slice(src.indexOf('window.checkForChanges = function'),src.indexOf('window.submitQuickOrder = async function'));
test('saved address disables save; edits enable it; reverting and successful save disable it',()=>{
 const values={'#quick-qty':'1','#edit-name':'Test','#edit-phone':'9999999999','#edit-whatsapp':'9999999999','#edit-house':'House','#edit-place':'Place','#edit-pincode':'683106','#edit-altphone':'8888888888','#edit-postoffice':'PO','#edit-district':'Ernakulam','#edit-state':'KERALA','#language-select':'en'};
 const nodes={};function $(s){return nodes[s]||(nodes[s]={length:1,props:{},store:{},val(){return values[s]||''},is(){return false},data(k,v){if(arguments.length===1)return this.store[k];this.store[k]=v;return this},prop(k,v){this.props[k]=v;return this},css(){return this},html(){return this},text(){return this},attr(){return this},show(){return this},hide(){return this},slideUp(){return this}})}
 const saved={quantity:1,name:'Test',phone:'9999999999',whatsapp:'9999999999',house:'House',place:'Place',pincode:'683106',altphone:'8888888888',postoffice:'PO',district:'Ernakulam',state:'KERALA',product:'Cheruthen',Status:'Paid'};
 const ctx={editPinState:{pin:'683106',pending:false,valid:true},window:{kafakStorage:{getItem:()=> 'true'},kafakCheckoutUI:{productName:()=> 'Cheruthen'}},$,savedOrderData:saved,editingOrderId:'TEST',localStorage:{getItem:()=> 'true'},translations:{en:{}}};vm.runInNewContext(code,ctx);
 const check=()=>{ctx.window.checkForChanges();return $('#address-edit-box button').props.disabled};
 assert.equal(check(),true);
 values['#edit-house']='New House';assert.equal(check(),false);
 values['#edit-house']='House';assert.equal(check(),true);
 values['#edit-house']='New House';saved.house='New House';assert.equal(check(),true);
 values['#edit-house']='New House';assert.equal(check(),true);
 values['#edit-house']='Other';$('.btn-update-sage').data('is-processing','active');assert.equal(check(),true);
 $('.btn-update-sage').data('is-processing',false);assert.equal(check(),false);
});
