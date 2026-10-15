/* Local data gives the first paint; visible customer views revalidate with the server. */
(function(scope){
 function createRefresh({current,blocked,read,apply,tracking,now=Date.now}){
  let busy=false,lastTracking=0;
  return async function refresh(){
   const before=current();if(busy||!before?.orderid||blocked())return;
   busy=true;
   try{
    const latest=await read(before.orderid);
    if(blocked()||current()?.orderid!==before.orderid)return;
    if(latest.version!==current().version)apply(latest);
    if(now()-lastTracking>=60000){lastTracking=now();tracking(latest);}
   }catch{/* Keep the last confirmed view; retry at the next interval. */}finally{busy=false;}
  };
 }
 if(typeof module!=='undefined'&&module.exports){module.exports=createRefresh;return;}
 if(scope.KAFAK_BACKEND!=='business')return;
 let dirty=false;
 document.addEventListener('input',e=>{if(e.target.matches('[id^="edit-"],#quick-qty,#admin-product-type'))dirty=true;});
 document.addEventListener('change',e=>{if(e.target.matches('[id^="edit-"],#quick-qty,#admin-product-type'))dirty=true;});
 for(const event of ['kafak-order-rendered','kafak-order-saved'])document.addEventListener(event,()=>{dirty=false;});
 const refresh=createRefresh({
  current:()=>typeof savedOrderData==='object'?savedOrderData:null,
  blocked:()=>document.hidden||dirty||localStorage.getItem('kafakAdmin')==='true'||!scope.kafakOrderEditorUI||!$('#returning-user-view').is(':visible')||$('#address-edit-box').is(':visible')||$('.btn-update-sage').data('is-processing')||document.activeElement?.matches('input,textarea,select'),
  read:id=>scope.kafakOrderEditorUI.latestCustomer(id),
  apply:row=>{scope.kafakOrderEditorUI.editor.current=row;loadOrderData(row,true);},
  tracking:row=>{if(row.tracking&&document.getElementById('inline-track-'+row.tracking))scope.loadLiveTrackingInline(row.tracking,row.postoffice,$('#language-select').val()||'en',true);}
 });
 setTimeout(refresh,2000);setInterval(refresh,15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 scope.addEventListener('focus',refresh);scope.addEventListener('online',refresh);
})(typeof window==='undefined'?globalThis:window);
