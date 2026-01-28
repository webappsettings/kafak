// 🔴 1. NEW GOOGLE SCRIPT URL
const scriptURL = "https://script.google.com/macros/s/AKfycbxpPZ3Ou_pVIEuVy0P4KemyklbI1jVNpXzkDKtFjBHgcetKl6UqwgJIFFYlYN3GVyUhYA/exec";


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
    fetchOrders();
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

// --- CORE FUNCTIONS ---

function fetchOrders(forceLoad = false) {
    let savedOrders = localStorage.getItem('allOrdersCache');
    let hasData = false;

    if (savedOrders) {
        allOrders = JSON.parse(savedOrders);
        renderTabs(allOrders);
        hasData = true;
        document.getElementById('loader').style.display = 'none';
    }

    if (hasData && !forceLoad) return;

    document.getElementById('list-pending').innerHTML = '';
    document.getElementById('list-paid').innerHTML = '';
    document.getElementById('list-dispatched').innerHTML = '';
    document.getElementById('loader').style.display = 'block';

    fetch(`${scriptURL}?action=getAllOrders`)
        .then(res => res.json())
        .then(response => {
            document.getElementById('loader').style.display = 'none';
            if (response.result === 'success') {
                allOrders = response.data;
                localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
                renderTabs(allOrders);
                updateSyncButtonUI();
            }
        })
        .catch(err => {
            document.getElementById('loader').style.display = 'none';
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

    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    orders.forEach((d, i) => {
        let localUpdate = pendingUpdates.find(item => item.oid === d.orderid);
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

// 🔴 UPDATED CARD DESIGN (FULL DETAILS)
function createCardHTML(d, index, type, currentStatus) {
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => (val || '').toString().toUpperCase();
    let statusBadge = '', buttons = '', tickMark = '';

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
        statusBadge = '<span class="badge bg-success">Paid ✅</span>';
        buttons = `<button class="btn-custom btn-dispatch" onclick="updateOrder('${d.orderid}', 'Dispatched')">📦 Dispatch</button>
                   <div style="display:flex; align-items:center; justify-content:center; width:40px;">
                       <input type="checkbox" class="order-cb" value="${index}" style="width:20px; height:20px;">
                   </div>`;
    } else if (type === 'dispatched') {
        statusBadge = '<span class="badge bg-primary">Dispatched</span>';
        tickMark = '<i class="fas fa-check-circle text-primary fs-4 position-absolute top-0 end-0 m-2"></i>';
        buttons = `<button class="btn-custom btn-track" onclick="startScanner('tracking', '${d.orderid}')">🚚 Add Tracking</button>`;
    }

    // Full Address Block
    let addressBlock = `
        <div class="cust-details">
            <div style="font-weight:700; color:#333;">${safe(d.house)}</div>
            <div>${safe(d.place)}, ${safe(d.postoffice)}</div>
            <div>${safe(d.district)}, ${safe(d.state)} - <b>${d.pincode}</b></div>
            <div class="mt-1 text-primary"><i class="fas fa-phone-alt small"></i> ${d.phone}</div>
        </div>
    `;

    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card status-${currentStatus}">
            ${tickMark}
            <div class="card-header-row">
                <span class="order-id">#${d.orderid}</span>
                ${statusBadge}
            </div>
            <div class="cust-name">${safe(d.name)}</div>
            
            ${addressBlock}

            <div class="info-box">
                <b>${d.quantity} Bottles</b>
                <div class="text-success fw-bold">${priceInfo.total}</div>
            </div>
            <div class="action-area">${buttons}</div>
        </div>
    </div>`;
}

function updateOrder(oid, status) {
    if (!confirm(`ഈ ഓർഡർ ${status} ആയി മാർക്ക് ചെയ്യട്ടെ?`)) return;

    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates = updates.filter(item => item.oid !== oid);
    updates.push({ oid: oid, status: status, time: new Date().getTime() });
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    const orderIndex = allOrders.findIndex(o => o.orderid === oid);
    if (orderIndex !== -1) {
        allOrders[orderIndex].Status = status;
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
    }

    alert(`Saved Locally: ${status} ✅`);
    renderTabs(allOrders);
}

function syncWithServer() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    if (pendingUpdates.length === 0) return;

    if (!confirm(`${pendingUpdates.length} മാറ്റങ്ങൾ സെർവറിലേക്ക് സേവ് ചെയ്യട്ടെ?`)) return;

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
                localStorage.removeItem('pendingUpdates');
                alert("Sync Complete! ✅");
                updateSyncButtonUI();
                $('#sync-btn').prop('disabled', false);
            }
        })
        .catch(err => {
            alert("Sync Failed! ഇന്റർനെറ്റ് പരിശോധിക്കുക.");
            $('#sync-btn').prop('disabled', false).text('Retry Sync');
        });
}

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

function sendWA(index) {
    const d = allOrders[index];
    const n = parseInt(d.quantity);
    const price = calculatePriceInfo(n, d.state);

    // Auto Update status to Sent if in New
    if (d.Status === 'Pending') {
        updateOrder(d.orderid, 'Sent');
    }

    const msg = `
*INVOICE: KAFAK HONEY* 🍯
---------------------------------
Name: *${d.name}*
Order ID: ${d.orderid}
Quantity: ${d.quantity} Bottles
Total: *${price.total}*
---------------------------------
*Google Pay: 7788990313*
(KAFAK LLP)

Pay ചെയ്ത് സ്ക്രീൻഷോട്ട് അയക്കുക. ✅`;

    window.open(`https://wa.me/${d.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// 🔴 PRINT FUNCTION (UNCHANGED - PERFECT)
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
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@100..800&display=swap" rel="stylesheet">
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

function toggleSelectAll() {
    const btn = document.getElementById('btn-select-all');
    const checkboxes = document.querySelectorAll('.order-cb');
    const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);
    const newState = !isAllChecked;
    checkboxes.forEach(cb => cb.checked = newState);

    if (newState) {
        btn.classList.remove('btn-outline-light');
        btn.classList.add('btn-light', 'text-success', 'fw-bold');
        btn.innerHTML = '<i class="fas fa-check-square"></i> All Selected';
    } else {
        btn.classList.add('btn-outline-light');
        btn.classList.remove('btn-light', 'text-success', 'fw-bold');
        btn.innerHTML = '<i class="far fa-square"></i> Select All';
    }
}