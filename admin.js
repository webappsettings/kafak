// 🔴🔴 PASTE YOUR NEW SCRIPT URL HERE (From Step 1) 🔴🔴
const scriptURL = "https://script.google.com/macros/s/AKfycbzzBowat6eZU-1IWFvxK8Beqi_mfgWx2DAae8NhYEGQ1pohBciil9ULNXb7UnDV61g1fA/exec";

const courierRates = {
    kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
    outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let allOrders = [];
let html5QrCode;
let scanMode = ''; let scanStep = 0; let tempOid = null;

// --- 1. LOAD ORDERS ---
document.addEventListener('DOMContentLoaded', () => { fetchOrders(); });

function fetchOrders() {
    fetch(`${scriptURL}?action=getAllOrders`)
        .then(res => res.json())
        .then(response => {
            document.getElementById('loader').style.display = 'none';
            if (response.result === 'success') {
                allOrders = response.data;
                renderOrders(allOrders);
            } else {
                alert('Server Error: ' + response.message);
            }
        })
        .catch(err => {
            document.getElementById('loader').innerHTML = `<p class="text-danger">Network Error. Check URL.</p>`;
        });
}

// --- 2. RENDER CARDS (Old Beautiful Design) ---
function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="col-12 text-center mt-5 text-muted">No orders found.</div>';
        return;
    }

    orders.forEach((d, i) => {
        let date = new Date(d.timestamp).toLocaleDateString('en-IN');

        let statusClass = 'bg-pending';
        let statusText = d.Status || 'PENDING';
        if (d.Status === 'Sent') { statusClass = 'bg-sent'; statusText = 'SENT'; }
        else if (d.Status === 'Dispatched') { statusClass = 'bg-dispatched'; statusText = 'DISPATCHED'; }

        let priceInfo = calculatePriceInfo(d.quantity, d.state);

        let html = `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="order-card" id="card-${i}">
                <div class="card-header-row">
                    <div class="d-flex align-items-center">
                        <input type="checkbox" class="custom-cb me-2 order-cb" value="${i}" onchange="highlightCard(${i}, this.checked)">
                        <span class="order-id">#${d.orderid}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>

                <div class="cust-name">${d.name || 'Unknown'}</div>
                <div class="cust-phone"><i class="fas fa-phone-alt small"></i> ${d.phone}</div>

                <div class="info-box">
                    <div>
                        <div class="info-label">Quantity</div>
                        <div class="info-val">${d.quantity} Bottles</div>
                    </div>
                    <div class="text-end">
                        <div class="info-label">Total Amount</div>
                        <div class="info-val amount-val">${priceInfo.total}</div>
                    </div>
                </div>

                <div class="address-sec">
                    <i class="fas fa-map-marker-alt text-danger me-1"></i>
                    ${d.house || ''}, ${d.place || ''}, ${d.district || ''}<br>
                    Pin: <span class="pin-code">${d.pincode || ''}</span> | ${d.state || ''}
                    ${d.tracking ? `<div class="mt-2 text-primary fw-bold">📦 Track: ${d.tracking}</div>` : ''}
                </div>

                <select class="contact-select" id="contact-${i}">
                    <option value="${d.whatsapp}">WhatsApp (${d.whatsapp})</option>
                    <option value="${d.phone}">Phone (${d.phone})</option>
                </select>

                <div class="btn-action-row">
                    <button class="btn-card btn-print" onclick="printOne(${i})">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button class="btn-card btn-whatsapp" onclick="sendWA(${i}, this)">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

// --- 3. WHATSAPP LOGIC (FIXED: No more 'trim' error) ---
function sendWA(index, btn) {
    const d = allOrders[index];
    const selectedPhone = document.getElementById(`contact-${index}`).value;
    const adminPhone = '7788990313';

    const priceData = calculatePriceInfo(d.quantity, d.state);
    const amountTextW = `Amount(₹): ${priceData.base} + ${priceData.courier} (Courier)`;
    const totalTextW = `Total(₹): ${priceData.numTotal}/-`;

    // 🔴 SAFETY CHECK: (value || '') prevents crash
    const name = (d.name || '').toString().trim().toUpperCase();
    const house = (d.house || '').toString().trim().toUpperCase();
    const place = (d.place || '').toString().trim().toUpperCase();
    const postLabel = (d.postoffice || '').toString().trim().toUpperCase();
    const district = (d.district || '').toString().trim().toUpperCase();
    const state = (d.state || '').toString().trim().toUpperCase();
    const pin = (d.pincode || '').toString().trim();
    const phone = (d.phone || '').toString().trim();

    const customerMsg = d.message ? `\n\n💬 *Note:* _${d.message}_` : '';
    const orderTime = new Date(d.timestamp).toLocaleString();
    const editLink = `kafaklife.com/order.html?oid=${d.orderid}&lang=ml`;

    const extra1 = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${d.orderid}\`\`\`\n⌚ _${orderTime}_\n🔗 _${editLink}_\n(Click link to edit order)`;

    const wtspformat = `
____________________________________\n
*${name}*
*${house}*
*${place}*
*${postLabel}*
*${district}*
*${state}*
*Pin: ${pin}*
*Ph: ${phone}*\n
*Qty: ${d.quantity}*
*${amountTextW}*\n
*${totalTextW}*${customerMsg}
____________________________________
\n*Please GPay to the number below...*
_(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്യുക)_ 👇
\n*${adminPhone} (KAFAK LLP)*\n`;

    const message = encodeURIComponent(extra1 + wtspformat);
    window.open(`https://wa.me/91${selectedPhone}?text=${message}`, '_blank');

    btn.innerText = 'Sent ✅';
    fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'updateStatus', oid: d.orderid, status: 'Sent' }) });
}

// --- 4. PRINTING (Safe) ---
function toggleAll(checked) {
    document.querySelectorAll('.order-cb').forEach(cb => { cb.checked = checked; highlightCard(cb.value, checked); });
}
function highlightCard(i, c) {
    const card = document.getElementById(`card-${i}`);
    if (c) card.classList.add('selected'); else card.classList.remove('selected');
}
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    renderOrders(allOrders.filter(o => (o.name || '').toLowerCase().includes(term) || String(o.phone).includes(term)));
}

function printOne(index) {
    // Select just this one and print
    document.querySelectorAll('.order-cb').forEach(cb => cb.checked = false);
    document.querySelector(`.order-cb[value="${index}"]`).checked = true;
    printSelected();
}

function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) { alert("Select orders!"); return; }

    const area = document.getElementById('print-area');
    area.innerHTML = '';

    selected.forEach(cb => {
        const idx = cb.value;
        const d = allOrders[idx];
        if (!d) return;

        let po = d.postoffice ? `${d.postoffice}` : '';
        // 🔴 SAFETY CHECK FOR PRINT
        let name = (d.name || '').toUpperCase();
        let house = (d.house || '').toUpperCase();
        let place = (d.place || '').toUpperCase();
        let district = (d.district || '').toUpperCase();

        area.innerHTML += `
        <div class="label-page">
            <div class="header-sec">
                <div id="qrcode-${idx}" class="qr-box"></div>
                <svg id="barcode-${idx}" class="barcode-box"></svg>
            </div>
            <div class="to-label">To,</div>
            <div class="cust-details">
                ${name}<br>${house}<br>${place} ${po ? ',' + po : ''}<br>${district}, KERALA
            </div>
            <div style="font-weight:900; margin-top:5px;">PIN: ${d.pincode}</div>
            <div style="border:2px solid black; padding:5px; display:inline-block; font-weight:900; font-size:16px; margin-top:5px;">PH: ${d.phone}</div>
            
             <div style="margin-top:10px; border:1px solid #777; padding:4px; font-size:10px; font-weight:700; width:fit-content; display:flex; gap:5px;">
                <div style="font-size:18px">📞</div>
                <div>7788990313, 9895082689<br>If unreachable, call or WhatsApp us</div>
            </div>

            <div class="footer">
                <div style="text-align:center; color:#d32f2f;">
                     <svg style="width:40px; fill:#d32f2f;" viewBox="0 0 24 24"><path d="M12,14L12,14c-0.6,0-1-0.4-1-1v-2l-2,3.5l-0.9-0.5L10,10.6L8.8,12.7L7.9,12.2l2-3.5L9,7.3l2.5,4.3l0.9-0.5l-2-3.5 L12,5l1.6,2.7l-2,3.5l0.9,0.5l2.5-4.3l-0.9-1.5l2-3.5l0.9,0.5L15.1,6L14,8v5C14,13.6,13.6,14,12,14z"/></svg>
                    <div style="font-weight:900; font-size:12px; letter-spacing:1px;">FRAGILE</div>
                </div>
                <div class="from-sec">
                    From,<br>KAFAK LLP, 10/174, Kunnathery,<br>Thaikkattukara P.O, Aluva - 683106,<br>Phone: 778899 0 313
                </div>
            </div>
        </div>`;
    });

    setTimeout(() => {
        selected.forEach(cb => {
            const idx = cb.value;
            const d = allOrders[idx];
            try {
                JsBarcode(`#barcode-${idx}`, d.orderid, { format: "CODE128", height: 30, displayValue: false, margin: 0 });
                new QRCode(document.getElementById(`qrcode-${idx}`), { text: `http://googleusercontent.com/maps.google.com/?q=${d.place},${d.district}`, width: 50, height: 50 });
            } catch (e) { }
        });
        setTimeout(() => window.print(), 500);
    }, 200);
}

// --- 5. SCANNER ---
function startScanner(mode) {
    scanMode = mode; scanStep = 1; tempOid = null;
    document.getElementById('scanner-modal').style.display = 'flex';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess);
}
function stopScanner() {
    if (html5QrCode) html5QrCode.stop().then(() => document.getElementById('scanner-modal').style.display = 'none');
}
function onScanSuccess(decodedText) {
    if (scanMode === 'dispatch') {
        if (decodedText.startsWith("ORD-")) {
            html5QrCode.pause();
            if (confirm(`Mark ${decodedText} as DISPATCHED?`)) {
                updateServer(decodedText, 'updateStatus', 'Dispatched');
            } else html5QrCode.resume();
        }
    }
    else if (scanMode === 'tracking') {
        if (scanStep === 1 && decodedText.startsWith("ORD-")) {
            tempOid = decodedText; scanStep = 2;
            alert("Order Found. Now Scan Tracking ID.");
            html5QrCode.pause(); setTimeout(() => html5QrCode.resume(), 1000);
        } else if (scanStep === 2 && !decodedText.startsWith("ORD-")) {
            html5QrCode.pause();
            if (confirm(`Link Tracking: ${decodedText} to ${tempOid}?`)) {
                updateServer(tempOid, 'updateTracking', null, decodedText);
            } else html5QrCode.resume();
        }
    }
}
function updateServer(oid, action, status, tracking) {
    let body = { action: action, oid: oid };
    if (status) body.status = status;
    if (tracking) body.tracking = tracking;
    fetch(scriptURL, { method: 'POST', body: JSON.stringify(body) })
        .then(res => res.json()).then(data => { if (data.result === 'success') { alert("Success"); stopScanner(); fetchOrders(); } });
}
function calculatePriceInfo(qty, state) {
    const n = parseInt(qty) || 0; const basePrice = n * 650; let courierCharge = 0; const s = String(state || '').toLowerCase().trim();
    if (s === 'lakshadweep') courierCharge = (n * 100) + 20; else if (s === 'kerala') courierCharge = courierRates.kerala[n] || 0; else courierCharge = courierRates.outside[n] || 0;
    return { base: basePrice, courier: courierCharge, numTotal: basePrice + courierCharge, total: `₹${basePrice + courierCharge}/-` };
}