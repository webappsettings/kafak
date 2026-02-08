const scriptURL = "https://script.google.com/macros/s/AKfycbytgNLFAEPHg1ia6cflgUMA4LVd2fOyV19bI9KKIq0ywKQQpTKNIzhzblIC-sfm_9-reQ/exec";

// Beep Sound for Scanner
const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT1GAg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAgEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/");
let isScanProcessing = false;

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
            fetchRatesBackground();
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
let courierRates = JSON.parse(localStorage.getItem('adminRatesCache')) || {};

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

// Background Rate Fetcher
function fetchRatesBackground() {
    console.log("🔄 Fetching latest rates...");
    fetch(`${scriptURL}?action=getRates`)
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success' && data.rates) {
                courierRates = data.rates; // ഗ്ലോബൽ വേരിയബിൾ അപ്‌ഡേറ്റ് ചെയ്യുന്നു

                // 🔥 പുതിയ റേറ്റ് ലോക്കൽ സ്റ്റോറേജിൽ സേവ് ചെയ്യുന്നു
                localStorage.setItem('adminRatesCache', JSON.stringify(courierRates));
                console.log("✅ Rates Updated & Saved to LocalStorage");
            }
        })
        .catch(err => console.log("⚠️ Rate fetch failed, using cached data."));
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

    // 🔥 NEW LOGIC: Find the Latest Date available in Dispatched List
    let dispatchedOrders = orders.filter(o => {
        let local = pendingUpdates.find(u => u.oid === o.orderid);
        let s = local ? local.status : (o.Status || 'Pending');
        return s === 'Dispatched';
    });

    // ഡിസ്പാച്ച് ലിസ്റ്റിലെ ഏറ്റവും പുതിയ തീയതി (ഉദാ: ഇന്ന് ഇല്ലെങ്കിൽ ഇന്നലെ, അതില്ലെങ്കിൽ 5-ാം തീയതി)
    let latestDispatchedDateLabel = "";
    if (dispatchedOrders.length > 0) {
        latestDispatchedDateLabel = getTimelineLabel(dispatchedOrders[0].timestamp);
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

            // 🔥 EXPAND/COLLAPSE LOGIC:
            // ഈ ഓർഡറിന്റെ തീയതിയും, ലിസ്റ്റിലെ ഏറ്റവും പുതിയ തീയതിയും ഒന്നാണെങ്കിൽ Expand ചെയ്യും.
            // പഴയ തീയതി ആണെങ്കിൽ Compact (Collapse) ആകും.
            let thisOrderDate = getTimelineLabel(d.timestamp);
            if (thisOrderDate !== latestDispatchedDateLabel) {
                isCompact = true; // Collapse old dates
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
            btlEl.className = "badge bg-primary ms-1 rounded-pill text-white";
            btlEl.style.fontSize = "10px"; btlEl.style.fontWeight = "700";
            el.insertAdjacentElement('afterend', btlEl);
        }
        btlEl.innerHTML = `<i class="fas fa-wine-bottle" style="color:#98b9ff;"></i> ${bottleCount}`;
    }
}

function createCardHTML(d, index, type, currentStatus, isCompact = false) {
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => String(val || '').toUpperCase();

    // Date Formatting
    let dateObj = new Date(d.timestamp);
    let formattedDate = dateObj.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    // Customer Stats
    let currentPhone = String(d.phone || '').replace(/[^0-9]/g, '');
    let custHistory = (typeof allOrders !== 'undefined') ? allOrders.filter(o => String(o.phone).replace(/[^0-9]/g, '') === currentPhone) : [];
    let totalOrders = custHistory.length;
    let totalBottles = custHistory.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);

    // --- BUTTONS & HEADER ---
    let archiveBtn = (currentStatus === 'Sent' || currentStatus === 'Pending')
        ? `<button onclick="updateOrder('${d.orderid}', 'Archive')" class="btn-archive-mini" title="Archive"><i class="fas fa-archive"></i></button>`
        : '';

    let editLink = `<a href="order.html?oid=${d.orderid}" target="_blank" class="btn-top-action">✏️ EDIT</a>`;
    let printBtn = `<button onclick="printSingle(${index})" class="btn-top-action">🖨️</button>`;

    let topActions = editLink + printBtn;
    if (type === 'paid' || type === 'dispatched') {
        topActions = `<button onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Sent')" class="btn-top-action">Revert</button>` + topActions;
    }

    // --- WHATSAPP SELECTOR (Pending Tab Only) ---
    let waSelectorHTML = '';
    if (type === 'pending') {
        let opts = '';
        if (d.whatsapp) opts += `<option value="${d.whatsapp}">📲 WA: ${d.whatsapp}</option>`;
        opts += `<option value="${d.phone}" ${!d.whatsapp ? 'selected' : ''}>📞 PH: ${d.phone}</option>`;
        if (d.altphone) opts += `<option value="${d.altphone}">☎️ ALT: ${d.altphone}</option>`;

        waSelectorHTML = `
        <div class="mt-2 mb-2" onclick="event.stopPropagation();">
            <select id="wa-select-${index}" class="form-select form-select-sm shadow-none border-secondary text-secondary" style="font-size:11px; font-weight:700; padding:4px 25px 4px 8px;">${opts}</select>
        </div>`;
    }

    // --- 🔥 SMART CONTACT GROUPING LOGIC ---
    let contactMap = {};

    const addContact = (iconType, number) => {
        if (!number) return;
        let numStr = String(number).trim();
        if (!numStr) return;

        if (!contactMap[numStr]) contactMap[numStr] = [];

        let iconHTML = '';
        // Icons Definition
        if (iconType === 'phone') iconHTML = '<i class="fas fa-phone-alt text-primary" title="Phone"></i>';
        if (iconType === 'wa') iconHTML = '<i class="fab fa-whatsapp text-success" style="font-weight:900; font-size:1.1em;" title="WhatsApp"></i>';
        if (iconType === 'alt') iconHTML = '<i class="fas fa-phone-square text-secondary" style="font-size:1.1em;" title="Land/Alt"></i>';

        // Avoid duplicate icons for same number group
        if (!contactMap[numStr].includes(iconHTML)) {
            contactMap[numStr].push(iconHTML);
        }
    };

    addContact('phone', d.phone);
    addContact('wa', d.whatsapp);
    addContact('alt', d.altphone);

    let contactHTMLParts = [];
    for (let num in contactMap) {
        // Join icons with a small space
        let iconsStr = contactMap[num].join('<span style="margin-left:4px;"></span>');
        // Format: [Icons] [Number]
        contactHTMLParts.push(`<span style="white-space:nowrap;">${iconsStr} <span class="fw-bold text-dark ms-1" style="font-size:11px;">${num}</span></span>`);
    }

    // Join different number groups with a separator
    let contactLine = contactHTMLParts.join('<span class="mx-2 text-muted" style="font-size:10px;">|</span>');

    // --- ACTION BUTTONS ---
    let buttons = '';

    if (type === 'pending') {
        buttons = (currentStatus === 'Sent')
            ? `<div class="d-flex gap-2 w-100">
                 <button class="btn-custom btn-paid flex-grow-1" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')">💰 Mark Paid</button>
                 <button class="btn-custom btn-wa flex-grow-1" onclick="event.stopPropagation(); sendWA(${index})"><i class="fab fa-whatsapp"></i> Resend</button>
               </div>`
            : `<button class="btn-custom btn-wa w-100" onclick="event.stopPropagation(); sendWA(${index})"><i class="fab fa-whatsapp"></i> Send Invoice</button>`;

    } else if (type === 'paid') {
        buttons = `
        <div class="d-flex gap-2 align-items-center w-100">
            <button class="btn-custom btn-dispatch flex-grow-1" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Dispatched')">📦 Dispatch</button>
            <div style="width: 40px; display: flex; justify-content: center;">
                <input type="checkbox" class="order-cb" style="width: 22px; height: 22px; cursor: pointer;" value="${index}" onclick="event.stopPropagation();">
            </div>
        </div>`;

    } else if (type === 'dispatched') {
        let trackNum = d.tracking || '';
        let courierName = d.provider || "DTDC";
        let trackLink = `https://www.google.com/search?q=${courierName}+tracking+${trackNum}`;
        let trackBtnGroup = `
        <div class="d-flex gap-1 mb-2 w-100">
            <button class="btn-custom btn-track flex-grow-1" onclick="event.stopPropagation(); editTracking('${d.orderid}', '${trackNum}')">
                🚚 ${trackNum ? 'TRK: ' + trackNum : 'Add Trk'}
            </button>
            ${trackNum ? `<a href="${trackLink}" target="_blank" onclick="event.stopPropagation();" class="btn btn-custom btn-track d-flex align-items-center justify-content-center" style="width: 45px; flex:none;"><i class="fas fa-search"></i></a>` : ''}
        </div>`;

        buttons = trackBtnGroup + `<button class="btn-custom btn-complete w-100" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Completed')">✅ Complete</button>`;
    }

    // COMPACT VIEW
    if (isCompact) {
        let trackNum = d.tracking || '';
        let courierName = d.provider || "DTDC";
        let trackCheckBtn = trackNum ? `<a href="https://www.google.com/search?q=${courierName}+tracking+${trackNum}" target="_blank" class="badge bg-info text-dark ms-1" style="text-decoration:none;" onclick="event.stopPropagation();"><i class="fas fa-search"></i></a>` : '';

        return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="order-card p-2 shadow-sm" style="border-left: 4px solid #2196f3;">
                <div class="d-flex justify-content-between align-items-center" style="cursor:pointer;" onclick="toggleCardUI(this.closest('.order-card'))">
                    <div style="font-size:12px; flex-grow:1;">
                        <span class="fw-bold">${safe(d.name)}</span> <span class="text-muted small">(${d.phone})</span><br>
                        <span class="badge bg-light text-dark border" style="font-size:9px;">#${d.orderid.split('-')[1]}</span>
                        ${trackNum ? `<span class="badge bg-light text-dark border ms-1" style="font-size:9px;">TRK: ${trackNum}</span>` : ''}
                        ${trackCheckBtn}
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <button class="btn btn-sm btn-success" style="padding: 2px 8px; font-size:10px;" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Completed')">Done?</button>
                    </div>
                </div>
                <div class="full-card-content mt-3 pt-3 border-top" style="display:none;">
                    ${createCardHTML(d, index, type, currentStatus, false)}
                </div>
            </div>
        </div>`;
    }

    // FULL VIEW
    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card status-${currentStatus} p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div class="d-flex align-items-center">${archiveBtn} <span class="text-muted small ms-1" style="font-size:9px;">${formattedDate}</span></div>
                <div>${topActions}</div>
            </div>
            <div class="cust-name">${safe(d.name)}</div>
            <div class="mb-2"><span class="stats-badge-blue">📦 ${totalBottles} Btls</span> <span class="stats-badge-purple">🛍️ ${totalOrders} Ords</span></div>
            <div class="cust-details">
                <b>${safe(d.house)}</b>, ${safe(d.place)}, ${safe(d.postoffice)}<br>
                ${safe(d.district)}, ${safe(d.state)} - <b>${d.pincode}</b><br>
                
                <div class="mt-2" style="font-size:11px;">${contactLine}</div>
            </div>
            <div class="info-box mt-2"><span>${d.quantity} Bottles</span><span class="fw-bold text-success">${priceInfo.total}</span></div>
            ${waSelectorHTML}
            <div class="action-area mt-2" style="display:block;">${buttons}</div>
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



function sendWA(index) {
    const d = allOrders[index];
    const n = parseInt(d.quantity);
    const adminPhone = '7788990313';
    const safe = (val) => String(val || '').trim().toUpperCase();

    // 1. DATE FORMATTING
    const dateObj = d.timestamp ? new Date(d.timestamp) : new Date();
    const formattedTime = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}, ${dateObj.toLocaleTimeString('en-US', { hour12: true })}`;

    // 2. CALCULATE PRICE
    const base = n * 650;
    const zone = getZoneKey(d.state);
    const courier = (courierRates[zone] && courierRates[zone][n]) ? courierRates[zone][n] : 0;
    const total = base + courier;

    // 3. GENERATE MESSAGE
    const editLink = `https://kafaklife.com/order.html?oid=${d.orderid}`;

    // 🔥 ഇവിടെയും പുതിയ ടെക്സ്റ്റ് നൽകി:
    const editText = "നിങ്ങളുടെ ഓർഡറിന്റെ സ്റ്റാറ്റസ് അറിയാനും മാറ്റങ്ങൾ വരുത്തുവാനും: 👇";

    const header = `*✅ Honey order confirmed!* 🍯\n⌚ _${formattedTime}_\n\n${editText}\n🔗 _${editLink}_\n`;
    const details = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${d.pincode}*\n*Ph: ${d.phone}*\n\n*Qty: ${d.quantity}*\n*Amount: ₹${base} + ${courier}*\n*Total: ₹${total}/-*\n____________________________________`;
    const footer = `\n\n*GPay to: ${adminPhone} (KAFAK LLP)*`;

    // 4. DETERMINE TARGET PHONE
    let phoneNum = "";
    const dropdown = document.getElementById(`wa-select-${index}`);
    if (dropdown && dropdown.value) phoneNum = dropdown.value;
    else phoneNum = d.whatsapp || d.phone;

    phoneNum = String(phoneNum).replace(/[^0-9]/g, '');
    if (phoneNum.length === 10) phoneNum = '91' + phoneNum;

    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(header + details + footer)}`, '_blank');

    // 5. UPDATE STATUS
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

    // 🔥 CAMERA SHAPE LOGIC (Fixed)
    let boxConfig;

    if (mode === 'tracking' || mode === 'barcode') {
        // Barcode: Wide Box (320x150)
        boxConfig = { width: 320, height: 150 };
    } else {
        // Dispatch / QR: Square Box (250x250)
        boxConfig = { width: 250, height: 250 };
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
        confirmButtonColor: '#000',
        position: 'top', // 🔥 ഇത് ചേർത്താൽ കീബോർഡ് പ്രശ്നം മാറിക്കോളും (മുകളിൽ കാണിക്കും)
        customClass: {
            popup: 'mt-5' // കുറച്ചുകൂടി താഴേക്ക് ഇറക്കി ഭംഗിയാക്കാൻ
        }
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
    // 🔥 1. Ignore if already processing (Single Beep Logic)
    if (isScanProcessing) return;
    isScanProcessing = true;

    playBeep();

    // 📦 MODE 1: DISPATCH
    if (scanMode === 'dispatch') {
        if (decodedText.startsWith("ORD-")) {
            if (isAlreadyScanned(decodedText, 'dispatch')) {
                let order = allOrders.find(o => o.orderid === decodedText);
                showScanFeedback("ALREADY SCANNED ⚠️", order, decodedText, order ? (order.tracking || "No Tracking") : "");

                html5QrCode.pause();
                setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 2000); // 🔥 Reset Flag
                return;
            }
            let order = allOrders.find(o => o.orderid === decodedText);
            if (order) {
                updateOrder(decodedText, 'Dispatched');
                showScanFeedback("DISPATCHED ✅", order, decodedText);

                html5QrCode.pause();
                setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 1500); // 🔥 Reset Flag
            } else {
                showScanFeedback("ORDER NOT FOUND ❌", null, decodedText);
                // Error case-ilum reset venam
                setTimeout(() => { isScanProcessing = false; }, 1500);
            }
        } else {
            let order = allOrders.find(o => o.tracking === decodedText);
            if (order) {
                if (order.Status === 'Dispatched') {
                    showScanFeedback("ALREADY DISPATCHED ⚠️", order, decodedText, order.orderid);
                } else {
                    updateOrder(order.orderid, 'Dispatched');
                    showScanFeedback("DISPATCHED (Via TrackID) ✅", order, decodedText, order.orderid);
                }
                html5QrCode.pause();
                setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 1500); // 🔥 Reset Flag
            } else {
                showScanFeedback("UNKNOWN BARCODE ❌", null, decodedText);
                setTimeout(() => { isScanProcessing = false; }, 1500);
            }
        }
    }

    // 🚚 MODE 2: TRACKING
    else if (scanMode === 'tracking') {

        // STEP 1: Scan Order QR
        if (scanStep === 1) {
            if (decodedText.startsWith("ORD-")) {
                tempOid = decodedText;
                let order = allOrders.find(o => o.orderid === tempOid);

                if (order) {
                    // 👉 CONDITION 1: Paid Order -> ASK CONFIRMATION
                    if (order.Status === 'Paid' || order.Status === 'Sent') {
                        html5QrCode.pause();

                        // Confirmation UI
                        let confirmHTML = `
                            <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:10px; margin-bottom:10px; border:1px solid #ffeeba; font-weight:bold;">
                                ❓ MARK AS DISPATCHED?
                            </div>
                            <div style="text-align:left; background:#fff; border:1px solid #e9ecef; padding:15px; border-radius:12px; margin-bottom:15px;">
                                <div style="font-size:16px; font-weight:800; color:#000;">${order.name}</div>
                                <div style="font-size:13px; color:#555;">${order.house}, ${order.place}</div>
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button onclick="confirmDispatchAction('${tempOid}', '${decodedText}')" style="flex:1; background:#000; color:white; border:none; padding:12px; border-radius:10px; font-weight:bold; font-size:13px;">YES, SCAN BARCODE</button>
                                <button onclick="cancelDispatchAction()" style="flex:1; background:#f1f3f5; color:#333; border:1px solid #ddd; padding:12px; border-radius:10px; font-weight:bold; font-size:13px;">NO, CANCEL</button>
                            </div>`;

                        $('#scan-status-text').html("");
                        $('#scan-info-text').html(confirmHTML);
                        $('#scan-result-box').slideDown();
                        return; // Note: Flag is NOT reset here, it waits for Yes/No click
                    }

                    // 👉 CONDITION 2: Already Dispatched -> Show Warning & Barcode
                    if (order.Status === 'Dispatched') {
                        let existingTrack = order.tracking || "No Tracking";
                        showScanFeedback("ALREADY DISPATCHED ⚠️", order, decodedText, existingTrack);

                        scanStep = 2;
                        $('#scan-mode-title').text("UPDATE TRACKING BARCODE");

                        html5QrCode.pause();
                        setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 2500); // 🔥 Reset Flag
                        return;
                    }

                    // Normal Flow
                    scanStep = 2;
                    $('#scan-mode-title').text("NOW SCAN TRACKING BARCODE");
                    showScanFeedback("QR OK! SCAN BARCODE NOW 📦", order, decodedText);
                    html5QrCode.pause();
                    setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 1500); // 🔥 Reset Flag

                } else {
                    showScanFeedback("ORDER NOT FOUND ❌", null, decodedText);
                    setTimeout(() => { isScanProcessing = false; }, 1500);
                }
            } else {
                setTimeout(() => { isScanProcessing = false; }, 500); // Not a valid QR
            }
        }

        // STEP 2: Scan Courier Barcode
        else if (scanStep === 2) {
            if (!decodedText.startsWith("ORD-")) {
                let existing = isAlreadyScanned(decodedText, 'tracking');
                if (existing && existing.orderid !== tempOid) {
                    showScanFeedback("BARCODE ALREADY USED ⚠️", existing, decodedText, existing.orderid);
                    html5QrCode.pause();
                    setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 2000); // 🔥 Reset Flag
                    return;
                }
                updateOrder(tempOid, 'Dispatched', decodedText);
                let order = allOrders.find(o => o.orderid === tempOid);
                showScanFeedback("TRACKING SAVED ✅", order, decodedText, tempOid);
                scanStep = 1;
                setTimeout(() => {
                    $('#scan-mode-title').text("SCAN NEXT ORDER QR");
                    html5QrCode.resume();
                    isScanProcessing = false; // 🔥 Reset Flag
                }, 2000);
                html5QrCode.pause();
            } else {
                showScanFeedback("SCAN BARCODE, NOT QR ⚠️", null, decodedText);
                setTimeout(() => { isScanProcessing = false; }, 1500);
            }
        }
    }
}

// 🔥 Updated Function with Secondary Code & Red Header Support
function showScanFeedback(status, order, code = "", secondaryCode = "") {

    // 1. Color Logic: "ALREADY" അല്ലെങ്കിൽ "⚠️" ഉണ്ടെങ്കിൽ ചുവപ്പ്, അല്ലെങ്കിൽ പച്ച
    let color = "#2e7d32"; // Green (Default)
    if (status.includes("ALREADY") || status.includes("NOT") || status.includes("⚠️") || status.includes("USED")) {
        color = "#dc3545"; // Red
    }

    // Apply Color & Text
    $('#scan-status-text').css('color', color).html(status);

    let htmlContent = "";

    // 2. 🔥 Primary Scanned Code
    if (code) {
        htmlContent += `
            <div style="background:#f8f9fa; padding:10px; border-radius:10px; margin-bottom:8px; border:1px dashed #ced4da;">
                <div style="font-size:10px; color:#6c757d; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">SCANNED CODE</div>
                <div style="font-size:18px; font-weight:800; color:#212529; font-family:monospace; letter-spacing:0.5px;">${code}</div>
            </div>`;
    }

    // 3. 🔥 Secondary Linked Code (New Feature)
    if (secondaryCode) {
        htmlContent += `
            <div style="background:#eef2ff; padding:8px; border-radius:8px; margin-bottom:15px; border:1px solid #c7d2fe; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:10px; color:#4338ca; font-weight:700; text-transform:uppercase;">LINKED ID:</span>
                <span style="font-size:14px; font-weight:800; color:#312e81; font-family:monospace;">${secondaryCode}</span>
            </div>`;
    }

    // 4. 👤 Customer Details Section
    if (order) {
        htmlContent += `
            <div style="text-align:left; background:#fff; border:1px solid #e9ecef; padding:15px; border-radius:12px; box-shadow:0 2px 5px rgba(0,0,0,0.03);">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                    <div>
                        <div style="font-size:11px; color:#adb5bd; font-weight:700; text-transform:uppercase;">CUSTOMER</div>
                        <div style="font-size:16px; font-weight:800; color:#000; line-height:1.2;">${order.name}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:700; display:inline-block;">
                            <i class="fas fa-phone-alt" style="font-size:10px;"></i> ${order.phone}
                        </span>
                    </div>
                </div>
                <div style="font-size:13px; color:#495057; line-height:1.5; border-top:1px dashed #e9ecef; padding-top:10px; margin-top:5px;">
                    <span style="font-weight:700;">${order.house}</span>, ${order.place}<br>
                    ${order.postoffice} <span style="color:#adb5bd;">|</span> <span style="font-weight:700;">${order.pincode}</span>
                </div>
            </div>`;
    } else {
        htmlContent += `<div style="color:#dc3545; font-weight:700; font-size:13px; margin-top:10px;">⛔ Order Details Not Found</div>`;
    }

    // Render
    $('#scan-info-text').html(htmlContent);
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

function toggleCard(btn) {
    let card = btn.closest('.order-card');
    let fullView = card.querySelector('.full-card-view');
    if (fullView.style.display === 'none') {
        fullView.style.display = 'block';
        btn.innerHTML = '▲';
    } else {
        fullView.style.display = 'none';
        btn.innerHTML = '▼';
    }
}

// 🔥 Toggle Card Expand/Collapse
function toggleCardUI(cardElement) {
    let fullContent = cardElement.querySelector('.full-card-content');

    if (fullContent.style.display === 'none') {
        fullContent.style.display = 'block';
    } else {
        fullContent.style.display = 'none';
    }
}

// ✅ Helper: Confirm Dispatch Click
function confirmDispatchAction(oid, code) {
    updateOrder(oid, 'Dispatched');
    scanStep = 2;
    $('#scan-mode-title').text("NOW SCAN TRACKING BARCODE");

    let order = allOrders.find(o => o.orderid === oid);
    showScanFeedback("MARKED DISPATCHED ✅ SCAN BARCODE", order, code);

    html5QrCode.resume();
    isScanProcessing = false; // 🔥 Unlock Scanner for next scan
}

function cancelDispatchAction() {
    $('#scan-result-box').slideUp();
    setTimeout(() => {
        html5QrCode.resume();
        isScanProcessing = false; // 🔥 Unlock Scanner (Important)
    }, 1000);
}

function getZoneKey(stateName) {
    if (!stateName) return 'north';
    let s = stateName.toUpperCase().trim();

    if (s === 'KERALA') return 'kerala';
    if (s === 'TAMIL NADU') return 'tn';
    if (s === 'KARNATAKA') return 'ka';
    if (s === 'ANDHRA PRADESH') return 'ap';
    if (s === 'TELANGANA') return 'ts';
    if (s === 'LAKSHADWEEP') return 'lakshadweep';

    return 'north'; // Default
}

function calculatePriceInfo(qty, state) {
    const n = parseInt(qty) || 0;
    const basePrice = n * 650;

    // Zone കണ്ടുപിടിക്കുന്നു
    const zone = getZoneKey(state);

    let courierCharge = 0;

    // 🔥 SAFETY CHECK: റേറ്റ് ഉണ്ടെങ്കിൽ മാത്രം എടുക്കുക, ഇല്ലെങ്കിൽ 0
    if (courierRates[zone] && courierRates[zone][n]) {
        courierCharge = courierRates[zone][n];
    }

    return { total: `₹${basePrice + courierCharge}/-` };
}



// ==========================================
// 🔥 DASHBOARD & EXPENSE LOGIC (NEW)
// ==========================================

// 1. DRAWER OPEN/CLOSE
function openDashboard() {
    $('#drawer-overlay').fadeIn(200);
    $('#dashboard-drawer').addClass('open');

    // Default to Today & Fetch
    selectedDate = new Date();
    updateDateDisplay();
    fetchDashboardData();
}

function closeDashboard() {
    $('#drawer-overlay').fadeOut(200);
    $('#dashboard-drawer').removeClass('open');
}

// 2. DATE NAVIGATION
function updateDateDisplay() {
    let today = new Date();
    // Reset time for comparison
    let d1 = new Date(selectedDate.toDateString());
    let d2 = new Date(today.toDateString());
    let isToday = d1.getTime() === d2.getTime();

    let options = { weekday: 'short', day: 'numeric', month: 'short' };
    $('#current-date-display').text(isToday ? "Today" : selectedDate.toLocaleDateString('en-IN', options));

    $('#btn-next-date').prop('disabled', isToday);

    // Sync Date Input in Form
    document.getElementById('exp-date').valueAsDate = selectedDate;
}

function changeDate(days) {
    selectedDate.setDate(selectedDate.getDate() + days);
    updateDateDisplay();
    fetchDashboardData();
}

// 3. FETCH UNIFIED DATA
function fetchDashboardData() {
    // Show Loading State
    $('#d-sales, #d-expense, #d-profit, #d-courier, #m-sales, #m-profit').text('...');
    $('#daily-timeline').html('<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-muted"></i></div>');

    // Format YYYY-MM-DD
    // Note: Using local time handling to avoid timezone issues
    let y = selectedDate.getFullYear();
    let m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    let d = String(selectedDate.getDate()).padStart(2, '0');
    let dateStr = `${y}-${m}-${d}`;

    fetch(`${scriptURL}?action=getDashboardData&date=${dateStr}`)
        .then(res => res.json())
        .then(res => {
            if (res.result === 'success') {
                dashboardData = res.data;
                renderDashboard();
            }
        })
        .catch(err => console.error("Dash Error:", err));
}

function renderDashboard() {
    if (!dashboardData) return;

    let d = dashboardData.daily;
    let m = dashboardData.monthly;

    // --- Daily Stats ---
    $('#d-sales').text('₹' + d.sales);
    $('#d-expense').text('₹' + d.expense);
    $('#d-courier').text('₹' + d.courier);
    $('#d-profit').text('₹' + d.profit).css('color', d.profit >= 0 ? 'green' : 'red');

    // --- Monthly Stats ---
    $('#m-sales').text('₹' + m.sales);
    $('#m-expense').text('₹' + m.expense);
    $('#m-courier').text('₹' + m.courier);
    $('#m-profit').text('₹' + m.profit).css('color', m.profit >= 0 ? 'green' : 'red');

    // --- Timeline List ---
    let listHtml = '';

    // 1. Custom Expenses
    if (d.list && d.list.length > 0) {
        d.list.forEach(item => {
            let icon = item.proof ? `<a href="${item.proof}" target="_blank" class="ms-2 text-primary small"><i class="fas fa-image"></i></a>` : '';
            listHtml += `
            <div class="timeline-item expense">
                <div style="width:70%">
                    <div class="fw-bold small text-truncate">${item.desc}</div>
                    <div class="text-muted" style="font-size:10px;">${item.category}</div>
                </div>
                <div class="d-flex align-items-center">
                    <span class="fw-bold text-danger small">-₹${item.amount}</span>
                    ${icon}
                </div>
            </div>`;
        });
    }

    // 2. Add Courier Summary Row if exists
    if (d.courier > 0) {
        listHtml += `
        <div class="timeline-item courier">
            <div>
                <div class="fw-bold small">Courier Charges</div>
                <div class="text-muted" style="font-size:10px;">Auto-calc</div>
            </div>
            <div class="fw-bold text-warning small">-₹${d.courier}</div>
        </div>`;
    }

    if (listHtml === '') listHtml = '<div class="text-center text-muted small py-4 bg-light rounded">No transactions yet.</div>';
    $('#daily-timeline').html(listHtml);

    // Update Partner List in Form
    renderPartnerList();
}

// 4. PARTNER SALARY LOGIC
function togglePartnerSelect() {
    let cat = $('#exp-category').val();
    if (cat === 'Salary') {
        $('#partner-section').slideDown();
        $('#exp-vendor').prop('readonly', true).attr('placeholder', 'Select Partner above');
    } else {
        $('#partner-section').slideUp();
        $('#exp-vendor').prop('readonly', false).val('').attr('placeholder', 'Vendor Name / Person');
    }
}

function renderPartnerList() {
    if (!dashboardData || !dashboardData.partners) return;

    let partners = dashboardData.partners;
    let html = '';

    for (let [name, balance] of Object.entries(partners)) {
        html += `
        <div class="partner-card" onclick="selectPartner('${name}')">
            <div class="d-flex align-items-center gap-2">
                <i class="fas fa-user-circle text-muted fs-4"></i>
                <div>
                    <div class="fw-bold small">${name}</div>
                    <div class="text-muted" style="font-size:10px;">Bal: ₹${balance}</div>
                </div>
            </div>
            <i class="far fa-circle text-muted check-icon"></i>
        </div>`;
    }
    $('#partner-list').html(html);
}

function selectPartner(name) {
    // UI Update
    $('.partner-card').removeClass('selected');
    $('.partner-card .check-icon').attr('class', 'far fa-circle text-muted check-icon');

    $(event.currentTarget).addClass('selected');
    $(event.currentTarget).find('.check-icon').attr('class', 'fas fa-check-circle text-success check-icon');

    // Fill Data
    $('#exp-vendor').val(name);
}

// 5. SUBMIT EXPENSE (With Image Compression)
async function submitExpense(e) {
    e.preventDefault();

    let btn = $('#btn-save-exp');
    let originalText = btn.text();
    btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> SAVING...');

    let fileInput = document.getElementById('exp-proof');
    let fileData = null;
    let fileName = null;

    if (fileInput.files.length > 0) {
        try {
            btn.html('<i class="fas fa-compress"></i> COMPRESSING...');
            let compressed = await compressImage(fileInput.files[0]);
            fileData = compressed.data;
            fileName = compressed.name;
        } catch (err) {
            alert("Image processing failed");
            btn.prop('disabled', false).text(originalText);
            return;
        }
    }

    let formData = {
        date: $('#exp-date').val(),
        category: $('#exp-category').val(),
        vendor: $('#exp-vendor').val(),
        description: $('#exp-desc').val(),
        amount: $('#exp-amount').val(),
        fileData: fileData,
        fileName: fileName
    };

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addExpense', data: formData })
    })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                Swal.fire({ icon: 'success', title: 'Saved!', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });

                // Reset Form
                $('#expense-form')[0].reset();
                document.getElementById('exp-date').valueAsDate = selectedDate;
                $('.partner-card').removeClass('selected'); // Reset partner selection

                // Refresh Dashboard Data
                fetchDashboardData();

                // Switch back to overview tab
                $('#tab-overview').click();
            } else {
                alert('Failed: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(err => alert('Network Error'))
        .finally(() => {
            btn.prop('disabled', false).text(originalText);
        });
}

// 📸 IMAGE COMPRESSION
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Resize to 800px
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% Quality
                resolve({ data: dataUrl, name: "Proof_" + Date.now() + ".jpg" });
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// ==========================================
// 📷 SCANNER LOGIC (Existing)
// ==========================================

function initScanner() {
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
}

function onScanSuccess(decodedText, decodedResult) {
    if (isScanProcessing) return;

    let parts = decodedText.split('|');
    if (parts.length < 2) return;

    isScanProcessing = true;
    beepSound.play();
    html5QrCode.pause();

    let orderId = parts[0];
    let trackingId = parts[1];

    $('#scan-oid').text(orderId);
    $('#scan-code').text(trackingId);
    $('#scan-result-box').slideDown();

    $('#btn-confirm-dispatch').off('click').on('click', function () {
        processDispatch(orderId, trackingId);
    });
}

function processDispatch(oid, trk) {
    const btn = $('#btn-confirm-dispatch');
    btn.prop('disabled', true).text('SAVING...');

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: "updateTracking", oid: oid, tracking: trk })
    })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 2000 })
                    .fire({ icon: 'success', title: 'Dispatched!' });

                $('#scan-result-box').slideUp();
                setTimeout(() => {
                    fetchAllOrders();
                    btn.prop('disabled', false).text('CONFIRM DISPATCH ✅');
                    html5QrCode.resume();
                    isScanProcessing = false;
                }, 1000);
            } else {
                alert('Error updating order');
                isScanProcessing = false;
                html5QrCode.resume();
            }
        });
}

function cancelDispatchAction() {
    $('#scan-result-box').slideUp();
    setTimeout(() => {
        html5QrCode.resume();
        isScanProcessing = false;
    }, 1000);
}