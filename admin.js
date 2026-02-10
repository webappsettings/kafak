const scriptURL = "https://script.google.com/macros/s/AKfycbxwUZWfsRFGC537qvqh3vPYN2ME7PWLbQphp-bLtp82_Dd9IFo8tDNvj4S0h1Bt-RUBNw/exec";

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

    // --- 1. HELPER: Get Effective Status & Dates ---
    const getOrderInfo = (o) => {
        let local = pendingUpdates.find(u => u.oid === o.orderid);
        let status = local ? local.status : (o.Status || 'Pending');

        // Dates Resolution
        let tDate = new Date(o.timestamp); // Order Date
        // Paid Date: Local Action Date OR Sheet Paid Date OR Order Date
        let pDateStr = (status === 'Paid' && local?.actionDate) ? local.actionDate : (o.paidDate || o.timestamp);
        let pDate = new Date(pDateStr);

        // Dispatch Date: Local Action Date OR Sheet Dispatch Date OR Order Date
        let dDateStr = (status === 'Dispatched' && local?.actionDate) ? local.actionDate : (o['Dispatched Date'] || o.timestamp);
        let dDate = new Date(dDateStr);

        return { status, tDate, pDate, dDate, pDateStr, dDateStr };
    };

    // --- 2. ADVANCED SORTING ---
    // Pending -> Order Date | Paid -> Paid Date | Dispatched -> Dispatch Date
    orders.sort((a, b) => {
        let infoA = getOrderInfo(a);
        let infoB = getOrderInfo(b);

        const statusPriority = { 'Pending': 1, 'Sent': 1, 'Paid': 2, 'Dispatched': 3, 'Completed': 4, 'Archive': 5 };
        let statA = statusPriority[infoA.status] || 9;
        let statB = statusPriority[infoB.status] || 9;

        // Status Grouping
        if (statA !== statB) return statA - statB;

        // Specific Sorting
        if (statA === 1) return infoB.tDate - infoA.tDate; // Pending: Newest Order First
        if (statA === 2) return infoB.pDate - infoA.pDate; // Paid: Newest Payment First
        if (statA === 3) return infoB.dDate - infoA.dDate; // Dispatched: Newest Dispatch First

        return 0;
    });

    // --- 3. CALCULATE LATEST DISPATCH DATE (For Collapse Logic) ---
    // സോർട്ട് ചെയ്തതുകൊണ്ട് ലിസ്റ്റിലെ ആദ്യത്തെ Dispatched ഐറ്റത്തിന്റെ തീയതി തന്നെയായിരിക്കും ലേറ്റസ്റ്റ്
    let latestDispatchedDateLabel = "";
    let firstDisp = orders.find(o => getOrderInfo(o).status === 'Dispatched');
    if (firstDisp) {
        let info = getOrderInfo(firstDisp);
        latestDispatchedDateLabel = getTimelineLabel(info.dDateStr);
    }

    // --- 4. RENDER LOOP ---
    let lastDateMap = { pending: '', paid: '', dispatched: '' };

    orders.forEach((d, i) => {
        let { status, dDateStr, pDateStr } = getOrderInfo(d);
        let isCompact = false;

        if (status === 'Completed' || status === 'Archive') return;

        let targetList = null;
        let type = '';

        // Determine List Type
        if (status === 'Pending' || status === 'Sent') {
            targetList = pendingList; type = 'pending';
            counts.pending++;
        } else if (status === 'Paid') {
            targetList = paidList; type = 'paid';
            counts.paid++;
        } else if (status === 'Dispatched') {
            targetList = dispatchedList; type = 'dispatched';
            counts.dispatched++;

            // 🔥 COLLAPSE LOGIC: Dispatched Date വെച്ച് ചെക്ക് ചെയ്യുന്നു
            let thisDispLabel = getTimelineLabel(dDateStr);
            if (thisDispLabel !== latestDispatchedDateLabel) {
                isCompact = true; // ഇന്നത്തെ (അല്ലെങ്കിൽ ലേറ്റസ്റ്റ്) തീയതി അല്ലാത്തവ ചുരുക്കുന്നു
            }
        }

        if (targetList) {
            let qty = parseInt(d.quantity) || 0;
            btlCounts[type] += qty;

            // 🔥 STICKY DATE HEADER LOGIC
            // ഓരോ ടാബിലും അതിന്റേതായ തീയതി വെച്ച് ഹെഡർ കാണിക്കുന്നു
            let displayDateRaw = d.timestamp; // Default
            if (type === 'paid') displayDateRaw = pDateStr;
            if (type === 'dispatched') displayDateRaw = dDateStr;

            let dateLabel = getTimelineLabel(displayDateRaw);

            if (dateLabel !== lastDateMap[type]) {
                targetList.innerHTML += `<div class="col-12 sticky-date-wrapper"><div class="timeline-badge">${dateLabel}</div></div>`;
                lastDateMap[type] = dateLabel;
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
    // 1. Existing Logic & Calculations (No Change)
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => String(val || '').toUpperCase();
    let dateObj = new Date(d.timestamp);
    let formattedDate = dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

    let currentPhone = String(d.phone || '').replace(/[^0-9]/g, '');
    let custHistory = (typeof allOrders !== 'undefined') ? allOrders.filter(o => String(o.phone).replace(/[^0-9]/g, '') === currentPhone) : [];
    let totalOrders = custHistory.length;
    let totalBottles = custHistory.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);

    // 2. 🔥 NEW: Colorful Status Badges
    let statusColor = 'secondary';
    if (currentStatus === 'Pending') statusColor = 'warning text-dark';
    if (currentStatus === 'Sent') statusColor = 'primary';
    if (currentStatus === 'Paid') statusColor = 'success';
    if (currentStatus === 'Dispatched') statusColor = 'info text-dark';

    // 3. 🔥 NEW: Beautiful Language Badge
    let langBadge = d.language ? `<span class="badge rounded-pill border ms-1 text-secondary" style="font-size:9px; background:#f8f9fa; vertical-align:middle;">${d.language.toUpperCase()}</span>` : '';

    // 4. Header Section (Order ID + Status + Lang + Archive)
    let archiveBtn = (currentStatus === 'Sent' || currentStatus === 'Pending')
        ? `<button onclick="updateOrder('${d.orderid}', 'Archive')" class="btn-archive-mini ms-1" title="Archive"><i class="fas fa-archive"></i></button>`
        : '';

    let headerLeft = `
        <div class="d-flex align-items-center flex-wrap gap-1">
            <span class="badge rounded-pill bg-dark" style="font-size:11px;">${d.orderid}</span>
            <span class="badge rounded-pill bg-${statusColor}" style="font-size:10px;">${currentStatus}</span>
            ${langBadge}
            ${archiveBtn}
        </div>
    `;

    // 5. Top Actions (Edit / Print / Revert)
    let editLink = `<a href="order.html?oid=${d.orderid}" target="_blank" class="btn-top-action">✏️ EDIT</a>`;
    let printBtn = `<button onclick="printSingle(${index})" class="btn-top-action">🖨️</button>`;
    let topActions = editLink + printBtn;

    if (type === 'dispatched') {
        topActions = `<button onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')" class="btn-top-action">Revert</button>` + topActions;
    } else if (type === 'paid') {
        topActions = `<button onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Sent')" class="btn-top-action">Revert</button>` + topActions;
    }

    // 6. 🔥 NEW: Paid Date & Time Display
    let paidTimeHTML = '';
    if (type === 'paid' && d.paidDate) {
        // d.paidDate ഗൂഗിൾ ഷീറ്റിൽ നിന്നും വരുന്നത്
        let pDate = new Date(d.paidDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
        paidTimeHTML = `<div class="mb-2 px-2 py-1 bg-success bg-opacity-10 border border-success border-opacity-25 rounded small text-success fw-bold" style="font-size:11px; display:inline-block;"><i class="fas fa-check-circle me-1"></i> Paid: ${pDate}</div>`;
    }

    // 7. WhatsApp Selector (Existing Logic)
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

    // 8. Contact Icons Logic (Existing Logic)
    let contactMap = {};
    const addContact = (iconType, number) => {
        if (!number) return;
        let numStr = String(number).trim();
        if (!numStr) return;
        if (!contactMap[numStr]) contactMap[numStr] = [];
        let iconHTML = '';
        if (iconType === 'phone') iconHTML = '<i class="fas fa-phone-alt text-primary" title="Phone"></i>';
        if (iconType === 'wa') iconHTML = '<i class="fab fa-whatsapp text-success" style="font-weight:900; font-size:1.1em;" title="WhatsApp"></i>';
        if (iconType === 'alt') iconHTML = '<i class="fas fa-phone-square text-secondary" style="font-size:1.1em;" title="Land/Alt"></i>';
        if (!contactMap[numStr].includes(iconHTML)) contactMap[numStr].push(iconHTML);
    };
    addContact('phone', d.phone);
    addContact('wa', d.whatsapp);
    addContact('alt', d.altphone);

    let contactHTMLParts = [];
    for (let num in contactMap) {
        let iconsStr = contactMap[num].join('<span style="margin-left:4px;"></span>');
        contactHTMLParts.push(`<span style="white-space:nowrap;">${iconsStr} <span class="fw-bold text-dark ms-1" style="font-size:11px;">${num}</span></span>`);
    }
    let contactLine = contactHTMLParts.join('<span class="mx-2 text-muted" style="font-size:10px;">|</span>');

    // 9. 🔥 UPDATED: Buttons Logic (With Small Icon Button)
    let buttons = '';
    if (type === 'pending') {
        let waBtnLabel = (currentStatus === 'Sent') ? 'Resend' : 'Invoice';
        // Main Invoice Button
        let mainBtn = `<button class="btn-custom btn-wa flex-grow-1" onclick="event.stopPropagation(); sendWA(${index})"><i class="fab fa-whatsapp"></i> ${waBtnLabel}</button>`;

        // Secondary Paid Button (Small Icon or Big Button based on Status)
        if (currentStatus === 'Sent') {
            // Sent ആണെങ്കിൽ: Big Paid Button + Small WA Button
            buttons = `<div class="d-flex gap-2 w-100">
                <button class="btn-custom btn-paid flex-grow-1" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')">💰 MARK PAID</button>
                <button class="btn-custom btn-wa" style="width:50px;" onclick="event.stopPropagation(); sendWA(${index})" title="Resend Invoice"><i class="fab fa-whatsapp"></i></button>
             </div>`;
        } else {
            // Pending ആണെങ്കിൽ: Invoice Button + Small Paid Icon Button
            buttons = `<div class="d-flex gap-2 w-100">
                ${mainBtn}
                <button class="btn btn-warning shadow-sm border-warning d-flex align-items-center justify-content-center" style="width:50px; border-radius:10px;" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')" title="Mark Paid"><i class="fas fa-hand-holding-usd"></i></button>
             </div>`;
        }
    }
    else if (type === 'paid') {
        buttons = `<div class="d-flex gap-2 align-items-center w-100"><button class="btn-custom btn-dispatch flex-grow-1" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Dispatched')">📦 DISPATCH</button><div style="width: 40px; display: flex; justify-content: center;"><input type="checkbox" class="order-cb" style="width: 22px; height: 22px; cursor: pointer;" value="${index}" onclick="event.stopPropagation();"></div></div>`;
    }
    else if (type === 'dispatched') {
        // Dispatched Logic (Preserved)
        let trackNum = d.tracking || '';
        let trackLink = `https://www.google.com/search?q=${d.provider || 'DTDC'}+tracking+${trackNum}`;
        let dispDate = d['Dispatched Date'] || d.actionDate || d.timestamp;
        let formattedDispDate = new Date(dispDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        let dateHtml = `
            <div style="background:#f0fdf4; border:1px solid #dcfce7; padding:8px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:11px; color:#166534; font-weight:700;">
                    <i class="fas fa-shipping-fast me-1"></i> Dispatched: ${formattedDispDate}
                </div>
                <button onclick="event.stopPropagation(); editDispatchDate('${d.orderid}', '${dispDate}')" class="btn btn-sm btn-light border py-0 px-2" style="font-size:10px;">✏️</button>
            </div>
        `;

        buttons = `
            ${dateHtml} 
            <div class="d-flex gap-1 mb-2 w-100">
                <button class="btn-custom btn-track flex-grow-1" onclick="event.stopPropagation(); editTracking('${d.orderid}', '${trackNum}')">🚚 ${trackNum ? 'TRK: ' + trackNum : 'Add Trk'}</button>
                ${trackNum ? `<a href="${trackLink}" target="_blank" onclick="event.stopPropagation();" class="btn btn-custom btn-track d-flex align-items-center justify-content-center" style="width: 45px; flex:none;"><i class="fas fa-search"></i></a>` : ''}
            </div>
            <button class="btn-custom btn-complete w-100" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Completed')">✅ Complete</button>
        `;
    }

    // --- RENDER RETURN ---

    // 10. Compact View (Updated with new Badges)
    if (isCompact) {
        return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="order-card p-3 shadow-sm">
                <div class="d-flex justify-content-between align-items-center" style="cursor:pointer;" onclick="toggleCardUI(this.closest('.order-card'))">
                    <div style="font-size:12px; flex-grow:1;">
                        <div class="mb-1">${headerLeft}</div>
                        <div class="fw-bold text-dark" style="font-size:14px;">${safe(d.name)}</div>
                        <div class="text-muted small" style="font-size:10px;">${formattedDate}</div>
                    </div>
                    <button class="btn btn-sm btn-light border" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Completed')">✅</button>
                </div>
                <div class="full-card-content mt-3 pt-3 border-top" style="display:none;">${createCardHTML(d, index, type, currentStatus, false)}</div>
            </div>
        </div>`;
    }

    // 11. Full View (Updated with Paid Date & New Button Group)
    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>${headerLeft}</div>
                <div>${topActions}</div>
            </div>
            <div class="text-end text-muted small mb-2" style="font-size:10px;">${formattedDate}</div>
            
            ${paidTimeHTML}

            <div class="cust-name">${safe(d.name)}</div>
            <div class="mb-2">
                <span class="stats-badge-blue">📦 ${totalBottles} Btls</span> 
                <span class="stats-badge-purple">🛍️ ${totalOrders} Ords</span>
            </div>

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

// Updated updateOrder function (Preserves Scanner Logic + Adds Date Feature)
function updateOrder(oid, status, trackingNum = null, skipConfirm = false, customDate = null) {
    // 1. SAFETY CHECK: സ്കാനർ, ട്രാക്കിംഗ്, അല്ലെങ്കിൽ ഡേറ്റ് എഡിറ്റ് ആണെങ്കിൽ കൺഫർമേഷൻ വേണ്ട
    // (Old Logic Preserved here)
    if (!skipConfirm && !trackingNum && !customDate && !confirm(`Mark '${status}'?`)) return;

    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates = updates.filter(item => item.oid !== oid);

    let updateObj = {
        oid: oid,
        status: status,
        time: new Date().getTime()
    };

    if (trackingNum) updateObj.tracking = trackingNum;

    // 🔥 NEW: Date സേവ് ചെയ്യുന്ന ഭാഗം
    if (customDate) {
        updateObj.actionDate = customDate;
    } else if (status === 'Dispatched' && !trackingNum) {
        // Dispatched ആക്കുമ്പോൾ Default ആയി ഇന്നത്തെ ഡേറ്റ് എടുക്കുന്നു
        updateObj.actionDate = new Date().toISOString().split('T')[0];
    }

    updates.push(updateObj);
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    // 2. UI UPDATE (Cache)
    const orderIndex = allOrders.findIndex(o => o.orderid === oid);
    if (orderIndex !== -1) {
        allOrders[orderIndex].Status = status;
        if (trackingNum) allOrders[orderIndex].tracking = trackingNum;
        // പുതിയ ഡേറ്റ് ഉടനടി കാർഡിൽ കാണിക്കാൻ
        if (customDate) allOrders[orderIndex]['Dispatched Date'] = customDate;
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
    }

    // 3. REFRESH VIEW (Preserved)
    if (document.getElementById('searchInput').value.length > 0) filterOrders();
    else renderTabs(allOrders);

    updateSyncButtonUI();

    // 4. TOAST MESSAGES
    if (trackingNum) showToast('success', 'Tracking Saved Locally ✅');
    if (customDate) showToast('success', 'Date Updated! Sync to Save.');
}


window.editDispatchDate = async function (oid, currentDate) {
    const { value: newDate } = await Swal.fire({
        title: 'Change Dispatch Date',
        html: `<input type="date" id="edit-disp-date" class="swal2-input" value="${currentDate ? new Date(currentDate).toISOString().split('T')[0] : ''}">`,
        showCancelButton: true,
        confirmButtonText: 'Update',
        preConfirm: () => document.getElementById('edit-disp-date').value
    });

    if (newDate) {
        updateOrder(oid, 'Dispatched', null, true, newDate);
    }
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



// Ensure editTracking is available
function editTracking(oid, currentVal) {
    Swal.fire({
        title: 'TRACKING ID',
        input: 'text',
        inputValue: currentVal,
        showCancelButton: true,
        confirmButtonText: 'SAVE'
    }).then((result) => {
        if (result.isConfirmed) {
            updateOrder(oid, 'Dispatched', result.value.trim().toUpperCase());
        }
    });
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

    // --- ANIMATE NUMBERS ---
    $('#d-sales').text('₹' + d.sales.toLocaleString());
    $('#d-expense').text('₹' + d.expense.toLocaleString());
    $('#d-courier').text('₹' + d.courier.toLocaleString());
    $('#d-profit').text('₹' + d.profit.toLocaleString());
    $('#d-orders').text(d.count || 0); // 🔥 Shows Order Count
    $('#d-prod').text('₹' + (d.productCost || 0).toLocaleString());

    // Profit Color Logic
    if (d.profit >= 0) {
        $('#d-profit').addClass('text-success').removeClass('text-danger');
        $('#d-status-text').text("Running Profit 🚀").css('color', '#4caf50');
    } else {
        $('#d-profit').addClass('text-danger').removeClass('text-success');
        $('#d-status-text').text("Needs Attention 📉").css('color', '#ff5252');
    }

    // --- MONTHLY ---
    $('#m-sales').text('₹' + m.sales.toLocaleString());
    $('#m-expense').text('₹' + m.expense.toLocaleString());
    $('#m-profit').text('₹' + m.profit.toLocaleString());

    // --- TIMELINE LIST (With Icons) ---
    let html = '';

    // 1. EXPENSES LIST
    if (d.expenseList && d.expenseList.length > 0) {
        d.expenseList.forEach(item => {
            let icon = '📝'; // Default
            let cat = item.category.toLowerCase();
            if (cat.includes('salary')) icon = '👤';
            else if (cat.includes('materials')) icon = '📦';
            else if (cat.includes('food')) icon = '🍔';
            else if (cat.includes('travel')) icon = '⛽';
            else if (cat.includes('courier')) icon = '🚚';
            else if (cat.includes('ads')) icon = '📢';

            html += `
            <div class="d-flex align-items-center justify-content-between p-3 mb-2 bg-white border rounded-4 shadow-sm">
                <div class="d-flex align-items-center">
                    <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style="width:40px; height:40px; font-size:18px;">${icon}</div>
                    <div>
                        <div class="fw-bold text-dark small">${item.desc || item.category}</div>
                        <div class="text-muted" style="font-size:10px;">${item.category}</div>
                    </div>
                </div>
                <div class="fw-bold text-danger">-₹${item.amount}</div>
            </div>`;
        });
    }

    // 2. COURIER SUMMARY (If any)
    if (d.courier > 0) {
        html += `
        <div class="d-flex align-items-center justify-content-between p-3 mb-2 bg-white border rounded-4 shadow-sm">
            <div class="d-flex align-items-center">
                <div class="rounded-circle bg-warning bg-opacity-10 d-flex align-items-center justify-content-center me-3" style="width:40px; height:40px; font-size:18px;">🚚</div>
                <div>
                    <div class="fw-bold text-dark small">Courier Charges</div>
                    <div class="text-muted" style="font-size:10px;">Auto-calculated</div>
                </div>
            </div>
            <div class="fw-bold text-warning">-₹${d.courier}</div>
        </div>`;
    }

    if (html === '') {
        html = `
        <div class="text-center py-5">
            <div class="text-muted mb-2" style="font-size:30px; opacity:0.3;"><i class="fas fa-receipt"></i></div>
            <div class="small text-muted">No transactions recorded today.</div>
        </div>`;
    }

    $('#daily-timeline').html(html);
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
// 📷 SCANNER LOGIC (BIG UI & SMART FEEDBACK)
// ==========================================

function startScanner(mode) {
    scanMode = mode;
    scanStep = (mode === 'tracking') ? 1 : 0;
    tempOid = null;

    $('#scanner-modal').css('display', 'flex');
    $('#scan-mode-title').text(mode === 'dispatch' ? "SCAN QR (Dispatch)" : "SCAN BARCODE");
    $('#scan-result-box').hide();
    $('#scan-info-text').html('');
    $('#scan-status-text').text('');

    let boxConfig = (mode === 'tracking') ? { width: 300, height: 150 } : { width: 250, height: 250 };

    history.pushState(null, null, location.href);
    window.onpopstate = function () { stopScanner(); };

    if (html5QrCode) {
        try { html5QrCode.stop().then(() => initHtml5Scanner(boxConfig)); }
        catch (e) { initHtml5Scanner(boxConfig); }
    } else {
        initHtml5Scanner(boxConfig);
    }
}

function initHtml5Scanner(config) {
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: config }, onScanSuccess)
        .catch(err => { $('#scanner-modal').hide(); alert("Camera Error"); });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            $('#scanner-modal').hide();
        }).catch(err => { $('#scanner-modal').hide(); });
    } else {
        $('#scanner-modal').hide();
    }
    window.onpopstate = null;
}

function onScanSuccess(decodedText) {
    if (isScanProcessing) return;
    isScanProcessing = true;
    playBeep();

    // 📦 MODE 1: DISPATCH (QR Only)
    if (scanMode === 'dispatch') {
        if (decodedText.startsWith("ORD-")) {
            let order = allOrders.find(o => o.orderid === decodedText);

            if (!order) {
                showScanFeedback("ORDER NOT FOUND ❌", null, decodedText, true);
            }
            else if (order.Status === 'Dispatched') {
                showScanFeedback("ALREADY DISPATCHED ⚠️", order, decodedText, true, "Already moved to Dispatched Tab");
            }
            else {
                updateOrder(decodedText, 'Dispatched', null, true);
                showScanFeedback("MOVED TO DISPATCHED ✅", order, decodedText, false);
            }
        } else {
            showScanFeedback("INVALID QR CODE ❌", null, decodedText, true);
        }

        html5QrCode.pause();
        setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 2000);
    }

    // 🚚 MODE 2: TRACKING (Dual Scan)
    else if (scanMode === 'tracking') {

        // 👉 STEP 1: SCAN ORDER QR
        if (scanStep === 1) {
            if (decodedText.startsWith("ORD-")) {
                tempOid = decodedText;
                let order = allOrders.find(o => o.orderid === tempOid);

                if (!order) {
                    showScanFeedback("ORDER NOT FOUND ❌", null, decodedText, true);
                    setTimeout(() => { isScanProcessing = false; }, 1500);
                }
                // 🔥 LOGIC CHANGE HERE: If Dispatched, allow updating Tracking (Don't stop)
                else {
                    scanStep = 2;
                    let msg = (order.Status === 'Dispatched') ? "UPDATE TRACKING BARCODE" : "NOW SCAN COURIER BARCODE";
                    let subMsg = (order.Status === 'Dispatched') ? "Order is already dispatched. Scanning to update tracking." : "Ready to link Tracking ID";

                    $('#scan-mode-title').text(msg);
                    showScanFeedback("QR DETECTED ✅", order, decodedText, false, subMsg);

                    html5QrCode.pause();
                    setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 1500);
                }
            } else {
                setTimeout(() => { isScanProcessing = false; }, 500);
            }
        }

        // 👉 STEP 2: SCAN BARCODE
        else if (scanStep === 2) {
            if (!decodedText.startsWith("ORD-")) {

                // 🔥 CHECK: Is this barcode already used?
                let duplicateOrder = allOrders.find(o => o.tracking === decodedText && o.orderid !== tempOid);
                let currentOrder = allOrders.find(o => o.orderid === tempOid);

                if (duplicateOrder) {
                    let errorMsg = `Duplicate! Assigned to: <b>${duplicateOrder.name} (${duplicateOrder.phone})</b>`;
                    showScanFeedback("BARCODE ALREADY USED ⚠️", currentOrder, decodedText, true, errorMsg);
                    setTimeout(() => { isScanProcessing = false; }, 3000);
                }
                else {
                    updateOrder(tempOid, 'Dispatched', decodedText, true);

                    showScanFeedback("TRACKING SAVED ✅", currentOrder, decodedText, false, "Tracking ID Linked Successfully");

                    scanStep = 1;
                    setTimeout(() => { $('#scan-mode-title').text("SCAN NEXT ORDER QR"); }, 2000);

                    html5QrCode.pause();
                    setTimeout(() => { html5QrCode.resume(); isScanProcessing = false; }, 2000);
                }
            } else {
                showScanFeedback("SCAN BARCODE (NOT QR) ⚠️", null, decodedText, true);
                setTimeout(() => { isScanProcessing = false; }, 1500);
            }
        }
    }
}

// 🔥 UPDATED UI: Highlights Code & Correct Priority
function showScanFeedback(statusHtml, order, code = "", isError = false, extraMsg = "") {
    let color = isError ? "#dc3545" : "#2e7d32";
    let bg = isError ? "#fff5f5" : "#f0fdf4";

    $('#scan-status-text').css('color', color).html(statusHtml);
    $('#scan-result-box').css('background', bg);

    let htmlContent = "";

    // 1. SCANNED CODE (HIGHLIGHTED BIG)
    if (code) {
        let label = code.startsWith("ORD-") ? "QR CODE" : "BARCODE";
        htmlContent += `
        <div style="background:#fff; border:2px dashed ${color}; padding:8px; border-radius:8px; margin-bottom:10px; text-align:center;">
            <div style="font-size:10px; font-weight:700; color:#888; letter-spacing:1px;">SCANNED ${label}</div>
            <div style="font-size:18px; font-weight:800; color:#333; font-family:monospace; word-break:break-all;">${code}</div>
        </div>`;
    }

    // 2. EXTRA MESSAGE (Error Details or Instructions)
    if (extraMsg) {
        htmlContent += `<div style="text-align:center; font-size:13px; color:${isError ? '#dc3545' : '#555'}; font-weight:600; margin-bottom:10px; padding:5px; background:rgba(255,255,255,0.5); border-radius:5px;">${extraMsg}</div>`;
    }

    // 3. CURRENT ORDER DETAILS (Large)
    if (order) {
        let safe = (v) => String(v || '').toUpperCase();

        // Icons
        let contactIcons = [];
        if (order.phone) contactIcons.push('<i class="fas fa-phone-alt text-primary"></i> ' + order.phone);
        if (order.whatsapp && order.whatsapp !== order.phone) contactIcons.push('<i class="fab fa-whatsapp text-success"></i> ' + order.whatsapp);

        let contactLine = contactIcons.join(' <span class="mx-2 text-muted">|</span> ');

        htmlContent += `
        <div style="background:white; border-radius:12px; padding:15px; box-shadow:0 4px 15px rgba(0,0,0,0.08); text-align:left; border:1px solid #eee;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <span style="background:#333; color:white; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">
                    ${order.orderid.slice(-5)}
                </span>
                <span style="font-size:11px; color:#888; font-weight:700;">QTY: ${order.quantity}</span>
            </div>

            <div style="font-size:18px; font-weight:900; color:#000; margin-bottom:2px;">
                ${safe(order.name)}
            </div>
            
            <div style="font-size:13px; color:#555; line-height:1.4; margin-bottom:10px;">
                ${safe(order.place)}, ${safe(order.district)}
            </div>

            <div style="font-size:12px; background:#f8f9fa; padding:8px; border-radius:8px; border:1px solid #eee; font-weight:700; color:#444;">
                ${contactLine}
            </div>
        </div>`;
    }

    $('#scan-info-text').html(htmlContent);
    $('#scan-result-box').slideDown();
}

function cancelDispatchAction() {
    $('#scan-result-box').slideUp();
    setTimeout(() => { if (html5QrCode) html5QrCode.resume(); isScanProcessing = false; }, 500);
}