
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwOjgnufnI1mNulCd_inPwOls_AXMJizzUNrkleJFuK24PjlC7uzdXhj-dIu2DadL6cCQ/exec';

// --- AUTHENTICATION & IP LOGIC ---
window.onload = function () {
    if (localStorage.getItem('kafakAdminLoggedIn') === 'true') {
        showDashboard();
    } else {
        document.getElementById('login-section').style.display = 'flex';
    }
};

async function attemptLogin() {
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;
    const btn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMsg');

    if (!user || !pass) { msg.innerText = "Please enter credentials"; return; }

    btn.disabled = true;
    btn.innerText = "Verifying...";
    msg.innerText = "";

    // 🔴 1. GET IP ADDRESS
    let userIP = "Unknown";
    try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        userIP = ipData.ip;
    } catch (e) { console.log("IP fetch failed"); }

    // 🔴 2. SEND TO SCRIPT WITH IP
    fetch(`${SCRIPT_URL}?action=login&user=${user}&pass=${pass}&ip=${userIP}`)
        .then(res => res.json())
        .then(data => {
            btn.disabled = false;
            btn.innerText = "ACCESS DASHBOARD";

            if (data.result === 'success') {
                localStorage.setItem('kafakAdminLoggedIn', 'true');
                showDashboard();
            } else {
                msg.innerText = "❌ Login Failed!";
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.innerText = "ACCESS DASHBOARD";
            msg.innerText = "Network Error.";
        });
}

function logout() {
    if (confirm("Logout now?")) {
        localStorage.removeItem('kafakAdminLoggedIn');
        location.reload();
    }
}

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    loadOrders();
}

// --- DASHBOARD LOGIC (Updated Design) ---
let allOrders = [];
let html5QrCode;
let scanMode = ''; scanStep = 1; tempOrderId = null;
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
                container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h3 style="opacity:0.3">📭</h3><p>No new orders</p></div>';
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
                <span class="order-id">#${row.orderid}</span>
                <span class="status-badge ${badgeClass}">${row.status}</span>
            </div>
            <div class="card-body-custom">
                <div class="customer-name">${row.name}</div>
                <span class="customer-phone">📞 ${row.phone}</span>
                
                <div class="order-details-box">
                    <div class="detail-row"><span class="detail-label">Quantity</span><span class="detail-value">${row.quantity} Bottles</span></div>
                    <div class="detail-row"><span class="detail-label">Total Amount</span><span class="detail-value price-value">₹${amount}</span></div>
                </div>

                <div class="address-text">
                    📍 ${row.address}<br>
                    Pin: <b>${row.pincode}</b> | ${row.state}
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-action btn-print flex-fill" onclick="printLabel('${row.orderid}')">🖨️ Print</button>
                    <button class="btn btn-action btn-whatsapp flex-fill" onclick="sendWhatsapp('${row.orderid}')">💬 WhatsApp</button>
                </div>
            </div>
          </div>`;
                container.appendChild(col);
            });
        });
}

// --- WHATSAPP BOLD FIX ---
function sendWhatsapp(orderId) {
    const row = allOrders.find(o => o.orderid === orderId); if (!row) return;
    const qty = parseInt(row.quantity); const basePrice = qty * 650;
    let courierCharge = (String(row.state).trim().toLowerCase() === 'lakshadweep') ? (qty * 100) + 20 : (String(row.state).trim().toLowerCase() === 'kerala' ? courierRates.kerala[qty] : courierRates.outside[qty]);
    const total = basePrice + courierCharge;
    const editLink = `kafaklife.com/order.html?oid=${orderId}`;

    // 🔴 BOLD FIX: Split address by comma, wrap each line in *, then join with newline
    const addressParts = row.address.split(',');
    let boldAddress = "";
    addressParts.forEach(part => {
        if (part.trim() !== "") {
            boldAddress += `*${part.trim().toUpperCase()}*\n`;
        }
    });

    const msg = row.message ? `\n\n💬 *Note:* _${row.message}_` : '';
    const header = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderId}\`\`\`\n🔗 _${editLink}_\n(Click link to edit order)`;
    const details = `____________________________________\n*${row.name.trim().toUpperCase()}*\n${boldAddress}*Pin: ${String(row.pincode).trim()}*\n*Ph: ${row.phone}*\n*Qty: ${row.quantity}*\n*Amount(₹): ${basePrice} + ${courierCharge} (Courier)*\n*Total(₹): ${total}/-*${msg}\n____________________________________\n\n*Please GPay to the number below...*\n_(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്യുക)_ 👇\n\n*7788990313 (KAFAK LLP)*\n`;

    let cp = String(row.whatsapp || row.phone).replace(/\D/g, ''); if (cp.length === 10) cp = '91' + cp;
    window.open(`https://wa.me/${cp}?text=${encodeURIComponent(header + details)}`, '_blank');
}

// --- SCANNER & UTILS (Same as before) ---
function startScanner(mode) { scanMode = mode; scanStep = 1; tempOrderId = null; document.getElementById('scanner-modal').style.display = 'flex'; updateScanInstruction(); const config = { fps: 10, qrbox: 250 }; html5QrCode = new Html5Qrcode("reader"); html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess).catch(err => { alert("Camera Error"); document.getElementById('scanner-modal').style.display = 'none'; }); }
function stopScanner() { if (html5QrCode) html5QrCode.stop().then(() => document.getElementById('scanner-modal').style.display = 'none'); else document.getElementById('scanner-modal').style.display = 'none'; }
function updateScanInstruction() { const title = document.getElementById('scan-instruction'); const detail = document.getElementById('scan-detail'); if (scanMode === 'dispatch') { title.innerText = "📦 DISPATCH MODE"; detail.innerText = "Scan Order QR Code"; title.style.color = "#4fc3f7"; } else if (scanMode === 'tracking') { if (scanStep === 1) { title.innerText = "Step 1: Scan ORDER QR"; detail.innerText = "Scan address label QR"; title.style.color = "#ff8a80"; } else { title.innerText = "Step 2: Scan TRACKING"; detail.innerText = `Scan Tracking Barcode`; title.style.color = "#69f0ae"; } } }
function onScanSuccess(decodedText) { if (html5QrCode.isScanning === false) return; if (scanMode === 'dispatch') { if (!decodedText.startsWith("ORD-")) return; html5QrCode.pause(); setTimeout(() => { if (confirm(`Mark Order ${decodedText} as DISPATCHED?`)) { stopScanner(); updateStatus(decodedText, 'Dispatched'); } else { html5QrCode.resume(); } }, 300); } else if (scanMode === 'tracking') { if (scanStep === 1) { if (!decodedText.startsWith("ORD-")) return; tempOrderId = decodedText; scanStep = 2; updateScanInstruction(); html5QrCode.pause(); setTimeout(() => html5QrCode.resume(), 1000); } else if (scanStep === 2) { if (decodedText.startsWith("ORD-")) return; html5QrCode.pause(); setTimeout(() => { if (confirm(`Link Tracking ID: ${decodedText}\nTo Order: ${tempOrderId}?`)) { stopScanner(); updateTracking(tempOrderId, decodedText); } else { html5QrCode.resume(); } }, 300); } } }
function updateStatus(orderId, status) { fetch(`${SCRIPT_URL}?action=updateStatus&orderid=${orderId}&status=${status}`).then(res => res.json()).then(data => { if (data.result === 'success') loadOrders(); else alert('Error'); }); }
function updateTracking(orderId, trackingId) { fetch(`${SCRIPT_URL}?action=updateTracking&orderid=${orderId}&tracking=${trackingId}`).then(res => res.json()).then(data => { if (data.result === 'success') { alert('Tracking Updated!'); loadOrders(); } else alert('Error'); }); }
function calculatePrice(qty, state) { const n = parseInt(qty) || 0; let charge = 0; let st = String(state).toLowerCase().trim(); if (st === 'lakshadweep') charge = (n * 100) + 20; else charge = (st === 'kerala' ? courierRates.kerala : courierRates.outside)[n] || 0; return (n * 650) + charge; }
function printLabel(orderId) { const order = allOrders.find(o => o.orderid === orderId); if (!order) return; const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderId}`; const printWindow = window.open('', '', 'width=600,height=600'); printWindow.document.write(`<html><head><style>body{font-family:Arial;text-align:center;padding:20px}.label-box{border:2px solid #000;padding:20px;max-width:350px;margin:auto}.qr-code{width:120px;height:120px}h2{margin:10px 0}p{font-size:16px;line-height:1.4}</style></head><body><div class="label-box"><img src="${qrUrl}" class="qr-code"><h2>TO:</h2><p><b>${order.name.toUpperCase()}</b><br>${order.address}<br><b>PH: ${order.phone}</b></p><hr><small>Order ID: ${order.orderid} | Qty: ${order.quantity}</small><br><small><b>From: KAFAK LLP, Kerala | Ph: 7788990313</b></small></div><script>window.onload=function(){window.print();window.close();}<\/script></body></html>`); printWindow.document.close(); }