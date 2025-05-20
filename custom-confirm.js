const cd = 'AKfycbx0vIfeeIQXffYoILxyexwoVd9Oli9Yv_Dw0mIIB1T9RstV-D6A-wpGTN0DcsD9LIL06A';
const sc = `https://script.google.com/macros/s/${cd}/exec`;

fetch(`${sc}?action=list`)
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('order-list');
    data.rows.forEach((row, index) => {
    const wrapper = document.createElement('div');
    const rowIndex = row.rowNumber;
      wrapper.innerHTML = `
        <div>
          ${formatTimestamp(row.timestamp)}<br>
          <b>${row.name}</b> - ${row.phone}<br>
          Qty: ${row.quantity}<br>
          <button onclick='sendConfirmation(${JSON.stringify(row)})'>Confirm</button>
          <button onclick='markConfirmed(${rowIndex}, this)'>Mark as Confirmed</button>
        </div><hr>`;
      container.appendChild(wrapper);
    });
  })
  .catch(err => {
    console.error('Error loading orders:', err);
    document.getElementById('order-list').innerHTML = '<p>Error loading data.</p>';
  });


  function markConfirmed(rowIndex, btn) {
  fetch(`${sc}?action=confirm&row=${rowIndex}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        btn.textContent = '✅ Confirmed';
        btn.disabled = true;
        btn.style.backgroundColor = '#28a745';
      } else {
        alert('Failed to mark as confirmed.');
      }
    })
    .catch(() => alert('Error while marking confirmation.'));
}



  function formatTimestamp(isoString) {
  const date = new Date(isoString);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months start from 0
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
}


function getCourierCharge(bottles) {
  switch (bottles) {
    case 1: return 80;
    case 2: return 140;
    case 3: return 190;
    case 4: return 240;
    case 5: return 290;
    case 6: return 340;
    case 8: return 480;
    case 10: return 500;
    default: return 0;
  }
}

function calculateAmountString(quantityText) {
  const numberOfBottles = parseInt(quantityText);
  const basePricePerBottle = 500;
  if (isNaN(numberOfBottles)) return '';
  const amount = numberOfBottles * basePricePerBottle;
  const courierCharge = getCourierCharge(numberOfBottles);
  return `Amount(₹): ${amount} + ${courierCharge}`;
}

function calculateTotalString(amountString) {
  const numbers = amountString.match(/\d+/g);
  if (!numbers || numbers.length < 2) return '';
  const amount = parseInt(numbers[0]);
  const courierCharge = parseInt(numbers[1]);
  const total = amount + courierCharge;
  return `Total(₹): ${total}/-`;
}


function sendConfirmation(row) {
  console.log(row);
  const whatsapp = row.whatsapp;
  const orderid = row.orderid;
  const submitTime = formatTimestamp(row.timestamp);
  const postLabel = row.officename || row.postoffice || '';

  const amountTextW = calculateAmountString(row.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);
  const extra1 = `*✅ Honey order confirmed!* 🍯\n🔖 \`\`\`#${orderid}\`\`\`\n🔗 _kafaklife.com/order?${row.rowNumber}_\n⌚ \`\`\`${submitTime}\`\`\``;
  const msg = row.message ? `\n\n💬 _${row.message.trim()}_\n` : '\n';

  const wtspformat = `
____________________________________\n
*${row.name.trim().toUpperCase()}*
*${row.house.trim().toUpperCase()}*
*${row.place.trim().toUpperCase()}*
*${postLabel.trim().toUpperCase()}*
*${row.district.trim().toUpperCase()}*
*${row.state.trim().toUpperCase()}*
*Pin: ${String(row.pincode).trim()}*
*Ph: ${row.phone}*\n
*Qty: ${row.quantity}*
*${amountTextW}*\n
*${totalTextW}*${msg}
____________________________________

*Please GPay to the number below and send the screenshot here. We will pack your order after receiving it.*\n
*(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്ത് സ്ക്രീന്‍ഷോട്ട് അയക്കൂ.. സ്ക്രീന്‍ഷോട്ട് അയച്ച ശേഷം ഓർഡർ പാക്ക് ചെയ്യും)* 👇
\n*7788990313 (KAFAK LLP)*\n`;

  const message = encodeURIComponent(extra1 + wtspformat);


  // Fix: force to string and strip non-digits
  const formattedNumber = String(whatsapp).replace(/\D/g, '');
  const withCountryCode = formattedNumber.startsWith('91') ? formattedNumber : '91' + formattedNumber;
  window.open(`whatsapp://send?phone=${withCountryCode}&text=${message}`, '_blank');
  // window.open(`whatsapp://send?phone=${formattedNumber}&text=${message}`, '_blank');
}

