// 🔴 ADMIN DASHBOARD SCRIPT

// 1. Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpYHAGtFP-kS-RsfU79oJ6fZr6BFL_JZjszH_s8JVCtMiWdx54TVzQ2-9nzcXs-FEAEA/exec';

let allOrders = [];
let html5QrCode;
let scanMode = ''; // 'dispatch' or 'tracking'

// 2. Courier Rates (Required for calculation)
const courierRates = {
  kerala: {
    1: 80, 2: 140, 3: 190, 4: 240,
    5: 290, 6: 340, 8: 480, 10: 500
  },
  outside: {
    1: 110, 2: 200, 3: 280, 4: 350,
    5: 430, 6: 510, 8: 640, 10: 840
  }
};

// --- LOAD ORDERS ---
function loadOrders() {
  fetch(`${SCRIPT_URL}?action=list`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('loader').style.display = 'none';
      const container = document.getElementById('order-list');
      container.innerHTML = '';
      allOrders = data.rows || [];

      if (allOrders.length === 0) {
        container.innerHTML = '<p>No pending orders.</p>';
        return;
      }

      allOrders.forEach(row => {
        // Calculate Price for Display
        const amount = calculatePrice(row.quantity, row.state);
        const statusClass = row.status === 'Dispatched' ? 'status-dispatched' : 'status-pending';

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between;">
            <div>
              <strong>#${row.orderid}</strong> <span class="${statusClass}">[${row.status}]</span><br>
              👤 ${row.name} - ${row.phone}<br>
              🍯 Qty: ${row.quantity} | ₹${amount}<br>
              📍 ${row.state} - ${row.pincode}
            </div>
            <div>
              <button class="btn btn-print" onclick="printLabel('${row.orderid}')">🖨️ Print</button>
              <button class="btn btn-whatsapp" onclick="sendWhatsapp('${row.orderid}')">💬 WhatsApp</button>
            </div>
          </div>
        `;
        container.appendChild(div);
      });
    });
}

// --- PRICE CALCULATION LOGIC ---
function calculatePrice(qty, state) {
  const n = parseInt(qty);
  if (isNaN(n)) return 0;

  let charge = 0;
  let st = String(state).toLowerCase().trim();

  if (st === 'lakshadweep') {
    charge = (n * 100) + 20;
  } else {
    // Kerala Rates
    const table = st === 'kerala' ? courierRates.kerala : courierRates.outside;
    charge = table[n] || 0;
  }
  return (n * 650) + charge;
}

// --- PRINT FUNCTION ---
function printLabel(orderId) {
  const order = allOrders.find(o => o.orderid === orderId);
  if (!order) return;

  const printArea = document.getElementById('print-area');
  // QR Code URL (Generates QR containing Order ID)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderId}`;

  printArea.innerHTML = `
    <div class="print-label">
      <img src="${qrUrl}" class="qr-code">
      <h3>TO:</h3>
      <p><b>${order.name.toUpperCase()}</b><br>
      ${order.address.replace(/,/g, '<br>')}<br>
      <b>PH: ${order.phone}</b></p>
      <hr>
      <small>Order ID: ${order.orderid} | Qty: ${order.quantity}</small><br>
      <small>From: Kafak LLP, Kerala | Ph: 7788990313</small>
    </div>
  `;
  window.print();
}

// --- WHATSAPP FUNCTION (Updated) ---
function sendWhatsapp(orderId) {
  const row = allOrders.find(o => o.orderid === orderId);
  if (!row) {
    alert("Order details not found!");
    return;
  }

  // Calculate Price Dynamic
  const qty = parseInt(row.quantity);
  const basePrice = qty * 650;
  let courierCharge = 0;
  let stateVal = String(row.state).trim().toLowerCase();

  if (stateVal === 'lakshadweep') {
    courierCharge = (qty * 100) + 20;
  } else {
    const rates = (stateVal === 'kerala') ? courierRates.kerala : courierRates.outside;
    courierCharge = rates[qty] || 0;
  }

  const total = basePrice + courierCharge;

  // Formatting
  const amountText = `Amount(₹): ${basePrice} + ${courierCharge} (Courier)`;
  const totalText = `Total(₹): ${total}/-`;
  const formattedAddress = row.address.replace(/, /g, '\n').toUpperCase();
  const submitTime = row.timestamp;
  const messageContent = row.message ? `\n\n💬 _${row.message}_\n` : '\n';

  // Message Body
  const header = `*✅ Honey order confirmed!* 🍯\n🔖 \`\`\`#${orderId}\`\`\`\n🔗 _kafaklife.com_\n⌚ \`\`\`${submitTime}\`\`\``;
  const details = `
____________________________________\n
*${row.name.trim().toUpperCase()}*
${formattedAddress}
*Pin: ${String(row.pincode).trim()}*
*Ph: ${row.phone}*\n
*Qty: ${row.quantity}*
*${amountText}*
*${totalText}*${messageContent}
____________________________________

*Please GPay to the number below and send the screenshot here. We will pack your order after receiving it.*\n
*(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്ത് സ്ക്രീന്‍ഷോട്ട് അയക്കൂ.. സ്ക്രീന്‍ഷോട്ട് അയച്ച ശേഷം ഓർഡർ പാക്ക് ചെയ്യും)* 👇
\n*7788990313 (KAFAK LLP)*\n`;

  const finalMsg = encodeURIComponent(header + details);

  // Phone Handling
  let customerPhone = String(row.whatsapp || row.phone).replace(/\D/g, '');
  if (customerPhone.length === 10) customerPhone = '91' + customerPhone;

  window.open(`whatsapp://send?phone=${customerPhone}&text=${finalMsg}`, '_blank');
}

// --- SCANNER FUNCTIONS ---
function startScanner(mode) {
  scanMode = mode;
  document.getElementById('scanner-modal').style.display = 'flex';
  document.getElementById('scan-title').innerText = mode === 'dispatch' ? 'Scan Order QR to DISPATCH' : 'Scan Order QR to UPDATE TRACKING';

  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    onScanSuccess
  ).catch(err => console.log(err));
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      document.getElementById('scanner-modal').style.display = 'none';
    });
  }
}

function onScanSuccess(decodedText) {
  stopScanner();

  if (scanMode === 'dispatch') {
    if (confirm(`Mark Order ${decodedText} as DISPATCHED?`)) {
      updateStatus(decodedText, 'Dispatched');
    }
  }
  else if (scanMode === 'tracking') {
    let trackID = prompt(`Enter Tracking ID for ${decodedText}:`);
    if (trackID) {
      updateTracking(decodedText, trackID);
    }
  }
}

// --- API CALLS ---
function updateStatus(orderId, status) {
  fetch(`${SCRIPT_URL}?action=updateStatus&orderid=${orderId}&status=${status}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        alert('Status Updated!');
        loadOrders();
      } else {
        alert('Order ID not found or Error!');
      }
    });
}

function updateTracking(orderId, trackingId) {
  fetch(`${SCRIPT_URL}?action=updateTracking&orderid=${orderId}&tracking=${trackingId}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        alert('Tracking Updated & Order Completed!');
        loadOrders();
      } else {
        alert('Error updating tracking.');
      }
    });
}

// Initial Load
loadOrders();