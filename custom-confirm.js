// 🔴 ADMIN DASHBOARD SCRIPT

// 1. Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIRamtjufuR-ADwMDidaqLxw5-leivVN1NyNhxDI0QeD0GemVUbPLWSFPwnrecGUOkpg/exec';

let allOrders = [];
let html5QrCode;
let scanMode = ''; // 'dispatch' or 'tracking'
let scanStep = 1;  // 1 = Order QR, 2 = Tracking Barcode
let tempOrderId = null; // To store Order ID temporarily

// --- LOAD ORDERS ---
function loadOrders() {
  document.getElementById('loader').style.display = 'block';
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

// --- SCANNER LOGIC (DUAL SCAN) ---
function startScanner(mode) {
  scanMode = mode;
  scanStep = 1;
  tempOrderId = null;

  document.getElementById('scanner-modal').style.display = 'flex';
  updateScanInstruction();

  // 🔴 CHANGE: qrbox size 250-ൽ നിന്ന് 200 ആക്കി കുറച്ചു. 
  // ഇത് സ്കാനിംഗ് ഏരിയ ചെറുതാക്കാൻ സഹായിക്കും, അപ്പോൾ കൃത്യമായി ഫോക്കസ് ചെയ്യാം.
  const config = { fps: 10, qrbox: 200 };

  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => console.log(err));
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      document.getElementById('scanner-modal').style.display = 'none';
    });
  }
}

function updateScanInstruction() {
  const title = document.getElementById('scan-instruction');
  const detail = document.getElementById('scan-detail');

  if (scanMode === 'dispatch') {
    title.innerText = "📦 DISPATCH MODE";
    detail.innerText = "Scan Order QR Code";
    title.style.color = "#007bff";
  }
  else if (scanMode === 'tracking') {
    if (scanStep === 1) {
      title.innerText = "Step 1: Scan ORDER QR";
      detail.innerText = "Scan the QR code on the address label";
      title.style.color = "#d63384"; // Pink
    } else {
      title.innerText = "Step 2: Scan TRACKING Barcode";
      detail.innerText = `Order: ${tempOrderId} Found! Now Scan Tracking Label.`;
      title.style.color = "#198754"; // Green
    }
  }
}

function onScanSuccess(decodedText) {
  if (html5QrCode.isScanning === false) return;

  // --- DISPATCH MODE ---
  if (scanMode === 'dispatch') {
    // Dispatch-ൽ "ORD-" എന്ന് തുടങ്ങുന്നവ മാത്രമേ എടുക്കാവൂ
    if (!decodedText.startsWith("ORD-")) {
      console.log("Ignored: Not an Order ID");
      return;
    }

    stopScanner();
    if (confirm(`Mark Order ${decodedText} as DISPATCHED?`)) {
      updateStatus(decodedText, 'Dispatched');
    }
    return;
  }

  // --- TRACKING MODE (Smart Dual Scan) ---
  if (scanMode === 'tracking') {

    // STEP 1: Scan ORDER QR
    if (scanStep === 1) {
      // 🔴 FILTER: "ORD-" എന്ന് തുടങ്ങുന്നില്ലെങ്കിൽ അത് ബാർകോഡ് ആകാം. അത് ഒഴിവാക്കുക.
      if (!decodedText.startsWith("ORD-")) {
        console.log("Ignored: Detected Barcode/Other text while waiting for Order QR");
        // ചെറിയൊരു മുന്നറിയിപ്പ് താഴെ കാണിക്കാം (Optional)
        document.getElementById('scan-detail').innerText = "❌ That's not the Order QR! Look for 'ORD-...'";
        document.getElementById('scan-detail').style.color = "red";
        return;
      }

      // If valid Order ID
      console.log("Order Found:", decodedText);
      tempOrderId = decodedText;
      scanStep = 2;

      // Update UI for Step 2
      updateScanInstruction();

      // Pause briefly (1.5 seconds) to move camera to barcode
      html5QrCode.pause();
      setTimeout(() => html5QrCode.resume(), 1500);
    }

    // STEP 2: Scan TRACKING Barcode
    else if (scanStep === 2) {
      // 🔴 FILTER: വീണ്ടും പഴയ QR കോഡ് (ORD-...) ആണ് സ്കാൻ ആയതെങ്കിൽ ഒഴിവാക്കുക.
      if (decodedText.startsWith("ORD-")) {
        console.log("Ignored: Re-scanned Order QR instead of Tracking ID");
        document.getElementById('scan-detail').innerText = "⚠️ You scanned Order QR again! Scan the Barcode.";
        return;
      }

      // Success! It's a tracking ID
      stopScanner();

      if (confirm(`Link Tracking ID: ${decodedText} to Order: ${tempOrderId}?`)) {
        updateTracking(tempOrderId, decodedText);
      } else {
        // If cancelled, restart scanner
        stopScanner();
      }
    }
  }
}

// --- API CALLS ---
function updateStatus(orderId, status) {
  fetch(`${SCRIPT_URL}?action=updateStatus&orderid=${orderId}&status=${status}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        alert('✅ Status Updated!');
        loadOrders();
      } else {
        alert('❌ Order ID not found!');
      }
    });
}

function updateTracking(orderId, trackingId) {
  fetch(`${SCRIPT_URL}?action=updateTracking&orderid=${orderId}&tracking=${trackingId}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        alert('✅ Tracking Updated & Order Completed!');
        loadOrders();
      } else {
        alert('❌ Error updating tracking.');
      }
    });
}

// --- UTILS (Price & Print & WhatsApp) ---
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

function calculatePrice(qty, state) {
  const n = parseInt(qty) || 0;
  let charge = 0;
  let st = String(state).toLowerCase().trim();

  if (st === 'lakshadweep') charge = (n * 100) + 20;
  else charge = (st === 'kerala' ? courierRates.kerala : courierRates.outside)[n] || 0;

  return (n * 650) + charge;
}

function printLabel(orderId) {
  const order = allOrders.find(o => o.orderid === orderId);
  if (!order) return;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderId}`;
  document.getElementById('print-area').innerHTML = `
    <div class="print-label">
      <img src="${qrUrl}" class="qr-code">
      <h3>TO:</h3>
      <p><b>${order.name.toUpperCase()}</b><br>${order.address.replace(/,/g, '<br>')}<br><b>PH: ${order.phone}</b></p>
      <hr><small>Order ID: ${order.orderid} | Qty: ${order.quantity}</small><br>
      <small>From: Kafak LLP, Kerala | Ph: 7788990313</small>
    </div>`;
  window.print();
}

// --- WHATSAPP FUNCTION (For Admin Dashboard) ---
function sendWhatsapp(orderId) {
  const row = allOrders.find(o => o.orderid === orderId);
  if (!row) {
    alert("Order details not found!");
    return;
  }

  const qty = parseInt(row.quantity);
  const basePrice = qty * 650;
  let courierCharge = 0;
  let stateVal = String(row.state).trim().toLowerCase();

  if (stateVal === 'lakshadweep') courierCharge = (qty * 100) + 20;
  else {
    const rates = (stateVal === 'kerala') ? courierRates.kerala : courierRates.outside;
    courierCharge = rates[qty] || 0;
  }

  const total = basePrice + courierCharge;
  const editLink = `kafaklife.com/order.html?oid=${orderId}`;

  const amountText = `Amount(₹): ${basePrice} + ${courierCharge} (Courier)`;
  const totalText = `Total(₹): ${total}/-`;
  const formattedAddress = row.address.replace(/, /g, '\n').toUpperCase();
  const submitTime = row.timestamp;
  const messageContent = row.message ? `\n\n💬 _${row.message}_\n` : '\n';

  // 🔴 CHANGE: Removed ``` and added * for Bold
  const header = `*✅ Honey order confirmed!* 🍯\n🔖 *#${orderId}*\n🔗 _${editLink}_\n(Click link to edit order)\n⌚ \`\`\`${submitTime}\`\`\``;

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

*Please GPay to the number below...* 👇
\n*7788990313 (KAFAK LLP)*\n`;

  const finalMsg = encodeURIComponent(header + details);

  let customerPhone = String(row.whatsapp || row.phone).replace(/\D/g, '');
  if (customerPhone.length === 10) customerPhone = '91' + customerPhone;

  window.open(`https://api.whatsapp.com/send?phone=${customerPhone}&text=${finalMsg}`, '_blank');
}

// Init
loadOrders();