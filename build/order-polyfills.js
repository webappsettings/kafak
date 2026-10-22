import 'core-js/es/object/has-own';
import 'core-js/es/object/from-entries';
import 'core-js/es/object/entries';
import 'core-js/es/object/values';
import 'core-js/es/promise/finally';
import 'core-js/modules/web.dom-collections.for-each';
import 'core-js/es/string/replace-all';
import 'core-js/es/array/flat-map';
import 'core-js/actual/global-this';
import 'core-js/web/url';
import 'core-js/web/queue-microtask';
import 'core-js/modules/web.dom-collections.iterator';
import 'whatwg-fetch';
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';

if(!crypto.randomUUID)crypto.randomUUID=function(){
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>('0'+b.toString(16)).slice(-2)).join('');
 return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
};
if(!Element.prototype.replaceChildren)Element.prototype.replaceChildren=function(...nodes){
 while(this.firstChild)this.removeChild(this.firstChild);
 for(const node of nodes)this.appendChild(typeof node==='string'?document.createTextNode(node):node);
};
