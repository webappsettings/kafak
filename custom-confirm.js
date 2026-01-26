// 🔴 ADMIN DASHBOARD SCRIPT

// 1. Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzCFPTGSx7c85ET0bi2RUoKFc6HSZFoMUjDH6G-6c9bvlR6WN5YP1M6HwMmSNqrJdfL3g/exec';

let allOrders = [];
let html5QrCode;
let scanMode = ''; // 'dispatch' or 'tracking'
let scanStep = 1;  // 1 = Order QR, 2 = Tracking Barcode
let tempOrderId = null;

// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

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
        container.innerHTML = '<p class="text-center text-muted mt-4">No pending orders found.</p>';
        return;
      }

      allOrders.forEach(row => {
        const amount = calculatePrice(row.quantity, row.state);
        const statusClass = row.status === 'Dispatched' ? 'status-dispatched' : 'status-pending';

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${row.orderid}</strong> <span class="badge ${statusClass}">${row.status}</span><br>
              <small>👤 ${row.name} | 📞 ${row.phone}</small><br>
              <small>🍯 Qty: ${row.quantity} | 💰 ₹${amount}</small><br>
              <small>📍 ${row.state} - ${row.pincode}</small>
            </div>
            <div style="display:flex; flex-direction:column; gap:5px;">
              <button class="btn btn-sm btn-outline-dark" onclick="printLabel('${row.orderid}')">🖨️ Print</button>
              <button class="btn btn-sm btn-success" onclick="sendWhatsapp('${row.orderid}')">💬 WhatsApp</button>
            </div>
          </div>
        `;
        container.appendChild(div);
      });
    });
}

// --- SCANNER LOGIC ---
function startScanner(mode) {
  scanMode = mode;
  scanStep = 1;
  tempOrderId = null;

  document.getElementById('scanner-modal').style.display = 'flex';
  updateScanInstruction();

  // Reduced qrbox size for better focus
  const config = { fps: 10, qrbox: 200 };

  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
      console.error("Camera Error", err);
      alert("Camera permission denied or error.");
    });
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      document.getElementById('scanner-modal').style.display = 'none';
    }).catch(err => console.log("Stop failed", err));
  } else {
    document.getElementById('scanner-modal').style.display = 'none';
  }
}

function updateScanInstruction() {
  const title = document.getElementById('scan-instruction');
  const detail = document.getElementById('scan-detail');

  if (scanMode === 'dispatch') {
    title.innerText = "📦 DISPATCH MODE";
    detail.innerText = "Scan Order QR Code (ORD-...)";
    title.style.color = "#007bff";
  }
  else if (scanMode === 'tracking') {
    if (scanStep === 1) {
      title.innerText = "Step 1: Scan ORDER QR";
      detail.innerText = "Scan the QR code on the address label";
      title.style.color = "#d63384";
    } else {
      title.innerText = "Step 2: Scan TRACKING Barcode";
      detail.innerText = `Order: ${tempOrderId} Found! Now Scan Tracking Label.`;
      title.style.color = "#198754";
    }
  }
}

function onScanSuccess(decodedText) {
  if (html5QrCode.isScanning === false) return;

  // --- DISPATCH MODE ---
  if (scanMode === 'dispatch') {
    if (!decodedText.startsWith("ORD-")) return; // Ignore non-orders

    html5QrCode.pause(); // Pause camera before confirm alert

    setTimeout(() => {
      if (confirm(`Mark Order ${decodedText} as DISPATCHED?`)) {
        stopScanner();
        updateStatus(decodedText, 'Dispatched');
      } else {
        html5QrCode.resume(); // Resume if cancelled
      }
    }, 300);
  }

  // --- TRACKING MODE ---
  else if (scanMode === 'tracking') {

    // STEP 1: Scan ORDER QR
    if (scanStep === 1) {
      if (!decodedText.startsWith("ORD-")) {
        // Optional: Show UI feedback "Not an Order QR"
        return;
      }

      tempOrderId = decodedText;
      scanStep = 2;
      updateScanInstruction();

      // Pause briefly to allow user to move to barcode
      html5QrCode.pause();
      setTimeout(() => html5QrCode.resume(), 1500);
    }

    // STEP 2: Scan TRACKING Barcode
    else if (scanStep === 2) {
      if (decodedText.startsWith("ORD-")) {
        // Ignored: Re-scanned Order QR
        return;
      }

      // Found Tracking ID
      html5QrCode.pause(); // Pause before confirm

      setTimeout(() => {
        if (confirm(`Link Tracking ID: ${decodedText}\nTo Order: ${tempOrderId}?`)) {
          stopScanner();
          updateTracking(tempOrderId, decodedText);
        } else {
          // Cancelled, restart scanning for tracking
          html5QrCode.resume();
        }
      }, 300);
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

// --- UTILS ---
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

  // Create a hidden print area or new window
  const printWindow = window.open('', '', 'width=600,height=600');
  printWindow.document.write(`
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .label-box { border: 2px solid #000; padding: 20px; max-width: 350px; margin: auto; }
            .qr-code { width: 120px; height: 120px; }
            h2 { margin: 10px 0; }
            p { font-size: 16px; line-height: 1.4; }
        </style>
    </head>
    <body>
        <div class="label-box">
            <img src="${qrUrl}" class="qr-code">
            <h2>TO:</h2>
            <p>
                <b>${order.name.toUpperCase()}</b><br>
                ${order.address}<br>
                <b>PH: ${order.phone}</b>
            </p>
            <hr>
            <small>Order ID: ${order.orderid} | Qty: ${order.quantity}</small><br>
            <small><b>From: KAFAK LLP, Kerala | Ph: 7788990313</b></small>
        </div>
        <script>
            window.onload = function() { window.print(); window.close(); }
        </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// --- WHATSAPP FUNCTION ---
function sendWhatsapp(orderId) {
  const row = allOrders.find(o => o.orderid === orderId);
  if (!row) { alert("Order details not found!"); return; }

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

  // Format Address for readability
  const formattedAddress = row.address.split(',').map(p => p.trim()).join('\n');

  const submitTime = row.timestamp;
  const messageContent = row.message ? `\n\n💬 *Note:* _${row.message}_` : '';

  // 🔴 UPDATED: Using Monospace for ID (```)
  const header = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderId}\`\`\`\n🔗 _${editLink}_\n(Click link to edit order)`;

  const details = `
____________________________________\n
*${row.name.trim().toUpperCase()}*
${formattedAddress.toUpperCase()}
*Pin: ${String(row.pincode).trim()}*
*Ph: ${row.phone}*\n
*Qty: ${row.quantity}*
*${amountText}*
*${totalText}*${messageContent}
____________________________________
\n*Please GPay to the number below...*
_(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്യുക)_ 👇
\n*7788990313 (KAFAK LLP)*\n`;

  const finalMsg = encodeURIComponent(header + details);

  let customerPhone = String(row.whatsapp || row.phone).replace(/\D/g, '');
  if (customerPhone.length === 10) customerPhone = '91' + customerPhone;

  // Use wa.me for better compatibility
  window.open(`https://wa.me/${customerPhone}?text=${finalMsg}`, '_blank');
}

// Initialize
loadOrders();