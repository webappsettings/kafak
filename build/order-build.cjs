// Reproducible customer/browser output. Edit source files, then npm run build:order.
const esbuild=require('esbuild'),fs=require('node:fs'),path=require('node:path');
const target='es2017',babel=require('@babel/core');
const lower=source=>babel.transformSync(source,{sourceType:'script',presets:[[require.resolve('@babel/preset-env'),{targets:{chrome:'60',safari:'11',firefox:'60'},modules:false,include:['@babel/plugin-transform-destructuring']}]],comments:true,compact:false}).code;
const sources=['order-runtime','order-admin-actions','order-customer-storage','order-presentation','backend-api','business-order','business-checkout','business-catalog','business-order-editor','custom','business-checkout-ui','business-order-editor-ui','business-live-order','order-recovery','business-admin-commands','business-admin-transport','release-update','translations'];
(async()=>{
 fs.mkdirSync('compat',{recursive:true});
 for(const name of sources){const source=fs.readFileSync(name+'.js','utf8');const out=await esbuild.transform(lower(source),{target,charset:'utf8',legalComments:'inline'});fs.writeFileSync(path.join('compat',name+'.js'),out.code);}
 await esbuild.build({entryPoints:['build/order-polyfills.js'],outfile:'compat/polyfills.js',bundle:true,target,format:'iife',minify:true});
 for(const [name,file]of Object.entries({jquery:'jquery/dist/jquery.min.js',bootstrap:'bootstrap/dist/js/bootstrap.bundle.min.js',sweetalert:'sweetalert2/dist/sweetalert2.all.min.js'})){
  const result=await esbuild.transform(lower(fs.readFileSync(require.resolve(file),'utf8')),{target,minify:true,legalComments:'inline'});fs.writeFileSync('compat/'+name+'.js',result.code);
 }
 const short=await esbuild.transform(lower(fs.readFileSync('o/open.js','utf8')),{target});fs.writeFileSync('compat/open-order.js',short.code);
 fs.writeFileSync('compat/LICENSES.txt',['core-js','whatwg-fetch','abortcontroller-polyfill','jquery','bootstrap','sweetalert2'].map(name=>{const root=path.dirname(require.resolve(name+'/package.json'));const file=['LICENSE','LICENSE.txt','LICENSE.md'].find(f=>fs.existsSync(path.join(root,f)));return name+'\n'+(file?fs.readFileSync(path.join(root,file),'utf8'):'See package license');}).join('\n\n'));
 const hash=file=>require('node:crypto').createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')).digest('hex');
 const inputs=[...sources.map(n=>n+'.js'),'o/open.js','build/order-polyfills.js','build/order-build.cjs','package-lock.json'];
 const outputs=fs.readdirSync('compat').filter(n=>n.endsWith('.js')).map(n=>'compat/'+n);
 fs.writeFileSync('compat/build-manifest.json',JSON.stringify({inputs:Object.fromEntries(inputs.map(f=>[f,hash(f)])),outputs:Object.fromEntries(outputs.map(f=>[f,hash(f)]))},null,2)+'\n');
 console.log('Customer assets built for Chrome 60+, Safari 11+, Firefox 60+ syntax. Device testing is separate.');
})();
