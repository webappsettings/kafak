
const scriptURL = 'https://script.google.com/macros/s/AKfycbytJW88K8vaC1MOdd2GvEYGXdkLucaTFrpDNCA8XlvPfv1eC-WiW4sd6qSFJH3NFM0tvQ/exe

// Courier Rates
const courierRates = {
    kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
    outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let allOrders = [];
let html5QrCode;
let scanMode = '';
let scanStep = 0;
let tempOid = null;

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
                alert('Error Loading: ' + response.message);
            }
        })
        .catch(err => {
            document.getElementById('loader').innerHTML = `<p class="text-danger">Network Error. Check URL.</p>`;
        });
}

// --- 2. RENDER CARDS (Beautiful Design) ---
function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="col-12 text-center mt-5">No orders found.</div>';
        return;
    }

    orders.forEach((d, i) => {
        let date = new Date(d.timestamp).toLocaleDateString('en-IN');

        // Status Styling
        let statusClass = 'bg-pending';
        let statusText = d.Status || 'Pending';
        let borderStyle = 'border-left: 5px solid #ccc;';

        if (d.Status === 'Sent') {
            statusClass = 'bg-sent'; statusText = 'Sent ✅'; borderStyle = 'border-left: 5px solid #198754;';
        } else if (d.Status === 'Dispatched') {
            statusClass = 'bg-dispatched'; statusText = '🚚 DISPATCHED';
            borderStyle = 'border-left: 5px solid #0dcaf0; background: #f8fdff;';
        }

        // Calculate Price
        let priceInfo = calculatePriceInfo(d.quantity, d.state);

        let html = `
        <div class="col-12 col-md-6 col-lg-4 mb-3">
            <div class="order-card p-3" id="card-${i}" style="${borderStyle}">
                <div class="card-top">
                    <div>
                        <span class="badge-id">${d.orderid}</span>
                        <span class="status-badge ${statusClass} ms-1">${statusText}</span>
                    </div>
                    <span class="date-text">${date}</span>
                </div>
                
                <div class="d-flex align-items-start mt-2">
                    <input type="checkbox" class="custom-check mt-1 order-cb" value="${i}" onchange="highlightCard(${i}, this.checked)">
                    <div class="w-100 ms-2">
                        <div class="cust-name">${d.name || 'Unknown'}</div>
                        <div class="text-muted small">${d.place || ''}, ${d.district || ''}</div>
                        
                        <div class="bg-light p-2 rounded mt-2 small">
                             <div class="d-flex justify-content-between"><span>Quantity:</span> <b>${d.quantity} Bottles</b></div>
                             <div class="d-flex justify-content-between"><span>Total:</span> <b class="text-success">${priceInfo.total}</b></div>
                             ${d.tracking ? `<div class="mt-1 pt-1 border-top text-primary fw-bold">📦 Track: ${d.tracking}</div>` : ''}
                        </div>

                        <div class="action-area">
                            <div class="input-group input-group-sm mb-2">
                                <span class="input-group-text bg-white">Send To:</span>
                                <select class="form-select" id="contact-${i}">
                                    <option value="${d.whatsapp}">WhatsApp (${d.whatsapp})</option>
                                    <option value="${d.phone}">Phone (${d.phone})</option>
                                </select>
                            </div>
                            <button class="btn btn-sm btn-success w-100 fw-bold" onclick="sendWA(${i}, this)">
                                <i class="fab fa-whatsapp"></i> Send Invoice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

// --- 3. WHATSAPP LOGIC (Fixed Error) ---
function sendWA(index, btn) {
    const d = allOrders[index];
    const selectedPhone = document.getElementById(`contact-${index}`).value;
    const adminPhone = '7788990313';

    const priceData = calculatePriceInfo(d.quantity, d.state);
    const amountTextW = `Amount(₹): ${priceData.base} + ${priceData.courier} (Courier)`;
    const totalTextW = `Total(₹): ${priceData.numTotal}/-`;

    const currentLang = 'ml';
    const editLink = `kafaklife.com/order.html?oid=${d.orderid}&lang=${currentLang}`;
    const orderTime = new Date(d.timestamp).toLocaleString();

    // 🔴 SAFETY FIX: Use (value || '') to prevent errors if empty
    const name = (d.name || '').trim().toUpperCase();
    const house = (d.house || '').trim().toUpperCase();
    const place = (d.place || '').trim().toUpperCase();
    const postLabel = (d.postoffice || '').trim().toUpperCase();
    const district = (d.district || '').trim().toUpperCase();
    const state = (d.state || '').trim().toUpperCase();
    const pin = (d.pincode || '').toString().trim();
    const phone = (d.phone || '').toString().trim();

    const customerMsg = d.message ? `\n\n💬 *Note:* _${d.message}_` : '';

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

    btn.className = 'btn btn-secondary btn-sm w-100 fw-bold';
    btn.innerText = 'Sent ✅';
    fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'updateStatus', oid: d.orderid, status: 'Sent' }) });
}

function calculatePriceInfo(qty, state) {
    const n = parseInt(qty) || 0;
    const basePrice = n * 650;
    let courierCharge = 0;
    const s = String(state || '').toLowerCase().trim();

    if (s === 'lakshadweep') courierCharge = (n * 100) + 20;
    else if (s === 'kerala') courierCharge = courierRates.kerala[n] || 0;
    else courierCharge = courierRates.outside[n] || 0;

    return {
        base: basePrice,
        courier: courierCharge,
        numTotal: basePrice + courierCharge,
        total: `₹${basePrice + courierCharge}/-`
    };
}

// --- 4. SCANNER LOGIC ---
function startScanner(mode) {
    scanMode = mode; scanStep = 1; tempOid = null;
    document.getElementById('scanner-modal').style.display = 'flex';
    document.getElementById('scan-instruction').innerText = mode === 'dispatch' ? "📦 Scan Order QR" : "🚚 Scan Order QR (Step 1)";

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess);
}

function stopScanner() {
    if (html5QrCode) html5QrCode.stop().then(() => document.getElementById('scanner-modal').style.display = 'none');
    else document.getElementById('scanner-modal').style.display = 'none';
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
            document.getElementById('scan-instruction').innerText = "📄 Now Scan Tracking Barcode";
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
        .then(res => res.json()).then(data => {
            if (data.result === 'success') { alert("Updated! ✅"); stopScanner(); fetchOrders(); }
        });
}

// --- 5. PRINT & UTILS (Safe Printing) ---
function toggleAll(checked) {
    document.querySelectorAll('.order-cb').forEach(cb => { cb.checked = checked; highlightCard(cb.value, checked); });
}
function highlightCard(i, c) {
    const card = document.getElementById(`card-${i}`);
    if (c) card.classList.add('selected'); else card.classList.remove('selected');
}
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    renderOrders(allOrders.filter(o =>
        (o.name || '').toLowerCase().includes(term) ||
        String(o.phone || '').includes(term) ||
        String(o.orderid || '').toLowerCase().includes(term)
    ));
}

function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) { alert("Select orders!"); return; }

    const area = document.getElementById('print-area');
    area.innerHTML = '';

    // Create HTML first
    selected.forEach(cb => {
        const idx = cb.value;
        const d = allOrders[idx];
        if (!d) return; // Skip if data missing

        let po = d.postoffice ? `${d.postoffice}` : '';
        // Handle undefined fields for print
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
            <div class="cust-pin">PIN: ${d.pincode}</div>
            <div class="phone-display">PH: ${d.phone}</div>
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

    // Generate Codes & Print
    setTimeout(() => {
        selected.forEach(cb => {
            const idx = cb.value;
            const d = allOrders[idx];
            try {
                JsBarcode(`#barcode-${idx}`, d.orderid, { format: "CODE128", height: 30, displayValue: false, margin: 0 });
                new QRCode(document.getElementById(`qrcode-${idx}`), { text: `http://googleusercontent.com/maps.google.com/?q=${d.place},${d.district}`, width: 50, height: 50 });
            } catch (e) { console.log("Code Gen Error", e); }
        });
        setTimeout(() => window.print(), 500);
    }, 200);
}