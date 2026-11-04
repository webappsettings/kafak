(function(root){
 'use strict';
 function parse(value){
  if(Object.prototype.toString.call(value)==='[object Date]')return new Date(value.getTime());
  if(typeof value==='number')return new Date(value);
  var s=String(value||'').trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?)?$/);
  if(m){
   var y=+m[1],mo=+m[2],d=+m[3],h=+(m[4]||0),mi=+(m[5]||0),se=+(m[6]||0);
   var check=new Date(Date.UTC(y,mo-1,d));
   if(check.getUTCFullYear()!==y||check.getUTCMonth()!==mo-1||check.getUTCDate()!==d||h>23||mi>59||se>59)return new Date(NaN);
   return new Date(m[1]+'-'+m[2]+'-'+m[3]+'T'+(m[4]||'00')+':'+(m[5]||'00')+':'+(m[6]||'00')+(m[7]||'')+'+05:30');
  }
  m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if(m){var hour=+(m[4]||0);if(m[7]){if(hour<1||hour>12)return new Date(NaN);hour=hour%12+(m[7].toUpperCase()==='PM'?12:0);}return parse(m[3]+'-'+m[2]+'-'+m[1]+' '+pad(hour)+':'+(m[5]||'00')+':'+(m[6]||'00'));}
  return /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)?new Date(s):new Date(NaN);
 }
 function pad(n){return ('0'+n).slice(-2);}
 function parts(value){var d=parse(value);if(!isFinite(d.getTime()))return null;d=new Date(d.getTime()+19800000);return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),h:d.getUTCHours(),min:d.getUTCMinutes()};}
 function input(value){var p=parts(value);return p?p.y+'-'+pad(p.m)+'-'+pad(p.d)+' '+pad(p.h)+':'+pad(p.min):'';}
 function format(value,dateOnly){var p=parts(value);if(!p)return value?String(value):'';var date=pad(p.d)+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.m-1]+' '+p.y;return dateOnly||/^\d{4}-\d{2}-\d{2}$/.test(String(value))?date:date+' '+(p.h%12||12)+':'+pad(p.min)+' '+(p.h>=12?'PM':'AM');}
 function iso(value){var d=parse(value);if(!isFinite(d.getTime()))throw Error('Enter a valid date and time (IST).');return d.toISOString();}
 var api={parse:parse,format:format,input:input,iso:iso};root.KafakDates=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
