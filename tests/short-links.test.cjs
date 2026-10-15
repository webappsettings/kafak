const test=require('node:test'),assert=require('node:assert/strict');
const Order=require('../business-order.js');
test('private sharing prefers a compact secret and preserves old links',()=>{const order={orderid:'K-test',accessToken:'b'.repeat(43),shortCode:'a'.repeat(22)};assert.equal(Order.privateLink('https://kafaklife.com/order.html',order),'https://kafaklife.com/o/#'+'a'.repeat(22));delete order.shortCode;assert.match(Order.privateLink('https://kafaklife.com/order.html',order),/oid=K-test#access=/);});
