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
    confirmAction("Logout ചെയ്യാൻ ഉറപ്പാണോ?", () => {
        localStorage.removeItem('kafakAdminLoggedIn');
        localStorage.removeItem('kafakAdmin');
        window.location.href = "index.html";
    });
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

// --- HELPERS (SWEET ALERT) ---
function showToast(icon, title) {
    Swal.fire({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
        icon: icon, title: title,
        didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
    });
}

function confirmAction(text, callback) {
    Swal.fire({
        text: text, icon: 'question', showCancelButton: true, confirmButtonColor: '#000', cancelButtonColor: '#f2f2f2', confirmButtonText: 'Yes',
        customClass: { popup: 'ios-popup', title: 'ios-title', confirmButton: 'ios-btn', cancelButton: 'ios-btn-cancel' }
    }).then((result) => { if (result.isConfirmed) callback(); });
}

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
                showToast("warning", "Offline Mode Enabled");
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
        syncBtn.css('display', 'flex');
        logoPlaceholder.hide();
        badge.text(pendingUpdates.length);
    } else {
        syncBtn.hide();
        logoPlaceholder.show();
        headerLogo.show();
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

        // Tracking info from local or server
        let localUpdate = JSON.parse(localStorage.getItem('pendingUpdates') || "[]").find(u => u.oid === d.orderid);
        let trackNum = (localUpdate && localUpdate.tracking) ? localUpdate.tracking : (d.tracking || '');
        let trackLabel = trackNum ? `TRK: ${trackNum}` : 'Add Tracking';

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

// 🔴 OFFLINE TRACKING & STATUS UPDATE
function updateOrder(oid, status, trackingNum = null) {
    // Determine context for confirmation
    let confirmMsg = `Mark '${status}'?`;
    if (trackingNum) confirmMsg = `Save Tracking: ${trackingNum}?`;

    // Only confirm if it's a manual click, not automated
    if (!trackingNum && !confirm(confirmMsg)) return;

    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates = updates.filter(item => item.oid !== oid);

    let updateObj = { oid: oid, status: status, time: new Date().getTime() };
    if (trackingNum) updateObj.tracking = trackingNum;

    updates.push(updateObj);
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    const orderIndex = allOrders.findIndex(o => o.orderid === oid);
    if (orderIndex !== -1) {
        allOrders[orderIndex].Status = status;
        if (trackingNum) allOrders[orderIndex].tracking = trackingNum;
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
    }

    // Refresh UI
    if (document.getElementById('searchInput').value.length > 0) filterOrders();
    else renderTabs(allOrders);

    updateSyncButtonUI();
    if (trackingNum) showToast('success', 'Tracking Saved Locally ✅');
}

// 🔴 SYNC LOGIC (STATUS + TRACKING)
function syncWithServer() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    if (pendingUpdates.length === 0) return;

    confirmAction(`${pendingUpdates.length} മാറ്റങ്ങൾ അപ്‌ലോഡ് ചെയ്യട്ടെ?`, () => {
        $('#sync-btn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

        let trackingUpdates = pendingUpdates.filter(u => u.tracking);
        let statusUpdates = pendingUpdates.filter(u => !u.tracking);

        let promises = [];

        // 1. Bulk Status Update
        if (statusUpdates.length > 0) {
            promises.push(fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify({ action: 'bulkUpdateStatus', updates: statusUpdates })
            }));
        }

        // 2. Individual Tracking Updates
        trackingUpdates.forEach(u => {
            promises.push(fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify({ action: 'updateTracking', oid: u.oid, tracking: u.tracking })
            }));
        });

        Promise.all(promises).then(() => {
            localStorage.removeItem('pendingUpdates');
            showToast('success', 'Synced Successfully!');
            updateSyncButtonUI();
            $('#sync-btn').prop('disabled', false).html('<i class="fas fa-cloud-upload-alt"></i>');
        }).catch(() => {
            showToast('error', 'Sync Failed!');
            $('#sync-btn').prop('disabled', false).html('<i class="fas fa-cloud-upload-alt"></i>');
        });
    });
}

function discardLocalChanges() {
    confirmAction("ലോക്കൽ മാറ്റങ്ങൾ കളയണോ?", () => {
        localStorage.removeItem('pendingUpdates');
        renderTabs(allOrders);
        updateSyncButtonUI();
        showToast("info", "Discarded");
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

// 🔴 FULL SEND WA FUNCTION (FIXED)
function sendWA(index) {
    const d = allOrders[index];
    const n = parseInt(d.quantity);
    const price = calculatePriceInfo(n, d.state);

    const base = n * 650;
    let courier = 0;
    const s = String(d.state || '').toLowerCase().trim();
    if (s === 'lakshadweep') courier = (n * 100) + 20;
    else if (s === 'kerala') courier = courierRates.kerala[n] || 0;
    else courier = courierRates.outside[n] || 0;

    const total = base + courier;
    const amountText = `Amount(₹): ${base} + ${courier}`;
    const totalText = `Total(₹): ${total}/-`;

    const adminPhone = '7788990313';
    const editLink = `kafaklife.com/order.html?oid=${d.orderid}`;
    const time = d.timestamp ? d.timestamp : new Date().toLocaleString();

    const extra = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${d.orderid}\`\`\`\n⌚ _${time}_\n🔗 _${editLink}_`;

    // SAFE STRING CONVERSION
    const safe = (val) => String(val || '').trim().toUpperCase();

    const format = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${String(d.pincode || '').trim()}*\n*Ph: ${String(d.phone || '').trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${adminPhone} (KAFAK LLP)*`;

    let phoneNum = String(d.phone).replace(/[^0-9]/g, '');
    if (phoneNum.length === 10) phoneNum = '91' + phoneNum;

    // 1. OPEN WHATSAPP
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(extra + format)}`, '_blank');

    // 2. SILENT UPDATE
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

        setTimeout(() => { renderTabs(allOrders); updateSyncButtonUI(); }, 1000);
    }
}

function printSingle(index) { runPrintLogic([{ value: index }]); }
function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) { showToast("warning", "Select orders first!"); return; }
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
            const safe = (val) => String(val || '').toUpperCase();
            let qtyHTML = (d.quantity == 1) ? '' : `<div class="qty-text">x${d.quantity}</div>`;
            const phoneIcon = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 15.5C18.75 15.5 17.55 15.3 16.43 14.93C16.08 14.82 15.69 14.9 15.43 15.16L13.23 17.36C10.42 15.92 8.08 13.58 6.64 10.77L8.84 8.57C9.1 8.31 9.18 7.92 9.07 7.57C8.7 6.45 8.5 5.25 8.5 4C8.5 3.45 8.05 3 7.5 3H4C3.45 3 3 3.45 3 4C3 13.39 10.61 21 20 21C20.55 21 21 20.55 21 20V16.5C21 15.95 20.55 15.5 20 15.5Z" fill="black"/><path d="M11.65 8.03C11.65 8.03 13.06 8.03 13.77 8.73C14.47 9.44 14.47 10.85 14.47 10.85M12 4.84C12 4.84 14.83 4.84 16.24 6.26C17.66 7.67 17.66 10.5 17.66 10.5M12.35 1.66C12.35 1.66 16.6 1.66 18.72 3.78C20.84 5.9 20.84 10.15 20.84 10.15" stroke="#008CFF" stroke-width="2" stroke-linecap="round"/></svg>`;
            htmlContent += `<div class="label-page"><div class="address-sec"><div class="to-label">To,</div><div class="cust-name">${safe(d.name)}</div><div class="cust-addr">${safe(d.house)}<br>${safe(d.place)}<br>${safe(d.postoffice)}<br>${safe(d.district)}, ${safe(d.state)}</div><div class="cust-pin">PIN: ${d.pincode}</div><div class="cust-ph">PH: ${d.phone}</div></div><div class="meta-sec"><div class="qr-box"><img src="${item.qrSrc}"></div><div class="qr-oid">${d.orderid}</div>${qtyHTML}</div><div class="contact-box"><div class="contact-icon">${phoneIcon}</div><div class="contact-text"><span>7788990313, 9895082689</span>If unreachable, call or WhatsApp us</div></div><div class="fragile-sec"><img src="fragile.png" class="fragile-img" alt="Fragile"></div><div class="from-sec"><span style="font-weight:bold; font-size:11px;">From,</span><br><b>KAFAK LLP,</b> 10/174, Kunnathery,<br>Thaikkattukara P.O, Aluva - 683106,<br>Ernakulam District, Kerala, India.<br>Phone: 778899 0 313</div></div>`;
        });
        htmlContent += `</body></html>`;
        printWin.document.write(htmlContent); printWin.document.close();
        setTimeout(() => { printWin.focus(); printWin.print(); }, 500);
    });
}

// 🔴 UPDATED SCANNER LOGIC (CONTINUOUS + 2-STEP)
function startScanner(mode, specificOid) {
    scanMode = mode;
    tempOid = specificOid || null;
    scanStep = (mode === 'tracking') ? 1 : 0;

    $('#scanner-modal').css('display', 'flex');
    $('#scan-mode-title').text(mode === 'dispatch' ? "SCAN QR TO DISPATCH" : "SCAN ORDER QR");
    $('#scan-result-box').hide();

    // PREVENT BACK BUTTON CLOSING
    history.pushState(null, null, location.href);
    window.onpopstate = function () { stopScanner(); };

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess);
}

function stopScanner() {
    if (html5QrCode) html5QrCode.stop().then(() => {
        $('#scanner-modal').hide();
        window.onpopstate = null; // Reset back button behavior
    });
}

function onScanSuccess(decodedText) {
    // 1. DISPATCH SCAN
    if (scanMode === 'dispatch') {
        if (decodedText.startsWith("ORD-")) {
            let order = allOrders.find(o => o.orderid === decodedText);
            if (order) {
                // Update Local directly (no confirm box for continuous scan flow)
                updateOrder(decodedText, 'Dispatched');

                showScanFeedback("DISPATCHED ✅", order);
                html5QrCode.pause();
                setTimeout(() => html5QrCode.resume(), 1500);
            } else {
                showScanFeedback("ORDER NOT FOUND ❌", null);
            }
        }
    }
    // 2. TRACKING SCAN
    else if (scanMode === 'tracking') {
        // Step 1: Scan Order ID
        if (scanStep === 1) {
            if (decodedText.startsWith("ORD-")) {
                tempOid = decodedText;
                let order = allOrders.find(o => o.orderid === tempOid);
                scanStep = 2;
                $('#scan-mode-title').text("NOW SCAN COURIER BARCODE");
                showScanFeedback("ORDER OK! SCAN BARCODE 📦", order);

                html5QrCode.pause();
                setTimeout(() => html5QrCode.resume(), 1000);
            }
        }
        // Step 2: Scan Tracking ID
        else if (scanStep === 2) {
            if (!decodedText.startsWith("ORD-")) {
                // Save Tracking Locally
                updateOrder(tempOid, 'Dispatched', decodedText);

                let order = allOrders.find(o => o.orderid === tempOid);
                showScanFeedback("TRACKING SAVED ✅", order);

                // Reset for next order
                scanStep = 1;
                setTimeout(() => {
                    $('#scan-mode-title').text("SCAN NEXT ORDER QR");
                    html5QrCode.resume();
                }, 1500);
                html5QrCode.pause();
            }
        }
    }
}

function showScanFeedback(status, order) {
    $('#scan-status-text').text(status);
    if (order) {
        $('#scan-info-text').html(`
            <b>${order.name}</b> (${order.phone})<br>
            <span style="font-size:11px; opacity:0.8;">${order.house}, ${order.place}</span>
        `);
    } else {
        $('#scan-info-text').text("");
    }
    $('#scan-result-box').slideDown();
}

// Select All Toggle
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
        btn.classList.remove('btn-light', 'text-secondary'); btn.classList.add('btn-dark', 'text-white');
        btn.innerHTML = '<i class="fas fa-check-square"></i> All';
    } else {
        btn.classList.add('btn-light', 'text-secondary'); btn.classList.remove('btn-dark', 'text-white');
        btn.innerHTML = '<i class="far fa-square"></i> All';
    }
}