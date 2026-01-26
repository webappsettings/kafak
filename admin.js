// 🔴 1. GOOGLE SCRIPT URL
const scriptURL = "https://script.google.com/macros/s/AKfycbw4fdoIOOqpDJEnIDzJR4BgfvSr5D9X7A-yzsK9EWU4AyGU8sZ6CWnnDcIH6tAN29HaSQ/exec";

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

// ലോഗൗട്ട് ഫങ്ക്ഷൻ - ക്ലീൻ ആക്കിയത്
function logoutAdmin() {
    if (confirm("Logout ചെയ്യാൻ ഉറപ്പാണോ?")) {
        localStorage.clear();
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
            document.getElementById('loader').innerHTML = `<p class="text-danger">Network Error!</p>`;
        });
}

function renderTabs(orders) {
    const pendingList = document.getElementById('list-pending');
    const paidList = document.getElementById('list-paid');
    const dispatchedList = document.getElementById('list-dispatched');

    pendingList.innerHTML = ''; paidList.innerHTML = ''; dispatchedList.innerHTML = '';
    let counts = { pending: 0, paid: 0, dispatched: 0 };

    // ലോക്കൽ അപ്ഡേറ്റുകൾ എടുക്കുന്നു
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    orders.forEach((d, i) => {
        // ലോക്കൽ മാറ്റം ഉണ്ടോ എന്ന് നോക്കുന്നു
        let localUpdate = pendingUpdates.find(item => item.oid === d.orderid);

        // ഷീറ്റിലെ സ്റ്റാറ്റസിനേക്കാൾ മുൻഗണന ലോക്കൽ മാറ്റത്തിന് നൽകുന്നു
        let status = localUpdate ? localUpdate.status : (d.Status || 'Pending');

        // 🔴 ഇവിടെ d.Status-ന് പകരം നമ്മൾ മുകളിൽ കണ്ടുപിടിച്ച status ഉപയോഗിക്കുന്നു
        if (status === 'Pending' || status === 'Sent') {
            counts.pending++;
            pendingList.innerHTML += createCardHTML(d, i, 'pending');
        } else if (status === 'Paid') {
            counts.paid++;
            paidList.innerHTML += createCardHTML(d, i, 'paid');
        } else if (status === 'Dispatched') {
            counts.dispatched++;
            dispatchedList.innerHTML += createCardHTML(d, i, 'dispatched');
        }
    });

    document.getElementById('count-pending').innerText = counts.pending;
    document.getElementById('count-paid').innerText = counts.paid;
    document.getElementById('count-dispatched').innerText = counts.dispatched;

    updateSyncButtonUI();
}

// 2. സിങ്ക് ബട്ടൺ എപ്പോൾ കാണിക്കണം എന്ന് തീരുമാനിക്കുന്ന ലോജിക്
// ഈ ഫങ്ക്ഷൻ നിങ്ങളുടെ നിലവിലുള്ള renderTabs-നുള്ളിൽ അവസാനം ചേർക്കുക
function updateSyncButtonUI() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    const syncBtn = $('#sync-btn');

    if (pendingUpdates.length > 0) {
        syncBtn.show(); // 🔴 ഇവിടെയാണ് display:none മാറുന്നത്
        syncBtn.html(`🔄 SYNC UPDATES (${pendingUpdates.length})`);
    } else {
        syncBtn.hide();
    }
}

function createCardHTML(d, index, type) {
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => (val || '').toString().toUpperCase();

    // 🔴 1. ലോക്കൽ സ്റ്റാറ്റസ് ഉണ്ടോ എന്ന് ആദ്യം പരിശോധിക്കുന്നു
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let localUpdate = pendingUpdates.find(item => item.oid === d.orderid);
    let currentStatus = localUpdate ? localUpdate.status : (d.Status || 'Pending');

    let statusBadge = '', buttons = '', tickMark = '';

    // 🔴 2. d.Status-ന് പകരം currentStatus ഉപയോഗിക്കുന്നു
    if (type === 'pending') {
        if (currentStatus === 'Sent') {
            // 'Sent' ആണെങ്കിൽ Invoice Sent എന്ന് കാണിക്കുകയും 'Mark Paid' ബട്ടൺ നൽകുകയും ചെയ്യുന്നു
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

    // കാർഡിന്റെ ബോർഡർ കളറും currentStatus അനുസരിച്ച് മാറ്റുന്നു
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

// 🚀 പുതുക്കിയ അപ്‌ഡേറ്റ് ഫങ്ക്ഷൻ: സർവർ ലോഡിംഗ് ഒഴിവാക്കി
function updateOrder(oid, status) {
    if (!confirm(`ഈ ഓർഡർ ${status} ആയി മാർക്ക് ചെയ്യട്ടെ?`)) return;

    // 1. പെൻഡിംഗ് ലിസ്റ്റിലേക്ക് ഡാറ്റ ചേർക്കുന്നു
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates = updates.filter(item => item.oid !== oid); // പഴയ സ്റ്റാറ്റസ് ഉണ്ടെങ്കിൽ ഒഴിവാക്കുന്നു
    updates.push({ oid: oid, status: status, time: new Date().getTime() });
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    // 2. ബട്ടൺ ലേബലുകൾക്കായി മാർക്ക് ചെയ്യുന്നു
    const storageKey = status === 'Sent' ? `sent_${oid}` : `paid_${oid}`;
    localStorage.setItem(storageKey, 'true');

    // 3. UI ഉടൻ അപ്‌ഡേറ്റ് ചെയ്യുന്നു (സെർവർ മറുപടിക്കായി കാത്തുനിൽക്കില്ല)
    alert(`Saved Locally: ${status} ✅`);
    renderTabs(allOrders); // ഇത് വിളിക്കുമ്പോൾ ഓട്ടോമാറ്റിക്കായി ലോക്കൽ സ്റ്റാറ്റസ് എടുക്കും
}

function calculatePriceInfo(qty, state) {
    const n = parseInt(qty) || 0;
    const basePrice = n * 650;
    const s = String(state || '').toLowerCase().trim();
    let rates = (s === 'kerala') ? courierRates.kerala : courierRates.outside;

    // നിരക്ക് കണ്ടുപിടിക്കുന്നു (ഇല്ലാത്ത എണ്ണം വന്നാൽ അടുത്ത നിരക്ക് എടുക്കും)
    let courierCharge = rates[n] || rates[n + 1] || rates[n + 2] || rates[10] || 0;

    if (s === 'lakshadweep') courierCharge = (n * 100) + 20;
    return { total: `₹${basePrice + courierCharge}/-` };
}

function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) { alert("Select orders!"); return; }

    const area = document.getElementById('print-area');
    area.innerHTML = '';

    selected.forEach(cb => {
        const d = allOrders[cb.value];
        const safe = (val) => (val || '').toString().toUpperCase();
        area.innerHTML += `
        <div class="label-page">
            <div class="header-sec"><div id="qrcode-${cb.value}" class="qr-box"></div><svg id="barcode-${cb.value}"></svg></div>
            <div class="cust-details-print">${safe(d.name)}<br>${safe(d.place)}<br>${safe(d.district)}</div>
            <div style="font-weight:900;">PIN: ${d.pincode}</div>
            <div style="border:1px solid black; padding:2px; display:inline-block;">PH: ${d.phone}</div>
        </div>`;
    });

    setTimeout(() => {
        selected.forEach(cb => {
            const d = allOrders[cb.value];
            JsBarcode(`#barcode-${cb.value}`, d.orderid, { height: 30, displayValue: false });
            // QR Code ലിങ്ക് ശരിയാക്കി
            new QRCode(document.getElementById(`qrcode-${cb.value}`), {
                text: `https://www.google.com/maps/search/${d.place},${d.district}`,
                width: 50, height: 50
            });
        });
        setTimeout(() => window.print(), 500);
    }, 500);
}

// ബാക്കിയുള്ള Scanner, WhatsApp ഫങ്ക്ഷനുകൾ മാറ്റമില്ലാതെ തുടരാം...

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

// --- അഡ്മിൻ ലോഗൗട്ട് ഫങ്ക്ഷൻ ---
function logoutAdmin() {
    if (confirm("Logout ചെയ്യാൻ ഉറപ്പാണോ?")) {
        // 1. അഡ്മിൻ ലോഗിൻ വിവരങ്ങൾ ഒഴിവാക്കുന്നു
        localStorage.removeItem('kafakAdminLoggedIn');

        // 2. ഓർഡർ ലിങ്കുകളിൽ 'Mark Paid' വരുന്നത് ഒഴിവാക്കുന്നു
        localStorage.removeItem('kafakAdmin');

        // 3. പേജ് ലോഗിൻ സ്ക്രീനിലേക്ക് കൊണ്ടുപോകുന്നു (ഉദാഹരണത്തിന് login.html ഉണ്ടെങ്കിൽ)
        // അല്ലെങ്കിൽ ഇൻഡക്സ് പേജിലേക്ക് റീഡയറക്ട് ചെയ്യുക
        window.location.href = "index.html";

        // ഇൻഡക്സ് പേജ് ഇല്ലെങ്കിൽ മാത്രം താഴെയുള്ളത് ഉപയോഗിക്കുക
        // location.reload(); 
    }
}


// 1. സെർവറിലേക്ക് ലോക്കൽ മാറ്റങ്ങൾ ഒന്നിച്ച് അയക്കുന്നു
function syncWithServer() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    if (pendingUpdates.length === 0) {
        alert("സിങ്ക് ചെയ്യാൻ മാറ്റങ്ങൾ ഒന്നുമില്ല!");
        return;
    }

    if (!confirm(`${pendingUpdates.length} മാറ്റങ്ങൾ സെർവറിലേക്ക് സേവ് ചെയ്യട്ടെ?`)) return;

    // ബട്ടൺ ലോഡിംഗ് സ്റ്റേറ്റിലേക്ക് മാറ്റുന്നു
    $('#sync-btn').prop('disabled', true).text('Syncing...');

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'bulkUpdateStatus', // GS-ൽ ഈ ആക്ഷൻ ഉണ്ടെന്ന് ഉറപ്പാക്കുക
            updates: pendingUpdates
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                // ലോക്കൽ ഡാറ്റ ക്ലിയർ ചെയ്യുന്നു
                localStorage.removeItem('pendingUpdates');

                // അഡ്മിൻ പേജിലെ മറ്റ് ലോക്കൽ മാർക്കിംഗുകളും ഒഴിവാക്കാം
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sent_') || key.startsWith('paid_')) {
                        localStorage.removeItem(key);
                    }
                });

                alert("എല്ലാം വിജയകരമായി സെർവറിൽ സേവ് ചെയ്തു! ✅");
                location.reload(); // പുതിയ ഡാറ്റ ലോഡ് ചെയ്യാൻ പേജ് റിഫ്രഷ് ചെയ്യുന്നു
            }
        })
        .catch(err => {
            alert("Sync Error! ഇന്റർനെറ്റ് പരിശോധിക്കുക.");
            $('#sync-btn').prop('disabled', false).text('Retry Sync');
        });
}

