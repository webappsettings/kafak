// 🔴 Update with NEW Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzCFPTGSx7c85ET0bi2RUoKFc6HSZFoMUjDH6G-6c9bvlR6WN5YP1M6HwMmSNqrJdfL3g/exec';

// --- AUTHENTICATION LOGIC ---

// Page Load: Check if already logged in
window.onload = function () {
    if (localStorage.getItem('kafakAdminLoggedIn') === 'true') {
        showDashboard();
    } else {
        document.getElementById('login-section').style.display = 'flex';
    }
};

function attemptLogin() {
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;
    const btn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMsg');

    if (!user || !pass) { msg.innerText = "Please enter username and password"; return; }

    btn.disabled = true;
    btn.innerText = "Checking...";
    msg.innerText = "";

    fetch(`${SCRIPT_URL}?action=login&user=${user}&pass=${pass}`)
        .then(res => res.json())
        .then(data => {
            btn.disabled = false;
            btn.innerText = "LOGIN DASHBOARD";

            if (data.result === 'success') {
                // Success! Save to Local Storage
                localStorage.setItem('kafakAdminLoggedIn', 'true');
                showDashboard();
            } else {
                msg.innerText = "❌ Incorrect Username or Password!";
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.innerText = "LOGIN DASHBOARD";
            msg.innerText = "Network Error. Try again.";
        });
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('kafakAdminLoggedIn');
        location.reload(); // Refresh page to show login
    }
}

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    loadOrders(); // Start loading data
}

// --- DASHBOARD LOGIC (Same as before) ---
let allOrders = [];
let html5QrCode;
let scanMode = '';
let scanStep = 1;
let tempOrderId = null;
const courierRates = { kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 }, outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 } };

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
                container.innerHTML = '<div class="col-12 text-center text-muted"><p>✨ No pending orders found.</p></div>';
                return;
            }

            allOrders.forEach(row => {
                const amount = calculatePrice(row.quantity, row.state);
                let badgeClass = row.status === 'Dispatched' ? 'bg-dispatched' : (row.status === 'Completed' ? 'bg-completed' : 'bg-pending');

                const col = document.createElement('div');
                col.className = 'col-md-6 col-lg-4';
                col.innerHTML = `
                  <div class="order-card">
                    <div class="card-header-custom">
                        <span style="font-weight:bold; color:#333;">#${row.orderid}</span>
                        <span class="status-badge ${badgeClass}">${row.status}</span>
                    </div>
                    <div class="card-body">
                        <h5 style="font-size:16px; font-weight:600; margin-bottom:5px;">${row.name}</h5>
                        <p class="text-muted small mb-2">📞 ${row.phone}</p>
                        <div style="background:#f9f9f9; padding:10px; border-radius:10px; font-size:14px;">
                            <div class="d-flex justify-content-between"><span>🍯 Qty: <b>${row.quantity}</b></span><span>💰 ₹${amount}</span></div>
                            <hr style="margin:5px 0;"><span class="text-muted small">📍 ${row.state} - ${row.pincode}</span>
                        </div>
                        <div class="d-flex gap-2 mt-3">
                            <button class="btn btn-action btn-print flex-fill justify-content-center" onclick="printLabel('${row.orderid}')">🖨️ Print</button>
                            <button class="btn btn-action btn-whatsapp flex-fill justify-content-center" onclick="sendWhatsapp('${row.orderid}')">💬 WhatsApp</button>
                        </div>
                    </div>
                  </div>`;
                container.appendChild(col);
            });
        });
}

// --- SCANNER ---
function startScanner(mode) {
    scanMode = mode; scanStep = 1; tempOrderId = null;
    document.getElementById('scanner-modal').style.display = 'flex';
    updateScanInstruction();
    const config = { fps: 10, qrbox: 280 };
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .catch(err => { alert("Camera Error"); document.getElementById('scanner-modal').style.display = 'none'; });
}

function stopScanner() {
    if (html5QrCode) html5QrCode.stop().then(() => document.getElementById('scanner-modal').style.display = 'none');
    else document.getElementById('scanner-modal').style.display = 'none';
}

function updateScanInstruction() {
    const title = document.getElementById('scan-instruction');
    const detail = document.getElementById('scan-detail');
    if (scanMode === 'dispatch') { title.innerText = "📦 DISPATCH MODE"; detail.innerText = "Scan Order QR Code (ORD-...)"; title.style.color = "#4fc3f7"; }
    else if (scanMode === 'tracking') {
        if (scanStep === 1) { title.innerText = "Step 1: Scan ORDER QR"; detail.innerText = "Scan the QR code on the address label"; title.style.color = "#ff8a80"; }
        else { title.innerText = "Step 2: Scan TRACKING Barcode"; detail.innerText = `Order Found! Now Scan Tracking Label.`; title.style.color = "#69f0ae"; }
    }
}

function onScanSuccess(decodedText) {
    if (html5QrCode.isScanning === false) return;
    if (scanMode === 'dispatch') {
        if (!decodedText.startsWith("ORD-")) return;
        html5QrCode.pause();
        setTimeout(() => { if (confirm(`Mark Order ${decodedText} as DISPATCHED?`)) { stopScanner(); updateStatus(decodedText, 'Dispatched'); } else { html5QrCode.resume(); } }, 300);
    } else if (scanMode === 'tracking') {
        if (scanStep === 1) {
            if (!decodedText.startsWith("ORD-")) return;
            tempOrderId = decodedText; scanStep = 2; updateScanInstruction(); html5QrCode.pause(); setTimeout(() => html5QrCode.resume(), 1000);
        } else if (scanStep === 2) {
            if (decodedText.startsWith("ORD-")) return;
            html5QrCode.pause(); setTimeout(() => { if (confirm(`Link Tracking ID: ${decodedText}\nTo Order: ${tempOrderId}?`)) { stopScanner(); updateTracking(tempOrderId, decodedText); } else { html5QrCode.resume(); } }, 300);
        }
    }
}

function updateStatus(orderId, status) { fetch(`${SCRIPT_URL}?action=updateStatus&orderid=${orderId}&status=${status}`).then(res => res.json()).then(data => { if (data.result === 'success') loadOrders(); else alert('Error'); }); }
function updateTracking(orderId, trackingId) { fetch(`${SCRIPT_URL}?action=updateTracking&orderid=${orderId}&tracking=${trackingId}`).then(res => res.json()).then(data => { if (data.result === 'success') { alert('Tracking Updated!'); loadOrders(); } else alert('Error'); }); }

function calculatePrice(qty, state) {
    const n = parseInt(qty) || 0; let charge = 0; let st = String(state).toLowerCase().trim();
    if (st === 'lakshadweep') charge = (n * 100) + 20; else charge = (st === 'kerala' ? courierRates.kerala : courierRates.outside)[n] || 0;
    return (n * 650) + charge;
}

function printLabel(orderId) {
    const order = allOrders.find(o => o.orderid === orderId); if (!order) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderId}`;
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`<html><head><style>body{font-family:Arial;text-align:center;padding:20px}.label-box{border:2px solid #000;padding:20px;max-width:350px;margin:auto}.qr-code{width:120px;height:120px}h2{margin:10px 0}p{font-size:16px;line-height:1.4}</style></head><body><div class="label-box"><img src="${qrUrl}" class="qr-code"><h2>TO:</h2><p><b>${order.name.toUpperCase()}</b><br>${order.address}<br><b>PH: ${order.phone}</b></p><hr><small>Order ID: ${order.orderid} | Qty: ${order.quantity}</small><br><small><b>From: KAFAK LLP, Kerala | Ph: 7788990313</b></small></div><script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
    printWindow.document.close();
}

function sendWhatsapp(orderId) {
    const row = allOrders.find(o => o.orderid === orderId); if (!row) { alert("Error"); return; }
    const qty = parseInt(row.quantity); const basePrice = qty * 650;
    let courierCharge = (String(row.state).trim().toLowerCase() === 'lakshadweep') ? (qty * 100) + 20 : (String(row.state).trim().toLowerCase() === 'kerala' ? courierRates.kerala[qty] : courierRates.outside[qty]);
    const total = basePrice + courierCharge;
    const editLink = `kafaklife.com/order.html?oid=${orderId}`;
    const formattedAddress = `*${row.address.split(',').map(p => p.trim()).join('\n').toUpperCase()}*`;
    const msg = row.message ? `\n\n💬 *Note:* _${row.message}_` : '';
    const header = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderId}\`\`\`\n🔗 _${editLink}_\n(Click link to edit order)`;
    const details = `____________________________________\n*${row.name.trim().toUpperCase()}*\n${formattedAddress}\n*Pin: ${String(row.pincode).trim()}*\n*Ph: ${row.phone}*\n*Qty: ${row.quantity}*\n*Amount(₹): ${basePrice} + ${courierCharge} (Courier)*\n*Total(₹): ${total}/-*${msg}\n____________________________________\n\n*Please GPay to the number below...*\n_(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്യുക)_ 👇\n\n*7788990313 (KAFAK LLP)*\n`;
    let cp = String(row.whatsapp || row.phone).replace(/\D/g, ''); if (cp.length === 10) cp = '91' + cp;
    window.open(`https://wa.me/${cp}?text=${encodeURIComponent(header + details)}`, '_blank');
}