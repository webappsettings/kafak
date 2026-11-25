const test=require('node:test'),assert=require('node:assert/strict'),address=require('../address-runtime.js');
test('address cleanup keeps dedicated postal/contact fields, removes repeated address copies and preserves real landmarks',()=>{const input={house:'ASEEM MANZIL VALACHAL VALLIKUNNAM PO ALAPPUZHA',place:'VALLIKUNNAM PO, ALAPPUZHA, KERALA, PIN 690501, PH 8086343665',postoffice:'VALLIKUNNAM PO',district:'ALAPPUZHA',state:'KERALA',pincode:'690501',phone:'8086343665',whatsapp:'8086343665'};const result=address.normalize(input);assert.equal(result.house,'ASEEM MANZIL VALACHAL');assert.equal(result.place,'');assert.equal(result.postoffice,'VALLIKUNNAM PO');for(const field of ['district','state','pincode','phone','whatsapp'])assert.equal(result[field],input[field]);assert.deepEqual(address.normalize(result),result);assert.equal(address.normalize({...input,house:'Alappuzha Villa',place:'Near Vallikunnam School'}).house,'Alappuzha Villa');assert.equal(address.normalize({...input,house:'Alappuzha Villa',place:'Near Vallikunnam School'}).place,'Near Vallikunnam School');});

test('WhatsApp address skips empty normalized fields and retains one PO line',()=>{
 const input={name:'Anasanchal',house:'EARANATTU PUTHEN VEEDU',place:'ANCHAL PO',postoffice:'ANCHAL PO',district:'KOLLAM',state:'KERALA',pincode:'691306',phone:'9999999999',altphone:'9999999998'};
 const before=JSON.stringify(input),message=address.whatsappAddress(input);
 assert.equal(message,'*ANASANCHAL*\n*EARANATTU PUTHEN VEEDU*\n*ANCHAL PO*\n*KOLLAM*\n*KERALA*\n*Pin: 691306*\n*Ph: 9999999999*\n*Alt Ph: 9999999998*');assert.equal(JSON.stringify(input),before);
 for(const place of ['',null,undefined,'  ','**']){const text=address.whatsappAddress({...input,place,altphone:' '});assert(!text.split('\n').includes('**'));assert(!text.includes('Alt Ph:'));}
 assert.equal(address.whatsappAddress({}), '');
});
