// 🔴 1. ഇവിടെ നിങ്ങളുടെ പുതിയ GOOGLE SCRIPT URL നൽകുക
const scriptURL = "https://script.google.com/macros/s/AKfycbzVBmDpR4byla5f6Sdxa7tqi125PlbP4SgqkR9xdQkdop6eBAHNPS6qn5pRz899TZ9DSQ/exec";

window.onload = function () {
    if (localStorage.getItem('kafakAdminLoggedIn') === 'true') {
        showDashboard();
    } else {
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('dashboard-section').style.display = 'none';
    }
};

function attemptLogin() {
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;
    if (user === "admin" && pass === "kafak123") {
        localStorage.setItem('kafakAdminLoggedIn', 'true');
        localStorage.setItem('kafakAdmin', 'true');
        showDashboard();
    } else {
        document.getElementById('loginMsg').innerText = "❌ തെറ്റായ വിവരങ്ങൾ!";
    }
}

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    fetchOrders();
}

function logoutAdmin() {
    if (confirm("Logout ചെയ്യാൻ ഉറപ്പാണോ?")) {
        localStorage.clear(); // Clear all data on logout
        window.location.href = "index.html";
    }
}

const courierRates = {
    kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
    outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let allOrders = [];
let html5QrCode;
let scanMode = '';
let scanStep = 0;
let tempOid = null;

function fetchOrders(forceLoad = false) {
    // ഫോണിലെ പഴയ ഡാറ്റ ആദ്യം നോക്കുന്നു (Offline Mode)
    let savedOrders = localStorage.getItem('allOrdersCache');
    if (savedOrders && !forceLoad) {
        allOrders = JSON.parse(savedOrders);
        renderTabs(allOrders);
        return;
    }
    // പുതിയ ഡാറ്റ ലോഡ് ചെയ്യുന്നു
    document.getElementById('loader').style.display = 'block';
    fetch(`${scriptURL}?action=getAllOrders`)
        .then(res => res.json())
        .then(response => {
            document.getElementById('loader').style.display = 'none';
            if (response.result === 'success') {
                allOrders = response.data;
                localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
                renderTabs(allOrders);
            }
        });
}

function renderTabs(orders) {
    const pendingList = document.getElementById('list-pending');
    const paidList = document.getElementById('list-paid');
    const dispatchedList = document.getElementById('list-dispatched');

    pendingList.innerHTML = ''; paidList.innerHTML = ''; dispatchedList.innerHTML = '';
    let counts = { pending: 0, paid: 0, dispatched: 0 };
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    orders.forEach((d, i) => {
        // 🔴 ലോക്കൽ അപ്‌ഡേറ്റ് (reverse ഉപയോഗിച്ച് ഏറ്റവും പുതിയത് എടുക്കുന്നു)
        let localUpdate = [...pendingUpdates].reverse().find(item => item.oid === d.orderid);
        let status = localUpdate ? localUpdate.status : (d.Status || 'Pending');

        if (status === 'Pending' || status === 'Sent') {
            counts.pending++;
            pendingList.innerHTML += createCardHTML(d, i, 'pending', status);
        } else if (status === 'Paid') {
            counts.paid++;
            paidList.innerHTML += createCardHTML(d, i, 'paid', status);
        } else if (status === 'Dispatched') {
            counts.dispatched++;
            dispatchedList.innerHTML += createCardHTML(d, i, 'dispatched', status);
        }
    });

    document.getElementById('count-pending').innerText = counts.pending;
    document.getElementById('count-paid').innerText = counts.paid;
    document.getElementById('count-dispatched').innerText = counts.dispatched;
    updateSyncButtonUI();
}

function updateSyncButtonUI() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    const syncBtn = $('#sync-btn');
    if (pendingUpdates.length > 0) {
        syncBtn.show();
        syncBtn.html(`🔄 SYNC UPDATES (${pendingUpdates.length})`);
    } else {
        syncBtn.hide();
    }
}

function createCardHTML(d, index, type, currentStatus) {
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => (val || '').toString().toUpperCase();
    let statusBadge = '', buttons = '', tickMark = '';

    // 🔴 ബട്ടണുകൾ currentStatus അനുസരിച്ച് നൽകുന്നു
    if (type === 'pending') {
        if (currentStatus === 'Sent') {
            statusBadge = '<span class="badge bg-info text-dark">Invoice Sent ⏳</span>';
            buttons = `<button class="btn-custom btn-paid" onclick="updateOrder('${d.orderid}', 'Paid')">💰 Mark Paid</button>
                       <button class="btn-custom btn-wa" onclick="sendWA(${index})"><i class="fab fa-whatsapp"></i> Resend</button>`;
        } else {
            statusBadge = '<span class="badge bg-warning text-dark">New</span>';
            buttons = `<button class="btn-custom btn-wa" onclick="sendWA(${index})"><i class="fab fa-whatsapp"></i> Send Invoice</button>`;
        }
    } else if (type === 'paid') {
        statusBadge = '<span class="badge bg-warning text-dark">Paid ✅</span>';
        buttons = `<button class="btn-custom btn-dispatch" onclick="updateOrder('${d.orderid}', 'Dispatched')">📦 Dispatch</button>
                   <input type="checkbox" class="order-cb ms-2" value="${index}">`;
    } else if (type === 'dispatched') {
        statusBadge = '<span class="badge bg-success">Dispatched</span>';
        tickMark = '<i class="fas fa-check-circle text-success fs-4 position-absolute top-0 end-0 m-2"></i>';
        buttons = `<button class="btn-custom btn-track" onclick="startScanner('tracking', '${d.orderid}')">🚚 Add Tracking</button>`;
    }

    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card status-${currentStatus}">
            ${tickMark}
            <div class="card-header-row">
                <span class="order-id">#${d.orderid}</span>
                ${statusBadge}
            </div>
            <div class="cust-name">${safe(d.name)}</div>
            <div class="cust-details">${safe(d.place)}, ${safe(d.district)}</div>
            <div class="info-box">
                <b>${d.quantity} Bottles</b>
                <div class="text-success fw-bold">${priceInfo.total}</div>
            </div>
            <div class="action-area">${buttons}</div>
        </div>
    </div>`;
}

// 🔴 ലോക്കലായി സേവ് ചെയ്യുന്നു (Instant Update)
function updateOrder(oid, status) {
    if (!confirm(`ഈ ഓർഡർ ${status} ആയി മാർക്ക് ചെയ്യട്ടെ?`)) return;

    // 1. പെൻഡിംഗ് ലിസ്റ്റ് അപ്‌ഡേറ്റ്
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates.push({ oid: oid, status: status, time: new Date().getTime() });
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    // 2. ബട്ടൺ ഫ്ലാഗ്
    localStorage.setItem(`${status === 'Sent' ? 'sent' : 'paid'}_${oid}`, 'true');

    // 3. UI ഉടൻ മാറ്റാൻ മെയിൻ ലിസ്റ്റ് എഡിറ്റ് ചെയ്യുന്നു
    const orderIndex = allOrders.findIndex(o => o.orderid === oid);
    if (orderIndex !== -1) {
        allOrders[orderIndex].Status = status; // താൽക്കാലികമായി മാറ്റുന്നു
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders)); // Cache-ഉം പുതുക്കുന്നു
    }

    alert(`Saved Locally: ${status} ✅`);
    renderTabs(allOrders); // UI Refresh
}

// 🔴 സിങ്ക് ഫങ്ക്ഷൻ (സെർവറിലേക്ക് അയക്കാൻ)
function syncWithServer() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    if (pendingUpdates.length === 0) return;

    if (!confirm(`${pendingUpdates.length} മാറ്റങ്ങൾ സെർവറിലേക്ക് സേവ് ചെയ്യട്ടെ?`)) return;
    $('#sync-btn').prop('disabled', true).text('Syncing...');

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'bulkUpdateStatus', updates: pendingUpdates })
    })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                localStorage.removeItem('pendingUpdates');
                // ക്ലീൻ അപ്പ്
                Object.keys(localStorage).forEach(key => { if (key.startsWith('sent_') || key.startsWith('paid_')) localStorage.removeItem(key); });
                alert("Sync Complete! ✅");
                location.reload();
            }
        })
        .catch(err => {
            alert("Sync Failed!");
            $('#sync-btn').prop('disabled', false).text('Retry Sync');
        });
}

function calculatePriceInfo(qty, state) {
    const n = parseInt(qty) || 0; const basePrice = n * 650; let courierCharge = 0; const s = String(state || '').toLowerCase().trim();
    if (s === 'lakshadweep') courierCharge = (n * 100) + 20; else if (s === 'kerala') courierCharge = courierRates.kerala[n] || 0; else courierCharge = courierRates.outside[n] || 0;
    return { total: `₹${basePrice + courierCharge}/-` };
}

function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    renderTabs(allOrders.filter(o => (o.name || '').toLowerCase().includes(term) || String(o.phone).includes(term) || (o.orderid || '').toLowerCase().includes(term)));
}

// Scanner and Print functions remain same as before...
function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) { alert("Select orders!"); return; }
    const area = document.getElementById('print-area'); area.innerHTML = '';
    selected.forEach(cb => {
        const d = allOrders[cb.value]; const safe = (val) => (val || '').toString().toUpperCase();
        area.innerHTML += `<div class="label-page"><div class="header-sec"><div id="qrcode-${cb.value}" class="qr-box"></div><svg id="barcode-${cb.value}"></svg></div><div class="cust-details-print">${safe(d.name)}<br>${safe(d.place)}<br>${safe(d.district)}</div><div style="font-weight:900;">PIN: ${d.pincode}</div><div style="border:1px solid black; padding:2px; display:inline-block;">PH: ${d.phone}</div></div>`;
    });
    setTimeout(() => {
        selected.forEach(cb => {
            const d = allOrders[cb.value];
            JsBarcode(`#barcode-${cb.value}`, d.orderid, { height: 30, displayValue: false });
            new QRCode(document.getElementById(`qrcode-${cb.value}`), { text: `https://www.google.com/maps/search/${d.place},${d.district}`, width: 50, height: 50 });
        });
        setTimeout(() => window.print(), 500);
    }, 500);
}

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
                    .then(res => res.json()).then(d => { if (d.result === 'success') { alert("Saved!"); fetchOrders(true); stopScanner(); } });
            }
        }
    }
}