// 🔴 1. NEW GOOGLE SCRIPT URL
const scriptURL = "https://script.google.com/macros/s/AKfycbzVBmDpR4byla5f6Sdxa7tqi125PlbP4SgqkR9xdQkdop6eBAHNPS6qn5pRz899TZ9DSQ/exec";

// --- LOGIN LOGIC ---
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
    fetchOrders(); // Load data (Offline first)
}

function logoutAdmin() {
    if (confirm("Logout ചെയ്യാൻ ഉറപ്പാണോ?")) {
        localStorage.removeItem('kafakAdminLoggedIn');
        localStorage.removeItem('kafakAdmin');
        window.location.href = "index.html";
    }
}

// --- CONFIG & VARIABLES ---
const courierRates = {
    kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
    outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let allOrders = [];
let html5QrCode;
let scanMode = '';
let scanStep = 0;
let tempOid = null;

// --- CORE FUNCTIONS (OFFLINE FIRST) ---

function fetchOrders(forceLoad = false) {
    // 1. ഫോണിലെ ഡാറ്റ എടുക്കുന്നു
    let savedOrders = localStorage.getItem('allOrdersCache');
    let hasData = false;

    if (savedOrders) {
        allOrders = JSON.parse(savedOrders);
        renderTabs(allOrders);
        hasData = true;
        document.getElementById('loader').style.display = 'none';
    }

    if (hasData && !forceLoad) {
        return;
    }

    // 2. 🔴 UI FIX: ലോഡ് ബട്ടൺ അമർത്തിയാൽ ഉടൻ പഴയ ലിസ്റ്റ് ക്ലിയർ ചെയ്യുന്നു
    // ഇതോടെ പഴയ ബാഡ്ജുകൾ കാണിക്കുന്നത് ഒഴിവാക്കാം.
    document.getElementById('list-pending').innerHTML = '';
    document.getElementById('list-paid').innerHTML = '';
    document.getElementById('list-dispatched').innerHTML = '';

    // 3. ലോഡർ കാണിക്കുന്നു
    document.getElementById('loader').style.display = 'block';

    fetch(`${scriptURL}?action=getAllOrders`)
        .then(res => res.json())
        .then(response => {
            document.getElementById('loader').style.display = 'none';
            if (response.result === 'success') {
                allOrders = response.data;
                localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
                renderTabs(allOrders); // പുതിയ ഡാറ്റ വെച്ച് ലിസ്റ്റ് ഉണ്ടാക്കുന്നു
                updateSyncButtonUI();
            }
        })
        .catch(err => {
            document.getElementById('loader').style.display = 'none';

            // എറർ വന്നാൽ പഴയ ഡാറ്റ തിരികെ കാണിക്കുന്നു (അല്ലെങ്കിൽ സ്ക്രീൻ കാലിയാകും)
            if (hasData) {
                renderTabs(allOrders);
                alert("നെറ്റ്‌വർക്ക് എറർ! പഴയ ഡാറ്റ റീസ്റ്റോർ ചെയ്തു.");
            } else {
                alert("നെറ്റ്‌വർക്ക് എറർ! കണക്ഷൻ പരിശോധിക്കുക.");
            }
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
        // ലോക്കൽ മാറ്റം ഉണ്ടോ എന്ന് നോക്കുന്നു (reverse ആവശ്യമില്ല, updateOrder-ൽ ഫിൽറ്റർ ചെയ്യുന്നുണ്ട്)
        let localUpdate = pendingUpdates.find(item => item.oid === d.orderid);

        // ഷീറ്റിലെ സ്റ്റാറ്റസിനേക്കാൾ മുൻഗണന ലോക്കൽ മാറ്റത്തിന് നൽകുന്നു
        let status = localUpdate ? localUpdate.status : (d.Status || 'Pending');

        // കാർഡ് ഉണ്ടാക്കുമ്പോൾ ഈ പുതിയ 'status' ഉപയോഗിക്കുന്നു
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

    // സിങ്ക് ബട്ടൺ അപ്‌ഡേറ്റ് ചെയ്യുന്നു
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

    // ബട്ടണുകൾ currentStatus അനുസരിച്ച് നൽകുന്നു
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

// 🔴 LOCAL UPDATE (INSTANT & FINAL STATUS ONLY)
function updateOrder(oid, status) {
    if (!confirm(`ഈ ഓർഡർ ${status} ആയി മാർക്ക് ചെയ്യട്ടെ?`)) return;

    // 1. പെൻഡിംഗ് ലിസ്റ്റ് അപ്‌ഡേറ്റ് (Sync-ന് വേണ്ടി)
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates = updates.filter(item => item.oid !== oid);
    updates.push({ oid: oid, status: status, time: new Date().getTime() });
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    // 2. ബട്ടൺ ഫ്ലാഗ് സേവ് ചെയ്യുന്നു
    localStorage.setItem(`${status === 'Sent' ? 'sent' : 'paid'}_${oid}`, 'true');

    // 3. മെയിൻ ലിസ്റ്റ് അപ്‌ഡേറ്റ് ചെയ്യുന്നു
    const orderIndex = allOrders.findIndex(o => o.orderid === oid);
    if (orderIndex !== -1) {
        allOrders[orderIndex].Status = status; // മെമ്മറിയിൽ മാറ്റുന്നു

        // 🔴 ഈ വരിയാണ് വിട്ടുപോയത്! 
        // മാറ്റം വന്ന ലിസ്റ്റ് അപ്പോൾ തന്നെ ഫോണിലെ Cache-ലേക്ക് സേവ് ചെയ്യുന്നു.
        // ഇത് ചെയ്താൽ പേജ് റിഫ്രഷ് ചെയ്താലും പുതിയ സ്റ്റാറ്റസ് തന്നെ നിൽക്കും.
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
    }

    alert(`Saved Locally: ${status} ✅`);
    renderTabs(allOrders);
}

// 🔴 SYNC FUNCTION (Updated for Auto Refresh)
// 🔴 SYNC FUNCTION (Super Fast - No Fetch)
// 🔴 SYNC FUNCTION (Super Fast - No Fetch)
function syncWithServer() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    if (pendingUpdates.length === 0) return;

    if (!confirm(`${pendingUpdates.length} മാറ്റങ്ങൾ സെർവറിലേക്ക് സേവ് ചെയ്യട്ടെ?`)) return;

    // ബട്ടൺ ലോഡിംഗ് ആക്കുന്നു
    $('#sync-btn').prop('disabled', true).text('Syncing...');

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'bulkUpdateStatus',
            updates: pendingUpdates
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                // 1. ലോക്കൽ പെൻഡിംഗ് ലിസ്റ്റ് ക്ലിയർ ചെയ്യുന്നു
                localStorage.removeItem('pendingUpdates');

                // 2. അനാവശ്യമായ ലോക്കൽ ഫ്ലാഗുകൾ കളയുന്നു
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sent_') || key.startsWith('paid_')) {
                        localStorage.removeItem(key);
                    }
                });

                alert("Sync Complete! ✅");

                // 3. 🔴 മാറ്റം: ഇവിടെ fetchOrders(true) വിളിക്കുന്നില്ല.
                // പകരം ബട്ടൺ ഹൈഡ് ചെയ്യുകയും UI ഒന്ന് പുതുക്കുകയും ചെയ്യുന്നു.

                updateSyncButtonUI();
                // വേണമെങ്കിൽ renderTabs(allOrders) വിളിക്കാം, പക്ഷെ അത് നിർബന്ധമില്ല 
                // കാരണം updateOrder ചെയ്തപ്പോൾ തന്നെ ലിസ്റ്റ് മാറിയതാണ്.

                $('#sync-btn').prop('disabled', false);
            }
        })
        .catch(err => {
            alert("Sync Failed! ഇന്റർനെറ്റ് പരിശോധിക്കുക.");
            $('#sync-btn').prop('disabled', false).text('Retry Sync');
        });
}

// --- UTILS ---
function calculatePriceInfo(qty, state) {
    const n = parseInt(qty) || 0;
    const basePrice = n * 650;
    let courierCharge = 0;
    const s = String(state || '').toLowerCase().trim();
    if (s === 'lakshadweep') courierCharge = (n * 100) + 20;
    else if (s === 'kerala') courierCharge = courierRates.kerala[n] || 0;
    else courierCharge = courierRates.outside[n] || 0;
    return { total: `₹${basePrice + courierCharge}/-` };
}

function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    renderTabs(allOrders.filter(o => (o.name || '').toLowerCase().includes(term) || String(o.phone).includes(term) || (o.orderid || '').toLowerCase().includes(term)));
}

function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) { alert("പ്രിന്റ് ചെയ്യാൻ ഓർഡറുകൾ സെലക്ട് ചെയ്യൂ!"); return; }

    // 1. HTML-ൽ നിന്ന് ഡിസൈൻ കോഡ് വലിച്ചെടുക്കുന്നു
    // 🔴 ഇതാണ് പ്രധാന മാറ്റം
    const styles = document.getElementById('label-css').innerHTML;

    // QR Generate ചെയ്യാൻ Temp Div
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    const promises = [];
    const labelsData = [];

    selected.forEach((cb, index) => {
        const d = allOrders[cb.value];
        if (d) {
            const safe = (val) => (val || '').toString().toUpperCase();

            const p = new Promise((resolve) => {
                const qrNode = document.createElement('div');
                tempDiv.appendChild(qrNode);

                new QRCode(qrNode, {
                    text: d.orderid,
                    width: 90, height: 90,
                    colorDark: "#000000", colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });

                setTimeout(() => {
                    const canvas = qrNode.querySelector('canvas');
                    let qrImgSrc = '';
                    if (canvas) {
                        qrImgSrc = canvas.toDataURL("image/png");
                    }
                    labelsData.push({
                        details: d,
                        qrSrc: qrImgSrc
                    });
                    resolve();
                }, 50);
            });
            promises.push(p);
        }
    });

    Promise.all(promises).then(() => {
        document.body.removeChild(tempDiv);

        const printWin = window.open('', '', 'width=600,height=800');

        let htmlContent = `
        <html>
        <head>
            <title>KAFAK Print</title>
            <style>${styles}</style>
        </head>
        <body>`;

        labelsData.forEach(item => {
            const d = item.details;
            const safe = (val) => (val || '').toString().toUpperCase();
            let qtyHTML = (d.quantity == 1) ? '' : `<div class="qty-text">x${d.quantity}</div>`;

            const phoneIcon = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 15.5C18.75 15.5 17.55 15.3 16.43 14.93C16.08 14.82 15.69 14.9 15.43 15.16L13.23 17.36C10.42 15.92 8.08 13.58 6.64 10.77L8.84 8.57C9.1 8.31 9.18 7.92 9.07 7.57C8.7 6.45 8.5 5.25 8.5 4C8.5 3.45 8.05 3 7.5 3H4C3.45 3 3 3.45 3 4C3 13.39 10.61 21 20 21C20.55 21 21 20.55 21 20V16.5C21 15.95 20.55 15.5 20 15.5Z" fill="black"/>
  <path d="M11.65 8.03C11.65 8.03 13.06 8.03 13.77 8.73C14.47 9.44 14.47 10.85 14.47 10.85M12 4.84C12 4.84 14.83 4.84 16.24 6.26C17.66 7.67 17.66 10.5 17.66 10.5M12.35 1.66C12.35 1.66 16.6 1.66 18.72 3.78C20.84 5.9 20.84 10.15 20.84 10.15" stroke="#008CFF" stroke-width="2" stroke-linecap="round"/>
</svg>`;

            htmlContent += `
            <div class="label-page">
                <div class="address-sec">
                    <div class="to-label">To,</div>
                    <div class="cust-name">${safe(d.name)}</div>
                    <div class="cust-addr">
                        ${safe(d.house)}<br>
                        ${safe(d.place)}<br>
                        ${safe(d.postoffice)}<br>
                        ${safe(d.district)}, ${safe(d.state)}
                    </div>
                    <div class="cust-pin">PIN: ${d.pincode}</div>
                    <div class="cust-ph">PH: ${d.phone}</div>
                </div>

                <div class="meta-sec">                   
                    <div class="qr-box"><img src="${item.qrSrc}"></div>
                    <div class="qr-oid">${d.orderid}</div>
                    ${qtyHTML}
                </div>

                <div class="contact-box">
                    <div class="contact-icon">${phoneIcon}</div>
                    <div class="contact-text">
                        <span>7788990313, 9895082689</span>
                        If unreachable, call or WhatsApp us
                    </div>
                </div>

                <div class="fragile-sec">
                    <img src="fragile.png" class="fragile-img" alt="Fragile">
                </div>

                <div class="from-sec">
                    <span style="font-weight:bold; font-size:11px;">From,</span><br>
                    <b>KAFAK LLP,</b> 10/174, Kunnathery,<br>
                    Thaikkattukara P.O, Aluva - 683106,<br>
                    Ernakulam District, Kerala, India.<br>
                    Phone: 778899 0 313
                </div>
            </div>`;
        });

        htmlContent += `</body></html>`;

        printWin.document.write(htmlContent);
        printWin.document.close();

        setTimeout(() => {
            printWin.focus();
            printWin.print();
        }, 500);
    });
}

function startScanner(mode, specificOid) {
    scanMode = mode; tempOid = specificOid || null; scanStep = mode === 'tracking' && tempOid ? 2 : 1;
    document.getElementById('scanner-modal').style.display = 'flex';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess);
}

function stopScanner() {
    if (html5QrCode) html5QrCode.stop().then(() => document.getElementById('scanner-modal').style.display = 'none');
}

function onScanSuccess(decodedText) {
    if (scanMode === 'dispatch' && decodedText.startsWith("ORD-")) {
        if (confirm(`Dispatch ${decodedText}?`)) { updateOrder(decodedText, 'Dispatched'); stopScanner(); }
    } else if (scanMode === 'tracking') {
        if (scanStep === 2 && !decodedText.startsWith("ORD-")) {
            if (confirm(`Link Tracking ${decodedText} to ${tempOid}?`)) {
                fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'updateTracking', oid: tempOid, tracking: decodedText }) })
                    .then(res => res.json())
                    .then(d => { if (d.result === 'success') { alert("Saved!"); fetchOrders(true); stopScanner(); } });
            }
        }
    }
}

// 🔴 UPDATED SELECT ALL FUNCTION
function toggleSelectAll() {
    const btn = document.getElementById('btn-select-all');
    const checkboxes = document.querySelectorAll('.order-cb');

    // നിലവിൽ എല്ലാം സെലക്ട് ആണോ എന്ന് നോക്കുന്നു
    const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);
    const newState = !isAllChecked; // നേരെ തിരിച്ചാക്കുന്നു

    checkboxes.forEach(cb => cb.checked = newState);

    // 🔴 BUTTON STYLE CHANGE
    if (newState) {
        // Checked ആകുമ്പോൾ (Solid White Background)
        btn.classList.remove('btn-outline-light');
        btn.classList.add('btn-light', 'text-success', 'fw-bold');
        btn.innerHTML = '<i class="fas fa-check-square"></i> All Selected';
    } else {
        // Unchecked ആകുമ്പോൾ (Outline Only)
        btn.classList.add('btn-outline-light');
        btn.classList.remove('btn-light', 'text-success', 'fw-bold');
        btn.innerHTML = '<i class="far fa-square"></i> Select All';
    }
}