(function(root){
 'use strict';
 function parse(text,defaultType='Normal'){
  const items=[],seen=new Map();
  for(const [index,line] of String(text).split(/\r?\n/).entries()){
   if(!line.trim()||/^\s*\|?\s*:?-{3}/.test(line)||/Tracking\s*ID/i.test(line))continue;
   const cells=line.trim().replace(/^\||\|$/g,'').split(/\t|\|/).map(s=>s.trim());
   const id=cells[0].toUpperCase();
   if(!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(id))throw Error(`Line ${index+1}: invalid tracking ID`);
   const type=cells[1]||defaultType;
   if(!['Normal','Speed'].includes(type))throw Error(`Line ${index+1}: type must be Normal or Speed`);
   if(cells[2]&&cells[2]!=='Unused')throw Error(`Line ${index+1}: only Unused trackers can be added`);
   if(cells[3])throw Error(`Line ${index+1}: Order ID must be empty`);
   if(cells[5])throw Error(`Line ${index+1}: Used Date must be empty`);
   if(cells.length>6)throw Error(`Line ${index+1}: too many columns`);
   if(seen.has(id)){if(seen.get(id)!==type)throw Error(`Conflicting types for ${id}`);continue;}
   seen.set(id,type);items.push({id,type});
  }
  if(!items.length||items.length>500)throw Error('Enter 1–500 trackers');
  return items;
 }
 function open(save){
  const dialog=document.createElement('dialog');dialog.style.cssText='width:min(640px,94vw);max-height:90vh;overflow:auto;border:1px solid #d8dfd9;border-radius:18px;padding:24px;color:#243b36;background:white;box-shadow:0 15px 60px #0004';
  dialog.innerHTML='<form><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:22px;margin:0">Add postal trackers</h2><button type="button" data-close aria-label="Close">×</button></div><p>Single tracker or paste a list / table (up to 500).</p><label>Type for ID-only lines <select name="type"><option>Normal</option><option>Speed</option></select></label><p style="font-size:13px">Tracking ID · Type · Status · Order ID · Added Date · Used Date</p><textarea name="list" rows="9" required spellcheck="false" placeholder="CL661956414IN&#10;CL661956428IN" style="width:100%;box-sizing:border-box;border:1px solid #bdc9c1;border-radius:8px;padding:12px;font:14px monospace"></textarea><p style="font-size:13px">New trackers are saved as Unused with the current Added Date. Existing IDs are skipped.</p><p data-result role="status" style="white-space:pre-wrap"></p><div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" data-close>Cancel</button><button type="submit">Save trackers</button></div></form>';
  for(const button of dialog.querySelectorAll('button'))button.style.cssText='padding:9px 16px;border:1px solid #bcc9c1;border-radius:8px;background:#f6f8f6;color:#243b36;font-weight:600;cursor:pointer';
  let busy=false,key=crypto.randomUUID(),last='';const form=dialog.querySelector('form'),result=dialog.querySelector('[data-result]');
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(!busy)dialog.close();});
  dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>dialog.remove();
  form.onsubmit=async e=>{e.preventDefault();if(busy)return;try{
   const trackers=parse(form.elements.list.value,form.elements.type.value),payload=JSON.stringify(trackers);
   if(payload!==last){key=crypto.randomUUID();last=payload;}
   busy=true;form.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=true);result.style.color='#52655a';result.textContent='Saving…';
   const data=await save(trackers,key);if(data.result!=='success')throw Error(data.error||'Save failed');
   result.style.color='#13713f';result.textContent=`✓ Saved ${data.added} trackers. ${trackers.length-data.added} existing IDs skipped.`;
   form.elements.list.value='';key=crypto.randomUUID();last='';
  }catch(error){result.style.color='#b42318';result.textContent=error.message;}finally{busy=false;form.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=false);}};
  document.body.append(dialog);dialog.showModal();form.elements.list.focus();
 }
 root.PostalEntry={parse,open};
 if(typeof module!=='undefined')module.exports={parse};
})(typeof window==='undefined'?globalThis:window);
