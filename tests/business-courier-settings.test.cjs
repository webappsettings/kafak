const test = require('node:test');
const assert = require('node:assert/strict');
const Settings = require('../business-courier-settings.js');
test('Existing courier row maps to stable identity; rate and margin use one action', async () => {
  const calls=[];
  const editor = new Settings({courierSettings:async()=>({status:'success',data:[{key:'zone:provider',version:'v1'}]}),adminAction:async(...args)=>{calls.push(args);return {status:'success',result:'success'};}},()=> 'request-id');
  await editor.load();await editor.rates(2,'1:62','1:18');
  assert.equal(calls.length,1);assert.deepEqual(calls[0][0],{action:'updateCourierRates',key:'zone:provider',version:'v1',rates:'1:62',margin:'1:18'});
});
test('Uncertain settings response retains request identity and blocks a different edit', async () => {
  const ids=[];let fail=true;
  const editor=new Settings({adminAction:async(data,id)=>{ids.push(id);if(fail)throw new TypeError('network');return {result:'success',status:'success'};}},()=>String(ids.length));
  const data={action:'test'};
  await assert.rejects(()=>editor.save(data),/network/);
  await assert.rejects(()=>editor.save({action:'other'}),/Retry/);
  fail=false;await editor.save(data);assert.deepEqual(ids,['0','0']);assert.equal(editor.pending,null);
});
