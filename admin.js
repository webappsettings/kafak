const scriptURL = "https://script.google.com/macros/s/AKfycbxvG8a6HlWtTFUyRVVM3tBofrlv0sJixLoYLoE4TztxDzPMgcHhZ1yzfz3FcXnxZTfDHg/exec";

// Beep Sound for Scanner
const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT1GAg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAgEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/");
let isScanProcessing = false;
let currentSortDir = 'desc';

// 🔥 GLOBAL: Contact Selection Memory
let contactMem = JSON.parse(localStorage.getItem('contactMem') || "{}");


window.saveContactSelection = function (oid, val) {
    contactMem[oid] = val; // സേവ് ചെയ്യുന്നു
    localStorage.setItem('contactMem', JSON.stringify(contactMem));
}

function playBeep() {
    let ctx = new (window.AudioContext || window.webkitAudioContext)();
    let osc = ctx.createOscillator();
    osc.type = "sine"; osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination); osc.start();
    setTimeout(() => osc.stop(), 100);
}

// 🔥 ADMIN META HELPER (Code: M=Mobile, W=WhatsApp, A=Alt, P=Printed, T=Tracked)
// 🔥 ADMIN META HELPER (Updated: G=Paid, P=Printed)
function getMetaStatus(metaStr) {
    metaStr = String(metaStr || '');

    // Check Contact Type
    let contact = 'phone'; // Default (M)
    if (metaStr.includes('G')) contact = 'paid';      // 'G' for Google Pay/Paid Number
    else if (metaStr.includes('W')) contact = 'whatsapp';
    else if (metaStr.includes('A')) contact = 'alt';

    return {
        contact: contact,
        isPrinted: metaStr.includes('P'), // 'P' for Printed Label
        isTracked: metaStr.includes('T')
    };
}


// Update Meta String Locally & Queue for Sync
// 🔥 UPDATED: ADMIN META UPDATE (Saves Old State for Undo)
function updateAdminMeta(oid, type, value) {
    let order = allOrders.find(o => o.orderid === oid);
    if (!order) return;

    let currentMeta = String(order.adminMeta || '');
    let oldMeta = currentMeta; // 🔥 പഴയ അവസ്ഥ ഇവിടെ സേവ് ചെയ്യുന്നു

    let newMeta = currentMeta;

    // 1. Contact Selection (M, W, A)
    if (type === 'contact') {
        newMeta = newMeta.replace(/[MWA]/g, '');
        newMeta += value;
    }
    // 2. Printed (P)
    else if (type === 'printed') {
        if (!newMeta.includes('P')) newMeta += 'P';
    }
    // 3. Tracked (T)
    else if (type === 'tracked') {
        if (!newMeta.includes('T')) newMeta += 'T';
    }

    // Save Locally
    order.adminMeta = newMeta;
    localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));

    // Queue for Sync
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    let existingUpd = updates.find(u => u.oid === oid && u.action === 'meta');

    if (existingUpd) {
        existingUpd.meta = newMeta;
        // പഴയത് സേവ് ചെയ്തിട്ടില്ലെങ്കിൽ മാത്രം സേവ് ചെയ്യുക (ആദ്യത്തെ മാറ്റം നിലനിർത്താൻ)
        if (existingUpd.oldMeta === undefined) existingUpd.oldMeta = oldMeta;
    } else {
        // 🔥 ഇവിടെ oldMeta കൂടി ചേർക്കുന്നു
        updates.push({
            oid: oid,
            action: 'meta',
            meta: newMeta,
            oldMeta: oldMeta,
            status: order.Status
        });
    }

    localStorage.setItem('pendingUpdates', JSON.stringify(updates));
    updateSyncButtonUI();
    renderTabs(allOrders); // UI ഉടനടി മാറാൻ
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
    const user = document.getElementById('adminUser').value.trim(); // Trim spaces
    const pass = document.getElementById('adminPass').value;

    // 🔥 Master Admin & Regular Admin Check
    // Master: master / kafak123
    // Admin: admin / kafak123

    if ((user === "admin" || user === "master") && pass === "kafak123") {
        try {
            localStorage.setItem('kafakAdmin', 'true');
            localStorage.setItem('kafakAdminUser', user); // 🔥 Username സേവ് ചെയ്യുന്നു
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
// 🔥 NEW: URL Search Logic Separate Function
// 🔥 1. NEW: URL Search Logic Function (ഇത് admin.js-ൽ എവിടെയെങ്കിലും ചേർക്കുക)
function handleUrlSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQ = urlParams.get('search');

    if (searchQ) {
        // Search Box-ൽ ഐഡി സെറ്റ് ചെയ്യുന്നു
        document.getElementById('searchInput').value = searchQ;
        // ഫിൽട്ടർ ചെയ്യുന്നു (കാർഡ് കാണിക്കുന്നു)
        filterOrders();

        // 🔥 URL ക്ലീൻ ചെയ്യുന്നു (ഇത് ഉള്ളതുകൊണ്ട് Refresh അടിച്ചാൽ ഫുൾ ഡാറ്റ വരും)
        window.history.replaceState(null, '', 'admin.html');
    }
}

// 🔥 2. UPDATED: FETCH ORDERS (Fixes Search Issue)
function fetchOrders(forceLoad = false) {
    let savedOrders = localStorage.getItem('allOrdersCache');
    let hasData = false;

    // A. Cache ഉണ്ടെങ്കിൽ ലോഡ് ചെയ്യുന്നു
    if (savedOrders) {
        allOrders = JSON.parse(savedOrders);
        renderTabs(allOrders);
        hasData = true;

        // ✅ FIX: Cache ഉണ്ടെങ്കിലും ഇവിടെ വെച്ച് തന്നെ സെർച്ച് നടക്കും
        handleUrlSearch();
    }

    // Cache ഉണ്ടെങ്കിൽ, Force Load (Refresh) അല്ലെങ്കിൽ ഇവിടെ വെച്ച് നിർത്തും
    if (hasData && !forceLoad) return;

    // B. Server Fetch (Refresh അടിക്കുമ്പോൾ നടക്കുന്നത്)
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

                // ✅ FIX: പുതിയ ഡാറ്റ വന്നാലും സെർച്ച് നടക്കും
                handleUrlSearch();
            }
        })
        .catch(err => {
            document.getElementById('loader').style.display = 'none';
            if (!hasData) alert("Network Error!");
        });
}


function renderTabs(orders) {
    // 1. SELECT DOM ELEMENTS (For all Sub-tabs)
    const listNew = document.getElementById('list-sub-new');
    const listSent = document.getElementById('list-sub-sent');
    const listPaidNew = document.getElementById('list-paid-new');
    const listPaidPrinted = document.getElementById('list-paid-printed');
    const listDispNew = document.getElementById('list-disp-new');
    const listDispTracked = document.getElementById('list-disp-tracked');
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    // 4. HELPER: Get Effective Status & Dates
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

    window.paidRankMap = {};
    let sourceOrders = (typeof allOrders !== 'undefined' && allOrders.length > 0) ? allOrders : orders;

    // Status = Paid ആയവ മാത്രം എടുക്കുന്നു
    let paidOrds = sourceOrders.filter(o => getOrderInfo(o).status === 'Paid');

    // പഴയത് മുതൽ പുതിയത് എന്ന ക്രമത്തിൽ (Oldest First) സോർട്ട് ചെയ്യുന്നു
    paidOrds.sort((a, b) => {
        let dateA = new Date(getOrderInfo(a).pDateStr);
        let dateB = new Date(getOrderInfo(b).pDateStr);
        return dateA - dateB;
    });

    // ഓരോന്നിനും നമ്പർ നൽകുന്നു
    paidOrds.forEach((o, i) => {
        window.paidRankMap[o.orderid] = i + 1;
    });

    // 2. CLEAR LISTS & RESTORE BUTTONS
    if (listNew) listNew.innerHTML = '';
    if (listSent) listSent.innerHTML = '';

    // 🔥 Restore "Paid" Tab Buttons (Scan, Select All, Print) in New Section
    // 🔥 Restore "Paid" Tab Buttons (New Section)
    if (listPaidNew) {
        listPaidNew.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-1 w-100">
            <button onclick="startScanner('dispatch')" class="btn btn-sm btn-dark rounded-pill px-3 fw-bold small"><i class="fas fa-qrcode"></i> Scan</button>
            <div class="d-flex gap-2">
                <button onclick="toggleSelectAll()" class="btn btn-sm btn-light fw-bold text-secondary border-0 small btn-select-all"><i class="far fa-square"></i> All</button>
                <button onclick="printSelected()" class="btn btn-sm btn-print-yellow rounded-pill px-3 fw-bold small">🖨️ Print</button>
            </div>
        </div>`;
    }

    // 🔥 NEW: Restore Buttons for "Printed" Section as well
    if (listPaidPrinted) {
        listPaidPrinted.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-1 w-100">
            <button onclick="startScanner('dispatch')" class="btn btn-sm btn-dark rounded-pill px-3 fw-bold small"><i class="fas fa-qrcode"></i> Scan</button>
            <div class="d-flex gap-2">
                <button onclick="toggleSelectAll()" class="btn btn-sm btn-light fw-bold text-secondary border-0 small btn-select-all"><i class="far fa-square"></i> All</button>
                <button onclick="printSelected('printed')" class="btn btn-sm btn-print-yellow rounded-pill px-3 fw-bold small">🖨️ Reprint</button>
            </div>
        </div>`;
    }

    // 🔥 Restore "Dispatched" Tab Buttons (Courier Scan) in New Section
    if (listDispNew) {
        listDispNew.innerHTML = `
        <div class="text-center mb-3 w-100">
            <button onclick="startScanner('tracking')" class="btn btn-outline-primary rounded-pill px-4 py-2 fw-bold border-2 small">
                <i class="fas fa-barcode"></i> Courier Scan
            </button>
        </div>`;
    }
    if (listDispTracked) listDispTracked.innerHTML = '';

    // 3. INITIALIZE COUNTERS
    let counts = { pending: 0, paid: 0, dispatched: 0 };
    let btlCounts = { pending: 0, paid: 0, dispatched: 0 };
    let subCounts = { new: 0, sent: 0, paid_new: 0, paid_print: 0, disp_new: 0, disp_track: 0 };



    // 5. SORTING LOGIC
    orders.sort((a, b) => {
        let infoA = getOrderInfo(a);
        let infoB = getOrderInfo(b);

        const statusPriority = { 'Pending': 1, 'Sent': 1, 'Paid': 2, 'Dispatched': 3, 'Completed': 4, 'Archive': 5 };
        let statA = statusPriority[infoA.status] || 9;
        let statB = statusPriority[infoB.status] || 9;

        if (statA !== statB) return statA - statB;

        let dateA, dateB;
        if (statA === 1) { dateA = infoA.tDate; dateB = infoB.tDate; }      // Pending/Sent
        else if (statA === 2) { dateA = infoA.pDate; dateB = infoB.pDate; } // Paid
        else if (statA === 3) { dateA = infoA.dDate; dateB = infoB.dDate; } // Dispatched
        else { dateA = infoA.tDate; dateB = infoB.tDate; }

        return (currentSortDir === 'desc') ? dateB - dateA : dateA - dateB;
    });

    // ---------------------------------------------------------
    // 6. PRE-CALCULATE COURIER TOTALS (SEPARATE FOR NEW & TRACKED)
    // ---------------------------------------------------------
    let dispNewCostMap = {};
    let dispTrackCostMap = {};

    orders.forEach(o => {
        let { status, dDateStr } = getOrderInfo(o);
        if (status === 'Dispatched') {
            let lbl = getTimelineLabel(dDateStr);
            let cost = parseInt(o.actualCourierCost) || 0;

            // Check if tracked to split the cost
            let meta = getMetaStatus(o.adminMeta);
            if (o.tracking || meta.isTracked) {
                dispTrackCostMap[lbl] = (dispTrackCostMap[lbl] || 0) + cost;
            } else {
                dispNewCostMap[lbl] = (dispNewCostMap[lbl] || 0) + cost;
            }
        }
    });

    // ---------------------------------------------------------
    // 7. RENDER LOOP (Distribute to Sub-lists)
    // ---------------------------------------------------------
    let lastDateMap = { new: '', sent: '', paid_new: '', paid_print: '', disp_new: '', disp_track: '' };

    orders.forEach((d, i) => {
        let { status, dDateStr, pDateStr } = getOrderInfo(d);
        d.paidDate = pDateStr;
        d['Dispatched Date'] = dDateStr;

        if (status === 'Completed' || status === 'Archive') return;

        let meta = getMetaStatus(d.adminMeta);
        let targetList = null;
        let type = '';
        let dateKey = '';

        // A. PENDING & SENT
        if (status === 'Pending') {
            targetList = listNew; type = 'pending'; dateKey = 'new';
            counts.pending++; subCounts.new++;
        }
        else if (status === 'Sent') {
            targetList = listSent; type = 'pending'; dateKey = 'sent';
            counts.pending++; subCounts.sent++;
        }
        // B. PAID
        else if (status === 'Paid') {
            type = 'paid'; counts.paid++;
            if (meta.isPrinted) {
                targetList = listPaidPrinted; dateKey = 'paid_print'; subCounts.paid_print++;
            } else {
                targetList = listPaidNew; dateKey = 'paid_new'; subCounts.paid_new++;
            }
        }
        // C. DISPATCHED
        else if (status === 'Dispatched') {
            type = 'dispatched'; counts.dispatched++;
            if (d.tracking || meta.isTracked) {
                targetList = listDispTracked; dateKey = 'disp_track'; subCounts.disp_track++;
            } else {
                targetList = listDispNew; dateKey = 'disp_new'; subCounts.disp_new++;
            }
        }

        if (targetList) {
            let qty = parseInt(d.quantity) || 0;
            btlCounts[type] += qty;

            // Determine Date for Header
            let displayDateRaw = d.timestamp;
            if (type === 'paid') displayDateRaw = pDateStr;
            if (type === 'dispatched') displayDateRaw = dDateStr;

            let dateLabel = getTimelineLabel(displayDateRaw);

            // 🔥 STICKY DATE HEADER (With Separate Totals)
            if (dateLabel !== lastDateMap[dateKey]) {
                let extraHtml = '';

                // Show Courier Cost ONLY for Dispatched Tabs (Separately)
                let currentCost = 0;
                if (dateKey === 'disp_new') currentCost = dispNewCostMap[dateLabel] || 0;
                if (dateKey === 'disp_track') currentCost = dispTrackCostMap[dateLabel] || 0;

                if (currentCost > 0) {
                    extraHtml = `<span style="opacity:0.9; font-weight:600; margin-left:8px; padding-left:8px; border-left:1px solid #999;">🚚 ₹${currentCost}</span>`;
                }

                targetList.innerHTML += `<div class="col-12 sticky-date-wrapper"><div class="timeline-badge">${dateLabel}${extraHtml}</div></div>`;
                lastDateMap[dateKey] = dateLabel;
            }

            // Render Card
            targetList.innerHTML += createCardHTML(d, i, type, status, false);
        }
    });

    // ---------------------------------------------------------
    // 8. UPDATE BADGES (With Bottle Counts & State Dots)
    // ---------------------------------------------------------

    updateBadgeUI('count-pending', counts.pending, btlCounts.pending);
    updateBadgeUI('count-paid', counts.paid, btlCounts.paid);
    updateBadgeUI('count-dispatched', counts.dispatched, btlCounts.dispatched);

    // Sub-Tab Badges (Pending)
    const setBadge = (id, val) => {
        if (document.getElementById(id)) document.getElementById(id).innerText = val;
    };
    setBadge('badge-sub-new', subCounts.new);
    setBadge('badge-sub-sent', subCounts.sent);

    // 🔥 STATE STATS COLLECTOR
    let stateStats = {
        paid_new: { lak: 0, kar: 0, tn: 0, other: 0 },
        paid_print: { lak: 0, kar: 0, tn: 0, other: 0 },
        disp_new: { lak: 0, kar: 0, tn: 0, other: 0 },
        disp_track: { lak: 0, kar: 0, tn: 0, other: 0 }
    };

    // 🔥 BOTTLE & STATE COUNTER LOOP
    let pNewQty = 0, pPrintQty = 0, dNewQty = 0, dTrackQty = 0;

    orders.forEach(o => {
        let q = parseInt(o.quantity) || 0;
        let s = String(o.state || '').toUpperCase().trim();
        let meta = getMetaStatus(o.adminMeta);

        // 1. Identify Non-Kerala State
        let stateKey = null;
        if (s && s !== 'KERALA') {
            if (s.includes('LAK')) stateKey = 'lak';       // Lakshadweep
            else if (s.includes('KARN')) stateKey = 'kar'; // Karnataka
            else if (s.includes('TAMIL') || s.includes('TN')) stateKey = 'tn'; // Tamil Nadu
            else stateKey = 'other'; // Other States
        }

        // 2. Paid Tab Stats
        if (o.Status === 'Paid') {
            if (meta.isPrinted) {
                pPrintQty += q;
                if (stateKey) stateStats.paid_print[stateKey]++;
            } else {
                pNewQty += q;
                if (stateKey) stateStats.paid_new[stateKey]++;
            }
        }
        // 3. Dispatched Tab Stats
        else if (o.Status === 'Dispatched') {
            if (o.tracking || meta.isTracked) {
                dTrackQty += q;
                if (stateKey) stateStats.disp_track[stateKey]++;
            } else {
                dNewQty += q;
                if (stateKey) stateStats.disp_new[stateKey]++;
            }
        }
    });

    // 🔥 HELPER: GENERATE COLORED DOTS HTML
    const getDotsHtml = (stats) => {
        let html = '';
        // Blue Dot (Lakshadweep)
        if (stats.lak > 0) html += `<span class="state-dot" style="background:#0dcaf0;" title="Lakshadweep">${stats.lak}</span>`;
        // Dark Yellow Dot (Karnataka)
        if (stats.kar > 0) html += `<span class="state-dot" style="background:#d97706;" title="Karnataka">${stats.kar}</span>`;
        // Coffee Dot (Tamil Nadu)
        if (stats.tn > 0) html += `<span class="state-dot" style="background:#795548;" title="Tamil Nadu">${stats.tn}</span>`;
        // Magenta Dot (Others)
        if (stats.other > 0) html += `<span class="state-dot" style="background:#d63384;" title="Other State">${stats.other}</span>`;

        return html ? `<div class="d-flex gap-1 ms-1 align-items-center">${html}</div>` : '';
    };

    // 🔥 INJECT CSS FOR DOTS (One time)
    if (!$('#state-dot-css').length) {
        $('<style id="state-dot-css">').html(`
            .state-dot {
                width: 14px; height: 14px;
                border-radius: 50%;
                color: white;
                font-size: 8px;
                font-weight: bold;
                display: flex; justify-content: center; align-items: center;
                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
        `).appendTo('head');
    }

    // 🔥 UPDATE BADGES WITH BOTTLES & DOTS
    // 1. Paid > New
    let elPaidNew = document.getElementById('badge-paid-new');
    if (elPaidNew) {
        elPaidNew.innerHTML = `${subCounts.paid_new} <span style="font-size:0.8em; opacity:0.8;"><i class="fas fa-wine-bottle" style="font-size:9px;"></i> ${pNewQty}</span> ${getDotsHtml(stateStats.paid_new)}`;
    }

    // 2. Paid > Printed
    let elPaidPrint = document.getElementById('badge-paid-printed');
    if (elPaidPrint) {
        elPaidPrint.innerHTML = `${subCounts.paid_print} <span style="font-size:0.8em; opacity:0.8;"><i class="fas fa-wine-bottle" style="font-size:9px;"></i> ${pPrintQty}</span> ${getDotsHtml(stateStats.paid_print)}`;
    }

    // 3. Dispatched > New
    let elDispNew = document.getElementById('badge-disp-new');
    if (elDispNew) {
        elDispNew.innerHTML = `${subCounts.disp_new} <span style="font-size:0.8em; opacity:0.8;"><i class="fas fa-wine-bottle" style="font-size:9px;"></i> ${dNewQty}</span> ${getDotsHtml(stateStats.disp_new)}`;
    }

    // 4. Dispatched > Tracked
    let elDispTrack = document.getElementById('badge-disp-tracked');
    if (elDispTrack) {
        elDispTrack.innerHTML = `${subCounts.disp_track} <span style="font-size:0.8em; opacity:0.8;"><i class="fas fa-wine-bottle" style="font-size:9px;"></i> ${dTrackQty}</span> ${getDotsHtml(stateStats.disp_track)}`;
    }

    updateSyncButtonUI();
    checkSelectAllStatus();

    let savedScroll = localStorage.getItem('lastScrollPosition');
    if (savedScroll && parseInt(savedScroll) > 0) {
        setTimeout(() => { window.scrollTo(0, parseInt(savedScroll)); }, 100);
    }
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
    if (type === 'search') {
        if (currentStatus === 'Pending' || currentStatus === 'Sent') type = 'pending';
        else if (currentStatus === 'Paid') type = 'paid';
        else if (currentStatus === 'Dispatched') type = 'dispatched';
    }

    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => String(val || '').toUpperCase();
    let dateObj = new Date(d.timestamp);
    let formattedDate = dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    // Customer Stats
    let currentPhone = String(d.phone || '').replace(/[^0-9]/g, '');
    let custHistory = (typeof allOrders !== 'undefined') ? allOrders.filter(o => String(o.phone).replace(/[^0-9]/g, '') === currentPhone) : [];
    let totalOrders = custHistory.length;
    let totalBottles = custHistory.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);

    // Color Logic
    let statusColor = 'secondary';
    if (currentStatus === 'Pending') statusColor = 'warning text-dark';
    if (currentStatus === 'Sent') statusColor = 'primary';
    if (currentStatus === 'Paid') statusColor = 'success';
    if (currentStatus === 'Refunded') statusColor = 'danger';
    if (currentStatus === 'Dispatched') statusColor = 'info text-dark';

    let langBadge = d.language ? `<span class="badge rounded-pill border ms-1 text-secondary" style="font-size:9px; background:#f8f9fa;">${d.language.toUpperCase()}</span>` : '';

    // Action Buttons
    let archiveBtn = (currentStatus === 'Sent' || currentStatus === 'Pending')
        ? `<button onclick="highlightCard(this); archiveOrder('${d.orderid}')" class="btn-archive-mini ms-1" title="Archive"><i class="fas fa-archive"></i></button>` : '';
    let refundBtn = (currentStatus !== 'Refunded' && currentStatus !== 'Completed') ? `<button id="ref-btn-${d.orderid}" onclick="event.stopPropagation(); highlightCard(this); handleRefundToggle('${d.orderid}', ${index})" class="btn-refund-icon ms-1" title="Refund"><i class="fas fa-undo-alt"></i></button>` : '';

    // Meta Badges ('P' for Printed)
    let meta = getMetaStatus(d.adminMeta);
    let metaBadges = '';
    if (meta.isPrinted) metaBadges += `<span class="dot-indicator brown" title="Printed"></span>`;
    if (meta.isTracked) metaBadges += `<span class="dot-indicator blue" title="Tracked"></span>`;

    let rankBadge = '';
    if (currentStatus === 'Paid' && window.paidRankMap && window.paidRankMap[d.orderid]) {
        rankBadge = `<span class="badge rounded-pill bg-warning text-dark border border-dark shadow-sm" style="font-size:11px; margin-right:4px; font-weight:800;">#${window.paidRankMap[d.orderid]}</span>`;
    }

    // Fraud Alert
    let fraudAlertHtml = '';
    if (currentStatus === 'Pending' || currentStatus === 'Sent') {
        let linkedOrder = checkCrossLinking(d);
        if (linkedOrder) {
            let linkColor = linkedOrder.Status === 'Paid' ? 'danger' : 'warning';
            let linkIcon = linkedOrder.Status === 'Paid' ? 'exclamation-triangle' : 'link';
            fraudAlertHtml = `
            <div class="alert alert-${linkColor} p-2 mb-2 mt-1 shadow-sm border-${linkColor}" style="border-radius:8px;">
                <div style="font-size:11px; font-weight:700; color:#b91c1c;">
                    <i class="fas fa-${linkIcon}"></i> Linked with: ${linkedOrder.name}
                </div>
                <div style="font-size:10px; color:#555; margin-top:2px;">ID: <b>${linkedOrder.orderid}</b></div>
                <div class="text-end mt-1"><button onclick="highlightCard(this); archiveOrder('${d.orderid}')" class="btn btn-sm btn-outline-danger fw-bold shadow-sm" style="font-size:9px; padding: 2px 8px;"><i class="fas fa-archive"></i> ARCHIVE</button></div>
            </div>`;
        }
    }

    // 🔥 HEADER: COPY ICON MOVED OUTSIDE
    let headerLeft = `
        <div class="d-flex align-items-center flex-wrap gap-2">
            ${rankBadge} 
            <span class="badge rounded-pill bg-dark" style="font-size:11px;">${d.orderid}</span>
            <i class="far fa-copy text-muted" style="cursor:pointer; font-size:12px;" onclick="event.stopPropagation(); copyToClipboard('${d.orderid}')" title="Copy ID"></i>
            ${metaBadges} 
            <span class="badge rounded-pill bg-${statusColor}" style="font-size:10px;">${currentStatus}</span>
            ${refundBtn} ${langBadge} ${archiveBtn}
        </div>`;

    // Top Actions (Updated for WhatsApp Target)
    let topActions = `<a href="order.html?oid=${d.orderid}" target="_blank" class="btn-top-action" onclick="highlightCard(this)">✏️ EDIT</a>` +
        `<button onclick="highlightCard(this); printSingle(${index})" class="btn-top-action">🖨️</button>`;

    if (type === 'dispatched') {
        topActions = `<button onclick="event.stopPropagation(); highlightCard(this); updateOrder('${d.orderid}', 'Paid')" class="btn-top-action">Revert</button>` + topActions;
    } else if (type === 'paid') {
        // 🔥 FIX: Passed 'index' to sendPaymentWA
        topActions = `<div class="d-flex gap-1"><button onclick="event.stopPropagation(); sendPaymentWA('${d.orderid}', ${index})" class="btn-top-action" style="background:#25D366; color:white; border:none;" title="Send Receipt"><i class="fab fa-whatsapp"></i></button><button onclick="event.stopPropagation(); highlightCard(this); updateOrder('${d.orderid}', 'Sent')" class="btn-top-action">Revert</button>${topActions}</div>`;
    }

    let paidTimeHTML = '';
    if ((type === 'paid' || currentStatus === 'Paid') && d.paidDate) {
        let pDate = new Date(d.paidDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        paidTimeHTML = `<div class="mb-2 px-2 py-1 bg-success bg-opacity-10 border border-success border-opacity-25 rounded small text-success fw-bold" style="font-size:11px; display:inline-block;"><i class="fas fa-check-circle me-1"></i> Paid on: ${pDate}</div>`;
    }

    // 🔥 CONTACT SELECTOR (Using 'G' for Paid)
    let selectedContact = meta.contact;
    let uniqueContacts = new Map();
    const cleanNum = (n) => String(n || '').replace(/[^0-9]/g, '');

    if (d.whatsapp) uniqueContacts.set(cleanNum(d.whatsapp), { val: d.whatsapp, label: `📲 WA: ${d.whatsapp}`, type: 'whatsapp' });
    if (d.phone && !uniqueContacts.has(cleanNum(d.phone))) uniqueContacts.set(cleanNum(d.phone), { val: d.phone, label: `📞 PH: ${d.phone}`, type: 'phone' });
    if (d.altphone && !uniqueContacts.has(cleanNum(d.altphone))) uniqueContacts.set(cleanNum(d.altphone), { val: d.altphone, label: `☎️ ALT: ${d.altphone}`, type: 'alt' });

    // Add Paid Number
    if (d.paidNum && !uniqueContacts.has(cleanNum(d.paidNum))) {
        uniqueContacts.set(cleanNum(d.paidNum), { val: d.paidNum, label: `💰 PAID: ${d.paidNum}`, type: 'paid' });
    }

    let opts = '';
    let selType = selectedContact;
    if (!d.adminMeta) selType = 'whatsapp';

    uniqueContacts.forEach((v, k) => {
        let isSelected = (v.type === selType) ? 'selected' : '';
        // Codes: W=WA, A=Alt, M=Mobile, G=Paid (Google Pay)
        let code = (v.type === 'whatsapp') ? 'W' : (v.type === 'alt' ? 'A' : (v.type === 'paid' ? 'G' : 'M'));
        opts += `<option value="${code}" ${isSelected}>${v.label}</option>`;
    });

    let waSelectorHTML = `
    <div class="mt-2 mb-2 d-flex gap-1" onclick="highlightCard(this)">
        <select id="wa-select-${index}" 
            onchange="updateAdminMeta('${d.orderid}', 'contact', this.value);" 
            class="form-select form-select-sm shadow-none border-secondary text-secondary flex-grow-1" 
            style="font-size:11px; font-weight:700; padding:4px 25px 4px 8px;">${opts}</select>
        <button class="btn btn-sm btn-success" onclick="openSimpleWA(${index}, this)" title="Open WhatsApp Chat"><i class="fab fa-whatsapp"></i></button>
    </div>`;

    // Contact Visuals
    let contactMap = {};
    const addVisualContact = (iconType, number) => {
        if (!number) return;
        let numStr = String(number).trim();
        if (!contactMap[numStr]) contactMap[numStr] = [];
        let iconHTML = '';
        if (iconType === 'phone') iconHTML = '<i class="fas fa-phone-alt text-primary" title="Phone"></i>';
        if (iconType === 'wa') iconHTML = '<i class="fab fa-whatsapp text-success" style="font-weight:900;" title="WhatsApp"></i>';
        if (iconType === 'alt') iconHTML = '<i class="fas fa-phone-square text-secondary" title="Alt"></i>';
        if (iconType === 'paid') iconHTML = '<i class="fas fa-money-bill-wave text-success" title="Paid By"></i>';
        if (!contactMap[numStr].includes(iconHTML)) contactMap[numStr].push(iconHTML);
    };
    addVisualContact('phone', d.phone);
    addVisualContact('wa', d.whatsapp);
    addVisualContact('alt', d.altphone);
    if (d.paidNum) addVisualContact('paid', d.paidNum);

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
        buttons = `<div class="d-flex gap-2 w-100"><button class="btn-custom btn-wa flex-grow-1" onclick="highlightCard(this); sendWA(${index})"><i class="fab fa-whatsapp"></i> ${waBtnLabel}</button><button class="btn btn-primary shadow-sm border-0 d-flex align-items-center justify-content-center fw-bold" style="width:100px; border-radius:10px; background:#0d6efd;" onclick="highlightCard(this); updateOrder('${d.orderid}', '${currentStatus === 'Pending' ? 'Sent' : 'Paid'}')" title="Next Status"><i class="fas fa-arrow-right me-1"></i> NEXT</button></div>`;
    } else if (type === 'paid') {
        buttons = `<div class="d-flex gap-2 align-items-center w-100"><button class="btn-custom btn-dispatch flex-grow-1" onclick="highlightCard(this); updateOrder('${d.orderid}', 'Dispatched')">📦 DISPATCH</button><div style="width: 40px; display: flex; justify-content: center;"><input type="checkbox" class="order-cb" style="width: 22px; height: 22px; cursor: pointer;" value="${index}" onclick="event.stopPropagation(); checkSelectAllStatus();"></div></div>`;
        if (type === 'dispatched') {
            let trackNum = d.tracking || '';
            let trackLink = `https://www.google.com/search?q=${d.provider || 'DTDC'}+tracking+${trackNum}`;

            let dispDateStr = d['Dispatched Date'] || d.actionDate || d.timestamp;
            let dateObj = new Date(dispDateStr);
            let formattedDispDate = dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

            let dateHtml = `<div style="background:#f0fdf4; border:1px solid #dcfce7; padding:8px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;"><div style="font-size:11px; color:#166534; font-weight:700;"><i class="fas fa-shipping-fast me-1"></i> Dispatched: ${formattedDispDate}</div><button onclick="event.stopPropagation(); editDispatchDate('${d.orderid}', '${dispDateStr}')" class="btn btn-sm btn-light border py-0 px-2" style="font-size:10px;">✏️</button></div>`;

            // 🔥 CUSTOM LOGIC: Red Button & Move to Tracked
            let meta = getMetaStatus(d.adminMeta);
            let isInTrackedList = (trackNum || meta.isTracked); // Already in Tracked Tab?

            let trkBtnHtml = '';

            if (trackNum) {
                // 🟢 Has Tracking Number (Green/Normal)
                trkBtnHtml = `<div class="d-flex gap-1 mb-2 w-100">
                <button class="btn-custom btn-track flex-grow-1" onclick="highlightCard(this); editTracking('${d.orderid}', '${trackNum}')">🚚 TRK: ${trackNum}</button>
                <a href="${trackLink}" target="_blank" onclick="event.stopPropagation(); highlightCard(this);" class="btn btn-custom btn-track d-flex align-items-center justify-content-center" style="width: 45px; flex:none;"><i class="fas fa-search"></i></a>
             </div>`;
            } else {
                // 🔴 No Tracking Number (Red Button)
                // Move Button (Only if currently in 'New' list)
                let moveBtn = !isInTrackedList ? `<button onclick="event.stopPropagation(); updateAdminMeta('${d.orderid}', 'tracked', 'T')" class="btn btn-outline-secondary ms-1 shadow-sm" title="Move to Tracked Tab" style="width:40px; border-radius:10px;"><i class="fas fa-arrow-right"></i></button>` : '';

                trkBtnHtml = `<div class="d-flex gap-1 mb-2 w-100">
                <button class="btn btn-danger flex-grow-1 fw-bold shadow-sm" style="border-radius:10px; font-size:12px; letter-spacing:0.5px;" onclick="highlightCard(this); editTracking('${d.orderid}', '')">⚠️ ADD TRK</button>
                ${moveBtn}
             </div>`;
            }

            buttons = `${dateHtml}${trkBtnHtml}<button class="btn-custom btn-complete w-100" onclick="highlightCard(this); updateOrder('${d.orderid}', 'Completed')">✅ Complete</button>`;
        }

        if (isCompact) {
            return `<div class="col-12 col-md-6 col-lg-4"><div class="order-card p-3 shadow-sm"><div class="d-flex justify-content-between align-items-center" style="cursor:pointer;" onclick="toggleCardUI(this.closest('.order-card'))"><div style="font-size:12px; flex-grow:1;"><div class="mb-1">${headerLeft}</div><div class="fw-bold text-dark" style="font-size:14px;">${safe(d.name)}</div><div class="text-muted small" style="font-size:10px;">${formattedDate}</div></div><button class="btn btn-sm btn-light border" onclick="event.stopPropagation(); highlightCard(this); updateOrder('${d.orderid}', 'Completed')">✅</button></div><div class="full-card-content mt-3 pt-3 border-top" style="display:none;">${createCardHTML(d, index, type, currentStatus, false)}</div></div></div>`;
        }

        return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>${headerLeft}</div>
                <div>${topActions}</div>
            </div>
            ${fraudAlertHtml}
            <div class="text-end text-muted small mb-2" style="font-size:10px; float: right">${formattedDate}</div>
            ${paidTimeHTML}
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


    // 🔥 UPDATED: POWERFUL SEARCH (Includes WA, Alt Phone & Space Fix)
    function filterOrders() {
        const term = document.getElementById('searchInput').value.trim().toLowerCase();
        const termClean = term.replace(/[^0-9]/g, ''); // സെർച്ച് ടേമിലെ നമ്പർ മാത്രം

        const clearBtn = document.getElementById('btn-clear-search');
        if (term.length > 0) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }

        const tabsContainer = document.getElementById('tabs-container');
        const searchResultsArea = document.getElementById('search-results-area');
        const searchList = document.getElementById('list-search');

        if (term.length > 0) {
            tabsContainer.style.display = 'none';
            searchResultsArea.style.display = 'block';
            searchList.innerHTML = '';

            let matches = allOrders.filter(o => {
                // 1. Text Search
                if ((o.name || '').toLowerCase().includes(term)) return true;
                if ((o.orderid || '').toLowerCase().includes(term)) return true;

                // 2. Powerful Number Search (Checks Phone, WA, Alt, AND PAID NUM)
                if (termClean.length > 0) {
                    let p = String(o.phone || '').replace(/[^0-9]/g, '');
                    let w = String(o.whatsapp || '').replace(/[^0-9]/g, '');
                    let paid = String(o.paidNum || '').replace(/[^0-9]/g, ''); // 🔥 New Field

                    if (p.includes(termClean)) return true;
                    if (w.includes(termClean)) return true;
                    if (paid.includes(termClean)) return true; // 🔥 Matches saved GPay number
                }
                return false;
            });

            if (matches.length === 0) {
                searchList.innerHTML = `<div class="text-center text-muted mt-3 mb-2">No local results found.</div>`;
            } else {
                matches.forEach(d => {
                    let originalIndex = allOrders.findIndex(x => x.orderid === d.orderid);
                    searchList.innerHTML += createCardHTML(d, originalIndex, 'search', d.Status);
                });
            }

            // Search Server Button
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

    // 🔥 ARCHIVE / DELETE ORDER FUNCTION
    // 🔥 ARCHIVE ORDER FUNCTION
    window.archiveOrder = function (oid) {
        // 1. Check User Permission
        const currentUser = localStorage.getItem('kafakAdminUser');
        const isMaster = (currentUser === 'master');

        // 2. HTML Content for Popup
        let htmlContent = `
        <div style="text-align:left; margin-bottom:10px;">
            <label style="font-size:12px; font-weight:700; color:#666;">SELECT REASON:</label>
            <select id="archive-reason" class="form-select mt-1" onchange="toggleReasonInput(this.value)">
                <option value="Duplicate">Duplicate Order (രണ്ടാമത് വന്നത്)</option>
                <option value="Test">Test Order (ടെസ്റ്റ് ചെയ്തത്)</option>
                <option value="Cancelled">Customer Cancelled</option>
                <option value="Other">Other (മറ്റുള്ളവ)</option>
            </select>
            <input type="text" id="archive-other-input" class="form-control mt-2" placeholder="എന്താണ് കാരണം?..." style="display:none;">
        </div>
    `;

        // 🔥 Master Admin ആണെങ്കിൽ മാത്രം DELETE Button കാണിക്കുന്നു
        let deleteBtnHtml = isMaster ?
            `<button type="button" onclick="confirmHardDelete('${oid}')" class="btn btn-danger w-100 mt-3 fw-bold"><i class="fas fa-trash-alt me-2"></i> PERMANENTLY DELETE</button>`
            : '';

        Swal.fire({
            title: 'Archive Order?',
            html: htmlContent + `<div id="del-btn-area">${deleteBtnHtml}</div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#444',
            confirmButtonText: 'Archive Order',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                let reason = document.getElementById('archive-reason').value;
                if (reason === 'Other') {
                    reason = document.getElementById('archive-other-input').value;
                }
                if (!reason) {
                    Swal.showValidationMessage('Please select or type a reason');
                    return false;
                }
                return reason;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                let reason = result.value;

                // ലോഡിംഗ് കാണിക്കുന്നു
                Swal.fire({ title: 'Archiving...', didOpen: () => Swal.showLoading() });

                // Server Call
                $.post(scriptURL, JSON.stringify({
                    action: 'bulkUpdateStatus',
                    updates: [{ oid: oid, status: 'Archive', reason: reason }]
                }), function (response) {
                    // 🔥 FIX: Response പരിശോധിക്കുന്നു
                    let data = response;
                    if (typeof response === 'string') {
                        try { data = JSON.parse(response); } catch (e) { }
                    }

                    if (data.result === 'success') {
                        // Local Update
                        let cached = JSON.parse(localStorage.getItem('allOrdersCache') || "[]");
                        let newCached = cached.filter(o => o.orderid !== oid);
                        localStorage.setItem('allOrdersCache', JSON.stringify(newCached));

                        Swal.fire('Archived!', 'Order moved to Archive.', 'success');
                        fetchOrders(true);
                    } else {
                        Swal.fire('Error', 'Failed to archive.', 'error');
                    }
                }).fail(() => {
                    Swal.fire('Error', 'Network connection failed.', 'error');
                });
            }
        });
    }

    // 🔥 Helper for Dropdown
    window.toggleReasonInput = function (val) {
        if (val === 'Other') document.getElementById('archive-other-input').style.display = 'block';
        else document.getElementById('archive-other-input').style.display = 'none';
    }

    // 🔥 HARD DELETE FUNCTION (Triggered from Button)
    window.confirmHardDelete = function (oid) {
        Swal.fire({
            title: 'Are you sure?',
            text: "ഇത് തിരിച്ചെടുക്കാൻ സാധിക്കില്ല! ഓർഡർ പൂർണ്ണമായും ഡിലീറ്റ് ആകും.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, DELETE IT!'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                fetch(scriptURL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'deleteOrder', oid: oid })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.result === 'success') {
                            // Local Cache Update
                            let cached = JSON.parse(localStorage.getItem('allOrdersCache') || "[]");
                            let newCached = cached.filter(o => o.orderid !== oid);
                            localStorage.setItem('allOrdersCache', JSON.stringify(newCached));

                            Swal.fire('Deleted!', 'Order has been deleted permanently.', 'success');
                            fetchOrders(true); // Refresh List
                        } else {
                            Swal.fire('Error', 'Failed to delete.', 'error');
                        }
                    })
                    .catch(err => Swal.fire('Error', 'Network Error', 'error'));
            }
        });
    }

    // 🔥 UPDATED: Auto generates Date & Time (Preserves Old Date)
    function updateOrder(oid, status, trackingNum = null, skipConfirm = false, customDate = null) {
        if (!skipConfirm && !trackingNum && !customDate && !confirm(`Mark '${status}'?`)) return;

        let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
        updates = updates.filter(item => item.oid !== oid);

        let existingOrder = allOrders.find(o => o.orderid === oid);
        let oldStatus = existingOrder ? existingOrder.Status : 'Pending';

        let needsRefundDelete = false;
        if (String(oldStatus).trim().toLowerCase() === 'refunded' && status !== 'Refunded') {
            needsRefundDelete = true;
        }

        if (existingOrder && existingOrder.Status === status && customDate) {
            oldStatus = `${existingOrder.Status} (${getTimelineLabel(existingOrder['Dispatched Date'] || existingOrder.timestamp)})`;
        }

        let updateObj = {
            oid: oid,
            status: status,
            oldStatus: oldStatus,
            time: new Date().getTime(),
            deleteRefund: needsRefundDelete
        };

        if (trackingNum) updateObj.tracking = trackingNum;

        // 🔥 DATE & TIME LOGIC FIX
        if (customDate) {
            updateObj.actionDate = customDate;
        } else if ((status === 'Dispatched' && !trackingNum) || status === 'Paid') {

            // 🔥 FIX: പഴയ ഓർഡറിൽ Paid Date ഉണ്ടെങ്കിൽ അത് തന്നെ ഉപയോഗിക്കുക (മാറ്റരുത്)
            if (status === 'Paid' && existingOrder && existingOrder.paidDate) {
                updateObj.actionDate = existingOrder.paidDate;
            } else {
                // ഇല്ലെങ്കിൽ മാത്രം പുതിയ സമയം എടുക്കുക
                let now = new Date();
                let y = now.getFullYear();
                let m = String(now.getMonth() + 1).padStart(2, '0');
                let d = String(now.getDate()).padStart(2, '0');
                let h = String(now.getHours()).padStart(2, '0');
                let min = String(now.getMinutes()).padStart(2, '0');
                updateObj.actionDate = `${y}-${m}-${d} ${h}:${min}`;
            }
        }

        updates.push(updateObj);
        localStorage.setItem('pendingUpdates', JSON.stringify(updates));

        const orderIndex = allOrders.findIndex(o => o.orderid === oid);
        if (orderIndex !== -1) {
            allOrders[orderIndex].Status = status;
            if (trackingNum) allOrders[orderIndex].tracking = trackingNum;
            if (customDate) allOrders[orderIndex]['Dispatched Date'] = customDate;

            // Paid Date ലോക്കലായി അപ്‌ഡേറ്റ് ചെയ്യുന്നു (പഴയതുണ്ടെങ്കിൽ അത് തന്നെ നിൽക്കും)
            if (status === 'Paid') {
                allOrders[orderIndex].paidDate = updateObj.actionDate;
            }
            if (status === 'Dispatched' && !allOrders[orderIndex]['Dispatched Date']) {
                allOrders[orderIndex]['Dispatched Date'] = updateObj.actionDate;
            }

            localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
        }

        if (document.getElementById('searchInput').value.trim().length > 0) {
            filterOrders();
        } else {
            renderTabs(allOrders);
        }

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
    // 🔥 UPDATED: BEAUTIFUL CARD-BASED SYNC LIST
    // 🔥 UPDATED: BEAUTIFUL CARD-BASED SYNC LIST (Includes Paid Number)
    function renderSyncList() {
        let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
        let pendingExpenses = JSON.parse(localStorage.getItem('pendingExpenses') || "[]");

        const list = document.getElementById('sync-preview-list');
        const countDisplay = document.getElementById('sync-count-display');

        let totalCount = pendingUpdates.length + pendingExpenses.length;
        countDisplay.innerText = totalCount;
        list.innerHTML = '';

        if (totalCount === 0) {
            $('#syncModal').modal('hide');
            updateSyncButtonUI();
            return;
        }

        // 1. Separate Updates
        let orderUpdates = pendingUpdates.filter(u => u.action !== 'meta' && u.action !== 'paidNum' && !u.deleteRefund);
        let metaUpdates = pendingUpdates.filter(u => u.action === 'meta');
        let paidNumUpdates = pendingUpdates.filter(u => u.action === 'paidNum'); // 🔥 New Category
        let refundDeletions = pendingUpdates.filter(u => u.deleteRefund);

        // --- A. ORDER STATUS CHANGES ---
        if (orderUpdates.length > 0 || refundDeletions.length > 0) {
            let itemsHtml = '';
            [...orderUpdates, ...refundDeletions].forEach((u, index) => {
                let order = allOrders.find(o => o.orderid === u.oid);
                let name = order ? order.name : 'Unknown';
                let actionHtml = '';

                if (u.deleteRefund) {
                    actionHtml = `<span class="badge bg-danger">DELETE REFUND RECORD</span>`;
                } else if (u.tracking) {
                    actionHtml = `<span class="badge bg-light text-dark border">Tracking: ${u.tracking}</span>`;
                } else {
                    let badgeColor = u.status === 'Paid' ? 'success' : (u.status === 'Dispatched' ? 'primary' : 'secondary');
                    actionHtml = `<span class="badge bg-${badgeColor}">${u.status}</span>`;
                }

                itemsHtml += `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom last-no-border">
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-light border d-flex align-items-center justify-content-center fw-bold text-secondary" style="width:25px; height:25px; font-size:10px;">${index + 1}</div>
                    <div><div class="fw-bold text-dark small">${u.oid} <span class="text-muted fw-normal">(${name})</span></div></div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    ${actionHtml}
                    <button onclick="undoUpdate('${u.oid}', false)" class="btn btn-sm text-danger hover-bg-light rounded-circle" style="width:30px; height:30px;"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
            });

            list.innerHTML += `<div class="card border-0 shadow-sm mb-3" style="border-radius:12px; overflow:hidden;"><div class="card-header bg-white fw-bold text-dark small py-2 px-3 border-bottom">📦 ORDER STATUS CHANGES</div><div class="card-body p-0 bg-white">${itemsHtml}</div></div>`;
        }

        // --- 🔥 B. PAID NUMBER UPDATES (New Section) ---
        if (paidNumUpdates.length > 0) {
            let itemsHtml = '';
            paidNumUpdates.forEach((u, index) => {
                itemsHtml += `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom last-no-border">
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-success bg-opacity-10 text-success border d-flex align-items-center justify-content-center" style="width:25px; height:25px; font-size:10px;"><i class="fas fa-mobile-alt"></i></div>
                    <div class="fw-bold text-dark small">${u.oid}</div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-light text-dark border fw-bold">Paid By: ${u.num}</span>
                    <button onclick="undoUpdate('${u.oid}', 'paidNum')" class="btn btn-sm text-danger hover-bg-light rounded-circle" style="width:30px; height:30px;"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
            });

            list.innerHTML += `<div class="card border-0 shadow-sm mb-3" style="border-radius:12px; overflow:hidden;"><div class="card-header bg-success bg-opacity-10 fw-bold text-success small py-2 px-3 border-bottom">📱 PAID NUMBER UPDATES</div><div class="card-body p-0 bg-white">${itemsHtml}</div></div>`;
        }

        // --- C. INTERNAL FLAGS ---
        if (metaUpdates.length > 0) {
            let itemsHtml = '';
            metaUpdates.forEach((u, index) => {
                let meta = getMetaStatus(u.meta);
                let flags = [];
                if (meta.isPrinted) flags.push(`<span class="badge bg-warning text-dark border">Printed 🖨️</span>`);
                if (meta.isTracked) flags.push(`<span class="badge bg-info text-dark border">Tracked 🚚</span>`);
                let contactIcon = meta.contact === 'whatsapp' ? 'fab fa-whatsapp text-success' : (meta.contact === 'alt' ? 'fas fa-phone-square text-secondary' : 'fas fa-phone-alt text-primary');
                flags.push(`<i class="${contactIcon}"></i> Pref`);

                itemsHtml += `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom last-no-border">
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-indigo-50 text-primary border d-flex align-items-center justify-content-center" style="width:25px; height:25px; font-size:10px;"><i class="fas fa-cog"></i></div>
                    <div class="fw-bold text-dark small">${u.oid}</div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <div class="d-flex gap-1">${flags.join('')}</div>
                    <button onclick="undoUpdate('${u.oid}', true)" class="btn btn-sm text-danger hover-bg-light rounded-circle" style="width:30px; height:30px;"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
            });
            list.innerHTML += `<div class="card border-0 shadow-sm mb-3" style="border-radius:12px; overflow:hidden;"><div class="card-header bg-indigo-50 fw-bold text-primary small py-2 px-3 border-bottom" style="background:#e0e7ff;">⚙️ ADMIN INTERNAL FLAGS</div><div class="card-body p-0 bg-white">${itemsHtml}</div></div>`;
        }

        // --- D. EXPENSES ---
        if (pendingExpenses.length > 0) {
            let itemsHtml = '';
            pendingExpenses.forEach((exp, index) => {
                itemsHtml += `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom last-no-border">
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-warning text-white d-flex align-items-center justify-content-center" style="width:25px; height:25px; font-size:10px;"><i class="fas fa-receipt"></i></div>
                    <div><div class="fw-bold small">${exp.category}</div><div class="small text-muted" style="font-size:10px;">${exp.vendor}</div></div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-dark small">₹${exp.amount}</span>
                    <button onclick="undoExpenseUpdate('${exp.id}')" class="btn btn-sm text-danger hover-bg-light rounded-circle" style="width:30px; height:30px;"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
            });
            list.innerHTML += `<div class="card border-0 shadow-sm mb-3" style="border-radius:12px; overflow:hidden;"><div class="card-header bg-warning-50 fw-bold text-dark small py-2 px-3 border-bottom" style="background:#fffbeb; color:#92400e;">💸 EXPENSES</div><div class="card-body p-0 bg-white">${itemsHtml}</div></div>`;
        }
    }

    // 🔥 UPDATED UNDO LOGIC (Supports Meta Separate Undo)
    // 🔥 UPDATED: UNDO LOGIC (Reverts Admin Meta & Status)
    window.undoUpdate = function (oid, isMeta) {
        let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
        let removedItem = null;

        if (isMeta) {
            // Find item
            removedItem = pendingUpdates.find(u => u.oid === oid && u.action === 'meta');

            if (removedItem) {
                // 🔥 REVERT META LOCALLY
                let order = allOrders.find(o => o.orderid === oid);

                // പഴയ Meta ഉണ്ടെങ്കിൽ അത് തിരികെ സെറ്റ് ചെയ്യുന്നു
                if (order && removedItem.oldMeta !== undefined) {
                    order.adminMeta = removedItem.oldMeta;
                    localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
                }
            }

            // Remove from list
            pendingUpdates = pendingUpdates.filter(u => !(u.oid === oid && u.action === 'meta'));

        } else {
            // Status Update Undo Logic (Old logic)
            removedItem = pendingUpdates.find(u => u.oid === oid && u.action !== 'meta');
            pendingUpdates = pendingUpdates.filter(u => !(u.oid === oid && u.action !== 'meta'));

            // 🔥 REVERT STATUS LOCALLY
            if (removedItem && removedItem.oldStatus) {
                let orderIndex = allOrders.findIndex(o => o.orderid === oid);
                if (orderIndex !== -1) {
                    allOrders[orderIndex].Status = removedItem.oldStatus;

                    // Tracking ഉണ്ടെങ്കിൽ അതും കളയുന്നു
                    if (removedItem.tracking) delete allOrders[orderIndex].tracking;

                    localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
                }
            }
        }

        localStorage.setItem('pendingUpdates', JSON.stringify(pendingUpdates));

        // Refresh Lists & UI
        renderSyncList();
        updateSyncButtonUI();
        renderTabs(allOrders); // 🔥 ഇതാണ് പ്രധാനം: കാർഡ് പഴയ സ്ഥലത്തേക്ക് മാറാൻ ഇത് സഹായിക്കും
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

        // 🔥 5. Paid Number Sync
        let paidNumUpdates = pendingUpdates.filter(u => u.action === 'paidNum');
        paidNumUpdates.forEach(u => {
            promises.push(fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify({ action: 'updatePaidNum', oid: u.oid, num: u.num })
            }));
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

        // 🔥 LANGUAGE LOGIC (English or Malayalam)
        const isEng = (d.language === 'en');

        // Header Text based on Language
        const editText = isEng ? "To check status or edit order: 👇" : "നിങ്ങളുടെ ഓർഡറിന്റെ സ്റ്റാറ്റസ് അറിയാനും മാറ്റങ്ങൾ വരുത്തുവാനും: 👇";

        const header = `*✅ Honey order confirmed!* 🍯\n⌚ _${formattedTime}_\n\n${editText}\n🔗 _${editLink}_\n`;
        const details = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${d.pincode}*\n*Ph: ${d.phone}*\n\n*Qty: ${d.quantity}*\n*Amount: ₹${base} + ${courier}*\n*Total: ₹${total}/-*\n____________________________________`;

        // 🔥 NEW: Payment Screenshot Request (Language based)
        let paymentNote = "";
        if (isEng) {
            paymentNote = "\n\n👉 Please send the screenshot after GPay.. 📸\n_(Packing starts only after receiving the screenshot)_";
        } else {
            paymentNote = "\n\nGpay ചെയ്തശേഷം സ്ക്രീൻഷോട്ട് അയക്കൂ.. 📸\n_(സ്ക്രീൻഷോട്ട് ലഭിച്ച ശേഷമാണ് പാക്കിംഗ് നടപടികൾ ആരംഭിക്കുക)_";
        }

        const footer = `\n\n*GPay to: ${adminPhone} (KAFAK LLP)*${paymentNote}`;

        // 4. DETERMINE TARGET PHONE (Fix for W/M/A)
        let phoneNum = "";
        const dropdown = document.getElementById(`wa-select-${index}`);
        let code = dropdown ? dropdown.value : '';

        if (code === 'W') phoneNum = d.whatsapp;
        else if (code === 'A') phoneNum = d.altphone;
        else if (code === 'M') phoneNum = d.phone;
        else phoneNum = d.whatsapp || d.phone;

        phoneNum = String(phoneNum || '').replace(/[^0-9]/g, '');
        if (phoneNum.length === 10) phoneNum = '91' + phoneNum;

        if (phoneNum) {
            window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(header + details + footer)}`, '_blank');
        } else {
            alert("Number not found!");
        }
    }

    function printSingle(index) { runPrintLogic([{ value: index }]); }
    // 🔥 SMART PRINT MANAGER (Fixes Hanging & Supports Both Tabs)
    window.printSelected = async function (sourceTab = 'new') {

        // 1. Collect Candidates
        let manualSelection = document.querySelectorAll('.order-cb:checked');
        let candidates = [];

        // A. മാന്വൽ ആയി ടിക്ക് ചെയ്തിട്ടുണ്ടെങ്കിൽ അത് മാത്രം എടുക്കുന്നു
        if (manualSelection.length > 0) {
            manualSelection.forEach(cb => {
                if (allOrders[cb.value]) candidates.push(allOrders[cb.value]);
            });
        }
        // B. ഒന്നും ടിക്ക് ചെയ്തിട്ടില്ലെങ്കിൽ, ആ ടാബിലുള്ള എല്ലാത്തിനെയും എടുക്കുന്നു
        else {
            candidates = allOrders.filter(o => {
                let meta = getMetaStatus(o.adminMeta);
                if (sourceTab === 'printed') {
                    return o.Status === 'Paid' && meta.isPrinted; // Printed Tab
                } else {
                    return o.Status === 'Paid' && !meta.isPrinted; // New Tab
                }
            });
        }

        if (candidates.length === 0) {
            showToast("warning", "No orders selected to print!");
            return;
        }

        // 2. SHOW PRINT MANAGER POPUP
        const { value: formValues } = await Swal.fire({
            title: '🖨️ Print Manager',
            html: `
            <div class="text-start bg-light p-3 rounded mb-3 border">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-bold text-dark">Selected Items:</span>
                    <span class="badge bg-primary rounded-pill fs-6">${candidates.length}</span>
                </div>
                <div class="text-muted small" style="font-size:11px;">
                    ${candidates.length > 50 ? '⚠️ High quantity! Select a limit to avoid hanging.' : 'Choose sort order and quantity.'}
                </div>
            </div>

            <div class="mb-3 text-start">
                <label class="fw-bold small text-muted text-uppercase" style="font-size:10px;">1. Sorting Order</label>
                <select id="print-sort" class="form-select shadow-none fw-bold text-dark mt-1">
                    <option value="oldest">Oldest First (പഴയത് ആദ്യം)</option>
                    <option value="newest">Newest First (പുതിയത് ആദ്യം)</option>
                </select>
            </div>

            <div class="mb-3 text-start">
                <label class="fw-bold small text-muted text-uppercase" style="font-size:10px;">2. Quantity Limit</label>
                <div class="input-group mt-1">
                    <input type="number" id="print-limit" class="form-control shadow-none fw-bold fs-5 text-center" 
                        value="${(manualSelection.length > 0) ? candidates.length : (candidates.length > 50 ? 50 : candidates.length)}" min="1" max="${candidates.length}">
                    <span class="input-group-text small text-muted">/ ${candidates.length}</span>
                </div>
            </div>
        `,
            showCancelButton: true,
            confirmButtonText: 'GENERATE LABELS',
            confirmButtonColor: '#000',
            cancelButtonText: 'Cancel',
            focusConfirm: false,
            preConfirm: () => {
                let limitVal = parseInt(document.getElementById('print-limit').value);
                if (!limitVal || limitVal < 1) {
                    Swal.showValidationMessage('Please enter a valid quantity');
                    return false;
                }
                return {
                    sort: document.getElementById('print-sort').value,
                    limit: limitVal
                };
            }
        });

        if (!formValues) return; // Cancelled

        // 3. PROCESS DATA (Sort & Slice)
        // ഇവിടെ വെച്ചാണ് ഹെവി പ്രോസസ്സിംഗ് നടക്കുന്നത് (യൂസർ കൺഫേം ചെയ്ത ശേഷം മാത്രം)

        // A. Sorting
        candidates.sort((a, b) => {
            let dateA = new Date(a.paidDate || a.timestamp);
            let dateB = new Date(b.paidDate || b.timestamp);
            return formValues.sort === 'oldest' ? dateA - dateB : dateB - dateA;
        });

        // B. Limiting (യൂസർ പറഞ്ഞ എണ്ണം മാത്രം എടുക്കുന്നു)
        let finalBatch = candidates.slice(0, formValues.limit);

        // 4. Run Print Logic
        runPrintLogic(null, finalBatch);
    }

    // 🔥 UPDATED PRINT LOGIC (With Sequence Number 1, 2, 3...)
    // 🔥 UPDATED PRINT LOGIC (With Dates & Compact Layout)
    async function runPrintLogic(checkboxes, directData = null) {
        let ordersToPrint = [];

        // 1. Determine Source
        if (directData) {
            ordersToPrint = directData;
        } else if (checkboxes) {
            checkboxes.forEach(cb => {
                if (allOrders[cb.value]) ordersToPrint.push(allOrders[cb.value]);
            });
            // Sort by Date (Oldest First)
            ordersToPrint.sort((a, b) => new Date(a.paidDate || a.timestamp) - new Date(b.paidDate || b.timestamp));
        }

        if (ordersToPrint.length === 0) return;

        // 🔥 PRE-CALCULATE ALL PAID ORDERS (To find global rank)
        let allPaidOrders = allOrders.filter(o => o.Status === 'Paid');
        allPaidOrders.sort((a, b) => new Date(a.paidDate || a.timestamp) - new Date(b.paidDate || b.timestamp));

        // Progress Bar
        Swal.fire({
            title: 'Generating Labels...',
            html: `Processing <b>1</b> of <b>${ordersToPrint.length}</b>`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const styles = document.getElementById('label-css').innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute'; tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        const labelsData = [];
        let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
        let isModified = false;

        // 2. PROCESS SEQUENTIALLY
        for (let i = 0; i < ordersToPrint.length; i++) {
            const d = ordersToPrint[i];

            if (Swal.getHtmlContainer()) {
                Swal.getHtmlContainer().querySelector('b').innerText = i + 1;
            }

            // FIND GLOBAL SEQUENCE NUMBER
            let globalIndex = allPaidOrders.findIndex(x => x.orderid === d.orderid);
            let seqNum = (globalIndex !== -1) ? globalIndex + 1 : (i + 1);

            // Update Meta Logic
            let currentMeta = String(d.adminMeta || '');
            if (!currentMeta.includes('P')) {
                let newMeta = currentMeta + 'P';
                d.adminMeta = newMeta;

                let existingUpd = updates.find(u => u.oid === d.orderid && u.action === 'meta');
                if (existingUpd) {
                    existingUpd.meta = newMeta;
                } else {
                    updates.push({ oid: d.orderid, action: 'meta', meta: newMeta, status: d.Status });
                }
                isModified = true;
            }

            // Generate QR
            await new Promise((resolve) => {
                const qrNode = document.createElement('div');
                tempDiv.appendChild(qrNode);
                new QRCode(qrNode, { text: d.orderid, width: 90, height: 90, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });

                setTimeout(() => {
                    const canvas = qrNode.querySelector('canvas');
                    let qrImgSrc = canvas ? canvas.toDataURL("image/png") : '';
                    labelsData.push({ details: d, qrSrc: qrImgSrc, seqNum: seqNum });
                    qrNode.remove();
                    resolve();
                }, 50);
            });
        }

        document.body.removeChild(tempDiv);
        Swal.close();

        // 3. SAVE & REFRESH
        if (isModified) {
            localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
            localStorage.setItem('pendingUpdates', JSON.stringify(updates));
            updateSyncButtonUI();
            renderTabs(allOrders);
        }

        // 4. OPEN PRINT WINDOW
        const printWin = window.open('', '', 'width=600,height=800');
        let htmlContent = `<html><head><title>KAFAK Print (${ordersToPrint.length})</title><link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@100..800&display=swap" rel="stylesheet"><style>${styles}</style></head><body>`;

        const fmtDate = (str) => {
            if (!str) return "-";
            return new Date(str).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
        };

        labelsData.forEach((item) => {
            const d = item.details;
            const seqNum = item.seqNum;

            const safe = (val) => String(val || '').toUpperCase();
            let qtyHTML = (d.quantity == 1) ? '' : `<div class="qty-text">x${d.quantity}</div>`;
            const phoneIcon = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 15.5C18.75 15.5 17.55 15.3 16.43 14.93C16.08 14.82 15.69 14.9 15.43 15.16L13.23 17.36C10.42 15.92 8.08 13.58 6.64 10.77L8.84 8.57C9.1 8.31 9.18 7.92 9.07 7.57C8.7 6.45 8.5 5.25 8.5 4C8.5 3.45 8.05 3 7.5 3H4C3.45 3 3 3.45 3 4C3 13.39 10.61 21 20 21C20.55 21 21 20.55 21 20V16.5C21 15.95 20.55 15.5 20 15.5Z" fill="black"/><path d="M11.65 8.03C11.65 8.03 13.06 8.03 13.77 8.73C14.47 9.44 14.47 10.85 14.47 10.85M12 4.84C12 4.84 14.83 4.84 16.24 6.26C17.66 7.67 17.66 10.5 17.66 10.5M12.35 1.66C12.35 1.66 16.6 1.66 18.72 3.78C20.84 5.9 20.84 10.15 20.84 10.15" stroke="#008CFF" stroke-width="2" stroke-linecap="round"/></svg>`;

            let printPhone = d.phone;
            if (d.altphone && String(d.altphone).trim() !== String(d.phone).trim()) {
                printPhone += `, ${d.altphone}`;
            }

            let orderTime = fmtDate(d.timestamp);
            let paidTime = fmtDate(d.paidDate || d.timestamp);

            htmlContent += `
        <div class="label-page">
            <div class="address-sec">
                <div class="to-label">To,</div>
                <div class="cust-name">${safe(d.name)}</div>
                <div class="cust-addr">${safe(d.house)}<br>${safe(d.place)}<br>${safe(d.postoffice)}<br>${safe(d.district)}, ${safe(d.state)}</div>
                <div class="cust-pin">PIN: ${d.pincode}</div>
                <div class="cust-ph">PH: ${printPhone}</div>
            </div>
            
            <div class="meta-sec">
                <div class="qr-box"><img src="${item.qrSrc}"></div>
                <div class="qr-oid">${d.orderid}</div>
                ${qtyHTML}
            </div>
            
            <div class="contact-box">
                <div class="contact-icon">${phoneIcon}</div>
                <div class="contact-text"><span>7788990313, 9895082689</span>If unreachable, call or WhatsApp us</div>
            </div>
            
            <div class="fragile-sec"><img src="fragile.png" class="fragile-img" alt="Fragile"></div>
            
            <div class="from-sec">
                <span style="font-weight:bold; font-size:11px;">From,</span><br>
                <b>KAFAK LLP,</b> 10/174, Kunnathery,<br>Thaikkattukara P.O, Aluva - 683106,<br>
                Ernakulam District, Kerala, India.<br>Phone: 778899 0 313
            </div>

            <div style="position:absolute; bottom:9mm; right:5mm; font-size:12px; font-weight:800; color:#000; border:1px solid #000; padding:1px 5px; border-radius:4px;">
                #${seqNum}
            </div>

            <div style="position:absolute; bottom:5mm; left:5mm; font-size:8px; color:#888; font-weight:600; font-family:sans-serif;">
                O: ${orderTime}
            </div>

            <div style="position:absolute; bottom:5mm; right:5mm; font-size:8px; color:#888; font-weight:600; font-family:sans-serif; text-align:right;">
                P: ${paidTime}
            </div>

        </div>`;
        });

        htmlContent += `</body></html>`;
        printWin.document.write(htmlContent);
        printWin.document.close();
        setTimeout(() => { printWin.focus(); printWin.print(); }, 500);
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
        // ദൃശ്യമായിട്ടുള്ള ചെക്ക്ബോക്സുകൾ മാത്രം സെലക്ട് ചെയ്യുന്നു
        const checkboxes = document.querySelectorAll('.order-cb:not([style*="display: none"])');
        const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(cb => cb.checked = !isAllChecked);

        // ബട്ടൺ സ്റ്റൈൽ മാറ്റുന്നു
        document.querySelectorAll('.btn-select-all').forEach(btn => {
            if (!isAllChecked) {
                btn.classList.remove('btn-light', 'text-secondary'); btn.classList.add('btn-dark', 'text-white');
                btn.innerHTML = '<i class="fas fa-check-square"></i> All';
            } else {
                btn.classList.add('btn-light', 'text-secondary'); btn.classList.remove('btn-dark', 'text-white');
                btn.innerHTML = '<i class="far fa-square"></i> All';
            }
        });
    }

    function checkSelectAllStatus() { updateSelectAllButton(); }

    // 🔥 FIX: Update ALL Select All Buttons (New & Printed Tabs)
    function updateSelectAllButton() {
        // ID-ക്ക് പകരം Class വെച്ച് എല്ലാ ബട്ടണുകളും എടുക്കുന്നു
        const buttons = document.querySelectorAll('.btn-select-all');
        if (buttons.length === 0) return;

        // ദൃശ്യമായിട്ടുള്ള ചെക്ക്ബോക്സുകൾ മാത്രം നോക്കുന്നു
        const checkboxes = document.querySelectorAll('.order-cb:not([style*="display: none"])');
        if (checkboxes.length === 0) return;

        const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);

        buttons.forEach(btn => {
            if (isAllChecked) {
                btn.classList.remove('btn-light', 'text-secondary');
                btn.classList.add('btn-dark', 'text-white');
                btn.innerHTML = '<i class="fas fa-check-square"></i> All';
            } else {
                btn.classList.add('btn-light', 'text-secondary');
                btn.classList.remove('btn-dark', 'text-white');
                btn.innerHTML = '<i class="far fa-square"></i> All';
            }
        });
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

        let paidNewQty = 0;
        let paidPrintedQty = 0;

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
            let match = desc.match(/(ORD-|K-)\d+/); // Description-ൽ നിന്നും ORD-xxxx കണ്ടുപിടിക്കുന്നു
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
            if (decodedText.startsWith("ORD-") || decodedText.startsWith("K-")) {
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
                if (decodedText.startsWith("ORD-") || decodedText.startsWith("K-")) {
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
                if (!decodedText.startsWith("ORD-") && !decodedText.startsWith("K-")) {

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
            let label = (code.startsWith("ORD-") || code.startsWith("K-")) ? "QR CODE" : "BARCODE";
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
    // 🔥 OPEN WHATSAPP (Fix for W/M/A Codes)
    function openSimpleWA(index, btnElement) {
        if (btnElement) highlightCard(btnElement);

        const d = allOrders[index];
        let phoneNum = "";

        // 2. Get Code from Dropdown (W, M, A, G)
        const dropdown = document.getElementById(`wa-select-${index}`);
        let code = dropdown ? dropdown.value : '';

        if (code === 'W') phoneNum = d.whatsapp;
        else if (code === 'A') phoneNum = d.altphone;
        else if (code === 'M') phoneNum = d.phone;
        else if (code === 'G') phoneNum = d.paidNum; // 🔥 G = Paid Number
        else phoneNum = d.whatsapp || d.phone;

        // 4. Clean & Open
        phoneNum = String(phoneNum || '').replace(/[^0-9]/g, '');
        if (phoneNum.length === 10) phoneNum = '91' + phoneNum;

        if (phoneNum) {
            window.open(`https://wa.me/${phoneNum}`, '_blank');
        } else {
            alert("Number not found!");
        }
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

    // 🔥 CLEAR SEARCH FUNCTION
    window.clearSearch = function () {
        document.getElementById('searchInput').value = ''; // 1. Input ക്ലിയർ ചെയ്യുന്നു
        filterOrders(); // 2. ലിസ്റ്റ് പഴയപടി ആക്കുന്നു
        document.getElementById('searchInput').focus(); // 3. വീണ്ടും ടൈപ്പ് ചെയ്യാൻ റെഡി ആക്കുന്നു
    }

    // 🔥 SWITCH SUB-TABS 
    window.switchSubTab = function (type) {
        // Hide All Sub-Lists First within context
        const hide = (ids) => ids.forEach(id => document.getElementById(id).style.display = 'none');
        const show = (id) => document.getElementById(id).style.display = 'flex';
        const btnActive = (id) => document.getElementById(id).className = 'btn btn-sm rounded-pill flex-grow-1 fw-bold btn-dark transition-all';
        const btnInactive = (id) => document.getElementById(id).className = 'btn btn-sm rounded-pill flex-grow-1 fw-bold text-muted transition-all';

        if (type === 'new' || type === 'sent') {
            hide(['list-sub-new', 'list-sub-sent']);
            show(type === 'new' ? 'list-sub-new' : 'list-sub-sent');
            btnActive(type === 'new' ? 'btn-sub-new' : 'btn-sub-sent');
            btnInactive(type === 'new' ? 'btn-sub-sent' : 'btn-sub-new');
        }
        else if (type === 'paid_new' || type === 'paid_printed') {
            hide(['list-paid-new', 'list-paid-printed']);
            show(type === 'paid_new' ? 'list-paid-new' : 'list-paid-printed');
            btnActive(type === 'paid_new' ? 'btn-sub-paid-new' : 'btn-sub-paid-printed');
            btnInactive(type === 'paid_new' ? 'btn-sub-paid-printed' : 'btn-sub-paid-new');
        }
        else if (type === 'disp_new' || type === 'disp_tracked') {
            hide(['list-disp-new', 'list-disp-tracked']);
            show(type === 'disp_new' ? 'list-disp-new' : 'list-disp-tracked');
            btnActive(type === 'disp_new' ? 'btn-sub-disp-new' : 'btn-sub-disp-tracked');
            btnInactive(type === 'disp_new' ? 'btn-sub-disp-tracked' : 'btn-sub-disp-new');
        }
    }

    // 🔥 HIGHLIGHT CARD FUNCTION
    window.highlightCard = function (el) {
        // Remove highlight from all others
        $('.order-card').removeClass('active-highlight-border');

        let card = $(el).closest('.order-card');
        card.addClass('active-highlight-border');
    }


    // 🔥 SAVE PAID NUMBER (With Offline Sync Support)
    // 🔥 SAVE PAID NUMBER (Fixed Error & Offline Support)
    window.savePaidNum = function (oid, val) {
        let order = allOrders.find(o => o.orderid === oid);
        if (!order) return;

        // 1. Local Update
        order.paidNum = val;
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));

        // 2. Queue for Sync
        let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

        // പഴയ അപ്‌ഡേറ്റ് ഉണ്ടെങ്കിൽ അത് തിരുത്തുന്നു, ഇല്ലെങ്കിൽ പുതിയത് ചേർക്കുന്നു
        let existing = updates.find(u => u.oid === oid && u.action === 'paidNum');
        if (existing) {
            existing.num = val;
        } else {
            updates.push({
                oid: oid,
                action: 'paidNum',
                num: val
            });
        }

        localStorage.setItem('pendingUpdates', JSON.stringify(updates));
        updateSyncButtonUI();

        // 🔥 FIX: Error പരിഹരിച്ചു. സേവ് ചെയ്ത് കഴിഞ്ഞാൽ കാർഡ് റീഫ്രഷ് ചെയ്യുന്നു.
        // ഇത് വഴി വാട്സാപ്പ് ബട്ടൺ ഓട്ടോമാറ്റിക് ആയി വരും.
        setTimeout(() => {
            renderTabs(allOrders);
        }, 100);

        showToast('success', 'Paid Number Saved ✅');
    }

    // 🔥 Open WhatsApp for Paid Number
    window.openPaidNumWA = function (num) {
        let clean = String(num).replace(/[^0-9]/g, '');
        if (clean.length >= 10) {
            if (clean.length === 10) clean = '91' + clean;
            window.open(`https://wa.me/${clean}`, '_blank');
        } else {
            alert("Invalid Phone Number");
        }
    }

    // 🔥 AUTO SCROLL RESTORE SYSTEM
    // 1. നമ്മൾ സ്ക്രോൾ ചെയ്യുമ്പോൾ ആ സ്ഥാനം സേവ് ചെയ്യുന്നു
    window.addEventListener('scroll', function () {
        localStorage.setItem('lastScrollPosition', window.scrollY);
    });

    // 2. ടാബ് മാറുമ്പോൾ സ്ക്രോൾ മുകളിലേക്ക് തന്നെ പോകാൻ (Optional)
    const tabButtons = document.querySelectorAll('button[data-bs-toggle="pill"]');
    tabButtons.forEach(btn => {
        btn.addEventListener('shown.bs.tab', function (e) {
            // ടാബ് മാറിയാൽ പൊസിഷൻ 0 ആക്കുന്നു
            localStorage.setItem('lastScrollPosition', 0);
        });
    });

    // 🔥 SMART FRAUD DETECTOR: Checks Phone, WhatsApp, Alt, AND PAID NUM
    function checkCrossLinking(currentOrder) {
        // ആർക്കൈവ് ചെയ്തതും കംപ്ലീറ്റ് ആയതും ചെക്ക് ചെയ്യേണ്ട
        if (currentOrder.Status === 'Completed' || currentOrder.Status === 'Archive') return null;

        // 1. ഇപ്പോഴത്തെ ഓർഡറിലെ എല്ലാ നമ്പറുകളും എടുക്കുന്നു (Paid Number ഉൾപ്പെടെ)
        let myNums = [
            currentOrder.phone,
            currentOrder.whatsapp,
            currentOrder.altphone,
            currentOrder.paidNum // 🔥 ഇതാണ് പ്രധാനം!
        ]
            .map(n => String(n || '').replace(/[^0-9]/g, '')) // അക്കങ്ങൾ മാത്രം
            .filter(n => n.length > 5 && !n.startsWith('0000')); // 5 അക്കത്തിൽ കുറഞ്ഞതും 0000 ഉം ഒഴിവാക്കുന്നു

        if (myNums.length === 0) return null;

        // 2. ബാക്കിയുള്ള എല്ലാ ഓർഡറുകളുമായും ഒത്തുനോക്കുന്നു
        for (let other of allOrders) {
            // സ്വന്തം ഓർഡർ ആണെങ്കിൽ നോക്കേണ്ട
            if (other.orderid === currentOrder.orderid) continue;

            // മറ്റേ ഓർഡറിലെ എല്ലാ നമ്പറുകളും എടുക്കുന്നു
            let theirNums = [
                other.phone,
                other.whatsapp,
                other.altphone,
                other.paidNum // 🔥 അവരുടെ പെയ്ഡ് നമ്പറും നോക്കുന്നു
            ]
                .map(n => String(n || '').replace(/[^0-9]/g, ''));

            // 3. ക്രോസ് ചെക്കിംഗ് (എന്റെ ഏതെങ്കിലും നമ്പർ അവരുടെ ലിസ്റ്റിൽ ഉണ്ടോ?)
            for (let myN of myNums) {
                if (theirNums.includes(myN)) {
                    // മാച്ച് കണ്ടുപിടിച്ചു!
                    return other;
                }
            }
        }
        return null;
    }


    // 🔥 COPY ORDER ID & OPEN WHATSAPP WEB
    window.searchOrderInWA = function (oid) {
        // 1. Order ID കോപ്പി ചെയ്യുന്നു
        navigator.clipboard.writeText(oid).then(() => {
            showToast('success', 'Order ID Copied! Paste in WhatsApp Search 📋');

            // 2. WhatsApp Web തുറക്കുന്നു
            window.open('https://web.whatsapp.com/', '_blank');
        }).catch(err => {
            console.error('Copy failed', err);
            showToast('error', 'Copy failed! Please copy manually.');
        });
    }

    // 🔥 SEND PAYMENT RECEIPT (Admin Dashboard)
    // 🔥 SEND PAYMENT RECEIPT (Target Selected Number)
    window.sendPaymentWA = function (oid, index) {
        let order = allOrders.find(o => o.orderid === oid);
        if (!order) { alert("Order Data Missing!"); return; }

        // 1. Get Selected Code from Dropdown (M, W, A, G)
        let code = 'W'; // Default
        let dropdown = document.getElementById(`wa-select-${index}`);
        if (dropdown) code = dropdown.value;

        // 2. Pick Number based on Selection
        let targetNum = "";
        if (code === 'M') targetNum = order.phone;
        else if (code === 'W') targetNum = order.whatsapp;
        else if (code === 'A') targetNum = order.altphone;
        else if (code === 'G') targetNum = order.paidNum;
        else targetNum = order.whatsapp || order.phone; // Fallback

        let cleanNum = String(targetNum || '').replace(/[^0-9]/g, '');
        if (cleanNum.length === 10) cleanNum = '91' + cleanNum;

        if (!cleanNum) { alert("No valid number found for selection!"); return; }

        // 3. Generate Message
        let lang = order.language || 'en';
        let msg = "";
        let trackLink = `https://kafaklife.com/order.html?oid=${oid}`;

        if (lang === 'ml') {
            msg = `✅ *പേയ്‌മെന്റ് ലഭിച്ചു!* നന്ദി❤️\nഓർഡർ നമ്പർ: ${oid}\n\n🚛 *4-5 ദിവസത്തിനുള്ളിൽ* ഓർഡർ നിങ്ങളുടെ കയ്യിൽ ലഭിക്കുന്നതാണ്.\n\n👇 *Order Status:*\n${trackLink}`;
        } else {
            msg = `✅ *Payment Received!* Thank you❤️\nOrder ID: ${oid}\n\n🚛 Your order will be delivered within *4-5 days*.\n\n👇 *Order Status:*\n${trackLink}`;
        }

        // 4. Open WhatsApp with SELECTED Number
        window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    // 🔥 CLIPBOARD COPY FUNCTION
    window.copyToClipboard = function (text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('success', 'Copied: ' + text);
        }).catch(err => console.error('Copy failed', err));
    }



    // ==========================================
    // 🔥 BEAUTIFUL DATE PICKER (Flatpickr)
    // ==========================================

    // 1. Load Flatpickr Library Dynamically
    function loadFlatpickr(callback) {
        if (typeof flatpickr !== 'undefined') { callback(); return; }

        // Load CSS (Blue Theme)
        let link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://npmcdn.com/flatpickr/dist/themes/material_blue.css';
        document.head.appendChild(link);

        // Load JS
        let script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
        script.onload = callback;
        document.head.appendChild(script);
    }

    // 🔥 SHOW ADD EXPENSE MODAL (Mobile Friendly & Beautiful)
    window.showAddExpenseModal = function () {
        // 1. Force High Z-Index for DatePicker on Mobile
        if (!$('#flatpickr-mobile-fix').length) {
            $('<style id="flatpickr-mobile-fix">').html(`
            .flatpickr-calendar { z-index: 9999 !important; } 
            .swal2-container { z-index: 2000 !important; }
        `).appendTo('head');
        }

        loadFlatpickr(() => {
            Swal.fire({
                title: 'Add New Expense 🧾',
                html: `
                <div style="text-align:left; font-size:14px;">
                    <label class="fw-bold" style="color:#2563eb;">📅 Date & Time</label>
                    
                    <div class="input-group mb-2">
                        <span class="input-group-text bg-white text-primary border-end-0"><i class="fas fa-calendar-alt"></i></span>
                        <input type="text" id="exp-date" class="form-control bg-white border-start-0 fw-bold" placeholder="Select Date & Time..." readonly>
                    </div>

                    <label class="fw-bold mt-2">📂 Category</label>
                    <select id="exp-category" class="form-select mb-2" onchange="togglePartnerSelect()">
                        <option value="Material Purchase">Material Purchase</option>
                        <option value="Packaging Material">Packaging Material</option>
                        <option value="Marketing/Ads">Marketing / Ads</option>
                        <option value="Transport/Fuel">Transport / Fuel</option>
                        <option value="Salary">Salary / Wages</option>
                        <option value="Office Expense">Office Expense</option>
                        <option value="Refund">Refund</option>
                        <option value="Other">Other</option>
                    </select>

                    <div id="partner-section" style="display:none; background:#f0f9ff; padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid #bae6fd;">
                        <label class="fw-bold text-primary" style="font-size:11px;">SELECT PARTNER:</label>
                        <div id="partner-list" class="d-flex flex-column gap-2 mt-1">
                            </div>
                    </div>

                    <label class="fw-bold">🏪 Vendor / Shop Name</label>
                    <input type="text" id="exp-vendor" class="form-control mb-2" placeholder="Ex: Lulu Hypermarket">

                    <label class="fw-bold">📝 Description</label>
                    <textarea id="exp-desc" class="form-control mb-2" rows="2" placeholder="Ex: 50kg Honey..."></textarea>

                    <label class="fw-bold">💰 Amount (₹)</label>
                    <input type="number" id="exp-amount" class="form-control mb-2" placeholder="0.00">
                    
                    <label class="fw-bold">📸 Upload Proof (Optional)</label>
                    <input type="file" id="exp-proof" class="form-control mb-2" accept="image/*">

                    <button id="btn-save-exp" class="btn btn-primary w-100 mt-3 py-2 fw-bold shadow-sm" onclick="submitExpense(event)" style="border-radius: 50px;">
                        <i class="fas fa-check-circle"></i> SAVE EXPENSE
                    </button>
                </div>
            `,
                showConfirmButton: false,
                showCloseButton: true,
                didOpen: () => {
                    // Render Partner List logic
                    if (typeof renderPartnerList === 'function') renderPartnerList();

                    // 🔥 Activate Flatpickr (Mobile Fix applied)
                    flatpickr("#exp-date", {
                        enableTime: true,
                        dateFormat: "Y-m-d\\TH:i",
                        altInput: true,
                        altFormat: "F j, Y at h:i K",
                        defaultDate: new Date(),
                        time_24hr: false,
                        disableMobile: true // 🔥 Quotes നീക്കി, ഇത് Boolean ആക്കി
                    });
                }
            });
        });
    }