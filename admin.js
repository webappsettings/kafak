// 🔴 1. GOOGLE SCRIPT URL (Replace with your latest deployment URL)
const scriptURL = "https://script.google.com/macros/s/AKfycbzzBowat6eZU-1IWFvxK8Beqi_mfgWx2DAae8NhYEGQ1pohBciil9ULNXb7UnDV61g1fA/exec";

// 🔴 2. ADMIN IDENTITY SETUP (Enables 'Mark Paid' on order links)
localStorage.setItem('kafakAdmin', 'true');

// Courier Rates for Price Calculation
const courierRates = {
    kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
    outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let allOrders = [];
let html5QrCode;
let scanMode = '';
let scanStep = 0;
let tempOid = null;

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => { fetchOrders(); });

function fetchOrders() {
    document.getElementById('loader').style.display = 'block';
    fetch(`${scriptURL}?action=getAllOrders`)
        .then(res => res.json())
        .then(response => {
            document.getElementById('loader').style.display = 'none';
            if (response.result === 'success') {
                allOrders = response.data;
                renderTabs(allOrders);
            }
        })
        .catch(err => {
            document.getElementById('loader').innerHTML = `<p class="text-danger">Network Error. Check Script URL.</p>`;
        });
}

// --- TAB RENDERING LOGIC ---
function renderTabs(orders) {
    const pendingList = document.getElementById('list-pending');
    const paidList = document.getElementById('list-paid');
    const dispatchedList = document.getElementById('list-dispatched');

    pendingList.innerHTML = ''; paidList.innerHTML = ''; dispatchedList.innerHTML = '';

    let c1 = 0, c2 = 0, c3 = 0;

    orders.forEach((d, i) => {
        let status = d.Status || 'Pending';

        if (status === 'Pending' || status === 'Sent') {
            c1++;
            pendingList.innerHTML += createCardHTML(d, i, 'pending');
        }
        else if (status === 'Paid') {
            c2++;
            paidList.innerHTML += createCardHTML(d, i, 'paid');
        }
        else if (status === 'Dispatched') {
            c3++;
            dispatchedList.innerHTML += createCardHTML(d, i, 'dispatched');
        }
    });

    document.getElementById('count-pending').innerText = c1;
    document.getElementById('count-paid').innerText = c2;
    document.getElementById('count-dispatched').innerText = c3;
}

// --- DYNAMIC CARD GENERATION ---
function createCardHTML(d, index, type) {
    let date = new Date(d.timestamp).toLocaleDateString('en-IN');
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => (val || '').toString().toUpperCase();

    let statusBadge = '';
    let buttons = '';
    let tickMark = '';

    if (type === 'pending') {
        if (d.Status === 'Sent') {
            statusBadge = '<span class="badge bg-info text-dark">Invoice Sent ⏳</span>';
            buttons = `
                <button class="btn-custom btn-paid" onclick="updateOrder('${d.orderid}', 'Paid')">💰 Mark Paid</button>
                <button class="btn-custom btn-wa" onclick="sendWA(${index})"><i class="fab fa-whatsapp"></i> Resend</button>
            `;
        } else {
            statusBadge = '<span class="badge bg-warning text-dark">New</span>';
            buttons = `<button class="btn-custom btn-wa" onclick="sendWA(${index})"><i class="fab fa-whatsapp"></i> Send Invoice</button>`;
        }
    }
    else if (type === 'paid') {
        statusBadge = '<span class="badge bg-warning text-dark">Paid ✅</span>';
        buttons = `
            <button class="btn-custom btn-dispatch" onclick="updateOrder('${d.orderid}', 'Dispatched')">📦 Dispatch</button>
            <div class="form-check d-inline-block ms-2 pt-2">
                <input type="checkbox" class="form-check-input order-cb" value="${index}">
                <label class="small fw-bold">Select</label>
            </div>
        `;
    }
    else if (type === 'dispatched') {
        statusBadge = '<span class="badge bg-success">Dispatched</span>';
        tickMark = '<i class="fas fa-check-circle text-success fs-4 position-absolute top-0 end-0 m-2"></i>';
        buttons = `
            <button class="btn-custom btn-track" onclick="startScanner('tracking', '${d.orderid}')">🚚 Add Tracking</button>
            <button class="btn-custom btn-remove" onclick="hideOrder(this)"><i class="fas fa-trash"></i></button>
        `;
    }

    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card status-${d.Status}">
            ${tickMark}
            <div class="card-header-row">
                <div><span class="order-id">#${d.orderid}</span></div>
                ${statusBadge}
            </div>
            <div class="cust-name">${safe(d.name)}</div>
            <div class="cust-details">${safe(d.place)}, ${safe(d.district)} <span class="state-badge">${safe(d.state)}</span></div>
            <div class="text-muted small mb-2">Ph: ${d.phone}</div>
            <div class="info-box">
                <div><b>${d.quantity} Bottles</b></div>
                <div class="text-success fw-bold">${priceInfo.total}</div>
            </div>
            ${d.tracking ? `<div class="alert alert-light py-1 small border"><i class="fas fa-truck"></i> ${d.tracking}</div>` : ''}
            <div class="action-area">${buttons}</div>
        </div>
    </div>`;
}

// --- SERVER ACTIONS ---
function updateOrder(oid, status) {
    if (!confirm(`Update #${oid} to ${status}?`)) return;
    const order = allOrders.find(o => o.orderid === oid);
    if (order) order.Status = status;
    renderTabs(allOrders);

    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'updateStatus', oid: oid, status: status })
    });
}

function hideOrder(btn) {
    if (confirm("Remove from view?")) btn.closest('.col-12').remove();
}

// --- WHATSAPP LOGIC ---
function sendWA(index) {
    const d = allOrders[index];
    const adminPhone = '7788990313';
    const priceData = calculatePriceInfo(d.quantity, d.state);
    const safe = (val) => (val || '').toString().trim().toUpperCase();

    const msg = encodeURIComponent(`*✅ Order Confirmed!* 🍯\nID: ${d.orderid}\n\nTo:\n*${safe(d.name)}*\n${safe(d.house)}, ${safe(d.place)}\n${safe(d.district)}, ${safe(d.state)}\nPIN: ${d.pincode}\nPH: ${d.phone}\n\nQty: ${d.quantity}\nTotal: ${priceData.total}\n\n*Please GPay to: ${adminPhone} (KAFAK LLP)*`);

    window.open(`https://wa.me/91${d.whatsapp || d.phone}?text=${msg}`, '_blank');
    updateOrder(d.orderid, 'Sent');
}

// --- PRINTING LOGIC (A6) ---
function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) { alert("Select orders from PAID tab!"); return; }

    const area = document.getElementById('print-area');
    area.innerHTML = '';

    selected.forEach(cb => {
        const idx = cb.value;
        const d = allOrders[idx];
        const safe = (val) => (val || '').toString().toUpperCase();
        area.innerHTML += `
        <div class="label-page">
            <div class="header-sec"><div id="qrcode-${idx}" class="qr-box"></div><svg id="barcode-${idx}" class="barcode-box"></svg></div>
            <div style="font-weight:bold;">To,</div>
            <div class="cust-details-print">${safe(d.name)}<br>${safe(d.house)}<br>${safe(d.place)}<br>${safe(d.district)}, ${safe(d.state)}</div>
            <div style="font-weight:900; margin-top:5px;">PIN: ${d.pincode}</div>
            <div style="border:2px solid black; padding:4px; display:inline-block; font-weight:900; margin-top:5px;">PH: ${d.phone}</div>
            <div class="footer">
                <div style="text-align:center; color:red;"><svg style="width:30px; fill:red;" viewBox="0 0 24 24"><path d="M12,14L12,14c-0.6,0-1-0.4-1-1v-2l-2,3.5l-0.9-0.5L10,10.6L8.8,12.7L7.9,12.2l2-3.5L9,7.3l2.5,4.3l0.9-0.5l-2-3.5 L12,5l1.6,2.7l-2,3.5l0.9,0.5l2.5-4.3l-0.9-1.5l2-3.5l0.9,0.5L15.1,6L14,8v5C14,13.6,13.6,14,12,14z"/></svg><div>FRAGILE</div></div>
                <div class="from-sec">From,<br>KAFAK LLP, Aluva<br>Ph: 7788990313</div>
            </div>
        </div>`;
    });

    setTimeout(() => {
        selected.forEach(cb => {
            const idx = cb.value; const d = allOrders[idx];
            JsBarcode(`#barcode-${idx}`, d.orderid, { format: "CODE128", height: 30, displayValue: false });
            new QRCode(document.getElementById(`qrcode-${idx}`), { text: `http://google.com/maps?q=${d.place},${d.district}`, width: 50, height: 50 });
        });
        setTimeout(() => window.print(), 500);
    }, 500);
}

// --- SCANNER LOGIC ---
function startScanner(mode, specificOid) {
    scanMode = mode; tempOid = specificOid || null; scanStep = mode === 'tracking' && tempOid ? 2 : 1;
    document.getElementById('scanner-modal').style.display = 'flex';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess);
}

function stopScanner() { if (html5QrCode) html5QrCode.stop().then(() => document.getElementById('scanner-modal').style.display = 'none'); }

function onScanSuccess(decodedText) {
    if (scanMode === 'dispatch' && decodedText.startsWith("ORD-")) {
        if (confirm(`Dispatch ${decodedText}?`)) { updateOrder(decodedText, 'Dispatched'); stopScanner(); }
    } else if (scanMode === 'tracking') {
        if (scanStep === 2 && !decodedText.startsWith("ORD-")) {
            if (confirm(`Link Tracking ${decodedText} to ${tempOid}?`)) {
                fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'updateTracking', oid: tempOid, tracking: decodedText }) })
                    .then(res => res.json()).then(d => { if (d.result === 'success') { alert("Saved!"); fetchOrders(); stopScanner(); } });
            }
        }
    }
}

// --- UTILS ---
function calculatePriceInfo(qty, state) {
    const n = parseInt(qty) || 0; const basePrice = n * 650; let courierCharge = 0; const s = String(state || '').toLowerCase().trim();
    if (s === 'lakshadweep') courierCharge = (n * 100) + 20; else if (s === 'kerala') courierCharge = courierRates.kerala[n] || 0; else courierCharge = courierRates.outside[n] || 0;
    return { total: `₹${basePrice + courierCharge}/-` };
}

function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    renderTabs(allOrders.filter(o => (o.name || '').toLowerCase().includes(term) || String(o.phone).includes(term) || (o.orderid || '').toLowerCase().includes(term)));
}

function logout() {
    if (confirm("Logout?")) {
        localStorage.removeItem('kafakAdminLoggedIn');
        localStorage.removeItem('kafakAdmin');
        location.reload();
    }
}