// 🔴 1. NEW GOOGLE SCRIPT URL
const scriptURL = "https://script.google.com/macros/s/AKfycbxpPZ3Ou_pVIEuVy0P4KemyklbI1jVNpXzkDKtFjBHgcetKl6UqwgJIFFYlYN3GVyUhYA/exec";


// --- LOGIN LOGIC & TAB PERSISTENCE ---
window.onload = function () {
    // 1. Check Login
    if (localStorage.getItem('kafakAdminLoggedIn') === 'true') {
        showDashboard();

        // 🔴 RESTORE ACTIVE TAB (Reload ചെയ്താലും ടാബ് മാറില്ല)
        const savedTab = localStorage.getItem('activeAdminTab');
        if (savedTab) {
            const tabTrigger = document.querySelector(`button[data-bs-target="${savedTab}"]`);
            if (tabTrigger) {
                const tab = new bootstrap.Tab(tabTrigger);
                tab.show();
            }
        }
    } else {
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('dashboard-section').style.display = 'none';
    }

    // 🔴 SAVE TAB ON CLICK (ടാബ് മാറ്റുമ്പോൾ സേവ് ചെയ്യുന്നു)
    const tabEls = document.querySelectorAll('button[data-bs-toggle="pill"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', function (event) {
            localStorage.setItem('activeAdminTab', event.target.getAttribute('data-bs-target'));
        });
    });
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
    fetchOrders(); // Load data
}

function logoutAdmin() {
    if (confirm("Logout ചെയ്യാൻ ഉറപ്പാണോ?")) {
        localStorage.removeItem('kafakAdminLoggedIn');
        localStorage.removeItem('kafakAdmin');
        localStorage.removeItem('activeAdminTab'); // Clear tab preference
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
    document.getElementById('loader').style.display = 'flex';

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
                alert("Network Error! Using offline data.");
            } else {
                alert("Network Error!");
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
    const logoPlaceholder = $('#logo-placeholder');
    const headerLogo = $('#header-logo');
    const badge = $('#sync-badge-count');

    if (pendingUpdates.length > 0) {
        // Show Sync Button
        syncBtn.css('display', 'flex'); // Flex to center icon
        logoPlaceholder.hide(); // Hide logo placeholder to make space
        badge.text(pendingUpdates.length); // Update Count
    } else {
        // Hide Sync Button
        syncBtn.hide();
        logoPlaceholder.show();
        headerLogo.show(); // Show logo when sync is hidden
    }
}

function createCardHTML(d, index, type, currentStatus) {
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => (val || '').toString().toUpperCase();
    let statusBadge = '', buttons = '', tickMark = '';
    let topButtons = '';

    let editLink = `<a href="order.html?oid=${d.orderid}" target="_blank" class="btn-top-action">✏️ EDIT</a>`;
    let printBtn = `<button onclick="printSingle(${index})" class="btn-top-action btn-print-mini">🖨️</button>`;

    if (type === 'pending') {
        if (currentStatus === 'Sent') {
            statusBadge = '<span class="badge bg-info text-dark">Sent</span>';
            buttons = `<button class="btn-custom btn-paid" onclick="updateOrder('${d.orderid}', 'Paid')">💰 Mark Paid</button>
                       <button class="btn-custom btn-wa" onclick="sendWA(${index})"><i class="fab fa-whatsapp"></i> Resend</button>`;
        } else {
            statusBadge = '<span class="badge bg-warning text-dark">New</span>';
            buttons = `<button class="btn-custom btn-wa" onclick="sendWA(${index})"><i class="fab fa-whatsapp"></i> Send Invoice</button>`;
        }
    } else if (type === 'paid') {
        statusBadge = '<span class="badge bg-success">Paid</span>';
        buttons = `<button class="btn-custom btn-dispatch" onclick="updateOrder('${d.orderid}', 'Dispatched')">📦 Dispatch</button>
                   <div style="display:flex; align-items:center; justify-content:center; width:40px;">
                       <input type="checkbox" class="order-cb" value="${index}" onchange="checkSelectAllStatus()" style="width:20px; height:20px;">
                   </div>`;
        topButtons = `<button onclick="updateOrder('${d.orderid}', 'Sent')" class="btn-top-action">↩ REVERT</button>` + printBtn;

    } else if (type === 'dispatched') {
        statusBadge = '<span class="badge bg-primary">Dispatched</span>';
        tickMark = '<i class="fas fa-check-circle text-primary fs-4 position-absolute top-0 end-0 m-2"></i>';
        let trackLabel = d.tracking ? `TRK: ${d.tracking}` : 'Add Tracking';
        buttons = `<button class="btn-custom btn-track" onclick="startScanner('tracking', '${d.orderid}')">🚚 ${trackLabel}</button>`;
        topButtons = `<button onclick="updateOrder('${d.orderid}', 'Paid')" class="btn-top-action">↩ REVERT</button>` + printBtn;
    }

    let addressBlock = `
        <div class="cust-details">
            <div style="font-weight:800; color:#1a1a1a;">${safe(d.house)}</div>
            <div>${safe(d.place)}, ${safe(d.postoffice)}</div>
            <div>${safe(d.district)}, ${safe(d.state)} - <b>${d.pincode}</b></div>
            <div class="mt-1 text-primary fw-bold"><i class="fas fa-phone-alt small"></i> ${d.phone}</div>
        </div>
    `;

    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card status-${currentStatus}">
            ${tickMark}
            <div class="card-header-row">
                <div><span class="order-id">#${d.orderid.split('-')[1]}</span> ${editLink} ${topButtons}</div>
                ${statusBadge}
            </div>
            <div class="cust-name">${safe(d.name)}</div>
            ${addressBlock}
            <div class="info-box">
                <span>${d.quantity} Bottles</span>
                <span class="price-tag">${priceInfo.total}</span>
            </div>
            <div class="action-area">${buttons}</div>
        </div>
    </div>`;
}

function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const tabsContainer = document.getElementById('tabs-container');
    const searchResultsArea = document.getElementById('search-results-area');
    const searchList = document.getElementById('list-search');

    if (term.length > 0) {
        tabsContainer.style.display = 'none';
        searchResultsArea.style.display = 'block';
        searchList.innerHTML = '';

        let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
        let matches = allOrders.filter(o => (o.name || '').toLowerCase().includes(term) || String(o.phone).includes(term) || (o.orderid || '').toLowerCase().includes(term));

        if (matches.length === 0) searchList.innerHTML = '<div class="text-center text-muted">No results found.</div>';
        else matches.forEach(d => {
            let originalIndex = allOrders.findIndex(x => x.orderid === d.orderid);
            let localUpdate = pendingUpdates.find(item => item.oid === d.orderid);
            let status = localUpdate ? localUpdate.status : (d.Status || 'Pending');
            let type = 'pending';
            if (status === 'Paid') type = 'paid';
            if (status === 'Dispatched') type = 'dispatched';
            searchList.innerHTML += createCardHTML(d, originalIndex, type, status);
        });
    } else {
        tabsContainer.style.display = 'block';
        searchResultsArea.style.display = 'none';
    }
}

function updateOrder(oid, status) {
    if (!confirm(`Mark '${status}'?`)) return;
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates = updates.filter(item => item.oid !== oid);
    updates.push({ oid: oid, status: status, time: new Date().getTime() });
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    const orderIndex = allOrders.findIndex(o => o.orderid === oid);
    if (orderIndex !== -1) {
        allOrders[orderIndex].Status = status;
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
    }

    if (document.getElementById('searchInput').value.length > 0) filterOrders();
    else renderTabs(allOrders);
}

function syncWithServer() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    if (pendingUpdates.length === 0) return;

    if (!confirm(`${pendingUpdates.length} മാറ്റങ്ങൾ സെർവറിലേക്ക് സേവ് ചെയ്യട്ടെ?`)) return;

    // 🔴 CHANGE: Show Spinning Icon instead of Text
    // പഴയ കണ്ടന്റ് സേവ് ചെയ്യുന്നു (എറർ വന്നാൽ തിരിച്ചിടാൻ)
    const originalContent = $('#sync-btn').html();

    // സ്പിന്നർ കാണിക്കുന്നു
    $('#sync-btn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin" style="font-size:20px;"></i>');

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

                // Clean up local flags
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sent_') || key.startsWith('paid_')) {
                        localStorage.removeItem(key);
                    }
                });

                alert("Sync Complete! ✅");

                // റീസെറ്റ് ചെയ്യുന്നു (Success ആയതുകൊണ്ട് ബട്ടൺ ഹൈഡ് ആകും)
                $('#sync-btn').html(`<i class="fas fa-cloud-upload-alt"></i><span class="sync-badge" id="sync-badge-count">0</span>`);
                updateSyncButtonUI();
                $('#sync-btn').prop('disabled', false);
            }
        })
        .catch(err => {
            alert("Sync Failed! ഇന്റർനെറ്റ് പരിശോധിക്കുക.");
            // എറർ വന്നാൽ പഴയ ഐക്കണും നമ്പറും തിരികെ കൊണ്ടുവരുന്നു
            $('#sync-btn').prop('disabled', false).html(originalContent);
        });
}

function discardLocalChanges() {
    if (!confirm("Discard all local changes?")) return;
    localStorage.removeItem('pendingUpdates');
    renderTabs(allOrders);
    alert("Discarded.");
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

// 🔴 FIXED WHATSAPP (Immediate Open + Silent Update)
function sendWA(index) {
    const d = allOrders[index];
    const n = parseInt(d.quantity);
    const price = calculatePriceInfo(n, d.state);

    // 2. Price Calculation (Same logic as Custom.js)
    const base = n * 650;
    let courier = 0;
    const s = String(d.state || '').toLowerCase().trim();

    if (s === 'lakshadweep') {
        courier = (n * 100) + 20;
    } else if (s === 'kerala') {
        courier = courierRates.kerala[n] || 0;
    } else {
        courier = courierRates.outside[n] || 0;
    }

    const total = base + courier;
    const amountText = `Amount(₹): ${base} + ${courier}`;
    const totalText = `Total(₹): ${total}/-`;

    // 3. Message Construction
    const adminPhone = '7788990313';
    const editLink = `kafaklife.com/order.html?oid=${d.orderid}`;
    const time = d.timestamp ? d.timestamp : new Date().toLocaleString();

    const extra = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${d.orderid}\`\`\`\n⌚ _${time}_\n🔗 _${editLink}_`;
    const format = `\n____________________________________\n*${(d.name || '').trim().toUpperCase()}*\n*${(d.house || '').trim().toUpperCase()}*\n*${(d.place || '').trim().toUpperCase()}*\n*${(d.postoffice || '').trim().toUpperCase()}*\n*${(d.district || '').trim().toUpperCase()}*\n*${(d.state || '').trim().toUpperCase()}*\n*Pin: ${(d.pincode || '').trim()}*\n*Ph: ${(d.phone || '').trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${adminPhone} (KAFAK LLP)*`;

    let phoneNum = String(d.phone).replace(/[^0-9]/g, '');
    if (phoneNum.length === 10) phoneNum = '91' + phoneNum;

    // 1. OPEN WHATSAPP FIRST (To prevent block)
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(extra + format)}`, '_blank');

    // 2. UPDATE STATUS SILENTLY (No Confirm Box)
    if (d.Status === 'Pending') {
        let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
        updates = updates.filter(item => item.oid !== d.orderid);
        updates.push({ oid: d.orderid, status: 'Sent', time: new Date().getTime() });
        localStorage.setItem('pendingUpdates', JSON.stringify(updates));

        const orderIndex = allOrders.findIndex(o => o.orderid === d.orderid);
        if (orderIndex !== -1) {
            allOrders[orderIndex].Status = 'Sent';
            localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
        }

        // Slight delay to refresh UI
        setTimeout(() => renderTabs(allOrders), 500);
    }
}

function printSingle(index) { runPrintLogic([{ value: index }]); }
function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) { alert("Select orders!"); return; }
    runPrintLogic(selected);
}

function runPrintLogic(selectedItems) {
    const styles = document.getElementById('label-css').innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute'; tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    const promises = []; const labelsData = [];

    selectedItems.forEach((cb) => {
        const d = allOrders[cb.value];
        if (d) {
            const p = new Promise((resolve) => {
                const qrNode = document.createElement('div');
                tempDiv.appendChild(qrNode);
                new QRCode(qrNode, { text: d.orderid, width: 90, height: 90, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
                setTimeout(() => {
                    const canvas = qrNode.querySelector('canvas');
                    let qrImgSrc = canvas ? canvas.toDataURL("image/png") : '';
                    labelsData.push({ details: d, qrSrc: qrImgSrc });
                    resolve();
                }, 50);
            });
            promises.push(p);
        }
    });

    Promise.all(promises).then(() => {
        document.body.removeChild(tempDiv);
        const printWin = window.open('', '', 'width=600,height=800');
        let htmlContent = `<html><head><title>KAFAK Print</title><link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@100..800&display=swap" rel="stylesheet"><style>${styles}</style></head><body>`;
        labelsData.forEach(item => {
            const d = item.details;
            const safe = (val) => (val || '').toString().toUpperCase();
            let qtyHTML = (d.quantity == 1) ? '' : `<div class="qty-text">x${d.quantity}</div>`;
            const phoneIcon = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 15.5C18.75 15.5 17.55 15.3 16.43 14.93C16.08 14.82 15.69 14.9 15.43 15.16L13.23 17.36C10.42 15.92 8.08 13.58 6.64 10.77L8.84 8.57C9.1 8.31 9.18 7.92 9.07 7.57C8.7 6.45 8.5 5.25 8.5 4C8.5 3.45 8.05 3 7.5 3H4C3.45 3 3 3.45 3 4C3 13.39 10.61 21 20 21C20.55 21 21 20.55 21 20V16.5C21 15.95 20.55 15.5 20 15.5Z" fill="black"/><path d="M11.65 8.03C11.65 8.03 13.06 8.03 13.77 8.73C14.47 9.44 14.47 10.85 14.47 10.85M12 4.84C12 4.84 14.83 4.84 16.24 6.26C17.66 7.67 17.66 10.5 17.66 10.5M12.35 1.66C12.35 1.66 16.6 1.66 18.72 3.78C20.84 5.9 20.84 10.15 20.84 10.15" stroke="#008CFF" stroke-width="2" stroke-linecap="round"/></svg>`;
            htmlContent += `<div class="label-page"><div class="address-sec"><div class="to-label">To,</div><div class="cust-name">${safe(d.name)}</div><div class="cust-addr">${safe(d.house)}<br>${safe(d.place)}<br>${safe(d.postoffice)}<br>${safe(d.district)}, ${safe(d.state)}</div><div class="cust-pin">PIN: ${d.pincode}</div><div class="cust-ph">PH: ${d.phone}</div></div><div class="meta-sec"><div class="qr-box"><img src="${item.qrSrc}"></div><div class="qr-oid">${d.orderid}</div>${qtyHTML}</div><div class="contact-box"><div class="contact-icon">${phoneIcon}</div><div class="contact-text"><span>7788990313, 9895082689</span>If unreachable, call or WhatsApp us</div></div><div class="fragile-sec"><img src="fragile.png" class="fragile-img" alt="Fragile"></div><div class="from-sec"><span style="font-weight:bold; font-size:11px;">From,</span><br><b>KAFAK LLP,</b> 10/174, Kunnathery,<br>Thaikkattukara P.O, Aluva - 683106,<br>Ernakulam District, Kerala, India.<br>Phone: 778899 0 313</div></div>`;
        });
        htmlContent += `</body></html>`;
        printWin.document.write(htmlContent); printWin.document.close();
        setTimeout(() => { printWin.focus(); printWin.print(); }, 500);
    });
}

function startScanner(mode, specificOid) {
    scanMode = mode; tempOid = specificOid || null; scanStep = (mode === 'tracking') ? 1 : 0;

    document.getElementById('scanner-modal').style.display = 'flex';
    document.getElementById('scan-msg').innerText = (mode === 'dispatch') ? "Scan Order QR to Dispatch" : "STEP 1: Scan Order QR";

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess);
}

function stopScanner() {
    if (html5QrCode) html5QrCode.stop().then(() => document.getElementById('scanner-modal').style.display = 'none');
}

function onScanSuccess(decodedText) {
    if (scanMode === 'dispatch') {
        if (decodedText.startsWith("ORD-")) {
            if (confirm(`Dispatch ${decodedText}?`)) { updateOrder(decodedText, 'Dispatched'); stopScanner(); }
        }
    } else if (scanMode === 'tracking') {
        if (scanStep === 1) {
            if (decodedText.startsWith("ORD-")) {
                tempOid = decodedText;
                scanStep = 2;
                document.getElementById('scan-msg').innerText = `STEP 2: Scan Tracking for ${tempOid}`;
                alert("Order ID OK! Now scan Courier Barcode.");
                html5QrCode.pause();
                setTimeout(() => html5QrCode.resume(), 1000);
            }
        } else if (scanStep === 2) {
            if (!decodedText.startsWith("ORD-")) {
                if (confirm(`Link Tracking ${decodedText} to ${tempOid}?`)) {
                    stopScanner();
                    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'updateTracking', oid: tempOid, tracking: decodedText }) })
                        .then(res => res.json())
                        .then(d => {
                            if (d.result === 'success') { alert("Saved! ✅"); fetchOrders(true); }
                            else { alert("Failed to save!"); }
                        });
                }
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
    updateSelectAllButton();
}

function checkSelectAllStatus() { updateSelectAllButton(); }

function updateSelectAllButton() {
    const btn = document.getElementById('btn-select-all');
    const checkboxes = document.querySelectorAll('.order-cb');
    if (checkboxes.length === 0) return;
    const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);
    if (isAllChecked) {
        btn.classList.remove('btn-outline-light'); btn.classList.add('btn-light', 'text-success', 'fw-bold');
        btn.innerHTML = '<i class="fas fa-check-square"></i> All Selected';
    } else {
        btn.classList.add('btn-outline-light'); btn.classList.remove('btn-light', 'text-success', 'fw-bold');
        btn.innerHTML = '<i class="far fa-square"></i> Select All';
    }
}