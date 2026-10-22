const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),babel=require('@babel/core');
const root=path.join(__dirname,'..');
test('shipped customer files contain no optional-chain, nullish, object-spread or optional-catch syntax',()=>{
 const forbidden=new Set(['OptionalMemberExpression','OptionalCallExpression']);
 for(const name of fs.readdirSync(path.join(root,'compat')).filter(x=>x.endsWith('.js'))){
  const ast=babel.parseSync(fs.readFileSync(path.join(root,'compat',name),'utf8'),{sourceType:'script'});
  function visit(n,parent){if(!n||typeof n!=='object')return;if(Array.isArray(n)){for(const child of n)visit(child,parent);return;}
   assert(!forbidden.has(n.type),name+': '+n.type);
   assert(!(n.type==='LogicalExpression'&&n.operator==='??'),name+': nullish');
   assert(!(n.type==='AssignmentExpression'&&['??=','&&=','||='].includes(n.operator)),name+': assignment');
   assert(!(n.type==='CatchClause'&&!n.param),name+': optional catch binding');
   assert(!(n.type==='SpreadElement'&&parent?.type==='ObjectExpression'),name+': object spread');
   for(const key of Object.keys(n))if(!['loc','tokens','comments'].includes(key))visit(n[key],n);
  }visit(ast,null);
 }
});
test('order and secure short-link entry points load polyfills before application scripts',()=>{
 for(const file of ['order.html','o/index.html']){const html=fs.readFileSync(path.join(root,file),'utf8');
  assert(html.indexOf('compat/polyfills.js')>=0);assert(html.indexOf('compat/polyfills.js')<html.indexOf(file==='order.html'?'compat/order-runtime.js':'compat/open-order.js'));
 }
 const html=fs.readFileSync(path.join(root,'order.html'),'utf8');assert(html.indexOf('height: 100vh;')<html.indexOf('height: 100dvh;'));
});

test('published compatibility output matches current sources and lockfile',()=>{const manifest=JSON.parse(fs.readFileSync(path.join(root,'compat/build-manifest.json'),'utf8'));for(const [file,expected]of Object.entries({...manifest.inputs,...manifest.outputs})){const actual=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n')).digest('hex');assert.equal(actual,expected,file+': run npm run build:order');}});
