const scriptURL = "https://script.google.com/macros/s/AKfycbxSEehazTZrXsydIUPnTXhFJx8ZCkzsmaMZll0bH1LqQvTzoE0KnqCo7XEh0OdAxLlQpQ/exec";

// Beep Sound for Scanner
const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT1GAg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAgEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/");
function playBeep() {
    let ctx = new (window.AudioContext || window.webkitAudioContext)();
    let osc = ctx.createOscillator();
    osc.type = "sine"; osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination); osc.start();
    setTimeout(() => osc.stop(), 100);
}

// 🔴 1. SAFE STORAGE CHECK
function isStorageAvailable() {
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
    } catch (e) { return false; }
}

// 🔴 2. LOGIN FUNCTION
window.attemptLogin = function () {
    if (!isStorageAvailable()) {
        alert("Storage error. Please disable Private Mode.");
        return;
    }
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;

    if (user === "admin" && pass === "kafak123") {
        try {
            localStorage.setItem('kafakAdmin', 'true');
            localStorage.setItem('kafakAdminLoggedIn', 'true');
            showDashboard();
        } catch (e) { alert("Login Failed: Storage Error"); }
    } else {
        document.getElementById('loginMsg').innerText = "❌ തെറ്റായ വിവരങ്ങൾ!";
    }
};

// 🔴 3. LOGOUT FUNCTION
window.logoutAdmin = function () {
    confirmAction("Logout ചെയ്യണോ?", () => {
        try {
            localStorage.removeItem('kafakAdmin');
            localStorage.removeItem('kafakAdminLoggedIn');
            localStorage.removeItem('activeAdminTab');
            localStorage.removeItem('allOrdersCache');
            localStorage.removeItem('pendingUpdates');
        } catch (e) { console.error(e); }
        window.location.href = "index.html";
    });
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', function () {
    if (!isStorageAvailable()) return;

    try {
        if (localStorage.getItem('kafakAdmin') === 'true') {
            showDashboard();
            const savedTab = localStorage.getItem('activeAdminTab');
            if (savedTab) {
                const tabTrigger = document.querySelector(`button[data-bs-target="${savedTab}"]`);
                if (tabTrigger) { const tab = new bootstrap.Tab(tabTrigger); tab.show(); }
            }
        } else {
            document.getElementById('login-section').style.display = 'flex';
            document.getElementById('dashboard-section').style.display = 'none';
        }

        const tabEls = document.querySelectorAll('button[data-bs-toggle="pill"]');
        tabEls.forEach(tabEl => {
            tabEl.addEventListener('shown.bs.tab', function (event) {
                localStorage.setItem('activeAdminTab', event.target.getAttribute('data-bs-target'));
            });
        });
    } catch (e) { console.error("Init Error:", e); }
});

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    fetchOrders();
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

// --- HELPERS ---
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
    }
    if (hasData && !forceLoad) return;

    document.getElementById('loader').style.display = 'flex';
    fetch(`${scriptURL}?action=getAllOrders`)
        .then(res => res.json())
        .then(response => {
            document.getElementById('loader').style.display = 'none';
            if (response.result === 'success') {
                allOrders = response.data.filter(o => o.Status !== 'Completed');
                localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
                renderTabs(allOrders);
                updateSyncButtonUI();
            }
        })
        .catch(err => {
            document.getElementById('loader').style.display = 'none';
            if (!hasData) alert("Network Error!");
        });
}

function renderTabs(orders) {
    const pendingList = document.getElementById('list-pending');
    const paidList = document.getElementById('list-paid');
    const dispatchedList = document.getElementById('list-dispatched');

    pendingList.innerHTML = ''; paidList.innerHTML = ''; dispatchedList.innerHTML = '';

    let counts = { pending: 0, paid: 0, dispatched: 0 };
    let btlCounts = { pending: 0, paid: 0, dispatched: 0 };
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    // Sort: Latest First
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 🔥 ഏറ്റവും പുതിയ തീയതി (Latest Date) ഏതാണെന്ന് കണ്ടുപിടിക്കുന്നു
    let latestDateLabel = "";
    if (orders.length > 0) {
        latestDateLabel = getTimelineLabel(orders[0].timestamp);
    }

    let lastDateMap = { pending: '', paid: '', dispatched: '' };

    orders.forEach((d, i) => {
        let localUpdate = pendingUpdates.find(item => item.oid === d.orderid);
        let status = localUpdate ? localUpdate.status : (d.Status || 'Pending');
        let isCompact = false;

        if (status === 'Completed' || status === 'Archive') return;

        let targetList = null;
        let type = '';
        let listKey = '';

        if (status === 'Pending' || status === 'Sent') {
            targetList = pendingList; type = 'pending'; listKey = 'pending';
            counts.pending++;
        } else if (status === 'Paid') {
            targetList = paidList; type = 'paid'; listKey = 'paid';
            counts.paid++;
        } else if (status === 'Dispatched') {
            targetList = dispatchedList; type = 'dispatched'; listKey = 'dispatched';
            counts.dispatched++;

            // 🔥 Compact Logic: ഏറ്റവും പുതിയ തീയതിയല്ലെങ്കിൽ മാത്രം Compact ആക്കുക
            let orderDateLabel = getTimelineLabel(d.timestamp);
            if (orderDateLabel !== latestDateLabel) {
                isCompact = true;
            }
        }

        if (targetList) {
            let qty = parseInt(d.quantity) || 0;
            btlCounts[type] += qty;

            let orderDate = d.timestamp ? getTimelineLabel(d.timestamp) : "Unknown Date";
            if (orderDate !== lastDateMap[listKey]) {
                targetList.innerHTML += `<div class="col-12 sticky-date-wrapper"><div class="timeline-badge">${orderDate}</div></div>`;
                lastDateMap[listKey] = orderDate;
            }
            targetList.innerHTML += createCardHTML(d, i, type, status, isCompact);
        }
    });

    updateBadgeUI('count-pending', counts.pending, btlCounts.pending);
    updateBadgeUI('count-paid', counts.paid, btlCounts.paid);
    updateBadgeUI('count-dispatched', counts.dispatched, btlCounts.dispatched);
    updateSyncButtonUI();
}

function updateBadgeUI(elementId, orderCount, bottleCount) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = orderCount;
        let btlId = elementId + '-btl';
        let btlEl = document.getElementById(btlId);
        if (!btlEl) {
            btlEl = document.createElement('span');
            btlEl.id = btlId;
            btlEl.className = "badge rounded-pill bg-light text-dark border ms-2";
            btlEl.style.fontSize = "10px"; btlEl.style.fontWeight = "700";
            el.insertAdjacentElement('afterend', btlEl);
        }
        btlEl.innerHTML = `<i class="fas fa-wine-bottle" style="color:#888;"></i> ${bottleCount}`;
    }
}

// 🔥 CORRECTED FUNCTION (No Duplicate)
function createCardHTML(d, index, type, currentStatus, isCompact = false) {
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => String(val || '').toUpperCase();
    let statusBadge = '', buttons = '', topButtons = '';

    // Date & Time Formatting
    let dateObj = new Date(d.timestamp);
    let formattedDate = dateObj.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    // Customer History Stats
    let currentPhone = String(d.phone || '').replace(/[^0-9]/g, '');
    let custHistory = (typeof allOrders !== 'undefined') ? allOrders.filter(o => String(o.phone).replace(/[^0-9]/g, '') === currentPhone) : [];
    let totalOrders = custHistory.length;
    let totalBottles = custHistory.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);

    // Common Buttons
    let archiveBtn = (currentStatus === 'Sent' || currentStatus === 'Pending') ? `<button onclick="updateOrder('${d.orderid}', 'Archive')" class="btn-archive-mini"><i class="fas fa-archive"></i></button>` : '';
    let editLink = `<a href="order.html?oid=${d.orderid}" target="_blank" class="btn-top-action">✏️ EDIT</a>`;
    let printBtn = `<button onclick="printSingle(${index})" class="btn-top-action">🖨️</button>`;

    if (type === 'pending') {
        buttons = (currentStatus === 'Sent')
            ? `<button class="btn-custom btn-paid" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')">💰 Mark Paid</button><button class="btn-custom btn-wa" onclick="event.stopPropagation(); sendWA(${index})"><i class="fab fa-whatsapp"></i> Resend</button>`
            : `<button class="btn-custom btn-wa" onclick="event.stopPropagation(); sendWA(${index})"><i class="fab fa-whatsapp"></i> Send Invoice</button>`;
    } else if (type === 'paid') {
        buttons = `<button class="btn-custom btn-dispatch" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Dispatched')">📦 Dispatch</button><input type="checkbox" class="order-cb ms-2" value="${index}" onclick="event.stopPropagation();">`;
        topButtons = `<button onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Sent')" class="btn-top-action">Revert</button>` + printBtn;
    } else if (type === 'dispatched') {
        let trackNum = d.tracking || '';
        let courierName = d.provider || "DTDC";

        // 🔥 Admin Tracking Button Logic
        let trackCheckBtn = trackNum ? `<a href="https://www.google.com/search?q=${courierName}+tracking+${trackNum}" target="_blank" class="ms-1 text-primary" style="font-size:10px;" onclick="event.stopPropagation();"><i class="fas fa-external-link-alt"></i></a>` : '';

        buttons = `<button class="btn-custom btn-track" onclick="event.stopPropagation(); editTracking('${d.orderid}', '${trackNum}')">🚚 ${trackNum ? 'TRK: ' + trackNum : 'Add Trk'}</button>
                   <button class="btn-custom btn-complete" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Completed')">✅ Complete</button>`;
        topButtons = trackCheckBtn + `<button onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')" class="btn-top-action">Revert</button>` + printBtn;
    }

    // 📦 COMPACT VIEW RENDER
    if (isCompact) {
        let trackNum = d.tracking || '';
        let courierName = d.provider || "DTDC";
        let trackCheckBtn = trackNum ? `<a href="https://www.google.com/search?q=${courierName}+tracking+${trackNum}" target="_blank" class="badge bg-info text-dark ms-1" style="text-decoration:none;" onclick="event.stopPropagation();"><i class="fas fa-search"></i></a>` : '';

        return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="order-card p-2 shadow-sm" style="border-left: 4px solid #2196f3; cursor:pointer;">
                <div class="d-flex justify-content-between align-items-center">
                    <div style="font-size:12px; flex-grow:1;">
                        <span class="fw-bold">${safe(d.name)}</span> <span class="text-muted small">(${d.phone})</span><br>
                        <span class="badge bg-light text-dark border" style="font-size:9px;">#${d.orderid.split('-')[1]}</span>
                        ${trackNum ? `<span class="badge bg-light text-dark border ms-1" style="font-size:9px;">TRK: ${trackNum}</span>` : ''}
                        ${trackCheckBtn}
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <button class="btn btn-sm btn-success" style="padding: 2px 8px; font-size:10px;" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Completed')">✔ Done</button>
                        <i class="fas fa-chevron-down text-muted small ms-1"></i>
                    </div>
                </div>
                <div class="full-card-content mt-3 pt-3 border-top" style="display:none;">
                    ${createCardHTML(d, index, type, currentStatus, false)}
                </div>
            </div>
        </div>`;
    }

    // 📱 FULL VIEW RENDER
    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card status-${currentStatus} p-3">
            <div class="d-flex justify-content-between mb-2">
                <span class="text-muted small" style="font-size:9px;">${formattedDate}</span>
                <div>${archiveBtn} ${editLink} ${topButtons}</div>
            </div>
            <div class="cust-name">${safe(d.name)}</div>
            <div class="mb-2"><span class="stats-badge-blue">📦 ${totalBottles} Btls</span> <span class="stats-badge-purple">🛍️ ${totalOrders} Ords</span></div>
            <div class="cust-details">
                <b>${safe(d.house)}</b>, ${safe(d.place)}, ${safe(d.postoffice)}<br>
                ${safe(d.district)}, ${safe(d.state)} - <b>${d.pincode}</b><br>
                <span class="text-primary"><i class="fas fa-phone-alt"></i> ${d.phone}</span>
            </div>
            <div class="info-box mt-2"><span>${d.quantity} Bottles</span><span class="fw-bold text-success">${priceInfo.total}</span></div>
            <div class="action-area mt-3">${buttons}</div>
        </div>
    </div>`;
}

function updateSyncButtonUI() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    const syncBtn = $('#sync-btn');
    const logoPlaceholder = $('#logo-placeholder');
    const headerLogo = $('#header-logo');
    const badge = $('#sync-badge-count');

    if (pendingUpdates.length > 0) {
        syncBtn.css('display', 'flex'); logoPlaceholder.hide(); badge.text(pendingUpdates.length);
    } else {
        syncBtn.hide(); logoPlaceholder.show(); headerLogo.show();
    }
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
            if (status !== 'Completed') searchList.innerHTML += createCardHTML(d, originalIndex, type, status);
        });
    } else {
        tabsContainer.style.display = 'block';
        searchResultsArea.style.display = 'none';
    }
}

function updateOrder(oid, status, trackingNum = null) {
    if (!trackingNum && !confirm(`Mark '${status}'?`)) return;

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

    if (document.getElementById('searchInput').value.length > 0) filterOrders();
    else renderTabs(allOrders);

    updateSyncButtonUI();
    if (trackingNum) showToast('success', 'Tracking Saved Locally ✅');
}

function syncWithServer() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    if (pendingUpdates.length === 0) return;

    confirmAction(`${pendingUpdates.length} മാറ്റങ്ങൾ അപ്‌ലോഡ് ചെയ്യട്ടെ?`, () => {
        $('#sync-btn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
        let trackingUpdates = pendingUpdates.filter(u => u.tracking);
        let statusUpdates = pendingUpdates.filter(u => !u.tracking);
        let promises = [];

        if (statusUpdates.length > 0) promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'bulkUpdateStatus', updates: statusUpdates }) }));
        trackingUpdates.forEach(u => promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'updateTracking', oid: u.oid, tracking: u.tracking }) })));

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

function sendWA(index) {
    const d = allOrders[index];
    const n = parseInt(d.quantity);

    let priceInfo = calculatePriceInfo(n, d.state);
    let total = d.grandTotal ? parseInt(d.grandTotal) : parseInt(priceInfo.total.replace(/[^0-9]/g, ''));

    const editLink = `https://kafaklife.com/order.html?oid=${d.orderid}`;
    const time = d.timestamp ? new Date(d.timestamp).toLocaleString() : new Date().toLocaleString();
    const safe = (val) => String(val || '').trim().toUpperCase();

    const extra = `*✅ Honey order confirmed!* 🍯\n⌚ _${time}_\n`;
    const linkSection = `🔍 *Check Status / Edit Address:* 👇\n(ഓർഡർ സ്റ്റാറ്റസ് അറിയാൻ താഴെ ക്ലിക്ക് ചെയ്യുക)\n🔗 _${editLink}_\n`;

    const base = n * 650;
    const courier = total - base;
    const amountText = `Amount(₹): ${base} + ${courier}`;
    const totalText = `Total(₹): ${total}/-`;
    const adminPhone = '7788990313';

    const format = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${String(d.pincode || '').trim()}*\n*Ph: ${String(d.phone || '').trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${adminPhone} (KAFAK LLP)*`;

    let phoneNum = String(d.phone).replace(/[^0-9]/g, '');
    if (phoneNum.length === 10) phoneNum = '91' + phoneNum;

    const finalMsg = extra + "\n" + linkSection + format;
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(finalMsg)}`, '_blank');

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
            let printPhone = d.phone;
            if (d.altphone && String(d.altphone).trim() !== String(d.phone).trim()) {
                printPhone += `, ${d.altphone}`;
            }
            htmlContent += `<div class="label-page"><div class="address-sec"><div class="to-label">To,</div><div class="cust-name">${safe(d.name)}</div><div class="cust-addr">${safe(d.house)}<br>${safe(d.place)}<br>${safe(d.postoffice)}<br>${safe(d.district)}, ${safe(d.state)}</div><div class="cust-pin">PIN: ${d.pincode}</div><div class="cust-ph">PH: ${printPhone}</div></div><div class="meta-sec"><div class="qr-box"><img src="${item.qrSrc}"></div><div class="qr-oid">${d.orderid}</div>${qtyHTML}</div><div class="contact-box"><div class="contact-icon">${phoneIcon}</div><div class="contact-text"><span>7788990313, 9895082689</span>If unreachable, call or WhatsApp us</div></div><div class="fragile-sec"><img src="fragile.png" class="fragile-img" alt="Fragile"></div><div class="from-sec"><span style="font-weight:bold; font-size:11px;">From,</span><br><b>KAFAK LLP,</b> 10/174, Kunnathery,<br>Thaikkattukara P.O, Aluva - 683106,<br>Ernakulam District, Kerala, India.<br>Phone: 778899 0 313</div></div>`;
        });
        htmlContent += `</body></html>`;
        printWin.document.write(htmlContent); printWin.document.close();
        setTimeout(() => { printWin.focus(); printWin.print(); }, 500);
    });
}

function startScanner(mode, specificOid) {
    scanMode = mode; tempOid = specificOid || null; scanStep = (mode === 'tracking') ? 1 : 0;
    $('#scanner-modal').css('display', 'flex');
    $('#scan-mode-title').text(mode === 'dispatch' ? "SCAN QR (Dispatch)" : "SCAN BARCODE");
    $('#scan-result-box').hide();

    let boxConfig = { width: 250, height: 250 };
    if (mode === 'tracking' || mode === 'barcode') {
        boxConfig = { width: 300, height: 150 };
    }

    history.pushState(null, null, location.href);
    window.onpopstate = function () { stopScanner(); };

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: boxConfig }, onScanSuccess);
}

function stopScanner() {
    if (html5QrCode) html5QrCode.stop().then(() => {
        $('#scanner-modal').hide();
        window.onpopstate = null;
    });
}

function isAlreadyScanned(val, mode) {
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    if (mode === 'dispatch') {
        let local = updates.find(u => u.oid === val && u.status === 'Dispatched');
        let server = allOrders.find(o => o.orderid === val && o.Status === 'Dispatched');
        return local || server;
    }
    if (mode === 'tracking') {
        let local = updates.find(u => u.tracking === val);
        let server = allOrders.find(o => o.tracking === val);
        return local || server;
    }
    return false;
}

function editTracking(oid, currentVal) {
    Swal.fire({
        title: 'ENTER TRACKING ID',
        input: 'text',
        inputValue: currentVal,
        inputAttributes: { autocapitalize: 'characters' },
        showCancelButton: true,
        confirmButtonText: 'SAVE',
        confirmButtonColor: '#000'
    }).then((result) => {
        if (result.isConfirmed) {
            let trackId = result.value.trim().toUpperCase();
            if (trackId) {
                updateOrder(oid, 'Dispatched', trackId);
            }
        }
    });
}

function onScanSuccess(decodedText) {
    playBeep();

    if (scanMode === 'dispatch') {
        if (decodedText.startsWith("ORD-")) {
            if (isAlreadyScanned(decodedText, 'dispatch')) {
                showScanFeedback("ALREADY SCANNED ⚠️", allOrders.find(o => o.orderid === decodedText));
                html5QrCode.pause(); setTimeout(() => html5QrCode.resume(), 2000);
                return;
            }
            let order = allOrders.find(o => o.orderid === decodedText);
            if (order) {
                updateOrder(decodedText, 'Dispatched');
                showScanFeedback("DISPATCHED ✅", order);
                html5QrCode.pause(); setTimeout(() => html5QrCode.resume(), 1500);
            } else {
                showScanFeedback("ORDER NOT FOUND ❌", null);
            }
        } else {
            let order = allOrders.find(o => o.tracking === decodedText);
            if (order) {
                if (order.Status === 'Dispatched') {
                    showScanFeedback("ALREADY DISPATCHED ⚠️", order);
                } else {
                    updateOrder(order.orderid, 'Dispatched');
                    showScanFeedback("DISPATCHED (Via TrackID) ✅", order);
                }
                html5QrCode.pause(); setTimeout(() => html5QrCode.resume(), 1500);
            } else {
                showScanFeedback("UNKNOWN BARCODE ❌", null);
            }
        }
    } else if (scanMode === 'tracking') {
        if (scanStep === 1) {
            if (decodedText.startsWith("ORD-")) {
                tempOid = decodedText;
                let order = allOrders.find(o => o.orderid === tempOid);
                scanStep = 2;
                $('#scan-mode-title').text("NOW SCAN COURIER BARCODE");
                showScanFeedback("ORDER OK! SCAN BARCODE 📦", order);
                html5QrCode.pause(); setTimeout(() => html5QrCode.resume(), 1000);
            }
        } else if (scanStep === 2) {
            if (!decodedText.startsWith("ORD-")) {
                updateOrder(tempOid, 'Dispatched', decodedText);
                let order = allOrders.find(o => o.orderid === tempOid);
                showScanFeedback("TRACKING SAVED ✅", order);
                scanStep = 1;
                setTimeout(() => { $('#scan-mode-title').text("SCAN NEXT ORDER QR"); html5QrCode.resume(); }, 1500);
                html5QrCode.pause();
            }
        }
    }
}

function showScanFeedback(status, order) {
    $('#scan-status-text').text(status);
    if (order) {
        $('#scan-info-text').html(`<b>${order.name}</b> (${order.phone})<br><span style="font-size:16px;">${order.house}, ${order.place}</span>`);
    } else {
        $('#scan-info-text').text("");
    }
    $('#scan-result-box').slideDown();
}

function toggleSelectAll() {
    const btn = document.getElementById('btn-select-all');
    const checkboxes = document.querySelectorAll('.order-cb');
    const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !isAllChecked);
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

function formatFullDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
}

function getTimelineLabel(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString('en-GB');
}

document.addEventListener('click', function (e) {
    if (e.target.closest('button') || e.target.closest('a')) {
        const card = e.target.closest('.order-card');
        if (card) {
            document.querySelectorAll('.order-card').forEach(c => c.classList.remove('active-highlight'));
            card.classList.add('active-highlight');
        }
    }
});

document.addEventListener('click', function (e) {
    const card = e.target.closest('.order-card');
    if (card) {
        document.querySelectorAll('.order-card').forEach(c => c.classList.remove('active-highlight'));
        card.classList.add('active-highlight');
    }
});


function toggleCardUI(cardElement) {
    let fullContent = cardElement.querySelector('.full-card-content');
    let icon = cardElement.querySelector('.fa-chevron-down, .fa-chevron-up');

    if (fullContent.style.display === 'none') {
        fullContent.style.display = 'block';
        if (icon) { icon.classList.replace('fa-chevron-down', 'fa-chevron-up'); }
    } else {
        fullContent.style.display = 'none';
        if (icon) { icon.classList.replace('fa-chevron-up', 'fa-chevron-down'); }
    }
}