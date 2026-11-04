const test=require('node:test'),assert=require('node:assert/strict'),dates=require('../date-runtime');
test('IST wall times and zoned instants agree without a next-day shift',()=>{
 for(const tz of ['UTC','Asia/Kolkata','America/Los_Angeles']){
 process.env.TZ=tz;
 assert.equal(dates.iso('2026-11-04 23:50'),'2026-11-04T18:20:00.000Z');
 assert.equal(dates.format('2026-11-04T18:20:00Z'),'04 Nov 2026 11:50 PM');
 assert.equal(dates.iso('2026-11-04 00:10'),'2026-11-03T18:40:00.000Z');
 assert.equal(dates.format('2026-11-03T18:40:00Z'),'04 Nov 2026 12:10 AM');
 assert.equal(dates.format('2026-11-04'),'04 Nov 2026');
 assert.equal(dates.format('04/11/2026 1:10 PM'),'04 Nov 2026 1:10 PM');
 assert.equal(dates.input('2026-11-03T18:40:00Z'),'2026-11-04 00:10');
 }
 assert.throws(()=>dates.iso('2026-02-30 12:00'));assert.throws(()=>dates.iso('2026-11-04 25:00'));
});
