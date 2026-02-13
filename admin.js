const scriptURL = "https://script.google.com/macros/s/AKfycbxSjcy51q_zXmc7mh_PalUUvUPvJKuPLDitu0oOlCykR2s3h30PJOAdkxVtMfsqqM73uw/exec";

// Beep Sound for Scanner
const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT1GAg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAgEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/");
let isScanProcessing = false;
let currentSortDir = 'desc';

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
            localStorage.removeItem('adminRatesCache');
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

// 🔥 1. GLOBAL UI BEAUTIFIER & INITIALIZER
function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';

    // 🔥 BEAUTIFUL EXPENSE UI CSS INJECTION (ഡാഷ്‌ബോർഡ് തുറക്കുമ്പോൾ തന്നെ വർക്ക് ആകും)
    if (!$('#custom-expense-css').length) {
        $('<style id="custom-expense-css">').html(`
            #expense-form input, #expense-form select, #expense-form textarea {
                border: 2px solid #cbd5e1 !important;
                border-radius: 10px !important;
                padding: 12px 15px !important;
                background-color: #f8fafc !important;
                font-weight: 700 !important;
                color: #1e293b !important;
                font-size: 14px !important;
                transition: all 0.3s ease;
            }
            #expense-form input:focus, #expense-form select:focus, #expense-form textarea:focus {
                border-color: #2563eb !important;
                background-color: #ffffff !important;
                box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
                outline: none !important;
            }
            #expense-form .form-label, #expense-form label {
                font-size: 11px !important;
                font-weight: 800 !important;
                color: #64748b !important;
                text-transform: uppercase !important;
                margin-bottom: 6px !important;
                letter-spacing: 0.5px;
            }
            #btn-save-exp {
                background: #0f172a !important;
                border-radius: 12px !important;
                font-size: 14px !important;
                font-weight: 800 !important;
                padding: 14px !important;
                letter-spacing: 1px !important;
                text-transform: uppercase !important;
                border: none !important;
                margin-top: 10px;
            }
                .btn-refund-icon {
                background: #fee2e2;
                border: 1px solid #fecaca;
                color: #dc2626;
                border-radius: 6px;
                padding: 1px 6px;
                font-size: 10px;
                transition: all 0.3s ease;
            }
            .btn-refund-icon.active-refund {
                background: #dc2626 !important;
                color: white !important;
                box-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
            }
        `).appendTo('head');
    }

    fetchRatesBackground();
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
    let cached = localStorage.getItem('adminRatesCache');

    // കാഷെ ഉണ്ടെങ്കിലും അത് ശൂന്യമല്ലെങ്കിൽ (Empty അല്ലെങ്കില്) മാത്രം എടുത്താൽ മതി
    if (cached && cached !== "{}" && cached !== "null") {
        let parsed = JSON.parse(cached);
        if (Object.keys(parsed).length > 0) {
            courierRates = parsed;
            return; // റേറ്റ് ഉണ്ടെങ്കിൽ പിന്നെ ഫെച്ച് ചെയ്യില്ല
        }
    }

    console.log("🔄 Fetching latest rates from server...");
    fetch(`${scriptURL}?action=getRates`)
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success' && data.rates) {
                courierRates = data.rates;
                localStorage.setItem('adminRatesCache', JSON.stringify(courierRates));
                console.log("✅ Rates Updated & Saved to LocalStorage");

                // റേറ്റ് കിട്ടിയ ഉടനെ കാർഡുകൾ അപ്ഡേറ്റ് ആവാൻ
                if (allOrders && allOrders.length > 0) {
                    renderTabs(allOrders);
                }
            }
        })
        .catch(err => console.log("⚠️ Rate fetch failed"));
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
                fetchDashboardDataBg();
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

        let tDate = new Date(o.timestamp); // Order Date
        let pDateStr = (status === 'Paid' && local?.actionDate) ? local.actionDate : (o.paidDate || o.timestamp);
        let pDate = new Date(pDateStr);

        let dDateStr = (status === 'Dispatched' && local?.actionDate) ? local.actionDate : (o['Dispatched Date'] || o.timestamp);
        let dDate = new Date(dDateStr);

        return { status, tDate, pDate, dDate, pDateStr, dDateStr };
    };

    // --- 2. ADVANCED SORTING ---
    orders.sort((a, b) => {
        let infoA = getOrderInfo(a);
        let infoB = getOrderInfo(b);

        const statusPriority = { 'Pending': 1, 'Sent': 1, 'Paid': 2, 'Dispatched': 3, 'Completed': 4, 'Archive': 5 };
        let statA = statusPriority[infoA.status] || 9;
        let statB = statusPriority[infoB.status] || 9;

        if (statA !== statB) return statA - statB;

        let dateA, dateB;
        if (statA === 1) { dateA = infoA.tDate; dateB = infoB.tDate; }
        else if (statA === 2) { dateA = infoA.pDate; dateB = infoB.pDate; }
        else if (statA === 3) { dateA = infoA.dDate; dateB = infoB.dDate; }
        else { dateA = infoA.tDate; dateB = infoB.tDate; }

        return (currentSortDir === 'desc') ? dateB - dateA : dateA - dateB;
    });

    // --- 3. PRE-CALCULATE DISPATCHED COURIER TOTALS 🚚💰 ---
    let dispatchedCostMap = {};
    orders.forEach(o => {
        let { status, dDateStr } = getOrderInfo(o);
        if (status === 'Dispatched') {
            let lbl = getTimelineLabel(dDateStr);
            // Actual Courier Cost (Column U in Sheet)
            let cost = parseInt(o.actualCourierCost) || 0;
            dispatchedCostMap[lbl] = (dispatchedCostMap[lbl] || 0) + cost;
        }
    });

    // --- 4. CALCULATE LATEST DATE (For Collapse) ---
    let firstDisp = orders.find(o => getOrderInfo(o).status === 'Dispatched');
    let latestDispatchedDateLabel = "";
    if (firstDisp) {
        let info = getOrderInfo(firstDisp);
        latestDispatchedDateLabel = getTimelineLabel(info.dDateStr);
    }

    // --- 5. RENDER LOOP ---
    let lastDateMap = { pending: '', paid: '', dispatched: '' };

    orders.forEach((d, i) => {
        let { status, dDateStr, pDateStr } = getOrderInfo(d);
        let isCompact = false;

        // Inject Resolved Dates for Card
        d.paidDate = pDateStr;
        d['Dispatched Date'] = dDateStr;

        if (status === 'Completed' || status === 'Archive') return;

        let targetList = null;
        let type = '';

        if (status === 'Pending' || status === 'Sent') {
            targetList = pendingList; type = 'pending'; counts.pending++;
        } else if (status === 'Paid') {
            targetList = paidList; type = 'paid'; counts.paid++;
        } else if (status === 'Dispatched') {
            targetList = dispatchedList; type = 'dispatched'; counts.dispatched++;
            if (currentSortDir === 'desc') {
                let thisDispLabel = getTimelineLabel(dDateStr);
                if (thisDispLabel !== latestDispatchedDateLabel) isCompact = true;
            }
        }

        if (targetList) {
            let qty = parseInt(d.quantity) || 0;
            btlCounts[type] += qty;

            let displayDateRaw = d.timestamp;
            if (type === 'paid') displayDateRaw = pDateStr;
            if (type === 'dispatched') displayDateRaw = dDateStr;

            let dateLabel = getTimelineLabel(displayDateRaw);

            // 🔥 STICKY DATE HEADER RENDERING
            if (dateLabel !== lastDateMap[type]) {
                let extraHtml = '';

                // Dispatched Tab ആണെങ്കിൽ കൊറിയർ തുക കാണിക്കുക
                if (type === 'dispatched' && dispatchedCostMap[dateLabel] > 0) {
                    extraHtml = `<span style="opacity:0.9; font-weight:600; margin-left:8px; padding-left:8px; border-left:1px solid #999;">🚚 ₹${dispatchedCostMap[dateLabel]}</span>`;
                }

                targetList.innerHTML += `<div class="col-12 sticky-date-wrapper"><div class="timeline-badge">${dateLabel}${extraHtml}</div></div>`;
                lastDateMap[type] = dateLabel;
            }

            targetList.innerHTML += createCardHTML(d, i, type, status, isCompact);
        }
    });

    updateBadgeUI('count-pending', counts.pending, btlCounts.pending);
    updateBadgeUI('count-paid', counts.paid, btlCounts.paid);
    updateBadgeUI('count-dispatched', counts.dispatched, btlCounts.dispatched);
    updateSyncButtonUI();
    checkSelectAllStatus();
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

    // 🔥 DATE WITH YEAR
    let dateObj = new Date(d.timestamp);
    let formattedDate = dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    // Customer Stats
    let currentPhone = String(d.phone || '').replace(/[^0-9]/g, '');
    let custHistory = (typeof allOrders !== 'undefined') ? allOrders.filter(o => String(o.phone).replace(/[^0-9]/g, '') === currentPhone) : [];
    let totalOrders = custHistory.length;
    let totalBottles = custHistory.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);

    // Badges
    let statusColor = 'secondary';
    if (currentStatus === 'Pending') statusColor = 'warning text-dark';
    if (currentStatus === 'Sent') statusColor = 'primary';
    if (currentStatus === 'Paid') statusColor = 'success';
    if (currentStatus === 'Refunded') statusColor = 'danger';
    if (currentStatus === 'Dispatched') statusColor = 'info text-dark';

    let langBadge = d.language ? `<span class="badge rounded-pill border ms-1 text-secondary" style="font-size:9px; background:#f8f9fa; vertical-align:middle;">${d.language.toUpperCase()}</span>` : '';

    let archiveBtn = (currentStatus === 'Sent' || currentStatus === 'Pending')
        ? `<button onclick="updateOrder('${d.orderid}', 'Archive')" class="btn-archive-mini ms-1" title="Archive"><i class="fas fa-archive"></i></button>`
        : '';

    // 🔥 FIX: Refunded അല്ലെങ്കിൽ മാത്രമേ റീഫണ്ട് ബട്ടൺ കാണിക്കൂ
    let showRefBtn = (currentStatus !== 'Refunded' && currentStatus !== 'Completed');
    let refundBtn = showRefBtn ? `<button id="ref-btn-${d.orderid}" onclick="event.stopPropagation(); handleRefundToggle('${d.orderid}', ${index})" class="btn-refund-icon ms-1" title="Refund"><i class="fas fa-undo-alt"></i></button>` : '';
    let headerLeft = `
        <div class="d-flex align-items-center flex-wrap gap-1">
            <span class="badge rounded-pill bg-dark" style="font-size:11px;">${d.orderid}</span>
            <span class="badge rounded-pill bg-${statusColor}" style="font-size:10px;">${currentStatus}</span>
            ${refundBtn} 
            ${langBadge}
            ${archiveBtn}
        </div>
    `;

    // Actions
    let editLink = `<a href="order.html?oid=${d.orderid}" target="_blank" class="btn-top-action">✏️ EDIT</a>`;
    let printBtn = `<button onclick="printSingle(${index})" class="btn-top-action">🖨️</button>`;
    let topActions = editLink + printBtn;

    if (type === 'dispatched') {
        topActions = `<button onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')" class="btn-top-action">Revert</button>` + topActions;
    } else if (type === 'paid') {
        topActions = `<button onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Sent')" class="btn-top-action">Revert</button>` + topActions;
    }

    // 🔥 PAID DATE BADGE (Always Check for Paid Status)
    let paidTimeHTML = '';
    if ((type === 'paid' || currentStatus === 'Paid') && d.paidDate) {
        let pDate = new Date(d.paidDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        paidTimeHTML = `<div class="mb-2 px-2 py-1 bg-success bg-opacity-10 border border-success border-opacity-25 rounded small text-success fw-bold" style="font-size:11px; display:inline-block;"><i class="fas fa-check-circle me-1"></i> Paid on: ${pDate}</div>`;
    }

    // 🔥 WHATSAPP SELECTOR (ALL TABS)
    let opts = '';
    if (d.whatsapp) opts += `<option value="${d.whatsapp}">📲 WA: ${d.whatsapp}</option>`;
    opts += `<option value="${d.phone}" ${!d.whatsapp ? 'selected' : ''}>📞 PH: ${d.phone}</option>`;
    if (d.altphone) opts += `<option value="${d.altphone}">☎️ ALT: ${d.altphone}</option>`;

    // Dropdown + WA Icon Button
    let waSelectorHTML = `
    <div class="mt-2 mb-2 d-flex gap-1" onclick="event.stopPropagation();">
        <select id="wa-select-${index}" class="form-select form-select-sm shadow-none border-secondary text-secondary flex-grow-1" style="font-size:11px; font-weight:700; padding:4px 25px 4px 8px;">${opts}</select>
        <button class="btn btn-sm btn-success" onclick="openSimpleWA(${index})" title="Open WhatsApp Chat"><i class="fab fa-whatsapp"></i></button>
    </div>`;

    // Contact Icons
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

    // Buttons
    let buttons = '';
    if (type === 'pending') {
        let waBtnLabel = (currentStatus === 'Sent') ? 'Resend' : 'Invoice';
        let mainBtn = `<button class="btn-custom btn-wa flex-grow-1" onclick="event.stopPropagation(); sendWA(${index})"><i class="fab fa-whatsapp"></i> ${waBtnLabel}</button>`;

        if (currentStatus === 'Sent') {
            buttons = `<div class="d-flex gap-2 w-100">
                <button class="btn-custom btn-paid flex-grow-1" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')">💰 MARK PAID</button>
                <button class="btn-custom btn-wa" style="width:50px;" onclick="event.stopPropagation(); sendWA(${index})" title="Resend Invoice"><i class="fab fa-whatsapp"></i></button>
             </div>`;
        } else {
            buttons = `<div class="d-flex gap-2 w-100">
                ${mainBtn}
                <button class="btn btn-warning shadow-sm border-warning d-flex align-items-center justify-content-center" style="width:50px; border-radius:10px;" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Paid')" title="Mark Paid"><i class="fas fa-hand-holding-usd"></i></button>
             </div>`;
        }
    }
    // 🔥 PAID TAB BUTTONS (With Checkbox Event)
    else if (type === 'paid') {
        buttons = `<div class="d-flex gap-2 align-items-center w-100">
            <button class="btn-custom btn-dispatch flex-grow-1" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Dispatched')">📦 DISPATCH</button>
                       
            <div style="width: 40px; display: flex; justify-content: center;">
                <input type="checkbox" class="order-cb" style="width: 22px; height: 22px; cursor: pointer;" value="${index}" onclick="event.stopPropagation(); checkSelectAllStatus();">
            </div>
        </div>`;
    }
    else if (currentStatus === 'Refunded') {
        buttons = `
        <div class="alert alert-danger p-2 mb-2 text-center" style="font-size:11px; font-weight:700;">
            <i class="fas fa-info-circle"></i> Amount Refunded to Customer
        </div>
        <button class="btn btn-warning w-100 fw-bold shadow-sm text-dark" style="border-radius:10px;" onclick="updateOrder('${d.orderid}', 'Paid')">
            <i class="fas fa-history me-1"></i> REVERT TO PAID
        </button>`;
    }
    else if (type === 'dispatched') {
        let trackNum = d.tracking || '';
        let trackLink = `https://www.google.com/search?q=${d.provider || 'DTDC'}+tracking+${trackNum}`;

        // 🔥 DATE + TIME Display Logic
        let dispDateStr = d['Dispatched Date'] || d.actionDate || d.timestamp;
        let dateObj = new Date(dispDateStr);
        // Format: 10 Feb 2026, 10:30 AM
        let formattedDispDate = dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

        // Date & Edit Icon HTML
        let dateHtml = `
            <div style="background:#f0fdf4; border:1px solid #dcfce7; padding:8px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:11px; color:#166534; font-weight:700;">
                    <i class="fas fa-shipping-fast me-1"></i> Dispatched: ${formattedDispDate}
                </div>
                <button onclick="event.stopPropagation(); editDispatchDate('${d.orderid}', '${dispDateStr}')" class="btn btn-sm btn-light border py-0 px-2" style="font-size:10px;">✏️</button>
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

    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>${headerLeft}</div>
                <div>${topActions}</div>
            </div>
            <div class="text-end text-muted small mb-2" style="font-size:10px; float: right">${formattedDate}</div>
            
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
// 🔥 UPDATED: Sync Button UI (Orders + Expenses കൂട്ടാൻ)
// 🔥 2. UPDATED SYNC BUTTON UI (Expense ഫോമിനുള്ളിൽ സിങ്ക് ബട്ടൺ കാണിക്കാൻ)
function updateSyncButtonUI() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let pendingExpenses = JSON.parse(localStorage.getItem('pendingExpenses') || "[]");

    let totalPending = pendingUpdates.length + pendingExpenses.length;

    const syncBtn = $('#sync-btn');
    const logoPlaceholder = $('#logo-placeholder');
    const headerLogo = $('#header-logo');
    const badge = $('#sync-badge-count');

    // ഹെഡറിലെ മെയിൻ സിങ്ക് ബട്ടൺ
    if (totalPending > 0) {
        syncBtn.css('display', 'flex'); logoPlaceholder.hide(); badge.text(totalPending);
    } else {
        syncBtn.hide(); logoPlaceholder.show(); headerLogo.show();
    }

    // 🔥 EXPENSE TAB-ൽ തനിയെ വരുന്ന SYNC ALERT & BUTTON
    $('#exp-sync-alert').remove(); // പഴയത് കളയുന്നു
    if (pendingExpenses.length > 0) {
        let alertHtml = `
        <div id="exp-sync-alert" class="alert alert-warning d-flex justify-content-between align-items-center p-3 mb-3 shadow-sm border-warning" style="border-radius:12px; background:#fffbeb;">
            <div style="font-size:12px; font-weight:800; color:#b45309;">
                <i class="fas fa-wifi text-danger me-1"></i> ${pendingExpenses.length} Expense(s) Offline!
            </div>
            <button type="button" onclick="syncWithServer()" class="btn btn-dark shadow-sm" style="font-size:11px; font-weight:800; border-radius:8px; padding:6px 12px;">SYNC NOW <i class="fas fa-cloud-upload-alt ms-1"></i></button>
        </div>`;
        $('#expense-form').prepend(alertHtml);
    }
}

// 🔥 UPDATED: POWERFUL SEARCH (Local + Server)
function filterOrders() {
    const term = document.getElementById('searchInput').value.trim().toLowerCase();
    const tabsContainer = document.getElementById('tabs-container');
    const searchResultsArea = document.getElementById('search-results-area');
    const searchList = document.getElementById('list-search');

    if (term.length > 0) {
        tabsContainer.style.display = 'none';
        searchResultsArea.style.display = 'block';
        searchList.innerHTML = '';

        let matches = allOrders.filter(o =>
            (o.name || '').toLowerCase().includes(term) ||
            String(o.phone).includes(term) ||
            (o.orderid || '').toLowerCase().includes(term) ||
            (o.tracking || '').toLowerCase().includes(term)
        );

        if (matches.length === 0) {
            searchList.innerHTML = `<div class="text-center text-muted mt-3 mb-2">No local results found.</div>`;
        } else {
            matches.forEach(d => {
                let originalIndex = allOrders.findIndex(x => x.orderid === d.orderid);
                searchList.innerHTML += createCardHTML(d, originalIndex, 'search', d.Status);
            });
        }

        // 🔥 ADD "SEARCH ON SERVER" BUTTON
        let serverBtnHtml = `
            <div class="col-12 mt-3 text-center">
                <div class="p-3 border rounded-3 bg-light shadow-sm">
                    <div class="small text-muted mb-2">കാണുന്നില്ലേ? പഴയ ഓർഡറുകൾക്കായി ഷീറ്റിൽ സെർച്ച് ചെയ്യുക</div>
                    <button onclick="searchOnServer('${term}')" class="btn btn-dark rounded-pill px-4 fw-bold">
                        <i class="fas fa-cloud-download-alt me-2"></i> Search Entire Database
                    </button>
                </div>
            </div>`;

        searchList.innerHTML += serverBtnHtml;

    } else {
        tabsContainer.style.display = 'block';
        searchResultsArea.style.display = 'none';
    }
}

// 🔥 UPDATED: Auto generates Date & Time for 'Paid' status from Admin Panel
function updateOrder(oid, status, trackingNum = null, skipConfirm = false, customDate = null) {
    if (!skipConfirm && !trackingNum && !customDate && !confirm(`Mark '${status}'?`)) return;

    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates = updates.filter(item => item.oid !== oid);

    let existingOrder = allOrders.find(o => o.orderid === oid);
    let oldStatus = existingOrder ? existingOrder.Status : 'Pending';

    // 🔥 FIX: നേരിട്ട് Delete ചെയ്യാതെ, Sync ചെയ്യുമ്പോൾ ഡിലീറ്റ് ചെയ്യാൻ ഒരു Flag വെക്കുന്നു
    let needsRefundDelete = false;
    if (String(oldStatus).trim().toLowerCase() === 'refunded' && status !== 'Refunded') {
        needsRefundDelete = true;
        console.log("Refund deletion queued for sync...");
    }

    if (existingOrder && existingOrder.Status === status && customDate) {
        oldStatus = `${existingOrder.Status} (${getTimelineLabel(existingOrder['Dispatched Date'] || existingOrder.timestamp)})`;
    }

    let updateObj = {
        oid: oid,
        status: status,
        oldStatus: oldStatus,
        time: new Date().getTime(),
        deleteRefund: needsRefundDelete // 🔥 ഈ ഫ്ലാഗ് വെച്ചാണ് Sync ചെയ്യുമ്പോൾ തിരിച്ചറിയുന്നത്
    };

    if (trackingNum) updateObj.tracking = trackingNum;

    // 🔥 DATE & TIME LOGIC FIX (Both Paid and Dispatched will get Exact Time)
    if (customDate) {
        updateObj.actionDate = customDate;
    } else if ((status === 'Dispatched' && !trackingNum) || status === 'Paid') {
        let now = new Date();
        let y = now.getFullYear();
        let m = String(now.getMonth() + 1).padStart(2, '0');
        let d = String(now.getDate()).padStart(2, '0');
        let h = String(now.getHours()).padStart(2, '0');
        let min = String(now.getMinutes()).padStart(2, '0');
        updateObj.actionDate = `${y}-${m}-${d} ${h}:${min}`;
    }

    updates.push(updateObj);
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    const orderIndex = allOrders.findIndex(o => o.orderid === oid);
    if (orderIndex !== -1) {
        allOrders[orderIndex].Status = status;
        if (trackingNum) allOrders[orderIndex].tracking = trackingNum;
        if (customDate) allOrders[orderIndex]['Dispatched Date'] = customDate;

        if (status === 'Paid' && !allOrders[orderIndex].paidDate) {
            allOrders[orderIndex].paidDate = updateObj.actionDate;
        }
        if (status === 'Dispatched' && !allOrders[orderIndex]['Dispatched Date']) {
            allOrders[orderIndex]['Dispatched Date'] = updateObj.actionDate;
        }

        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
    }

    if (document.getElementById('searchInput').value.length > 0) filterOrders();
    else renderTabs(allOrders);

    updateSyncButtonUI();

    if (trackingNum) showToast('success', 'Tracking Saved Locally ✅');
    if (customDate) showToast('success', 'Date Updated! Sync to Save.');
}


window.editDispatchDate = async function (oid, currentDate) {
    // 1. Create a container for Flatpickr inside SweetAlert
    const { value: newDate } = await Swal.fire({
        title: 'Change Dispatch Date',
        html: `
            <div style="text-align:center;">
                <label style="font-size:12px; color:#666; font-weight:700; margin-bottom:5px; display:block;">SELECT NEW DATE & TIME</label>
                <input type="text" id="flatpickr-input" class="form-control text-center fw-bold" 
                       style="font-size:18px; padding:10px; border:2px solid #eee; border-radius:12px;" 
                       placeholder="Select Date...">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Update',
        confirmButtonColor: '#2e7d32',
        focusConfirm: false,
        didOpen: () => {
            // 🔥 Initialize Flatpickr (Material Style)
            flatpickr("#flatpickr-input", {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                defaultDate: currentDate || new Date(),
                theme: "material_blue",
                time_24hr: false,
                disableMobile: false // Force custom picker even on mobile for consistency
            });
        },
        preConfirm: () => {
            return document.getElementById('flatpickr-input').value;
        }
    });

    if (newDate) {
        // Save locally & Sync
        // Format it to ISO String or keep as YYYY-MM-DD HH:MM for simplicity in script
        updateOrder(oid, 'Dispatched', null, true, newDate);
    }
}

// 🔥 1. SYNC CLICK FIX (ഓർഡറുകളും എക്സ്പെൻസുകളും ചെക്ക് ചെയ്യാൻ)
window.syncWithServer = function () {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let pendingExpenses = JSON.parse(localStorage.getItem('pendingExpenses') || "[]");

    // രണ്ടും ഇല്ലെങ്കിൽ മാത്രം റിട്ടേൺ ചെയ്യുക
    if (pendingUpdates.length === 0 && pendingExpenses.length === 0) return;

    renderSyncList();
    new bootstrap.Modal(document.getElementById('syncModal')).show();
};

// 🔥 2. SHOW EXPENSES IN SYNC MODAL (സിങ്ക് വിൻഡോയിൽ എക്സ്പെൻസുകൾ കൂടി കാണിക്കാൻ)
function renderSyncList() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let pendingExpenses = JSON.parse(localStorage.getItem('pendingExpenses') || "[]");

    const list = document.getElementById('sync-preview-list');
    const countDisplay = document.getElementById('sync-count-display');

    let totalCount = pendingUpdates.length + pendingExpenses.length;
    countDisplay.innerText = totalCount;
    list.innerHTML = '';

    // A. ഓഫ്‌ലൈൻ ഓർഡറുകൾ ലിസ്റ്റ് ചെയ്യുന്നു
    pendingUpdates.forEach((u, index) => {
        let order = allOrders.find(o => o.orderid === u.oid);
        let name = order ? order.name : 'Unknown';
        let actionHtml = '';

        if (u.tracking) {
            actionHtml = `<span class="badge bg-light text-dark border">Tracking</span> <b class="ms-1">${u.tracking}</b>`;
        } else if (u.status) {
            let fromStatus = u.oldStatus || (order ? order.Status : 'Unknown');
            let badgeColor = 'secondary';
            if (u.status === 'Paid') badgeColor = 'success';
            if (u.status === 'Dispatched') badgeColor = 'primary';
            if (u.status === 'Sent') badgeColor = 'info text-dark';

            let extraInfo = "";
            if (u.status === 'Dispatched' && u.actionDate) {
                let d = new Date(u.actionDate);
                let dateStr = d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                extraInfo = `<div class="mt-1 small text-success fw-bold"><i class="far fa-calendar-alt"></i> ${dateStr}</div>`;
            }
            actionHtml = `
            <div style="font-size:12px; color:#555;">
                <span class="badge bg-light text-secondary border">${fromStatus}</span> 
                <i class="fas fa-long-arrow-alt-right mx-1 text-muted"></i> 
                <span class="badge bg-${badgeColor}">${u.status}</span>
                ${extraInfo}
            </div>`;
        }

        list.innerHTML += `
        <tr style="border-bottom:1px solid #eee;">
            <td width="30"><div class="rounded-circle bg-white d-flex align-items-center justify-content-center border" style="width:30px; height:30px; font-weight:700; font-size:10px;">${index + 1}</div></td>
            <td>
                <div class="fw-bold text-dark" style="font-size:12px;">${u.oid}</div>
                <div class="small text-muted" style="font-size:11px;">${name}</div>
            </td>
            <td>${actionHtml}</td>
            <td width="40" class="text-end">
                <button onclick="undoUpdate(${index})" class="btn btn-sm btn-outline-danger border-0" title="Undo"><i class="fas fa-undo"></i></button>
            </td>
        </tr>`;
    });

    // B. ഓഫ്‌ലൈൻ എക്സ്പെൻസുകൾ ലിസ്റ്റ് ചെയ്യുന്നു
    pendingExpenses.forEach((exp, index) => {
        list.innerHTML += `
        <tr style="border-bottom:1px solid #eee; background:#fffcf2;">
            <td width="30"><div class="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center border" style="width:30px; height:30px; font-weight:700; font-size:10px;"><i class="fas fa-receipt"></i></div></td>
            <td>
                <div class="fw-bold text-dark" style="font-size:12px;">Expense: ${exp.category}</div>
                <div class="small text-muted" style="font-size:11px;">${exp.vendor || 'No Vendor'}</div>
            </td>
            <td><span class="badge bg-danger">₹${exp.amount}</span></td>
            <td width="40" class="text-end">
                <button onclick="undoExpenseUpdate('${exp.id}')" class="btn btn-sm btn-outline-danger border-0" title="Remove"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    if (totalCount === 0) {
        $('#syncModal').modal('hide');
        updateSyncButtonUI();
    }
}

// 🔥 3. UNDO EXPENSE (എക്സ്പെൻസ് സിങ്ക് ചെയ്യുന്നത് ക്യാൻസൽ ചെയ്യാൻ)
window.undoExpenseUpdate = function (id) {
    let pendingExpenses = JSON.parse(localStorage.getItem('pendingExpenses') || "[]");
    pendingExpenses = pendingExpenses.filter(e => e.id !== id);
    localStorage.setItem('pendingExpenses', JSON.stringify(pendingExpenses));
    renderSyncList();
    updateSyncButtonUI();
};

// 🔥 NEW: Discard All Function
window.discardAllUpdates = function () {
    if (!confirm("Are you sure you want to discard ALL pending changes?")) return;

    localStorage.removeItem('pendingUpdates');

    // Re-fetch to revert UI instantly (Important!)
    fetchOrders(true);

    $('#syncModal').modal('hide');
    updateSyncButtonUI();
    showToast('info', 'All changes discarded');
}

// 🔥 UNDO LOGIC
function undoUpdate(index) {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    // Remove item at index
    pendingUpdates.splice(index, 1);

    // Save back
    localStorage.setItem('pendingUpdates', JSON.stringify(pendingUpdates));

    // Refresh List
    renderSyncList();

    // 🔥 Critical: Revert UI changes by reloading data
    // (This ensures the card goes back to old status visually)
    fetchOrders(true);
    updateSyncButtonUI();
}

// 🔥 FINAL UPLOAD
// 🔥 UPDATED: FINAL UPLOAD (Orders + Expenses ഒരുമിച്ച് സിങ്ക് ആവാൻ)
// 🔥 UPDATED: FINAL UPLOAD (With Refund Deletion Logic)
function finalConfirmSync() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let pendingExpenses = JSON.parse(localStorage.getItem('pendingExpenses') || "[]");

    if (pendingUpdates.length === 0 && pendingExpenses.length === 0) return;

    const btn = $('#syncModal button.btn-dark');
    btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> UPLOADING...');

    let promises = [];

    // 1. Orders Status Sync
    let statusUpdates = pendingUpdates.filter(u => !u.tracking);
    if (statusUpdates.length > 0) promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'bulkUpdateStatus', updates: statusUpdates }) }));

    // 2. Orders Tracking Sync
    let trackingUpdates = pendingUpdates.filter(u => u.tracking);
    trackingUpdates.forEach(u => promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'updateTracking', oid: u.oid, tracking: u.tracking }) })));

    // 🔥 3. Refund Deletions (ഇതാണ് പുതിയത്)
    let refundDeletions = pendingUpdates.filter(u => u.deleteRefund);
    refundDeletions.forEach(u => {
        promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'deleteRefund', oid: u.oid }) }));
    });

    // 4. Expenses Sync
    pendingExpenses.forEach(exp => {
        promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'addExpense', data: exp }) }));
    });

    Promise.all(promises).then(() => {
        localStorage.removeItem('pendingUpdates');
        localStorage.removeItem('pendingExpenses');
        $('#syncModal').modal('hide');
        showToast('success', 'Synced Successfully!');
        updateSyncButtonUI();
        fetchDashboardDataBg();
        btn.prop('disabled', false).html('<i class="fas fa-cloud-upload-alt me-2"></i> UPLOAD NOW');
    }).catch(() => {
        showToast('error', 'Sync Failed! Try again later.');
        btn.prop('disabled', false).html('<i class="fas fa-cloud-upload-alt me-2"></i> UPLOAD NOW');
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



// 🔥 2. SIMPLE ZONE MATCHER 
function getZoneKey(stateName) {
    if (!stateName) return 'REST OF INDIA';
    let s = String(stateName).toUpperCase().trim();

    if (courierRates && courierRates[s]) {
        return s;
    }

    // ഫോൾബാക്ക് (എന്തെങ്കിലും കാരണവശാൽ സ്പെല്ലിംഗ് മാറിയാൽ)
    let zones = Object.keys(courierRates || {});
    for (let z of zones) {
        if (z.toUpperCase() === s) return z;
    }

    return 'REST OF INDIA';
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
// 🔥 DASHBOARD LOGIC (INTERACTIVE CALENDAR WITH DOTS)
// ==========================================

let selectedDate = new Date();
let dashboardData = null;
let dashDatePicker = null;
let expDatePicker = null;
let txCalendarPicker = null;

// 1. Initialize Advanced Pickers
function initFlatpickrs() {
    if (!dashDatePicker) {
        dashDatePicker = flatpickr("#dash-date", {
            dateFormat: "d M Y", // 🔥 Fix: Beautiful format (e.g. 11 Feb 2026)
            defaultDate: selectedDate,
            maxDate: "today",
            theme: "material_blue",
            disableMobile: true, // 🔥 Fix: Prevents dd-mm-yyyy issue on phones
            onChange: function (selectedDates) {
                if (selectedDates[0]) {
                    selectedDate = selectedDates[0];
                    changeDashDate();
                }
            }
        });
    }
    if (!expDatePicker) {
        expDatePicker = flatpickr("#exp-date", {
            enableTime: true,           // 🔥 Time picker enable cheyyan
            dateFormat: "Y-m-d h:i K",  // 🔥 AM/PM format-il date & time varan
            defaultDate: new Date(),    // 🔥 Default aayi ippozhathe time varan
            theme: "material_blue",
            time_24hr: false,
            disableMobile: false        // 🔥 Mobile-lum UI clear aayi varan
        });
    }
    if (!txCalendarPicker) {
        txCalendarPicker = flatpickr("#tx-calendar", {
            inline: true, // 🔥 Show as a permanent calendar block
            defaultDate: selectedDate,
            theme: "material_blue",
            onChange: function (selectedDates) {
                if (selectedDates[0]) {
                    selectedDate = selectedDates[0];
                    changeDashDate();
                }
            },
            onMonthChange: function (selectedDates, dateStr, instance) {
                // Fetch data when user swipes to previous month
                selectedDate = new Date(instance.currentYear, instance.currentMonth, 1);
                changeDashDate();
            },
            // 🔥 Inject Green & Red Dots
            onDayCreate: function (dObj, dStr, fp, dayElem) {
                if (!dashboardData || !dashboardData.monthTimeline) return;
                let dateKey = flatpickr.formatDate(dayElem.dateObj, "Y-m-d");
                let hasIncome = dashboardData.monthTimeline.income[dateKey];
                let hasExpense = dashboardData.monthTimeline.expense.some(e => e.date === dateKey);

                if (hasIncome || hasExpense) {
                    let dots = '<div class="activity-dots">';
                    if (hasIncome) dots += '<span class="dot-inc"></span>';
                    if (hasExpense) dots += '<span class="dot-exp"></span>';
                    dots += '</div>';
                    dayElem.innerHTML += dots;
                }
            }
        });
    }
}

function fetchDashboardDataBg() {
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
        }).catch(err => console.error(err));
}

// 🔥 FIX: ഡാഷ്‌ബോർഡ് തുറക്കുമ്പോൾ തന്നെ തീയതി കാണിക്കാൻ (Force UI Update)
function openDashboard() {
    $('#drawer-overlay').fadeIn(200);
    $('#dashboard-drawer').addClass('open');

    initFlatpickrs();
    updateArrowUI();

    // 🔥 ഡാഷ്‌ബോർഡ് തുറക്കുന്ന നിമിഷം തന്നെ തീയതി ബോക്സിലേക്ക് വെക്കുന്നു
    let formattedDate = flatpickr.formatDate(selectedDate, "d M Y");
    if (selectedDate.toDateString() === new Date().toDateString()) {
        formattedDate = "Today, " + formattedDate;
    }
    $('#dash-date').val(formattedDate).text(formattedDate);

    if (!dashboardData) fetchDashboardDataBg();
    else renderDashboard();
}


function closeDashboard() {
    $('#drawer-overlay').fadeOut(200);
    $('#dashboard-drawer').removeClass('open');
}

function updateArrowUI() {
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkD = new Date(selectedDate);
    checkD.setHours(0, 0, 0, 0);

    if (checkD >= today) {
        $('#btn-next-day').prop('disabled', true).css({ 'opacity': '0.3', 'cursor': 'not-allowed' });
    } else {
        $('#btn-next-day').prop('disabled', false).css({ 'opacity': '1', 'cursor': 'pointer' });
    }
}

function changeDate(days) {
    let newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);

    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkD = new Date(newDate);
    checkD.setHours(0, 0, 0, 0);

    if (checkD > today) return;

    selectedDate = newDate;
    changeDashDate();
}

// 🔥 FIX: തീയതി കാണിക്കാനും, ഡിസൈൻ സെറ്റ് ചെയ്യാനുമുള്ള ഫംഗ്‌ഷൻ
function changeDashDate() {
    if (dashDatePicker) dashDatePicker.setDate(selectedDate, false);
    if (expDatePicker) expDatePicker.setDate(selectedDate, false);
    if (txCalendarPicker) txCalendarPicker.setDate(selectedDate, false);

    updateArrowUI();

    // 🔥 FIX 1: Top Date Text (Arrows ഇടയിലുള്ള തീയതി കാണിക്കാൻ)
    let formattedDate = flatpickr.formatDate(selectedDate, "d M Y");
    if (selectedDate.toDateString() === new Date().toDateString()) {
        formattedDate = "Today, " + formattedDate;
    }
    // ഇൻപുട്ട് ആണെങ്കിലും ഡിവിഷൻ ആണെങ്കിലും വർക്ക് ചെയ്യാൻ
    $('#dash-date').val(formattedDate).text(formattedDate);

    $('#d-sales, #d-expense, #d-profit, #d-courier, #m-sales, #m-profit').text('...');
    $('#tx-details-area').html('<div class="text-center py-4 text-muted small"><i class="fas fa-spinner fa-spin"></i> Loading...</div>');

    // 🔥 FIX 2: ആക്റ്റിവിറ്റി ലിസ്റ്റ് കലണ്ടറിന് താഴേക്ക് മാറ്റാൻ
    if ($('#tx-calendar').length && $('#tx-details-area').length) {
        $('#tx-details-area').insertAfter($('#tx-calendar').parent());
    }

    // 🔥 FIX 3: Add Expense ഇൻപുട്ട് ബോക്സുകൾക്ക് നല്ല ബോർഡർ കൊടുക്കാൻ (CSS Injection)
    if (!$('#custom-expense-css').length) {
        $('<style id="custom-expense-css">')
            .html(`
            #expense-form input, #expense-form select, #expense-form textarea {
                border: 2px solid #ced4da !important;
                border-radius: 8px;
                padding: 10px;
                background-color: #f8f9fa;
                font-weight: 600;
                color: #333;
            }
            #expense-form input:focus, #expense-form select:focus, #expense-form textarea:focus {
                border-color: #0d6efd !important;
                background-color: #fff;
                box-shadow: 0 0 0 0.25rem rgba(13,110,253,.25);
            }
            `)
            .appendTo('head');
    }

    fetchDashboardDataBg();
}

// 🔥 Render Top Summary & Refresh Calendar Dots
function renderDashboard() {
    if (!dashboardData) return;

    let d = dashboardData.daily;
    let mName = selectedDate.toLocaleString('en-US', { month: 'short' });
    let yName = selectedDate.getFullYear();

    $('#m-overview-title').text(`(${mName} ${yName})`);

    // --- DAILY CARDS ---
    $('#d-sales').text('₹' + d.sales.toLocaleString());
    $('#d-expense').text('₹' + d.expense.toLocaleString());
    $('#d-courier').text('₹' + d.courier.toLocaleString());
    $('#d-profit').text('₹' + d.profit.toLocaleString());
    $('#d-orders').text(d.count || 0);

    // 🔥 ഡെയ്‌ലി കാർഡുകൾക്ക് താഴെ എളുപ്പത്തിൽ മനസ്സിലാക്കാൻ (റിപ്പീറ്റ് ആവാതിരിക്കാൻ പഴയത് ഡിലീറ്റ് ചെയ്യുന്നു)
    $('.helper-text-dash').remove();
    $('#d-profit').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(Sales - Courier - Exp)</div>');

    if (d.profit >= 0) {
        $('#d-profit').removeClass('text-danger').addClass('text-success');
        $('#d-status-text').text("Cash in Hand 🚀").css('color', '#2e7d32');
    } else {
        $('#d-profit').removeClass('text-success').addClass('text-danger');
        $('#d-status-text').text("Needs Attention 📉").css('color', '#dc3545');
    }

    // 🔥 TRUE MONTHLY NET PROFIT & ADVANCED STATS CALCULATION 
    let mY = selectedDate.getFullYear();
    let mM = selectedDate.getMonth();

    let trueIncome = 0, trueProductCost = 0, trueCourierExp = 0;

    // പുതിയ വേരിയബിളുകൾ (കുപ്പികളുടെയും ഓർഡറുകളുടെയും കണക്കെടുക്കാൻ)
    let monthBottles = 0, yearBottles = 0;
    let monthOrders = 0, yearOrders = 0;

    allOrders.forEach(o => {
        let status = o.Status || 'Pending';
        if (status === 'Pending' || status === 'Sent' || status === 'Archive') return;

        let pDate = new Date(o.paidDate || o.timestamp);
        let oYear = pDate.getFullYear();
        let oMonth = pDate.getMonth();
        let qty = parseInt(o.quantity) || 0;

        // ഓർഡറുകളും കുപ്പികളും കൂട്ടുന്നു (ഈ വർഷത്തെ)
        if (oYear === mY) {
            yearOrders++;
            yearBottles += qty;

            // ഈ മാസത്തെ മാത്രം കണക്കുകൾ
            if (oMonth === mM) {
                monthOrders++;
                monthBottles += qty;

                // വരുമാനവും ചിലവും (Monthly)
                let pInfo = calculatePriceInfo(qty, o.state);
                let amt = parseInt(pInfo.total.replace(/[^0-9]/g, '')) || 0;
                trueIncome += amt;
                trueProductCost += qty * 350; // 350 എന്നത് കുപ്പിയുടെ അടിസ്ഥാന ചിലവ്
            }
        }

        // കൊറിയർ ചിലവ് (Dispatched Date വെച്ച് - Monthly)
        if (status !== 'Paid') {
            let dDate = new Date(o['Dispatched Date'] || o.timestamp);
            if (dDate.getFullYear() === mY && dDate.getMonth() === mM) {
                trueCourierExp += parseInt(o.actualCourierCost) || 0;
            }
        }
    });

    // മറ്റ് ചിലവുകൾ (Expenses) & മെറ്റീരിയൽ ചിലവുകൾ (Materials)
    let trueOtherExp = 0;
    let monthMaterialExp = 0;

    if (dashboardData && dashboardData.monthTimeline && dashboardData.monthTimeline.expense) {
        dashboardData.monthTimeline.expense.forEach(e => {
            let catName = String(e.cat || '').toLowerCase();

            // മെറ്റീരിയൽ ആണെങ്കിൽ പ്രത്യേകം കൂട്ടുന്നു
            if (catName.includes('material')) {
                monthMaterialExp += e.amount;
            }
            // 🔥 FIX: സാലറി ആണെങ്കിൽ ലാഭത്തിൽ നിന്നും കുറയ്ക്കില്ല
            else if (catName === 'salary') {
                // Do nothing
            }
            // അല്ലെങ്കിൽ മറ്റ് കമ്പനി ചിലവുകളിൽ കൂട്ടുന്നു (വാടക, പരസ്യം, etc.)
            else if (!e.isCourier) {
                trueOtherExp += e.amount;
            }
        });
    }

    // യഥാർത്ഥ ലാഭം കണ്ടുപിടിക്കുന്നു (ലൂപ്പിന് പുറത്ത്!)
    let trueNetProfit = trueIncome - (trueProductCost + trueCourierExp + trueOtherExp);
    let totalExpenses = trueProductCost + trueCourierExp + trueOtherExp;

    // ഡാഷ്‌ബോർഡിലെ Monthly Overview കാർഡുകളിലേക്ക് നൽകുന്നു
    $('#m-sales').text('₹' + trueIncome.toLocaleString());
    $('#m-expense').text('₹' + totalExpenses.toLocaleString());
    $('#m-profit').text('₹' + trueNetProfit.toLocaleString());

    // 🔥 മന്ത്‌ലി കാർഡുകൾക്ക് താഴെ എളുപ്പത്തിൽ മനസ്സിലാക്കാൻ
    $('.helper-text-dash').remove(); // പഴയത് കളയുന്നു
    $('#d-profit').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(Sales - Courier - Exp)</div>');
    $('#m-sales').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(Delivered & Paid Orders Only)</div>');
    $('#m-expense').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(Bottle Cost + Courier + Other)</div>');
    $('#m-profit').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(True Business Net Profit)</div>');

    // 🔥 പഴയ കണ്ടെയ്‌നറുകൾ കളയുന്നു
    $('#extra-stats-container').remove();
    $('#partner-shares-container').remove();
    $('#material-stats-container').remove(); // 🔥 പഴയ മെറ്റീരിയൽ ബോക്സ് കളയുന്നു

    // 🔥 NEW: YEARLY MATERIAL EXPENSE
    let yearMaterialExp = 0;
    if (dashboardData && dashboardData.yearly && dashboardData.yearly.materialExp) {
        yearMaterialExp = dashboardData.yearly.materialExp;
    }

    // 🔥 UPDATED: BEAUTIFUL MATERIAL PURCHASES BOX (Month & Year)
    let materialHtml = `
    <div id="material-stats-container" class="mt-4 mb-2 p-3 bg-secondary bg-opacity-10 border border-secondary border-opacity-25 rounded-4 shadow-sm">
        <div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom border-secondary border-opacity-25">
            <div class="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center shadow-sm" style="width:28px;height:28px;font-size:12px;"><i class="fas fa-boxes"></i></div>
            <h6 class="fw-bold text-dark m-0" style="font-size:11px; letter-spacing:0.5px;">MATERIAL PURCHASES</h6>
        </div>
        <div class="d-flex justify-content-between align-items-end mt-1 pt-1">
            <div class="text-center w-50">
                <div style="font-size:9px;" class="text-muted fw-bold text-uppercase">This Month</div>
                <div class="fw-bold text-dark fs-5" style="line-height:1;">₹${monthMaterialExp.toLocaleString()}</div>
            </div>
            <div style="height:30px; width:1px; background:#adb5bd;"></div>
            <div class="text-center w-50">
                <div style="font-size:9px;" class="text-muted fw-bold text-uppercase">This Year</div>
                <div class="fw-bold text-dark fs-5" style="line-height:1;">₹${yearMaterialExp.toLocaleString()}</div>
            </div>
        </div>
    </div>
    `;

    // 🔥 NEW: BEAUTIFUL BOTTLES & ORDERS STATS UI 
    let statsHtml = `
    <div id="extra-stats-container" class="row mb-3 px-1 mt-2">
    <div class="col-6 pe-2">
            <div class="bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-4 p-3 h-100 shadow-sm d-flex flex-column justify-content-between">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <div class="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center shadow-sm" style="width:28px;height:28px;font-size:12px;"><i class="fas fa-wine-bottle"></i></div>
                    <h6 class="fw-bold text-primary m-0" style="font-size:11px; letter-spacing:0.5px;">BOTTLES SOLD</h6>
                </div>
                <div class="d-flex justify-content-between align-items-end mt-1 pt-2 border-top border-primary border-opacity-25">
                    <div class="text-center w-50">
                        <div style="font-size:9px;" class="text-muted fw-bold text-uppercase">Month</div>
                        <div class="fw-bold text-dark fs-5" style="line-height:1;">${monthBottles}</div>
                    </div>
                    <div style="height:30px; width:1px; background:#bbd0ff;"></div>
                    <div class="text-center w-50">
                        <div style="font-size:9px;" class="text-muted fw-bold text-uppercase">Year</div>
                        <div class="fw-bold text-dark fs-5" style="line-height:1;">${yearBottles}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 ps-2">
            <div class="bg-warning bg-opacity-10 border border-warning border-opacity-50 rounded-4 p-3 h-100 shadow-sm d-flex flex-column justify-content-between">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <div class="rounded-circle bg-warning text-dark d-flex justify-content-center align-items-center shadow-sm" style="width:28px;height:28px;font-size:12px;"><i class="fas fa-box-open"></i></div>
                    <h6 class="fw-bold text-dark m-0" style="font-size:11px; letter-spacing:0.5px;">TOTAL ORDERS</h6>
                </div>
                <div class="d-flex justify-content-between align-items-end mt-1 pt-2 border-top border-warning border-opacity-50">
                    <div class="text-center w-50">
                        <div style="font-size:9px;" class="text-muted fw-bold text-uppercase">Month</div>
                        <div class="fw-bold text-dark fs-5" style="line-height:1;">${monthOrders}</div>
                    </div>
                    <div style="height:30px; width:1px; background:#ffe08a;"></div>
                    <div class="text-center w-50">
                        <div style="font-size:9px;" class="text-muted fw-bold text-uppercase">Year</div>
                        <div class="fw-bold text-dark fs-5" style="line-height:1;">${yearOrders}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    // 🔥 PROFIT SHARES UI 
    let sharesHtml = `
    <div id="partner-shares-container" class="mb-4 p-3 bg-white border border-success border-opacity-25 rounded-4 shadow-sm">
        <div class="d-flex align-items-center mb-2 pb-2 border-bottom border-success border-opacity-10">
            <i class="fas fa-chart-pie text-success me-2"></i>
            <h6 class="fw-bold text-dark m-0" style="font-size:12px;">PROFIT SHARE SPLIT (This Month)</h6>
        </div>
        <div class="row text-center pt-1">
            <div class="col-4 border-end">
                <div class="small text-muted mb-1" style="font-size:10px; font-weight:700;">Salam (20%)</div>
                <div class="fw-bold text-success" style="font-size:14px;">₹${(trueNetProfit * 0.20).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
            <div class="col-4 border-end">
                <div class="small text-muted mb-1" style="font-size:10px; font-weight:700;">Samad (70%)</div>
                <div class="fw-bold text-success" style="font-size:14px;">₹${(trueNetProfit * 0.70).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
            <div class="col-4">
                <div class="small text-muted mb-1" style="font-size:10px; font-weight:700;">Jazeela (10%)</div>
                <div class="fw-bold text-success" style="font-size:14px;">₹${(trueNetProfit * 0.10).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
        </div>
    </div>
    `;

    // 🔥 3 ബോക്സുകളും ആക്ടിവിറ്റി ലിസ്റ്റിന് മുകളിലായി ആഡ് ചെയ്യുന്നു (ആദ്യം മെറ്റീരിയൽ, പിന്നെ സ്റ്റാറ്റസ്, പിന്നെ പ്രോഫിറ്റ്)
    $('#tx-details-area').before(materialHtml + statsHtml + sharesHtml);

    // 🔥 Redraw Calendar & Render Transactions
    if (txCalendarPicker) txCalendarPicker.redraw();
    let dateKey = flatpickr.formatDate(selectedDate, "Y-m-d");
    renderTransactionsForDate(dateKey);

    if (typeof renderPartnerList === 'function') renderPartnerList();
}

// 🔥 RENDER TRANSACTIONS FOR SELECTED DATE
// 🔥 RENDER TRANSACTIONS FOR SELECTED DATE (WITH COURIER GROUPING FIX)
function renderTransactionsForDate(dateStr) {
    if (!dashboardData || !dashboardData.monthTimeline) return;

    let tl = dashboardData.monthTimeline;
    let inc = tl.income[dateStr];
    let rawExps = tl.expense.filter(e => e.date === dateStr);

    // 🔥 FIX: കൊറിയർ ചാർജുകൾ ഒരൊറ്റ ലൈനിൽ കൂട്ടിക്കാണിക്കാൻ (Grouping)
    let exps = [];
    let totalCourier = 0;

    rawExps.forEach(e => {
        if (e.isCourier) totalCourier += e.amount;
        else exps.push(e);
    });

    // കൊറിയർ ഉണ്ടെങ്കിൽ അത് എക്സ്പെൻസ് ലിസ്റ്റിന്റെ ആദ്യം വെക്കുന്നു
    if (totalCourier > 0) {
        exps.unshift({ isCourier: true, amount: totalCourier, desc: "Courier Charges", cat: "Auto-calculated" });
    }

    let dateLabel = getTimelineLabel(dateStr);
    if (dateLabel !== "Today" && dateLabel !== "Yesterday") {
        dateLabel = flatpickr.formatDate(new Date(dateStr), "d M Y");
    }

    let html = `<div class="d-flex align-items-center mb-2 px-1"><h6 class="fw-bold small text-dark m-0">${dateLabel}'s Activity</h6></div>`;

    if (!inc && exps.length === 0) {
        html += `<div class="text-center py-4 bg-white border rounded-4 shadow-sm text-muted small" style="border-style:dashed !important;">No activity on this date.</div>`;
    }

    if (inc) {
        html += `
        <div class="d-flex justify-content-between align-items-center p-3 mb-2 bg-white border border-success border-opacity-25 rounded-4 shadow-sm">
            <div class="d-flex align-items-center gap-3">
                <div class="rounded-circle d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success" style="width:35px; height:35px; font-size:16px;">🍯</div>
                <div>
                    <div class="small fw-bold text-dark mb-1">Sales Income</div>
                    <div class="text-muted" style="font-size:10px;">${inc.bottles} bottles sold</div>
                </div>
            </div>
            <div class="fw-bold text-success fs-6">+₹${inc.amount.toLocaleString()}</div>
        </div>`;
    }

    if (exps.length > 0) {
        exps.forEach(item => {
            let descText = item.desc || item.cat || 'Expense';
            if (item.vendor && item.vendor !== 'Auto') descText += ` (${item.vendor})`;
            if (item.isCourier) descText = "Courier Charges";

            let icon = item.isCourier ? '🚚' : '📦';
            if (!item.isCourier && item.cat === 'Salary') icon = '👤';

            // 🔥 FIX: റീഫണ്ട് ആണെങ്കിൽ പൈസ പോകുന്ന ഐക്കൺ കാണിക്കാൻ
            if (!item.isCourier && item.cat === 'Refund') icon = '💸';

            let proofBtn = '';
            if (item.proof && String(item.proof).trim() !== "") {
                proofBtn = `<button onclick="viewReceipt('${item.proof}')" class="btn btn-sm btn-light border py-0 px-2 ms-1" style="font-size:10px; border-radius:6px;"><i class="fas fa-image text-primary"></i></button>`;
            }

            // 🔥 FIX: 'undefined' മാറ്റി 'Auto-calculated' ആക്കുന്നു
            let subText = item.isCourier ? "Auto-calculated" : item.cat;

            html += `
            <div class="d-flex justify-content-between align-items-center p-3 mb-2 bg-white border border-danger border-opacity-25 rounded-4 shadow-sm">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle d-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger" style="width:35px; height:35px; font-size:14px;">${icon}</div>
                    <div>
                        <div class="small fw-bold text-dark mb-1 d-flex align-items-center flex-wrap">${descText} ${proofBtn}</div>
                        <div class="text-muted" style="font-size:10px;">${subText}</div>
                    </div>
                </div>
                <div class="fw-bold text-danger fs-6">-₹${item.amount.toLocaleString()}</div>
            </div>`;
        });
    }

    $('#tx-details-area').html(html);
}

// 🔥 NEW: Receipt കാണാനുള്ള ഫംഗ്‌ഷൻ (Google Drive Image Fix)
window.viewReceipt = function (url) {
    let imgUrl = url;

    // ഗൂഗിൾ ഡ്രൈവ് വ്യൂ ലിങ്കിനെ നേരിട്ടുള്ള ഇമേജ് ലിങ്ക് ആക്കി മാറ്റുന്നു
    let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        imgUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    Swal.fire({
        title: 'Bill / Receipt',
        imageUrl: imgUrl,
        imageAlt: 'Loading Image...',
        width: '90%',
        padding: '10px',
        showCloseButton: true,
        showConfirmButton: false,
        customClass: { image: 'rounded-3 shadow-sm' },
        didOpen: () => {
            // ഡ്രൈവ് പെർമിഷൻ കാരണം ഇമേജ് ലോഡ് ആയില്ലെങ്കിൽ, നേരിട്ട് പുതിയ ടാബിൽ തുറക്കും
            const img = Swal.getImage();
            if (img) {
                img.onerror = () => {
                    Swal.close();
                    window.open(url, '_blank');
                };
            }
        }
    });
}


// 🔥 UPDATED: ADD EXPENSE (WITH OFFLINE SUPPORT)
// 🔥 UPDATED: SUBMIT EXPENSE (With Refund Logic)
async function submitExpense(e) {
    e.preventDefault();
    let btn = $('#btn-save-exp');
    let originalText = btn.text();
    btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> SAVING...');

    let fileInput = document.getElementById('exp-proof');
    let fileData = null; let fileName = null;

    if (fileInput && fileInput.files.length > 0) {
        try {
            btn.html('<i class="fas fa-compress"></i> COMPRESSING...');
            let compressed = await compressImage(fileInput.files[0]);
            fileData = compressed.data; fileName = compressed.name;
        } catch (err) {
            alert("Image processing failed");
            btn.prop('disabled', false).text(originalText);
            return;
        }
    }

    let selectedD = $('#exp-date').val() || flatpickr.formatDate(new Date(), "Y-m-d");

    // 🔥 Extract Order ID if it is a Refund
    let refundOrderId = null;
    if ($('#exp-category').val() === 'Refund') {
        let desc = $('#exp-desc').val();
        let match = desc.match(/ORD-\d+/); // Description-ൽ നിന്നും ORD-xxxx കണ്ടുപിടിക്കുന്നു
        if (match) refundOrderId = match[0];
    }

    let formData = {
        id: 'EXP-' + Date.now(),
        date: selectedD,
        category: $('#exp-category').val(),
        vendor: $('#exp-vendor').val(),
        description: $('#exp-desc').val(),
        amount: $('#exp-amount').val(),
        fileData: fileData,
        fileName: fileName,
        orderId: refundOrderId // 🔥 Backend-ലേക്ക് അയക്കുന്നു
    };

    // Helper to Update Local Order Status
    const updateLocalStatus = () => {
        if (refundOrderId) {
            let order = allOrders.find(o => o.orderid === refundOrderId);
            if (order) {
                order.Status = 'Refunded';
                localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
                renderTabs(allOrders); // UI Refresh
            }
        }
    };

    // 🔥 OFFLINE CHECK
    if (!navigator.onLine) {
        saveExpenseOffline(formData, selectedD);
        updateLocalStatus(); // ഓഫ്ലൈൻ ആണെങ്കിലും സ്റ്റാറ്റസ് മാറ്റുന്നു
        btn.prop('disabled', false).text(originalText);
        return;
    }

    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'addExpense', data: formData }) })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                Swal.fire({ icon: 'success', title: 'Saved!', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
                updateLocalStatus(); // Success ആണെങ്കിൽ സ്റ്റാറ്റസ് മാറ്റുന്നു
                resetExpenseForm(selectedD);
            } else {
                saveExpenseOffline(formData, selectedD);
                updateLocalStatus();
            }
        })
        .catch(err => {
            saveExpenseOffline(formData, selectedD);
            updateLocalStatus();
        })
        .finally(() => btn.prop('disabled', false).text(originalText));
}


// 🔥 REFUND TOGGLE & AUTO-FILL LOGIC
window.handleRefundToggle = function (oid, index) {
    let btn = $(`#ref-btn-${oid}`);

    // 1. CLEAR LOGIC: ബട്ടൺ ഓൾറെഡി ആക്റ്റീവ് ആണെങ്കിൽ ഫോം ക്ലിയർ ചെയ്യുന്നു
    if (btn.hasClass('active-refund')) {
        clearRefundForm();
        return;
    }

    // 2. CONFIRMATION: റീഫണ്ട് പ്രോസസ്സ് തുടങ്ങുന്നതിന് മുൻപ് ചോദിക്കുന്നു
    confirmAction(`Order ${oid} റീഫണ്ട് ചെയ്യണോ?`, () => {
        let order = allOrders[index];
        if (!order) return;

        // പഴയ ആക്റ്റീവ് ബട്ടണുകൾ മാറ്റുന്നു
        $('.btn-refund-icon').removeClass('active-refund');
        // ഈ ബട്ടൺ ഹൈലൈറ്റ് ചെയ്യുന്നു
        btn.addClass('active-refund');

        // എമൗണ്ട് കണക്കാക്കുന്നു
        let priceInfo = calculatePriceInfo(order.quantity, order.state);
        let amount = parseInt(priceInfo.total.replace(/[^0-9]/g, '')) || 0;

        // Add Expense ടാബിലേക്ക് മാറുന്നു
        let tabTrigger = new bootstrap.Tab(document.querySelector('#tab-expense'));
        tabTrigger.show();

        // ഫോം ഫിൽ ചെയ്യുന്നു
        setTimeout(() => {
            $('#exp-category').val('Refund');
            $('#exp-vendor').val(order.name + " (Ref #" + order.orderid + ")");
            $('#exp-amount').val(amount);
            $('#exp-desc').val("Refund for Order " + order.orderid);

            // വിഷ്വൽ ഇൻഡിക്കേഷൻ
            $('#expense-form').css('border', '2px solid #dc2626').css('padding', '10px').css('border-radius', '15px');

            showToast('info', 'Refund details filled! 💸');
        }, 300);
    });
};

// 🔥 ഫോം ക്ലിയർ ചെയ്യാനുള്ള ഫംഗ്‌ഷൻ
window.clearRefundForm = function () {
    $('.btn-refund-icon').removeClass('active-refund');
    $('#expense-form')[0].reset();
    $('#exp-category').val('Materials');
    $('#expense-form').css('border', 'none');

    // ടാബ് തിരികെ ഓവർവ്യൂവിലേക്ക് മാറ്റുന്നു (ഓപ്ഷണൽ)
    let tabTrigger = new bootstrap.Tab(document.querySelector('#tab-overview'));
    tabTrigger.show();

    showToast('info', 'Form cleared and reset ✅');
};

// Helper: Offline Save
function saveExpenseOffline(formData, selectedD) {
    let pendingExp = JSON.parse(localStorage.getItem('pendingExpenses') || "[]");
    pendingExp.push(formData);
    localStorage.setItem('pendingExpenses', JSON.stringify(pendingExp));

    showToast('info', 'Saved Offline! 📶 Sync later.');
    updateSyncButtonUI();
    resetExpenseForm(selectedD);
}

// Helper: Form Reset
function resetExpenseForm(selectedD) {
    $('#expense-form')[0].reset();
    $('#exp-category').val('Materials');
    $('#partner-section').hide();
    $('#exp-vendor').prop('readonly', false).val('').attr('placeholder', 'Vendor Name / Person');
    $('.partner-card').removeClass('selected');
    $('.partner-card .check-icon').attr('class', 'far fa-circle text-muted check-icon');

    // 🔥 FIX: Reset cheyyumpozhum exact ippozhathe time varan
    if (expDatePicker) expDatePicker.setDate(new Date(), false);

    // ഇന്റർനെറ്റ് ഉണ്ടെങ്കിൽ മാത്രം ഡാഷ്‌ബോർഡ് ഡാറ്റ റിഫ്രഷ് ചെയ്യാൻ ശ്രമിക്കുക
    if (navigator.onLine) {
        fetchDashboardDataBg();
    }

    $('#tab-overview').click();
}

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

// 🔥 4. PARTNER BALANCE DECIMAL FIX (ആ വലിയ ഡെസിമൽ നമ്പറുകൾ കളയാൻ)
function renderPartnerList() {
    if (!dashboardData || !dashboardData.partners) return;
    let partners = dashboardData.partners;

    let html = `<div class="alert alert-warning p-2 mb-2 d-flex align-items-start gap-2 border-warning" style="font-size:10px; font-weight:700; background:#fff8e1; border-radius:8px;">
        <i class="fas fa-info-circle text-warning mt-1"></i> 
        <div>താഴെ കാണിക്കുന്ന തുക (Total Bal) എന്നത് അവരുടെ ഇതുവരെയുള്ള <b>എല്ലാ മാസത്തെയും ലാഭത്തിൽ നിന്നും അവർ എടുത്ത തുക കുറച്ചതിന് ശേഷമുള്ള</b> ബാക്കി ബാലൻസ് ആണ്.</div>
    </div>`;

    for (let [name, data] of Object.entries(partners)) {
        let totalBal = typeof data === 'object' ? data.curr : data;

        // 🔥 ഡെസിമൽ ഒഴിവാക്കി പക്കാ തുക ആക്കാൻ
        let formattedBal = Number(totalBal).toLocaleString('en-IN', { maximumFractionDigits: 0 });

        html += `
        <div class="partner-card" onclick="selectPartner('${name}')">
            <div class="d-flex align-items-center gap-2">
                <i class="fas fa-user-circle text-muted fs-4"></i>
                <div>
                    <div class="fw-bold small">${name}</div>
                    <div class="text-success fw-bold" style="font-size:11px;">Total Bal: ₹${formattedBal}</div>
                </div>
            </div>
            <i class="far fa-circle text-muted check-icon"></i>
        </div>`;
    }
    $('#partner-list').html(html);
}

function selectPartner(name) {
    $('.partner-card').removeClass('selected');
    $('.partner-card .check-icon').attr('class', 'far fa-circle text-muted check-icon');
    $(event.currentTarget).addClass('selected');
    $(event.currentTarget).find('.check-icon').attr('class', 'fas fa-check-circle text-success check-icon');
    $('#exp-vendor').val(name);
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
    setTimeout(() => {
        if (typeof html5QrCode !== 'undefined' && html5QrCode) html5QrCode.resume();
        isScanProcessing = false;
    }, 500);
}

// 🔥 TOGGLE SORT FUNCTION
function toggleSort() {
    currentSortDir = (currentSortDir === 'desc') ? 'asc' : 'desc';

    // Update Icon
    const icon = currentSortDir === 'desc' ? 'fa-sort-amount-down' : 'fa-sort-amount-up';
    $('#btn-sort i').attr('class', `fas ${icon}`);

    renderTabs(allOrders); // Re-render
}

// 🔥 OPEN WHATSAPP (JUST OPEN)
function openSimpleWA(index) {
    const d = allOrders[index];
    let phoneNum = "";

    // Get value from dropdown
    const dropdown = document.getElementById(`wa-select-${index}`);
    if (dropdown && dropdown.value) phoneNum = dropdown.value;
    else phoneNum = d.whatsapp || d.phone;

    phoneNum = String(phoneNum).replace(/[^0-9]/g, '');
    if (phoneNum.length === 10) phoneNum = '91' + phoneNum;

    window.open(`https://wa.me/${phoneNum}`, '_blank');
}

// 🔥 SERVER SIDE SEARCH FUNCTION
function searchOnServer(term) {
    let btn = $('#list-search button.btn-dark');
    let originalText = btn.html();
    btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> SEARCHING SHEET...');

    fetch(`${scriptURL}?action=searchGlobal&query=${term}`)
        .then(res => res.json())
        .then(data => {
            btn.prop('disabled', false).html(originalText);

            if (data.result === 'success' && data.orders.length > 0) {
                // റിസൾട്ട് കാണിക്കാൻ ലിസ്റ്റ് ക്ലിയർ ചെയ്യുന്നു
                const searchList = document.getElementById('list-search');
                searchList.innerHTML = `<div class="alert alert-success small fw-bold text-center">Found ${data.orders.length} result(s) from Server!</div>`;

                data.orders.forEach(d => {
                    // പുതിയ ഡാറ്റ ലോക്കൽ ലിസ്റ്റിലേക്ക് താൽക്കാലികമായി ചേർക്കുന്നു (കാർഡ് ജനറേറ്റ് ചെയ്യാൻ)
                    // ഡ്യൂപ്ലിക്കേറ്റ് വരാതിരിക്കാൻ ചെക്ക് ചെയ്യുന്നു
                    let exists = allOrders.findIndex(o => o.orderid === d.orderid);
                    if (exists === -1) allOrders.push(d);

                    let idx = allOrders.findIndex(o => o.orderid === d.orderid);
                    searchList.innerHTML += createCardHTML(d, idx, 'search', d.Status);
                });

            } else {
                Swal.fire({ icon: 'warning', title: 'Not Found', text: 'No orders found in the Sheet.', toast: true, position: 'top' });
            }
        })
        .catch(err => {
            btn.prop('disabled', false).html(originalText);
            alert("Search Failed!");
        });
}