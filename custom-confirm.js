// 🔴 ADMIN DASHBOARD SCRIPT

// 1. Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxf2hnyuoPFcV8pN4pRsI7kwVr6RyE-n9Fk5jxHiX-MLzyVeHlkMORUVvAczE8mfy7iFg/exec';

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
  scanStep = 1; // Reset to Step 1
  tempOrderId = null;

  document.getElementById('scanner-modal').style.display = 'flex';
  updateScanInstruction();

  // ബാർകോഡുകൾ കൂടി സപ്പോർട്ട് ചെയ്യാൻ formatsToSupport ചേർക്കുന്നു
  const config = { fps: 10, qrbox: 250 };

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
  // Prevent multiple reads
  if (html5QrCode.isScanning === false) return;

  // --- DISPATCH MODE (Single Scan) ---
  if (scanMode === 'dispatch') {
    stopScanner();
    if (confirm(`Mark Order ${decodedText} as DISPATCHED?`)) {
      updateStatus(decodedText, 'Dispatched');
    }
    return;
  }

  // --- TRACKING MODE (Dual Scan) ---
  if (scanMode === 'tracking') {

    // STEP 1: Look for Order ID (Starts with ORD-)
    if (scanStep === 1) {
      if (decodedText.startsWith("ORD-")) {
        console.log("Order Found:", decodedText);
        tempOrderId = decodedText;
        scanStep = 2; // Move to next step

        // UI Update: Ask for Tracking ID
        updateScanInstruction();

        // Pause briefly to avoid double scanning the same QR
        html5QrCode.pause();
        setTimeout(() => html5QrCode.resume(), 1000);
      } else {
        // If scanned something else in Step 1
        console.log("Ignored non-order code in Step 1");
      }
    }
    // STEP 2: Look for Tracking ID (Anything that is NOT the Order ID)
    else if (scanStep === 2) {
      if (decodedText !== tempOrderId) {
        // Success! We have both IDs
        stopScanner();
        // Play a beep sound (Optional/Browser dependent)
        // new Audio('beep.mp3').play().catch(e=>{}); 

        if (confirm(`Link Tracking ID: ${decodedText} to Order: ${tempOrderId}?`)) {
          updateTracking(tempOrderId, decodedText);
        } else {
          // If cancelled, close scanner or restart? 
          // Currently closes scanner.
        }
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

function sendWhatsapp(orderId) {
  const row = allOrders.find(o => o.orderid === orderId);
  if (!row) return alert("Order not found!");

  const n = parseInt(row.quantity);
  const basePrice = n * 650;
  const total = calculatePrice(n, row.state); // Using helper function logic
  const courierCharge = total - basePrice;

  const msg = `*✅ Honey order confirmed!* 🍯\n🔖 \`\`\`#${orderId}\`\`\`\n🔗 _kafaklife.com_\n⌚ \`\`\`${row.timestamp}\`\`\`
  \n____________________________________\n
*${row.name.trim().toUpperCase()}*
${row.address.replace(/, /g, '\n').toUpperCase()}
*Pin: ${row.pincode}*
*Ph: ${row.phone}*\n
*Qty: ${row.quantity}*
*Amount(₹): ${basePrice} + ${courierCharge} (Courier)*
*Total(₹): ${total}/-*${row.message ? `\n\n💬 _${row.message}_` : ''}
____________________________________
\n*Please GPay to the number below and send the screenshot here. We will pack your order after receiving it.*\n
*(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്ത് സ്ക്രീന്‍ഷോട്ട് അയക്കൂ.. സ്ക്രീന്‍ഷോട്ട് അയച്ച ശേഷം ഓർഡർ പാക്ക് ചെയ്യും)* 👇
\n*7788990313 (KAFAK LLP)*\n`;

  let phone = String(row.whatsapp || row.phone).replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;
  window.open(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
}

// Init
loadOrders();