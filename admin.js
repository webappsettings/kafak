const scriptURL = "https://script.google.com/macros/s/AKfycbywBdyjeEG-aePYIBfkeCwjF2JkKra3GlGSYjYtroRTWneL8qumpWGDNvjLVxraWd026Q/exec";

// Beep Sound for Scanner
const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT1GAg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAgEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/");
let isScanProcessing = false;
let currentSortDir = 'desc';
let showAllTracking = false;

// 🔥 SMART SEARCH (Debouncing - ടൈപ്പിംഗ് ഫാസ്റ്റ് ആക്കാൻ)
let searchTimeout;

window.handleSmartSearch = function (value) {
    // ആരെങ്കിലും വേഗത്തിൽ ടൈപ്പ് ചെയ്തുകൊണ്ടിരിക്കുകയാണെങ്കിൽ പഴയ സെർച്ച് ക്യാൻസൽ ചെയ്യുന്നു
    clearTimeout(searchTimeout);

    // 400 മില്ലിസെക്കൻഡ് (0.4 സെക്കൻഡ്) കാത്തിരുന്ന ശേഷം മാത്രം യഥാർത്ഥ സെർച്ച് നടത്തുന്നു
    searchTimeout = setTimeout(() => {
        // filterOrders എന്നത് നിങ്ങളുടെ നിലവിലെ യഥാർത്ഥ സെർച്ച് ഫംഗ്ഷൻ ആണ്
        filterOrders(value);
    }, 400);
};

// 🔥 GLOBAL: Contact Selection Memory
let contactMem = JSON.parse(localStorage.getItem('contactMem') || "{}");
const globalBaseCost = 330;
let availableProviders = ["DTDC", "India Post", "ST Courier", "Professional", "Delhivery"];

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
    let contact = 'whatsapp'; // 🔥 Default aayi WhatsApp aakki
    if (metaStr.includes('G')) contact = 'paid';      // 'G' for Google Pay/Paid Number
    else if (metaStr.includes('M')) contact = 'phone';
    else if (metaStr.includes('A')) contact = 'alt';

    return {
        contact: contact,
        isPrinted: metaStr.includes('P'),
        isTracked: metaStr.includes('T'),
        isResend: metaStr.includes('R') // 🔥 Resend ആണെന്ന് തിരിച്ചറിയാൻ
    };
}


// 🔥 UPDATED: ADMIN META UPDATE (Saves Old State for Undo)
function updateAdminMeta(oid, type, value) {
    let order = allOrders.find(o => o.orderid === oid);
    if (!order) return;

    let currentMeta = String(order.adminMeta || '');
    let newMeta = currentMeta;

    if (type === 'contact') {
        newMeta = newMeta.replace(/[MWAG]/g, '');
        newMeta += value;
    } else if (type === 'printed') {
        if (!newMeta.includes('P')) newMeta += 'P';
    } else if (type === 'unprint') {
        newMeta = newMeta.replace(/P/g, ''); // 🔥 Revert P (Unprint)
    } else if (type === 'tracked') {
        if (!newMeta.includes('T')) newMeta += 'T';
    } else if (type === 'tracked_revert') {
        newMeta = newMeta.replace(/T/g, ''); // 🔥 Revert T (Remove from Tracked)
    } else if (type === 'resend') {
        if (!newMeta.includes('R')) newMeta += 'R';
        newMeta = newMeta.replace(/P/g, '');
    } else if (type === 'resend_history') {
        newMeta = newMeta.split('|')[0] + 'R' + value; // നിലവിലെ ഡാറ്റയ്ക്കൊപ്പം ഹിസ്റ്ററി ചേർക്കുന്നു
        newMeta = newMeta.replace(/P/g, ''); // Unprint ആക്കുന്നു
    }

    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let existingIndex = pendingUpdates.findIndex(u => u.oid === oid && u.action === 'meta' && u.meta !== undefined);

    let trueOldMeta = (existingIndex > -1 && pendingUpdates[existingIndex].oldMeta !== undefined) ? pendingUpdates[existingIndex].oldMeta : currentMeta;

    // Save Locally
    order.adminMeta = newMeta;
    localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));

    // 🔥 FIX: String comparison issue (eg: "" vs "W" both means WhatsApp)
    let getContactCode = (m) => {
        if (m.includes('G')) return 'G';
        if (m.includes('A')) return 'A';
        if (m.includes('M')) return 'M';
        return 'W'; // Default is WhatsApp
    };

    let oldContact = getContactCode(trueOldMeta);
    let newContact = getContactCode(newMeta);
    let oldFlags = trueOldMeta.replace(/[MWAG]/g, '');
    let newFlags = newMeta.replace(/[MWAG]/g, '');

    // രണ്ടും ഫലത്തിൽ ഒരേ കോൺടാക്റ്റ് ആണോ എന്ന് ചെക്ക് ചെയ്യുന്നു
    let isEffectivelySame = (oldContact === newContact) && (oldFlags === newFlags);

    if (isEffectivelySame) {
        if (existingIndex > -1) {
            delete pendingUpdates[existingIndex].meta;
            delete pendingUpdates[existingIndex].oldMeta;
            if (pendingUpdates[existingIndex].provider === undefined) {
                pendingUpdates.splice(existingIndex, 1);
            }
        }
    } else {
        if (existingIndex > -1) {
            pendingUpdates[existingIndex].meta = newMeta;
        } else {
            let provOnlyIndex = pendingUpdates.findIndex(u => u.oid === oid && u.action === 'meta');
            if (provOnlyIndex > -1) {
                pendingUpdates[provOnlyIndex].meta = newMeta;
                pendingUpdates[provOnlyIndex].oldMeta = trueOldMeta;
            } else {
                pendingUpdates.push({
                    oid: oid, action: 'meta', meta: newMeta, oldMeta: trueOldMeta, status: order.Status, time: new Date().getTime()
                });
            }
        }
    }

    localStorage.setItem('pendingUpdates', JSON.stringify(pendingUpdates));
    updateSyncButtonUI();
    renderTabs(allOrders);

    let msg = type === 'unprint' ? 'Moved to Unprinted Tab!' : 'Saved!';
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000, icon: 'success', title: msg });
}

// 🔥 Unprint Confirmation Helper
window.confirmUnprint = function (oid) {
    if (confirm("Move back to Unprinted Tab?")) {
        updateAdminMeta(oid, 'unprint', '');
    }
};

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
                // 1. ടാബ് മാറുന്നത് സേവ് ചെയ്യുന്നു
                localStorage.setItem('activeAdminTab', event.target.getAttribute('data-bs-target'));

                // 2. 🔥 SMART SEARCH RE-SORTING
                // സെർച്ച് ബോക്സിൽ വാല്യൂ ഉണ്ടെങ്കിൽ, പുതിയ ടാബ് അനുസരിച്ച് റിസൾട്ട് ക്രമീകരിക്കാൻ filterOrders() വീണ്ടും വിളിക്കുന്നു.
                let searchInput = document.getElementById('searchInput');
                if (searchInput && searchInput.value.trim() !== "") {
                    filterOrders();
                } else {
                    // സെർച്ച് ഇല്ലെങ്കിൽ മാത്രം സ്ക്രോൾ മുകളിലേക്ക് ആക്കുന്നു
                    localStorage.setItem('lastScrollPosition', 0);
                }
            });
        });
    } catch (e) { console.error("Init Error:", e); }
});

// 🔥 1. GLOBAL UI BEAUTIFIER & INITIALIZER
function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';

    // 🔥 മാസ്റ്റർ ലോഗിൻ ചെക്കിങ് (Salary & Settings Hide ചെയ്യാൻ)
    let isMasterUser = localStorage.getItem('kafakAdminUser') === 'master';

    if (!isMasterUser) {
        // സാധാരണ Admin ആണെങ്കിൽ Settings ബട്ടണും Salary ഓപ്ഷനും മായ്ച്ചു കളയുന്നു
        $('[data-bs-target="#settingsModal"]').hide();
        $('#exp-category option[value="Salary"]').remove(); // HTML-ൽ ഉള്ള Salary ഡിലീറ്റ് ചെയ്യുന്നു
        $('#edit-exp-cat option[value="Salary"]').remove();
    } else {
        // Master ആണെങ്കിൽ എല്ലാം കാണിക്കുന്നു
        $('[data-bs-target="#settingsModal"]').show();
        if ($('#exp-category option[value="Salary"]').length === 0) {
            $('#exp-category').append('<option value="Salary">Salary / Wages</option>');
        }
    }

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
    injectLeftDrawer();
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
// 🔥 BACKGROUND RATE FETCHER (Fixed: Always keeps rates up-to-date & Updates UI)
function fetchRatesBackground() {
    let cached = localStorage.getItem('adminRatesCache');

    // കാഷെ ഉണ്ടെങ്കിൽ അത് ആദ്യം എടുക്കുന്നു (ആപ്പ് പെട്ടെന്ന് ലോഡ് ആവാൻ)
    if (cached && cached !== "{}" && cached !== "null") {
        let parsed = JSON.parse(cached);
        if (Object.keys(parsed).length > 0) {
            courierRates = parsed;
            if (parsed._providers) {
                availableProviders = parsed._providers;
            }
            // 🔥 ഇവിടെ ഉണ്ടായിരുന്ന 'return;' നമ്മൾ ഒഴിവാക്കി! 
            // (അതുകൊണ്ട് എപ്പോഴും പുതിയ റേറ്റ് ഷീറ്റിൽ നിന്നും എടുക്കും)
        }
    }

    // കാഷെ ഉണ്ടെങ്കിലും ഇല്ലെങ്കിലും ബാക്ക്ഗ്രൗണ്ടിൽ പുതിയ റേറ്റ് എപ്പോഴും ചെക്ക് ചെയ്യുന്നു!
    console.log("🔄 Fetching latest rates from server...");
    fetch(`${scriptURL}?action=getRates`)
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success' && data.rates) {
                courierRates = data.rates;

                if (data.rates._providers) {
                    availableProviders = data.rates._providers;
                }

                // പുതിയ റേറ്റ് കാഷെയിലേക്ക് സേവ് ചെയ്യുന്നു
                localStorage.setItem('adminRatesCache', JSON.stringify(courierRates));
                console.log("✅ Rates Updated & Saved to LocalStorage");

                // 🔥 വിട്ടുപോയ ആ പ്രധാനപ്പെട്ട ഭാഗം തിരികെ ചേർത്തു!
                // ബാക്ക്ഗ്രൗണ്ടിൽ പുതിയ റേറ്റ് കിട്ടിയാൽ ഉടൻ തന്നെ സ്ക്രീനിൽ കാർഡുകൾ അപ്ഡേറ്റ് ആവാൻ:
                if (typeof allOrders !== 'undefined' && allOrders && allOrders.length > 0) {
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
                allOrders = response.data;
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
    // 1. SELECT DOM ELEMENTS
    const listNew = document.getElementById('list-sub-new');
    const listSent = document.getElementById('list-sub-sent');
    const listPaidNew = document.getElementById('list-paid-new');
    const listPaidPrinted = document.getElementById('list-paid-printed');
    const listDispNew = document.getElementById('list-disp-new');
    const listDispTracked = document.getElementById('list-disp-tracked');
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    // Helper to get effective status and dates
    const getOrderInfo = (o) => {
        // 🔥 FIX: Courier മാറ്റങ്ങൾ (meta update) ഇവിടെ എടുക്കരുത്. Status update മാത്രം എടുക്കുക!
        let local = pendingUpdates.find(u => u.oid === o.orderid && u.action !== 'meta' && u.action !== 'paidNum');

        let status = (local && local.status) ? local.status : (o.Status || 'Pending');
        let tDate = new Date(o.timestamp);
        let pDateStr = (status === 'Paid' && local?.actionDate) ? local.actionDate : (o.paidDate || o.timestamp);
        let pDate = new Date(pDateStr);
        let dDateStr = (status === 'Dispatched' && local?.actionDate) ? local.actionDate : (o['Dispatched Date'] || o.timestamp);
        let dDate = new Date(dDateStr);
        return { status, tDate, pDate, dDate, pDateStr, dDateStr };
    };

    // Rank Logic for Paid Orders
    window.paidRankMap = {};
    let sourceOrders = (typeof allOrders !== 'undefined' && allOrders.length > 0) ? allOrders : orders;
    let paidOrds = sourceOrders.filter(o => getOrderInfo(o).status === 'Paid');
    paidOrds.sort((a, b) => new Date(getOrderInfo(a).pDateStr) - new Date(getOrderInfo(b).pDateStr));
    paidOrds.forEach((o, i) => window.paidRankMap[o.orderid] = i + 1);

    // 2. CLEAR LISTS & RESTORE DEFAULT BUTTONS
    if (listNew) listNew.innerHTML = '';
    if (listSent) listSent.innerHTML = '';

    // 🔥 പുതിയ റൗണ്ട് ഡിസൈൻ (Text ഇല്ലാതെ, Tab-നുള്ളിൽ Sticky ആയി നിൽക്കാൻ)
    const getCourierBadgeHtml = (id) => `
        <div class="d-flex justify-content-end w-100" id="box-courier-${id}" style="display:none; position: sticky; top: 147px; z-index: 1020; pointer-events: none; float: right; margin-top: 5px;">
             <div class="bg-white border border-danger border-opacity-25 shadow rounded-pill px-3 py-1 d-flex align-items-center gap-2" style="font-size:11px; font-weight:800; color:#dc3545; pointer-events: auto;">
                 <div class="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style="width:20px; height:20px;"><i class="fas fa-truck" style="font-size:9px;"></i></div>
                 <span>₹<span id="txt-courier-${id}">0</span></span>
             </div>
        </div>`;

    if (listPaidNew) listPaidNew.innerHTML = `
        ${getCourierBadgeHtml('paid_new')}
        <div class="d-flex justify-content-between align-items-center mb-3 px-1 w-100">
            <button onclick="startScanner('dispatch')" class="btn btn-sm btn-dark rounded-pill px-3 fw-bold small"><i class="fas fa-qrcode"></i> Scan</button>
            <div class="d-flex gap-2">
                <button onclick="toggleSelectAll()" class="btn btn-sm btn-light fw-bold text-secondary border-0 small btn-select-all"><i class="far fa-square"></i> All</button>
                <button onclick="printSelected()" class="btn btn-sm btn-print-yellow rounded-pill px-3 fw-bold small">🖨️ Print</button>
            </div>
        </div>`;

    if (listPaidPrinted) listPaidPrinted.innerHTML = `
        ${getCourierBadgeHtml('paid_print')}
        <div class="d-flex justify-content-between align-items-center mb-3 px-1 w-100">
            <button onclick="startScanner('dispatch')" class="btn btn-sm btn-dark rounded-pill px-3 fw-bold small"><i class="fas fa-qrcode"></i> Scan</button>
            <div class="d-flex gap-2">
                <button onclick="toggleSelectAll()" class="btn btn-sm btn-light fw-bold text-secondary border-0 small btn-select-all"><i class="far fa-square"></i> All</button>
                <button onclick="printSelected('printed')" class="btn btn-sm btn-print-yellow rounded-pill px-3 fw-bold small">🖨️ Reprint</button>
            </div>
        </div>`;

    if (listDispNew) listDispNew.innerHTML = `
        ${getCourierBadgeHtml('disp_new')}
        <div class="text-center mb-3 w-100">
            <button onclick="startScanner('tracking')" class="btn btn-outline-primary rounded-pill px-4 py-2 fw-bold border-2 small">
                <i class="fas fa-barcode"></i> Courier Scan
            </button>
        </div>`;

    if (listDispTracked) listDispTracked.innerHTML = `
        ${getCourierBadgeHtml('disp_track')}
    `;

    // 3. INITIALIZE VARIABLES
    let counts = { pending: 0, paid: 0, dispatched: 0 };
    let btlCounts = { pending: 0, paid: 0, dispatched: 0 };
    let subCounts = { new: 0, sent: 0, paid_new: 0, paid_print: 0, disp_new: 0, disp_track: 0 };

    // State Stats Containers (Lakshadweep, Karnataka etc.)
    let stateStats = {
        paid_new: { lak: 0, kar: 0, tn: 0, other: 0 },
        paid_print: { lak: 0, kar: 0, tn: 0, other: 0 },
        disp_new: { lak: 0, kar: 0, tn: 0, other: 0 },
        disp_track: { lak: 0, kar: 0, tn: 0, other: 0 }
    };

    // Bottle Counts for Sub-Tabs
    let pNewQty = 0, pPrintQty = 0, dNewQty = 0, dTrackQty = 0;

    // Sorting Logic
    orders.sort((a, b) => {
        let infoA = getOrderInfo(a), infoB = getOrderInfo(b);
        const statusPriority = { 'Pending': 1, 'Sent': 1, 'Paid': 2, 'Dispatched': 3, 'Completed': 4, 'Archive': 5 };
        let statA = statusPriority[infoA.status] || 9, statB = statusPriority[infoB.status] || 9;
        if (statA !== statB) return statA - statB;
        let dateA = (statA === 2) ? infoA.pDate : ((statA === 3) ? infoA.dDate : infoA.tDate);
        let dateB = (statA === 2) ? infoB.pDate : ((statA === 3) ? infoB.dDate : infoB.tDate);
        return (currentSortDir === 'desc') ? dateB - dateA : dateA - dateB;
    });

    // 🔥 STEP 4: PRE-CALCULATE TIMELINE STATS (For Header Display)
    let timelineStats = {};
    let tabCourierTotal = { paid_new: 0, paid_print: 0, disp_new: 0, disp_track: 0 }; // 🔥 ടാബുകളിലെ മൊത്തം തുകയ്ക്ക്

    orders.forEach(o => {
        let { status, dDateStr, pDateStr } = getOrderInfo(o);
        if (status === 'Completed' || status === 'Archive') return;

        let meta = getMetaStatus(o.adminMeta);
        let dateKeyType = '';
        let displayDateRaw = o.timestamp;

        if (status === 'Paid') {
            displayDateRaw = pDateStr;
            dateKeyType = meta.isPrinted ? 'paid_print' : 'paid_new';
        } else if (status === 'Dispatched') {
            displayDateRaw = dDateStr;
            dateKeyType = (o.tracking || meta.isTracked) ? 'disp_track' : 'disp_new';
        } else if (status === 'Pending') dateKeyType = 'new';
        else if (status === 'Sent') dateKeyType = 'sent';

        if (dateKeyType) {
            let lbl = getTimelineLabel(displayDateRaw);
            let fullKey = `${dateKeyType}_${lbl}`;

            if (!timelineStats[fullKey]) timelineStats[fullKey] = { cost: 0, count: 0, bottles: 0 };

            timelineStats[fullKey].count++;
            let qty = parseInt(o.quantity) || 0;
            timelineStats[fullKey].bottles += qty;

            if (status === 'Dispatched' || status === 'Paid') {
                let actualC = parseInt(o.Actual_Courier_Cost) || parseInt(o.actualCourierCost) || 0;

                if (actualC <= 0) {
                    actualC = getBaseCourierRate(o.state, o.provider || o.Courier_Provider, qty);
                }
                timelineStats[fullKey].cost += actualC;

                // 🔥 ടാബിലെ മൊത്തം തുകയിലേക്ക് കൂട്ടുന്നു
                if (tabCourierTotal[dateKeyType] !== undefined) {
                    tabCourierTotal[dateKeyType] += actualC;
                }
            }
        }
    });

    // 🔥 STEP 5: MAIN RENDER LOOP (Merged everything here)
    let lastDateMap = { new: '', sent: '', paid_new: '', paid_print: '', disp_new: '', disp_track: '' };
    let firstDateFlags = { new: true, sent: true, paid_new: true, paid_print: true, disp_new: true, disp_track: true };

    // --- 🔥 FIX: 3 ദിവസത്തെ ലിമിറ്റ് സെറ്റ് ചെയ്യാനുള്ള വേരിയബിളുകൾ ഇവിടെയാണ് ചേർക്കേണ്ടത്! ---
    let oldTrackingCount = 0;
    let oldSentCount = 0;
    let oldPendingCount = 0;
    let oldDispNewCount = 0;

    // ഓരോ ടാബിലും എത്ര തീയതികൾ കാണിച്ചു എന്ന് ഓർമ്മിക്കാൻ
    let visibleDates = {
        sent: new Set(),
        disp_track: new Set(),
        new: new Set(),
        disp_new: new Set()
    };

    // ടാബുകൾ ലോഡ് ചെയ്യാൻ വേണ്ടിയുള്ള ഗ്ലോബൽ വേരിയബിളുകൾ
    window.showAllSent = window.showAllSent || false;
    window.showAllPending = window.showAllPending || false;
    window.showAllDispNew = window.showAllDispNew || false;
    // ----------------------------------------------------------------------

    orders.forEach((d, i) => {
        let { status, dDateStr, pDateStr } = getOrderInfo(d);
        d.paidDate = pDateStr;
        d['Dispatched Date'] = dDateStr;

        if (status === 'Completed' || status === 'Archive') return;

        let meta = getMetaStatus(d.adminMeta);
        let targetList = null;
        let type = '';
        let dateKey = '';

        let qty = parseInt(d.quantity) || 0;
        let s = String(d.state || '').toUpperCase().trim();
        let stateKey = null;

        // --- State Identification (For Dots) ---
        if (s && s !== 'KERALA') {
            if (s.includes('LAK')) stateKey = 'lak';
            else if (s.includes('KARN')) stateKey = 'kar';
            else if (s.includes('TAMIL') || s.includes('TN')) stateKey = 'tn';
            else stateKey = 'other';
        }

        // --- Classification Logic ---
        if (status === 'Pending') {
            targetList = listNew; type = 'pending'; dateKey = 'new'; counts.pending++; subCounts.new++;
        }
        else if (status === 'Sent') {
            targetList = listSent; type = 'pending'; dateKey = 'sent'; counts.pending++; subCounts.sent++;
        }
        else if (status === 'Paid') {
            type = 'paid'; counts.paid++;
            if (meta.isPrinted) {
                targetList = listPaidPrinted; dateKey = 'paid_print'; subCounts.paid_print++; pPrintQty += qty;
                if (stateKey) stateStats.paid_print[stateKey]++;
            } else {
                targetList = listPaidNew; dateKey = 'paid_new'; subCounts.paid_new++; pNewQty += qty;
                if (stateKey) stateStats.paid_new[stateKey]++;
            }
        }
        else if (status === 'Dispatched') {
            type = 'dispatched'; counts.dispatched++;
            if (d.tracking || meta.isTracked) {
                targetList = listDispTracked; dateKey = 'disp_track'; subCounts.disp_track++; dTrackQty += qty;
                if (stateKey) stateStats.disp_track[stateKey]++;
            } else {
                targetList = listDispNew; dateKey = 'disp_new'; subCounts.disp_new++; dNewQty += qty;
                if (stateKey) stateStats.disp_new[stateKey]++;
            }
        }

        if (targetList) {
            // ആദ്യം തന്നെ എണ്ണം കൂട്ടുന്നു (ബാഡ്ജിൽ തെറ്റാതിരിക്കാൻ)
            btlCounts[type] += qty;

            // ഓർഡറിന്റെ തീയതി ലേബൽ (Today, Yesterday, 12/01/2026) ഉണ്ടാക്കുന്നു
            let displayDateRaw = d.timestamp;
            if (type === 'paid') displayDateRaw = pDateStr;
            if (type === 'dispatched') displayDateRaw = dDateStr;
            let dateLabel = getTimelineLabel(displayDateRaw);

            // 🔥 1. TRACKED TAB LOGIC (Last 3 Active Dates മാത്രം)
            if (dateKey === 'disp_track' && !showAllTracking) {
                if (!visibleDates.disp_track.has(dateLabel) && visibleDates.disp_track.size >= 3) {
                    oldTrackingCount++; return;
                }
                visibleDates.disp_track.add(dateLabel);
            }
            // 🔥 2. SENT TAB LOGIC (Last 3 Active Dates മാത്രം)
            if (dateKey === 'sent' && !window.showAllSent) {
                if (!visibleDates.sent.has(dateLabel) && visibleDates.sent.size >= 3) {
                    oldSentCount++; return;
                }
                visibleDates.sent.add(dateLabel);
            }

            // 🔥 Pending (new) ഉം, Dispatched (disp_new) ഉം ഇവിടെ കൊടുക്കുന്നില്ല, അതുകൊണ്ട് അവയിലെ മുഴുവൻ കാർഡുകളും എപ്പോഴും കാണിക്കും!

            // --- STICKY DATE HEADER ---
            if (dateLabel !== lastDateMap[dateKey]) {
                if (lastDateMap[dateKey] !== '') firstDateFlags[dateKey] = false;
                let extraHtml = '';
                let s = timelineStats[`${dateKey}_${dateLabel}`];
                if (s) {
                    // 🔥 'type === dispatched' എന്ന കണ്ടീഷൻ ഒഴിവാക്കി, അതുകൊണ്ട് Paid ലും കാണിക്കും!
                    if (s.cost > 0) {
                        extraHtml += `<span class="ms-2 ps-2 border-start border-secondary"><i class="fas fa-shipping-fast text-muted" style="font-size:9px;"></i> ₹${s.cost}</span>`;
                    }
                    extraHtml += `<span class="ms-2 ps-2 border-start border-secondary"><i class="fas fa-box-open text-muted" style="font-size:9px;"></i> ${s.count}</span>`;
                    extraHtml += `<span class="ms-2 ps-2 border-start border-secondary"><i class="fas fa-wine-bottle text-muted" style="font-size:9px;"></i> ${s.bottles}</span>`;
                }
                targetList.innerHTML += `<div class="col-12 sticky-date-wrapper"><div class="timeline-badge d-flex align-items-center">${dateLabel}${extraHtml}</div></div>`;
                lastDateMap[dateKey] = dateLabel;
            }

            // --- COMPACT VIEW LOGIC ---
            let isCompact = (dateKey === 'disp_track' && !firstDateFlags[dateKey]);
            targetList.innerHTML += createCardHTML(d, i, type, status, isCompact);
        }
    });

    // 🔥 ലൂപ്പിന് ശേഷം ഹൈഡ് ചെയ്ത കാർഡുകൾക്കുള്ള ബട്ടൺ ചേർക്കുന്നു
    const addLoadMoreBtn = (listElement, count, funcName) => {
        if (count > 0 && listElement) {
            listElement.innerHTML += `
            <div class="text-center my-4">
                <button onclick="${funcName}()" class="btn btn-light border border-secondary border-opacity-50 text-secondary btn-sm rounded-pill px-4 shadow-sm fw-bold" style="font-size:11px;">
                    <i class="fas fa-history me-1"></i> Load Old Orders (${count})
                </button>
            </div>`;
        }
    };

    if (!showAllTracking) addLoadMoreBtn(listDispTracked, oldTrackingCount, 'loadOldTrackingOrders');
    if (!window.showAllSent) addLoadMoreBtn(listSent, oldSentCount, 'loadOldSentOrders');
    if (!window.showAllPending) addLoadMoreBtn(listNew, oldPendingCount, 'loadOldPendingOrders');
    if (!window.showAllDispNew) addLoadMoreBtn(listDispNew, oldDispNewCount, 'loadOldDispNewOrders');

    // ------------------------------------------------------------------
    // 🔥 EMPTY STATE UI (If no cards in a tab)
    // ------------------------------------------------------------------
    const getEmptyUI = (msg, subMsg, icon) => `
        <div class="text-center w-100 py-5 mt-3 fade-in d-flex flex-column align-items-center justify-content-center">
            <div style="width: 80px; height: 80px; background: #f8f9fa; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 15px; border: 1px dashed #ced4da;">
                <i class="fas ${icon} text-secondary opacity-50" style="font-size: 35px;"></i>
            </div>
            <h6 class="fw-bold text-dark mb-1" style="font-size: 14px; letter-spacing: 0.5px;">${msg}</h6>
            <div class="text-muted small" style="font-size: 11px;">${subMsg}</div>
        </div>`;

    // 1. Pending Tabs
    if (listNew && subCounts.new === 0) listNew.innerHTML += getEmptyUI('No New Orders', 'You have caught up with everything!', 'fa-box-open');
    if (listSent && subCounts.sent === 0) listSent.innerHTML += getEmptyUI('No Sent Orders', 'All invoices are cleared.', 'fa-paper-plane');

    // 2. Paid Tabs
    if (listPaidNew && subCounts.paid_new === 0) listPaidNew.innerHTML += getEmptyUI('No New Payments', 'Waiting for customers to pay.', 'fa-money-check-alt');
    if (listPaidPrinted && subCounts.paid_print === 0) listPaidPrinted.innerHTML += getEmptyUI('No Printed Labels', 'All labels are cleared.', 'fa-print');

    // 3. Dispatched Tabs
    if (listDispNew && subCounts.disp_new === 0) listDispNew.innerHTML += getEmptyUI('No Dispatched Orders', 'Waiting to add tracking IDs.', 'fa-shipping-fast');
    if (listDispTracked && subCounts.disp_track === 0) listDispTracked.innerHTML += getEmptyUI('No Tracked Orders', 'No orders in transit right now.', 'fa-route');
    // ------------------------------------------------------------------

    // 6. UPDATE BADGES
    updateBadgeUI('count-pending', counts.pending, btlCounts.pending);
    updateBadgeUI('count-paid', counts.paid, btlCounts.paid);
    updateBadgeUI('count-dispatched', counts.dispatched, btlCounts.dispatched);

    // State Dots HTML Helper
    const getDotsHtml = (stats) => {
        let html = '';
        if (stats.lak > 0) html += `<span class="state-dot" style="background:#0dcaf0;" title="Lakshadweep">${stats.lak}</span>`;
        if (stats.kar > 0) html += `<span class="state-dot" style="background:#d97706;" title="Karnataka">${stats.kar}</span>`;
        if (stats.tn > 0) html += `<span class="state-dot" style="background:#795548;" title="Tamil Nadu">${stats.tn}</span>`;
        if (stats.other > 0) html += `<span class="state-dot" style="background:#d63384;" title="Other State">${stats.other}</span>`;
        return html ? `<div class="d-flex gap-1 ms-1 align-items-center">${html}</div>` : '';
    };

    // Inject CSS for Dots
    if (!$('#state-dot-css').length) {
        $('<style id="state-dot-css">').html(`.state-dot { width: 14px; height: 14px; border-radius: 50%; color: white; font-size: 8px; font-weight: bold; display: flex; justify-content: center; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }`).appendTo('head');
    }

    // Update Sub-tab Badges
    const setBadge = (id, val, btl, stats) => {
        if (document.getElementById(id)) {
            document.getElementById(id).innerHTML = `${val} <span style="font-size:0.8em; opacity:0.8;"><i class="fas fa-wine-bottle" style="font-size:9px;"></i> ${btl}</span> ${getDotsHtml(stats)}`;
        }
    };

    // Basic Badges
    const setBasicBadge = (id, val) => { if (document.getElementById(id)) document.getElementById(id).innerText = val; };
    setBasicBadge('badge-sub-new', subCounts.new);
    setBasicBadge('badge-sub-sent', subCounts.sent);

    // Advanced Badges (With Dots & Bottles)
    setBadge('badge-paid-new', subCounts.paid_new, pNewQty, stateStats.paid_new);
    setBadge('badge-paid-printed', subCounts.paid_print, pPrintQty, stateStats.paid_print);
    setBadge('badge-disp-new', subCounts.disp_new, dNewQty, stateStats.disp_new);
    setBadge('badge-disp-tracked', subCounts.disp_track, dTrackQty, stateStats.disp_track);

    updateSyncButtonUI();
    checkSelectAllStatus();

    let savedScroll = localStorage.getItem('lastScrollPosition');
    if (savedScroll && parseInt(savedScroll) > 0) {
        setTimeout(() => { window.scrollTo(0, parseInt(savedScroll)); }, 100);
    }

    const setTabCourierTotal = (tabKey) => {
        let amt = tabCourierTotal[tabKey];
        if (amt > 0) {
            $(`#box-courier-${tabKey}`).css('display', 'flex'); // 🔥 block മാറ്റി flex ആക്കി
            $(`#txt-courier-${tabKey}`).text(amt.toLocaleString('en-IN'));
        } else {
            $(`#box-courier-${tabKey}`).css('display', 'none');
        }
    };

    setTabCourierTotal('paid_new');
    setTabCourierTotal('paid_print');
    setTabCourierTotal('disp_new');
    setTabCourierTotal('disp_track');

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
    let buttons = '';
    let logicType = type;
    if (type === 'search') {
        if (currentStatus === 'Pending' || currentStatus === 'Sent') logicType = 'pending';
        else if (currentStatus === 'Paid') logicType = 'paid';
        else if (currentStatus === 'Dispatched') logicType = 'dispatched';
    }

    // 1. Basic Data & Safety
    let safe = (val) => String(val || '').toUpperCase();
    let dateObj = new Date(d.timestamp);
    let formattedDate = dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    let priceInfo = calculatePriceInfo(d, d.quantity, d.state, d.provider || d.Courier_Provider);

    // 2. Customer Stats (History) - 🔥 1 LAKH SCALING LOGIC 🔥
    let totalOrders = 0;
    let totalBottles = 0;

    // A. ഗൂഗിൾ ഷീറ്റിലെ 'Customers' ഡാറ്റാബേസിൽ നിന്നും കണക്ക് വന്നിട്ടുണ്ടെങ്കിൽ അത് നേരിട്ട് എടുക്കുന്നു (O(1) Time - Super Fast)
    if (d.Total_Orders !== undefined || d.total_orders !== undefined) {
        totalOrders = parseInt(d.Total_Orders || d.total_orders) || 1;
        totalBottles = parseInt(d.Total_Bottles || d.total_bottles) || (parseInt(d.quantity) || 1);
    }
    // B. ഇനി ഷീറ്റിൽ നിന്നും വന്നിട്ടില്ലെങ്കിൽ മാത്രം (Fall-back) ഫോണിൽ ഉള്ളതിൽ നിന്നും എണ്ണിയെടുക്കുന്നു
    else {
        let currentPhone = String(d.phone || '').replace(/[^0-9]/g, '');
        let custHistory = (typeof allOrders !== 'undefined') ? allOrders.filter(o => {
            let matchPhone = String(o.phone || '').replace(/[^0-9]/g, '') === currentPhone;
            let s = o.Status || 'Pending';
            return matchPhone && (s !== 'Pending' && s !== 'Sent' && s !== 'Archive');
        }) : [];
        totalOrders = custHistory.length;
        totalBottles = custHistory.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
    }

    // 3. Compact View (Collapsed Logic) - EARLY EXIT
    if (isCompact) {
        let phoneDisplay = d.phone ? d.phone.replace(/[^0-9]/g, '').slice(-10) : '';
        return `
        <div class="col-12 col-md-6 col-lg-6">
            <div class="order-card p-0 shadow-sm border-0 mb-2" style="border-radius:10px; overflow:hidden;">
                <div class="d-flex align-items-center justify-content-between p-3 bg-white" 
                     onclick="toggleCardUI(this.parentElement)" 
                     style="cursor:pointer; border:1px solid #eee; border-radius:10px;">
                    <div class="d-flex align-items-center gap-2 overflow-hidden">
                         <span class="badge bg-light text-secondary border" style="font-size:10px; font-weight:700;">${d.orderid.slice(-4)}</span>
                         <div class="fw-bold text-dark text-truncate" style="font-size:13px;">${safe(d.name)}</div>
                         <div class="text-muted small" style="font-size:11px;"><i class="fas fa-phone-alt ms-1 me-1" style="font-size:9px;"></i>${phoneDisplay}</div>
                    </div>
                    <i class="fas fa-chevron-down text-muted small transition-icon"></i>
                </div>
                <div class="full-card-content bg-white border-top p-3" style="display:none;">
                    ${createCardHTML(d, index, type, currentStatus, false)} 
                </div>
            </div>
        </div>`;
    }

    // --- FULL CARD CONTENT (Standard View) ---

    // Badges & Status Color
    let statusColor = 'secondary';
    if (currentStatus === 'Pending') statusColor = 'warning text-dark';
    if (currentStatus === 'Sent') statusColor = 'primary';
    if (currentStatus === 'Paid') statusColor = 'success';
    if (currentStatus === 'Refunded') statusColor = 'danger';
    if (currentStatus === 'Dispatched') statusColor = 'info text-dark';

    let langBadge = d.language ? `<span class="badge rounded-pill border ms-1 text-secondary" style="font-size:9px; background:#f8f9fa;">${d.language.toUpperCase()}</span>` : '';

    let meta = getMetaStatus(d.adminMeta);
    let metaBadges = '';
    if (meta.isPrinted) metaBadges += `<span class="dot-indicator brown" title="Printed"></span>`;
    if (meta.isTracked) metaBadges += `<span class="dot-indicator blue" title="Tracked"></span>`;

    let resendBadge = '';
    let oldTrackingInfo = '';

    // പഴയ ഹിസ്റ്ററി ഉണ്ടോ എന്ന് ചെക്ക് ചെയ്യുന്നു
    // let currentMetaStr = String(d.adminMeta || '');
    // if (currentMetaStr.includes('|OldTrk:')) {
    //     let historyMatch = currentMetaStr.split('|OldTrk:')[1];
    //     if (historyMatch) {
    //         oldTrackingInfo = `
    //         <div class="mt-2 p-2 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3 d-flex align-items-center justify-content-between" style="font-size:10px;">
    //             <div><i class="fas fa-info-circle text-danger me-1"></i> <b>Old Courier:</b> <span class="text-secondary">${historyMatch}</span></div>
    //         </div>`;
    //     }
    // }

    if (meta.isResend) {
        resendBadge = `<span class="badge bg-danger ms-1 shadow-sm" style="font-size:9px; border-radius:6px;" title="This order was returned and is being resent"><i class="fas fa-reply-all me-1"></i>RESEND</span>`;
    }
    let rankBadge = '';
    if (currentStatus === 'Paid' && window.paidRankMap && window.paidRankMap[d.orderid]) {
        rankBadge = `<span class="badge rounded-pill bg-warning text-dark border border-dark shadow-sm" style="font-size:11px; margin-right:4px; font-weight:800;">#${window.paidRankMap[d.orderid]}</span>`;
    }


    // Fraud/Linked Order Alert
    let fraudAlertHtml = '';
    // 🔥 Paid ടാബിലും കാണിക്കാൻ currentStatus === 'Paid' കൂടി ചേർത്തിട്ടുണ്ട്
    if (currentStatus === 'Pending' || currentStatus === 'Sent' || currentStatus === 'Paid') {
        let linkData = checkCrossLinking(d); // മാച്ച് ആയ നമ്പറും എടുക്കുന്നു
        if (linkData) {
            let linkedOrder = linkData.order;
            let matchedNum = linkData.matchedNum; // ഏത് നമ്പർ വഴിയാണ് ലിങ്ക് ആയത് എന്ന്

            let linkStatus = String(linkedOrder.Status || 'Pending');
            let linkColor = linkStatus === 'Paid' ? 'danger' : 'warning';
            let linkIcon = linkStatus === 'Paid' ? 'exclamation-triangle' : 'link';

            // ഓർഡർ ചെയ്ത തീയതിയും സമയവും (Top Right)
            let linkDateStr = '';
            if (linkedOrder.timestamp) {
                let lDate = new Date(linkedOrder.timestamp);
                linkDateStr = lDate.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
            }

            // ഫോൺ നമ്പറുകൾ ഒരുമിച്ചാക്കാൻ (Smart Contact Line with Radio Buttons)
            let linkContacts = {};
            const cleanNumLinked = (n) => String(n || '').replace(/[^0-9]/g, '');

            const addLinkedContact = (type, num) => {
                let clNum = cleanNumLinked(num);
                if (clNum && clNum.length >= 10) {
                    if (!linkContacts[clNum]) linkContacts[clNum] = [];
                    linkContacts[clNum].push(type);
                }
            };

            addLinkedContact('<i class="fas fa-phone-alt text-primary" title="Phone"></i>', linkedOrder.phone);
            addLinkedContact('<i class="fab fa-whatsapp text-success" title="WhatsApp"></i>', linkedOrder.whatsapp);
            addLinkedContact('<i class="fas fa-phone-square text-secondary" title="Alt Phone"></i>', linkedOrder.altphone);
            if (linkedOrder.paidNum) {
                addLinkedContact('<i class="fas fa-money-bill-wave text-success" title="Paid Num"></i>', linkedOrder.paidNum);
            }

            // 🔥 Radio Buttons തയ്യാറാക്കുന്നു
            let radioHtml = '';
            let isFirstRadio = true; // ആദ്യത്തേത് Default ആയി Select ചെയ്യാൻ
            for (let num in linkContacts) {
                let icons = linkContacts[num].join('<span style="margin-left:3px;"></span>');
                let checkedStr = isFirstRadio ? 'checked' : '';
                radioHtml += `
                <label class="d-flex align-items-center me-3 mb-1" style="cursor:pointer; font-size:11px;" onclick="event.stopPropagation();">
                    <input type="radio" name="link_wa_${d.orderid}" value="${num}" ${checkedStr} class="me-1" style="margin:0; cursor:pointer; transform: scale(0.9);">
                    ${icons} <span class="fw-bold ms-1 text-dark">${num.slice(-10)}</span>
                </label>`;
                isFirstRadio = false;
            }

            // 🔥 WhatsApp Open Button (Selected Radio Button-ലെ നമ്പർ എടുത്ത് WA തുറക്കും)
            let linkWaBtn = `<button type="button" class="btn btn-sm btn-success py-0 px-2 shadow-sm ms-auto d-flex align-items-center" style="font-size:10px; height:24px; border-radius:6px;" onclick="event.stopPropagation(); let sel = document.querySelector('input[name=\\'link_wa_${d.orderid}\\']:checked'); if(sel){ let v = sel.value; if(v.length===10) v='91'+v; window.open('https://wa.me/'+v, '_blank'); }"><i class="fab fa-whatsapp me-1" style="font-size:12px;"></i> WA</button>`;

            // Archive ബട്ടൺ കാണിക്കണോ എന്ന് തീരുമാനിക്കുന്നു
            let hideArchiveFor = ['archive', 'sent', 'dispatched', 'delivered', 'completed'];
            let showArchiveBtn = !hideArchiveFor.includes(linkStatus.toLowerCase());

            let archiveBtnHtml = showArchiveBtn ? `<button onclick="event.stopPropagation(); highlightCard(this); archiveOrder('${linkedOrder.orderid}')" class="btn btn-sm btn-outline-danger fw-bold shadow-sm py-0 px-2" style="font-size:9px;"><i class="fas fa-archive"></i></button>` : '';

            fraudAlertHtml = `
            <div class="alert alert-${linkColor} p-2 mb-2 mt-1 shadow-sm border-${linkColor}" style="border-radius:8px;" onclick="event.stopPropagation();">
                <div class="d-flex justify-content-between align-items-start">
                    <div style="font-size:11px; font-weight:700; color:#b91c1c;">
                        <i class="fas fa-${linkIcon}"></i> Linked: ${linkedOrder.name} <span class="badge bg-secondary bg-opacity-25 text-dark ms-1" style="font-size:9px;">[${linkStatus}]</span>
                    </div>
                    <div style="font-size:9px; font-weight:700; color:#666; text-align:right;">
                        ${linkDateStr}
                    </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center mt-1 mb-2">
                    <div style="font-size:10px; color:#555; display:flex; align-items:center; gap:8px;">
                        ID: <b>${linkedOrder.orderid}</b> 
                        <div onclick="event.stopPropagation(); document.getElementById('searchInput').value='${matchedNum}'; filterOrders();" 
                             style="cursor:pointer; background:#e0f2fe; color:#0284c7; padding:2px 6px; border-radius:4px; border:1px solid #bae6fd;" title="Compare Both Orders">
                             <i class="fas fa-search" style="font-size:10px;"></i>
                        </div>
                    </div>
                    ${archiveBtnHtml}
                </div>
                
                <div class="d-flex align-items-center flex-wrap" style="background:rgba(255,255,255,0.6); padding:6px; border-radius:6px; border:1px solid rgba(0,0,0,0.05);">
                    <div class="d-flex flex-wrap align-items-center flex-grow-1">
                        ${radioHtml}
                    </div>
                    ${linkWaBtn}
                </div>
            </div>`;
        }
    }

    // Header Construction (Left Side - Archive/Refund ബട്ടണുകൾ ഒഴിവാക്കി)
    let headerLeft = `
        <div class="d-flex align-items-center flex-wrap gap-2">
            ${rankBadge} 
            
            <span class="badge rounded-pill bg-dark d-flex align-items-center shadow-sm" 
                  style="font-size:11px; cursor:pointer; padding: 4px 10px;" 
                  onclick="event.stopPropagation(); copyToClipboard('${d.orderid}')" 
                  title="Click to Copy ID">
                ${d.orderid} <i class="far fa-copy ms-2" style="opacity:0.7; font-size:12px;"></i>
            </span>
            
            ${metaBadges} 
            <span class="badge rounded-pill bg-${statusColor}" style="font-size:10px;">${currentStatus}</span>
            ${langBadge}
        </div>`;

    // 🔥 BEAUTIFUL 3-DOT MENU (Top Right Actions)
    let menuItems = '';

    // 1. Edit (എല്ലായ്പ്പോഴും കാണിക്കും)
    menuItems += `<li><a class="dropdown-item py-2 fw-bold text-dark d-flex align-items-center" href="order.html?oid=${d.orderid}" target="_blank" onclick="event.stopPropagation();"><i class="fas fa-pen text-primary me-2" style="width:16px; text-align:center;"></i> Edit Order</a></li>`;

    // 2. Print (എല്ലായ്പ്പോഴും കാണിക്കും)
    menuItems += `<li><a class="dropdown-item py-2 fw-bold text-dark d-flex align-items-center" href="#" onclick="event.stopPropagation(); printSingle(${index});"><i class="fas fa-print text-secondary me-2" style="width:16px; text-align:center;"></i> Print Label</a></li>`;

    // 3. Send Receipt (Paid സ്റ്റാറ്റസ് ആണെങ്കിൽ മാത്രം)
    if (logicType === 'paid') {
        menuItems += `<li><a class="dropdown-item py-2 fw-bold text-dark d-flex align-items-center" href="#" onclick="event.stopPropagation(); sendPaymentWA('${d.orderid}', ${index}, '${type}');"><i class="fab fa-whatsapp text-success me-2" style="width:16px; text-align:center;"></i> Send Receipt</a></li>`;
    }


    // 4. Revert Status (Dispatched, Paid സ്റ്റാറ്റസുകൾക്ക് മാത്രം)
    if (logicType === 'dispatched') {
        let isTrackedCard = (d.tracking || meta.isTracked);
        let revertFn = isTrackedCard ? `revertToDispatched('${d.orderid}')` : `revertToPrinted('${d.orderid}')`;
        menuItems += `<li><a class="dropdown-item py-2 fw-bold text-dark d-flex align-items-center" href="#" onclick="event.stopPropagation(); ${revertFn};"><i class="fas fa-history text-warning me-2" style="width:16px; text-align:center;"></i> Revert Status</a></li>`;
    } else if (logicType === 'paid') {
        let revertFn = meta.isPrinted ? `confirmUnprint('${d.orderid}')` : `updateOrder('${d.orderid}', 'Sent')`;
        menuItems += `<li><a class="dropdown-item py-2 fw-bold text-dark d-flex align-items-center" href="#" onclick="event.stopPropagation(); ${revertFn};"><i class="fas fa-history text-warning me-2" style="width:16px; text-align:center;"></i> Revert Status</a></li>`;
    }

    // 5. Archive (Pending, Sent സ്റ്റാറ്റസുകൾക്ക് മാത്രം)
    if (currentStatus === 'Sent' || currentStatus === 'Pending') {
        menuItems += `<li><hr class="dropdown-divider m-1"></li>`;
        menuItems += `<li><a class="dropdown-item py-2 fw-bold text-dark d-flex align-items-center" href="#" onclick="event.stopPropagation(); archiveOrder('${d.orderid}');"><i class="fas fa-archive text-secondary me-2" style="width:16px; text-align:center;"></i> Archive Order</a></li>`;
    }

    // 5.5 Resend (Dispatched/Delivered ആയവയ്ക്ക് മാത്രം)
    if (currentStatus === 'Dispatched' || currentStatus === 'Delivered' || currentStatus === 'Completed') {
        menuItems += `<li><a class="dropdown-item py-2 fw-bold text-dark d-flex align-items-center" href="#" onclick="event.stopPropagation(); handleResendOrder('${d.orderid}', ${index});"><i class="fas fa-reply-all me-2 text-warning" style="width:16px; text-align:center;"></i> Resend / Return</a></li>`;
    }

    // 6. Refund (Completed, Refunded അല്ലാത്ത എല്ലാത്തിനും)
    if (currentStatus !== 'Refunded' && currentStatus !== 'Completed') {
        if (currentStatus !== 'Sent' && currentStatus !== 'Pending') {
            menuItems += `<li><hr class="dropdown-divider m-1"></li>`; // ഡബിൾ ലൈൻ വരാതിരിക്കാൻ
        }
        menuItems += `<li><a class="dropdown-item py-2 fw-bold text-danger d-flex align-items-center" href="#" id="ref-btn-${d.orderid}" onclick="event.stopPropagation(); handleRefundToggle('${d.orderid}', ${index});"><i class="fas fa-undo-alt me-2" style="width:16px; text-align:center;"></i> Issue Refund</a></li>`;
    }

    // 3-Dot ബട്ടണും മെനുവും ഒരുമിച്ച്
    let topActions = `
    <div class="dropdown" onclick="event.stopPropagation();">
        <button class="btn btn-sm btn-light border border-secondary border-opacity-25 rounded-circle shadow-sm d-flex align-items-center justify-content-center" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="width:32px; height:32px; background:#f8f9fa;">
            <i class="fas fa-ellipsis-v text-secondary"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0" style="font-size:12px; border-radius:12px; min-width: 170px; z-index: 1050; margin-top:5px;">
            ${menuItems}
        </ul>
    </div>`;
    // Paid Date Display
    let paidTimeHTML = '';
    if ((logicType === 'paid' || currentStatus === 'Paid') && d.paidDate) {
        let pDate = new Date(d.paidDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
        paidTimeHTML = `<div class="mb-2 px-2 py-1 bg-success bg-opacity-10 border border-success border-opacity-25 rounded small text-success fw-bold" style="font-size:11px; display:inline-block;"><i class="fas fa-check-circle me-1"></i> Paid on: ${pDate}</div>`;
    }

    // Contact Selector Logic
    let uniqueContacts = new Map();
    const cleanNum = (n) => String(n || '').replace(/[^0-9]/g, '');
    if (d.whatsapp) uniqueContacts.set(cleanNum(d.whatsapp), { val: d.whatsapp, label: `📲 WA: ${d.whatsapp}`, type: 'whatsapp' });
    if (d.phone && !uniqueContacts.has(cleanNum(d.phone))) uniqueContacts.set(cleanNum(d.phone), { val: d.phone, label: `📞 PH: ${d.phone}`, type: 'phone' });
    if (d.altphone && !uniqueContacts.has(cleanNum(d.altphone))) uniqueContacts.set(cleanNum(d.altphone), { val: d.altphone, label: `☎️ ALT: ${d.altphone}`, type: 'alt' });
    if (d.paidNum && !uniqueContacts.has(cleanNum(d.paidNum))) uniqueContacts.set(cleanNum(d.paidNum), { val: d.paidNum, label: `💰 PAID: ${d.paidNum}`, type: 'paid' });

    let opts = '';
    let selType = meta.contact || 'whatsapp';
    if (!d.adminMeta) selType = 'whatsapp';

    uniqueContacts.forEach((v, k) => {
        let isSelected = (v.type === selType) ? 'selected' : '';
        let code = (v.type === 'whatsapp') ? 'W' : (v.type === 'alt' ? 'A' : (v.type === 'paid' ? 'G' : 'M'));
        opts += `<option value="${code}" ${isSelected}>${v.label}</option>`;
    });

    let waSelectorHTML = `
    <div class="mt-2 mb-2 d-flex gap-1" onclick="highlightCard(this)">
        <select id="wa-select-${type}-${index}" 
            onchange="updateAdminMeta('${d.orderid}', 'contact', this.value);" 
            class="form-select form-select-sm shadow-none border-secondary text-secondary flex-grow-1" 
            style="font-size:11px; font-weight:700; padding:4px 25px 4px 8px;">${opts}</select>
        <button class="btn btn-sm btn-success" onclick="openSimpleWA(${index}, this, '${type}')" title="Open WhatsApp Chat"><i class="fab fa-whatsapp"></i></button>
    </div>`;

    // Contact Visuals (Icons)
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

    // === MAIN BUTTONS LOGIC ===
    if (currentStatus === 'Completed' || currentStatus === 'Delivered') {
        let delDateStr = d['Delivered Date'] || d.actionDate;
        let dateDisplay = '';
        if (delDateStr) {
            let fmtDate = new Date(delDateStr).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
            dateDisplay = `<div style="background:#f0fff4; border:1px solid #bbf7d0; padding:8px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;"><div style="font-size:11px; color:#15803d; font-weight:700;"><i class="fas fa-check-circle me-1"></i> Delivered: ${fmtDate}</div><button onclick="event.stopPropagation(); editDeliveredDate('${d.orderid}', '${delDateStr}')" class="btn btn-sm btn-light border py-0 px-2" style="font-size:10px;">✏️</button></div>`;
        }
        buttons = dateDisplay + `<button class="btn btn-secondary w-100 disabled" style="opacity:0.7;">Order Completed</button>`;
    }
    else if (logicType === 'pending') {
        let waBtnLabel = (currentStatus === 'Sent') ? 'Resend' : 'Invoice';
        let actionBtn = '';

        // 🔥 CHANGE: Status Sent ആണെങ്കിൽ 'PAID' ബട്ടൺ, അല്ലെങ്കിൽ 'SENT' ബട്ടൺ
        if (currentStatus === 'Sent') {
            // Green PAID Button
            actionBtn = `<button class="btn btn-success shadow-sm border-0 d-flex align-items-center justify-content-center fw-bold" 
                         style="width:100px; border-radius:10px; background:#198754;" 
                         onclick="highlightCard(this); updateOrder('${d.orderid}', 'Paid')" 
                         title="Mark as Paid">💰 PAID</button>`;
        } else {
            // Blue SENT Button
            actionBtn = `<button class="btn btn-primary shadow-sm border-0 d-flex align-items-center justify-content-center fw-bold" 
                         style="width:100px; border-radius:10px; background:#0d6efd;" 
                         onclick="highlightCard(this); updateOrder('${d.orderid}', 'Sent')" 
                         title="Mark as Sent">SENT <i class="fas fa-arrow-right ms-1"></i></button>`;
        }

        buttons = `<div class="d-flex gap-2 w-100"><button class="btn-custom btn-wa flex-grow-1" onclick="highlightCard(this); sendWA(${index}, '${type}')"><i class="fab fa-whatsapp"></i> ${waBtnLabel}</button>${actionBtn}</div>`;
    }
    else if (logicType === 'paid') {
        buttons = `<div class="d-flex gap-2 align-items-center w-100"><button class="btn-custom btn-dispatch flex-grow-1" onclick="highlightCard(this); updateOrder('${d.orderid}', 'Dispatched')">📦 DISPATCH</button><div style="width: 40px; display: flex; justify-content: center;"><input type="checkbox" class="order-cb" style="width: 22px; height: 22px; cursor: pointer;" value="${index}" onclick="event.stopPropagation(); checkSelectAllStatus();"></div></div>`;
    }
    else if (logicType === 'dispatched') {
        let trackNum = d.tracking || '';
        let rawProvider = String(d.provider || d.Courier_Provider || 'DTDC').trim();
        let trackLink = `https://www.google.com/search?q=${encodeURIComponent(rawProvider)}+tracking+${trackNum}`;

        let dispDateStr = d['Dispatched Date'] || d.actionDate || d.timestamp;
        let formattedDispDate = new Date(dispDateStr).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

        let dateHtml = `<div style="background:#f0fdf4; border:1px solid #dcfce7; padding:8px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;"><div style="font-size:11px; color:#166534; font-weight:700;"><i class="fas fa-shipping-fast me-1"></i> Dispatched: ${formattedDispDate}</div><button onclick="event.stopPropagation(); editDispatchDate('${d.orderid}', '${dispDateStr}')" class="btn btn-sm btn-light border py-0 px-2" style="font-size:10px;">✏️</button></div>`;

        let trkBtnHtml = '';
        let isInTrackedList = (trackNum || meta.isTracked);
        if (trackNum) {
            trkBtnHtml = `<div class="d-flex gap-1 mb-2 w-100"><button class="btn-custom btn-track flex-grow-1" onclick="highlightCard(this); editTracking('${d.orderid}', '${trackNum}')">🚚 TRK: ${trackNum}</button><a href="${trackLink}" target="_blank" onclick="event.stopPropagation(); highlightCard(this);" class="btn btn-custom btn-track d-flex align-items-center justify-content-center" style="width: 45px; flex:none;"><i class="fas fa-search"></i></a></div>`;
        } else {
            let moveBtn = !isInTrackedList ? `<button onclick="event.stopPropagation(); updateAdminMeta('${d.orderid}', 'tracked', 'T')" class="btn btn-outline-secondary ms-1 shadow-sm" title="Move to Tracked Tab" style="width:40px; border-radius:10px;"><i class="fas fa-arrow-right"></i></button>` : '';
            trkBtnHtml = `<div class="d-flex gap-1 mb-2 w-100"><button class="btn btn-danger flex-grow-1 fw-bold shadow-sm" style="border-radius:10px; font-size:12px; letter-spacing:0.5px;" onclick="highlightCard(this); editTracking('${d.orderid}', '')">⚠️ ADD TRK</button>${moveBtn}</div>`;
        }
        buttons = `${dateHtml}${trkBtnHtml}<button class="btn-custom btn-complete w-100" onclick="highlightCard(this); updateOrder('${d.orderid}', 'Completed')">✅ Complete</button>`;
    }

    // FINAL ASSEMBLY
    let providerOptions = '';
    availableProviders.forEach(prov => {
        let isSelected = (String(d.provider || d.Courier_Provider).toUpperCase() === String(prov).toUpperCase()) ? 'selected' : '';
        providerOptions += `<option value="${prov}" ${isSelected}>${prov}</option>`;
    });
    return `
    <div class="col-12 col-md-12 col-lg-12">
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
                ${safe(d.district)}, ${safe(d.state)} - <b>${d.pincode}</b>
                <div class="mt-2" style="font-size:11px;">${contactLine}</div>
            </div>
            <div class="info-box mt-2">
                <span>${d.quantity} Bottles</span>
                <div class="d-flex align-items-center">
                    <select class="form-select form-select-sm me-2 border-secondary shadow-sm" style="width:120px; font-size:11px; font-weight:bold; padding:2px 5px;" onchange="event.stopPropagation(); changeCourier('${d.orderid}', this.value)">
                        ${providerOptions}
                    </select>
                    <span class="fw-bold text-success d-flex align-items-center" id="price-box-${d.orderid}">${priceInfo.breakdownText}</span>
                </div>
            </div>
            ${waSelectorHTML}
            ${oldTrackingInfo} <div class="action-area mt-2" style="display:block;">${buttons}</div>
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
// 🔥 UPDATED: POWERFUL SEARCH (Address Filter + Active Tab Priority)
function filterOrders() {
    const term = document.getElementById('searchInput').value.trim().toLowerCase();
    const termClean = term.replace(/[^0-9]/g, ''); // സെർച്ച് ടേമിലെ നമ്പർ മാത്രം

    // Clear Button Visibility
    const clearBtn = document.getElementById('btn-clear-search');
    if (term.length > 0) clearBtn.style.display = 'block';
    else clearBtn.style.display = 'none';

    const tabsContainer = document.getElementById('tabs-container');
    const searchResultsArea = document.getElementById('search-results-area');
    const searchList = document.getElementById('list-search');

    if (term.length > 0) {
        tabsContainer.style.display = 'none';
        searchResultsArea.style.display = 'block';
        searchList.innerHTML = '';

        // 1. FIND ACTIVE TAB STATUS (To prioritize results)
        let activeStatus = [];
        // Check which tab button is active (Assuming standard Bootstrap IDs)
        if ($('#pills-pending-tab').hasClass('active')) activeStatus = ['Pending', 'Sent'];
        else if ($('#pills-paid-tab').hasClass('active')) activeStatus = ['Paid'];
        else if ($('#pills-dispatched-tab').hasClass('active')) activeStatus = ['Dispatched'];
        else if ($('#pills-completed-tab').hasClass('active')) activeStatus = ['Completed', 'Delivered'];

        // 2. FILTER LOGIC
        let matches = allOrders.filter(o => {
            // A. Text Search (Name, ID)
            if ((o.name || '').toLowerCase().includes(term)) return true;
            if ((o.orderid || '').toLowerCase().includes(term)) return true;

            // B. Address Search (House, Place, District, State, Pin) 🔥 NEW
            let addressStr = [
                o.house, o.place, o.postoffice,
                o.district, o.state, o.pincode
            ].map(s => String(s || '').toLowerCase()).join(' ');

            if (addressStr.includes(term)) return true;

            // C. Number Search (Phone, WA, Alt, Paid Num)
            if (termClean.length > 0) {
                let p = String(o.phone || '').replace(/[^0-9]/g, '');
                let w = String(o.whatsapp || '').replace(/[^0-9]/g, '');
                let paid = String(o.paidNum || '').replace(/[^0-9]/g, '');

                if (p.includes(termClean)) return true;
                if (w.includes(termClean)) return true;
                if (paid.includes(termClean)) return true;
            }
            return false;
        });

        // 3. SORT LOGIC (Active Tab First) 🔥 NEW
        matches.sort((a, b) => {
            // Check if items belong to the active tab
            let aIsActive = activeStatus.includes(a.Status) ? 1 : 0;
            let bIsActive = activeStatus.includes(b.Status) ? 1 : 0;

            // Priority 1: Active Tab Status comes first
            if (aIsActive !== bIsActive) return bIsActive - aIsActive;

            // Priority 2: Sort by Date (Newest First) within groups
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // 4. RENDER RESULTS
        if (matches.length === 0) {
            searchList.innerHTML = `<div class="text-center text-muted mt-3 mb-2">No local results found.</div>`;
        } else {
            // Show a small header if prioritizing
            let prevWasActive = true;

            matches.forEach(d => {
                let isCurrentActive = activeStatus.includes(d.Status);

                // Optional: Add a separator line between Active Tab results and Others
                if (activeStatus.length > 0 && prevWasActive && !isCurrentActive) {
                    searchList.innerHTML += `<div class="text-center my-2"><span class="badge bg-secondary bg-opacity-25 text-secondary rounded-pill px-3" style="font-size:10px;">OTHER RESULTS</span></div>`;
                    prevWasActive = false;
                }

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
        renderTabs(allOrders);
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

// 🔥 FULL FIXED updateOrder FUNCTION (customDate Error Fixed)
window.updateOrder = function (oid, status, tracking = null, skipConfirm = false, customDate = null, appendMessage = '') {
    let orderIndex = allOrders.findIndex(o => o.orderid === oid);
    if (orderIndex === -1) return;

    let trackingNum = tracking;

    let executeUpdate = () => {
        let updateObj = { oid: oid, status: status, actionDate: new Date() };
        if (trackingNum !== null) updateObj.tracking = trackingNum;
        if (appendMessage) updateObj.appendMessage = appendMessage;

        let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
        let existingIndex = updates.findIndex(u => u.oid === oid && u.action === 'status');

        let existingOrder = allOrders.find(o => o.orderid === oid);

        // യഥാർത്ഥ പഴയ സ്റ്റാറ്റസ് എടുക്കുന്നു (Undo ചെയ്യാൻ വേണ്ടി)
        let trueOldStatus = 'Pending';
        if (existingIndex > -1 && updates[existingIndex].oldStatus !== undefined) {
            trueOldStatus = updates[existingIndex].oldStatus;
        } else {
            trueOldStatus = existingOrder ? existingOrder.Status : 'Pending';
        }

        if (existingOrder && existingOrder.Status === status && customDate) {
            trueOldStatus = `${existingOrder.Status} (${getTimelineLabel(existingOrder['Dispatched Date'] || existingOrder.timestamp)})`;
        }

        let needsRefundDelete = false;
        if (String(trueOldStatus).trim().toLowerCase() === 'refunded' && status !== 'Refunded') {
            needsRefundDelete = true;
        }

        // DATE & TIME LOGIC
        let finalActionDate = null;
        if (customDate) {
            finalActionDate = customDate;
        } else if ((status === 'Dispatched' && !trackingNum) || status === 'Paid') {
            if (status === 'Paid' && existingOrder && existingOrder.paidDate) {
                finalActionDate = existingOrder.paidDate;
            } else {
                let now = new Date();
                let y = now.getFullYear();
                let m = String(now.getMonth() + 1).padStart(2, '0');
                let d = String(now.getDate()).padStart(2, '0');
                let h = String(now.getHours()).padStart(2, '0');
                let min = String(now.getMinutes()).padStart(2, '0');
                finalActionDate = `${y}-${m}-${d} ${h}:${min}`;
            }
        }

        // Undo/Revert Logic// Undo/Revert Logic
        if (trackingNum === null && !customDate && status === trueOldStatus) {
            if (existingIndex > -1) updates.splice(existingIndex, 1);
        } else {
            let updateObjParams = {
                oid: oid,
                action: 'status',
                status: status,
                oldStatus: trueOldStatus,
                time: new Date().getTime(),
                deleteRefund: needsRefundDelete
            };

            if (trackingNum !== null) updateObjParams.tracking = trackingNum;
            if (finalActionDate) updateObjParams.actionDate = finalActionDate;
            if (appendMessage) updateObjParams.appendMessage = appendMessage;

            if (existingIndex > -1) {
                updates[existingIndex] = updateObjParams;
            } else {
                updates.push(updateObjParams);
            }
        }

        localStorage.setItem('pendingUpdates', JSON.stringify(updates));

        // LOCAL CACHE UPDATE
        if (orderIndex !== -1) {
            allOrders[orderIndex].Status = status;
            if (trackingNum !== null) allOrders[orderIndex].tracking = trackingNum;
            if (customDate) allOrders[orderIndex]['Dispatched Date'] = customDate;

            if (status === 'Paid' && finalActionDate) {
                allOrders[orderIndex].paidDate = finalActionDate;
            }
            if (status === 'Dispatched' && !allOrders[orderIndex]['Dispatched Date'] && finalActionDate) {
                allOrders[orderIndex]['Dispatched Date'] = finalActionDate;
            }
            if ((status === 'Completed' || status === 'Delivered')) {
                if (!allOrders[orderIndex]['Delivered Date'] && finalActionDate) {
                    allOrders[orderIndex]['Delivered Date'] = finalActionDate;
                }
                if (customDate) {
                    allOrders[orderIndex]['Delivered Date'] = customDate;
                }
            }

            localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
        }

        if (document.getElementById('searchInput') && document.getElementById('searchInput').value.trim().length > 0) {
            filterOrders();
        } else {
            renderTabs(allOrders);
        }

        updateSyncButtonUI();

        if (trackingNum) showToast('success', 'Tracking Saved Locally ✅');
        if (customDate) showToast('success', 'Date Updated! Sync to Save.');
    };

    if (skipConfirm) {
        executeUpdate();
    } else {
        let msg = status === 'Paid' ? 'Mark as Paid?' : `Change status to ${status}?`;
        confirmAction(msg, () => {
            executeUpdate();
        });
    }
};

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

// 🔥 EDIT DELIVERED DATE
window.editDeliveredDate = async function (oid, currentDate) {
    const { value: newDate } = await Swal.fire({
        title: 'Change Delivered Date',
        html: `
            <div style="text-align:center;">
                <input type="text" id="del-date-input" class="form-control text-center fw-bold" 
                       style="font-size:18px; padding:10px; border:2px solid #eee; border-radius:12px;" 
                       placeholder="Select Date...">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Update',
        confirmButtonColor: '#198754', // Green
        didOpen: () => {
            flatpickr("#del-date-input", {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                defaultDate: currentDate || new Date(),
                theme: "material_blue",
                disableMobile: true
            });
        },
        preConfirm: () => document.getElementById('del-date-input').value
    });

    if (newDate) {
        // Status മാറ്റാതെ തന്നെ ഡേറ്റ് മാത്രം അപ്‌ഡേറ്റ് ചെയ്യുന്നു
        // അതിനായി വീണ്ടും 'Completed' സ്റ്റാറ്റസ് തന്നെ അയക്കുന്നു
        updateOrder(oid, 'Completed', null, true, newDate);
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
    let allOrdersLocal = JSON.parse(localStorage.getItem('allOrdersCache') || "[]"); // കസ്റ്റമർ ഡാറ്റ എടുക്കാൻ

    const list = document.getElementById('sync-preview-list');
    const countDisplay = document.getElementById('sync-count-display');

    let totalCount = pendingUpdates.length + pendingExpenses.length;
    countDisplay.innerText = totalCount;
    list.innerHTML = '';

    if (totalCount === 0) {
        list.innerHTML = `
            <div class="text-center text-muted p-5">
                <i class="fas fa-check-circle fa-3x mb-3 text-success opacity-50"></i>
                <h6 class="fw-bold">Everything is synced!</h6>
                <div class="small">No pending changes found.</div>
            </div>`;
        $('#syncModal').modal('hide');
        updateSyncButtonUI();
        return;
    }

    // 1. Separate Updates
    let orderUpdates = pendingUpdates.filter(u => u.action !== 'meta' && u.action !== 'paidNum' && !u.deleteRefund);
    let metaUpdates = pendingUpdates.filter(u => u.action === 'meta' && u.meta !== undefined); // WhatsApp/Print flags
    let courierUpdates = pendingUpdates.filter(u => u.action === 'meta' && u.provider !== undefined); // 🔥 Courier Changes
    let paidNumUpdates = pendingUpdates.filter(u => u.action === 'paidNum');
    let refundDeletions = pendingUpdates.filter(u => u.deleteRefund);

    let itemsHtml = '';

    // --- A. COURIER UPDATES (NEW BEAUTIFUL UI) ---
    if (courierUpdates.length > 0) {
        itemsHtml += `<div class="fw-bold text-dark mb-2 mt-2" style="font-size:12px; letter-spacing:1px; text-transform:uppercase;">🚚 Courier & Price Updates</div>`;
        courierUpdates.forEach(u => {
            let order = allOrdersLocal.find(o => o.orderid === u.oid) || {};
            let custName = order.name || 'Unknown User';
            let custPhone = String(order.phone || 'N/A').replace(/[^0-9]/g, '');

            itemsHtml += `
            <div class="bg-white border rounded-3 p-3 mb-2 shadow-sm position-relative" style="border-left: 4px solid #ff9800 !important;">
                <button class="btn btn-sm btn-outline-danger border-0 position-absolute top-0 end-0 mt-1 me-1 rounded-circle" style="width:28px;height:28px;padding:0;" onclick="undoUpdate('${u.oid}', true)" title="Discard"><i class="fas fa-times"></i></button>
                
                <div class="d-flex justify-content-between align-items-start mb-2 pe-4">
                    <div>
                        <div class="fw-bold text-dark" style="font-size:14px;"><i class="fas fa-user-circle text-muted me-1"></i> ${custName}</div>
                        <div class="text-muted mt-1 fw-bold" style="font-size:11px;"><i class="fas fa-phone-alt me-1 text-success"></i> ${custPhone}</div>
                    </div>
                    <div class="badge bg-light text-secondary border border-secondary border-opacity-25" style="font-size:9px;">${u.oid.split('-').pop()}</div>
                </div>
                
                <div class="bg-light p-2 rounded border border-dashed mt-2 d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <div class="bg-warning text-white rounded-circle d-flex align-items-center justify-content-center" style="width:28px; height:28px; font-size:12px;"><i class="fas fa-truck"></i></div>
                        <div>
                            <div style="font-size:10px; color:#6c757d; font-weight:700; text-transform:uppercase;">New Courier</div>
                            <div class="fw-bold text-dark" style="font-size:13px;">${u.provider}</div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div style="font-size:10px; color:#6c757d; font-weight:700; text-transform:uppercase;">New Total</div>
                        <div class="fw-bold text-success" style="font-size:14px;">₹${u.total}</div>
                    </div>
                </div>
            </div>`;
        });
    }

    // --- B. ORDER STATUS CHANGES ---
    if (orderUpdates.length > 0 || refundDeletions.length > 0) {
        itemsHtml += `<div class="fw-bold text-dark mb-2 mt-3" style="font-size:12px; letter-spacing:1px; text-transform:uppercase;">📦 Order Status Updates</div>`;
        [...orderUpdates, ...refundDeletions].forEach(u => {
            let order = allOrdersLocal.find(o => o.orderid === u.oid) || {};
            let custName = order.name || 'Unknown User';
            let custPhone = String(order.phone || 'N/A').replace(/[^0-9]/g, '');

            let oldS = u.oldStatus || 'Pending';
            let newS = u.status;
            let actionHtml = '';

            if (u.deleteRefund) {
                actionHtml = `<div class="fw-bold text-danger"><i class="fas fa-trash-alt me-1"></i> Refund Deleted</div>`;
            } else if (u.tracking !== undefined) {
                if (u.tracking === '') {
                    actionHtml = `<div class="fw-bold text-danger"><i class="fas fa-eraser me-1"></i> Tracking Removed</div>`;
                } else {
                    actionHtml = `<div class="fw-bold text-dark"><i class="fas fa-barcode me-1 text-muted"></i> Track: <span class="text-primary">${u.tracking}</span></div>`;
                }
            } else {
                let oldCol = oldS === 'Paid' ? 'success' : (oldS === 'Sent' ? 'info text-dark' : 'secondary');
                let newCol = newS === 'Paid' ? 'success' : (newS === 'Dispatched' ? 'primary' : 'dark');
                actionHtml = `
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-${oldCol} bg-opacity-25 text-${oldCol} border border-${oldCol} border-opacity-50 px-2 py-1">${oldS}</span>
                        <i class="fas fa-long-arrow-alt-right text-muted"></i>
                        <span class="badge bg-${newCol} px-2 py-1 shadow-sm">${newS}</span>
                    </div>`;
            }

            itemsHtml += `
            <div class="bg-white border rounded-3 p-3 mb-2 shadow-sm position-relative" style="border-left: 4px solid #0d6efd !important;">
                <button class="btn btn-sm btn-outline-danger border-0 position-absolute top-0 end-0 mt-1 me-1 rounded-circle" style="width:28px;height:28px;padding:0;" onclick="undoUpdate('${u.oid}', false)" title="Discard"><i class="fas fa-times"></i></button>
                
                <div class="d-flex justify-content-between align-items-start mb-2 pe-4">
                    <div>
                        <div class="fw-bold text-dark" style="font-size:14px;"><i class="fas fa-user-circle text-muted me-1"></i> ${custName}</div>
                        <div class="text-muted mt-1 fw-bold" style="font-size:11px;"><i class="fas fa-phone-alt me-1 text-primary"></i> ${custPhone}</div>
                    </div>
                    <div class="badge bg-light text-secondary border border-secondary border-opacity-25" style="font-size:9px;">${u.oid.split('-').pop()}</div>
                </div>
                
                <div class="bg-light p-2 rounded border border-dashed mt-2">
                    ${actionHtml}
                </div>
            </div>`;
        });
    }

    // --- C. PAID NUMBER UPDATES ---
    if (paidNumUpdates.length > 0) {
        itemsHtml += `<div class="fw-bold text-dark mb-2 mt-3" style="font-size:12px; letter-spacing:1px; text-transform:uppercase;">📱 Payment Contact Updates</div>`;
        paidNumUpdates.forEach(u => {
            let order = allOrdersLocal.find(o => o.orderid === u.oid) || {};
            let custName = order.name || 'Unknown User';

            itemsHtml += `
            <div class="bg-white border rounded-3 p-3 mb-2 shadow-sm position-relative" style="border-left: 4px solid #198754 !important;">
                <button class="btn btn-sm btn-outline-danger border-0 position-absolute top-0 end-0 mt-1 me-1 rounded-circle" style="width:28px;height:28px;padding:0;" onclick="undoUpdate('${u.oid}', 'paidNum')" title="Discard"><i class="fas fa-times"></i></button>
                <div class="fw-bold text-dark mb-1" style="font-size:13px;"><i class="fas fa-user-circle text-muted me-1"></i> ${custName}</div>
                <div class="d-flex align-items-center gap-2 mt-2">
                    <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1"><i class="fas fa-mobile-alt me-1"></i> Paid By: ${u.num}</span>
                </div>
            </div>`;
        });
    }

    // --- D. META & PRINT UPDATES ---
    if (metaUpdates.length > 0) {
        itemsHtml += `<div class="fw-bold text-dark mb-2 mt-3" style="font-size:12px; letter-spacing:1px; text-transform:uppercase;">⚙️ Meta Updates</div>`;
        metaUpdates.forEach(u => {
            let order = allOrdersLocal.find(o => o.orderid === u.oid) || {};
            let custName = order.name || 'Unknown User';

            let oldMetaStr = u.oldMeta || '';
            let newMetaStr = u.meta || '';

            let oldStatus = getMetaStatus(oldMetaStr);
            let newStatus = getMetaStatus(newMetaStr);

            let changedLines = [];

            // 1. കോൺടാക്ട് മാറ്റിയതാണെങ്കിൽ
            if (oldStatus.contact !== newStatus.contact) {
                let contactIcon = newStatus.contact === 'whatsapp' ? 'fab fa-whatsapp text-success' : (newStatus.contact === 'alt' ? 'fas fa-phone-square text-secondary' : (newStatus.contact === 'paid' ? 'fas fa-money-bill-wave text-success' : 'fas fa-phone-alt text-primary'));
                let contactLabel = newStatus.contact === 'whatsapp' ? 'WhatsApp' : (newStatus.contact === 'alt' ? 'Alt Phone' : (newStatus.contact === 'paid' ? 'Paid Phone' : 'Main Phone'));
                changedLines.push(`Contact: <span class="fw-bold text-dark"><i class="${contactIcon}"></i> ${contactLabel}</span>`);
            }

            // 2. പ്രിന്റ് മാറ്റിയതാണെങ്കിൽ
            if (!oldMetaStr.includes('P') && newMetaStr.includes('P')) {
                changedLines.push(`Status: <span class="fw-bold text-dark"><i class="fas fa-print text-warning"></i> Marked as Printed</span>`);
            } else if (oldMetaStr.includes('P') && !newMetaStr.includes('P')) {
                changedLines.push(`Status: <span class="fw-bold text-dark"><i class="fas fa-undo text-secondary"></i> Moved back to Unprinted</span>`);
            }

            // 3. ട്രാക്കിങ് മാറ്റിയതാണെങ്കിൽ
            if (!oldMetaStr.includes('T') && newMetaStr.includes('T')) {
                changedLines.push(`Tab: <span class="fw-bold text-dark"><i class="fas fa-truck text-info"></i> Moved to Tracked Tab</span>`);
            } else if (oldMetaStr.includes('T') && !newMetaStr.includes('T')) {
                changedLines.push(`Tab: <span class="fw-bold text-danger"><i class="fas fa-undo text-secondary"></i> Removed from Tracked Tab</span>`);
            }

            // എന്തെങ്കിലും കാരണം കൊണ്ട് മാച്ച് ആയില്ലെങ്കിൽ
            if (changedLines.length === 0) changedLines.push("Internal Meta Updated");

            let detailsHtml = changedLines.map(line => `<div class="mt-1 text-muted" style="font-size:12px;">${line}</div>`).join('');

            itemsHtml += `
            <div class="bg-white border rounded-3 p-3 mb-2 shadow-sm position-relative" style="border-left: 4px solid #6c757d !important;">
                <button class="btn btn-sm btn-outline-danger border-0 position-absolute top-0 end-0 mt-1 me-1 rounded-circle" style="width:28px;height:28px;padding:0;" onclick="undoUpdate('${u.oid}', true)" title="Discard"><i class="fas fa-times"></i></button>
                <div class="fw-bold text-dark mb-1" style="font-size:13px;"><i class="fas fa-user-circle text-muted me-1"></i> ${custName}</div>
                ${detailsHtml}
            </div>`;
        });
    }

    // --- E. EXPENSES ---
    if (pendingExpenses.length > 0) {
        itemsHtml += `<div class="fw-bold text-dark mb-2 mt-3" style="font-size:12px; letter-spacing:1px; text-transform:uppercase;">💸 New Expenses</div>`;
        pendingExpenses.forEach((exp, index) => {
            itemsHtml += `
            <div class="bg-white border rounded-3 p-3 mb-2 shadow-sm position-relative" style="border-left: 4px solid #dc3545 !important;">
                <button class="btn btn-sm btn-outline-danger border-0 position-absolute top-0 end-0 mt-1 me-1 rounded-circle" style="width:28px;height:28px;padding:0;" onclick="undoExpenseUpdate('${exp.id}')" title="Discard"><i class="fas fa-times"></i></button>
                <div class="d-flex justify-content-between align-items-start mb-2 pe-4">
                    <div>
                        <div class="fw-bold text-dark" style="font-size:14px;"><i class="fas fa-receipt text-danger me-1"></i> ${exp.category}</div>
                        <div class="text-muted mt-1 fw-bold" style="font-size:11px;">${exp.vendor || 'No Vendor'}</div>
                    </div>
                    <div class="fw-bold text-danger" style="font-size:15px;">₹${exp.amount}</div>
                </div>
                <div class="bg-light p-2 rounded border border-dashed mt-2 small text-muted">
                    ${exp.description || 'No Description provided'}
                </div>
            </div>`;
        });
    }

    list.innerHTML = itemsHtml;
}

// 🔥 UPDATED UNDO LOGIC (Supports Meta Separate Undo)
// 🔥 UNIVERSAL UNDO UPDATE (Restores Everything to Previous State)
window.undoUpdate = function (oid, type) {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let removedItem = null;

    // 1. PAID NUMBER UNDO
    if (type === 'paidNum') {
        removedItem = pendingUpdates.find(u => u.oid === oid && u.action === 'paidNum');
        if (removedItem) {
            let order = allOrders.find(o => o.orderid === oid);
            if (order) order.paidNum = removedItem.oldNum || "";
            pendingUpdates = pendingUpdates.filter(u => !(u.oid === oid && u.action === 'paidNum'));
        }
    }
    // 2. META UNDO (Contact Prefs, Printed, Tracked) & COURIER UNDO
    else if (type === true || type === 'meta') {
        // Here we need to check if it's a courier meta or normal meta
        let metaIndex = pendingUpdates.findIndex(u => u.oid === oid && u.action === 'meta');

        if (metaIndex > -1) {
            removedItem = pendingUpdates[metaIndex];
            let order = allOrders.find(o => o.orderid === oid);

            if (order) {
                // A. Restore Courier if it was a courier update
                if (removedItem.provider !== undefined) {
                    order.provider = removedItem.oldProvider;
                    order.Courier_Provider = removedItem.oldProvider;
                    order.Courier_Charge = removedItem.oldCharge;
                    order.Grand_Total = removedItem.oldTotal;
                }

                // B. Restore Meta String if it was a preference update
                if (removedItem.meta !== undefined && removedItem.oldMeta !== undefined) {
                    order.adminMeta = removedItem.oldMeta;
                }
            }
            pendingUpdates.splice(metaIndex, 1); // Remove from list
        }
    }
    // 3. STATUS UNDO (Pending, Sent, Paid, Dispatched etc)
    else {
        removedItem = pendingUpdates.find(u => u.oid === oid && u.action !== 'meta' && u.action !== 'paidNum');
        if (removedItem) {
            let orderIndex = allOrders.findIndex(o => o.orderid === oid);
            if (orderIndex !== -1) {
                // Restore old status
                allOrders[orderIndex].Status = removedItem.oldStatus || "Pending";

                // Remove tracking if it was added during this step
                if (removedItem.tracking) delete allOrders[orderIndex].tracking;

                // Remove Dispatch Date if it was added
                if (removedItem.status === 'Dispatched') delete allOrders[orderIndex]['Dispatched Date'];
                if (removedItem.status === 'Paid') delete allOrders[orderIndex]['Paid Date'];
            }
            pendingUpdates = pendingUpdates.filter(u => !(u.oid === oid && u.action !== 'meta' && u.action !== 'paidNum'));
        }
    }

    // Save final state back to Local Storage
    localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
    localStorage.setItem('pendingUpdates', JSON.stringify(pendingUpdates));

    // Refresh UI
    renderSyncList();
    updateSyncButtonUI();

    // 🔥 ഇത് കാർഡുകളെ തൽക്ഷണം പഴയ ടാബിലേക്ക് മാറ്റും!
    renderTabs(allOrders);

    // 🔥 FIX: സെർച്ച് ചെയ്തുകൊണ്ടിരിക്കുന്ന സമയത്താണ് അൺഡൂ അടിക്കുന്നതെങ്കിൽ ആ കാർഡും തൽക്ഷണം റിഫ്രഷ് ആവാൻ!
    let searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim() !== "") {
        filterOrders();
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

    // 🔥 1 & 2. COMBINED SYNC (Status, Tracking & META എല്ലാം ഒരുമിച്ച് അയക്കുന്നു)
    let bulkUpdates = pendingUpdates.filter(u => u.action !== 'paidNum' && !u.deleteRefund);
    if (bulkUpdates.length > 0) {
        promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'bulkUpdateStatus', updates: bulkUpdates }) }));
    }
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



// 🔥 SEND INVOICE WA (Fixed Unique ID & Preserved Logic)
window.sendWA = function (index, type = 'pending') {
    const d = allOrders[index];
    const n = parseInt(d.quantity);
    const adminPhone = '7788990313';
    const safe = (val) => String(val || '').trim().toUpperCase();

    // 1. DATE FORMATTING
    const dateObj = d.timestamp ? new Date(d.timestamp) : new Date();
    const formattedTime = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}, ${dateObj.toLocaleTimeString('en-US', { hour12: true })}`;

    // 2. CALCULATE PRICE (Preserved)
    const base = (typeof courierRates !== 'undefined' && courierRates.prices && courierRates.prices[n]) ? Number(courierRates.prices[n]) : (n * 650);
    const zone = getZoneKey(d.state);
    const courier = (courierRates[zone] && courierRates[zone][n]) ? courierRates[zone][n] : 0;
    const total = base + courier;

    // 3. GENERATE MESSAGE (Preserved)
    const editLink = `https://kafaklife.com/order.html?oid=${d.orderid}`;

    // 🔥 LANGUAGE LOGIC
    const isEng = (d.language === 'en');

    // Header Text based on Language
    const editText = isEng ? "To check status or edit order: 👇" : "നിങ്ങളുടെ ഓർഡറിന്റെ സ്റ്റാറ്റസ് അറിയാനും മാറ്റങ്ങൾ വരുത്തുവാനും: 👇";

    const header = `*✅ Honey order confirmed!* 🍯\n⌚ _${formattedTime}_\n\n${editText}\n🔗 _${editLink}_\n`;
    const details = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${d.pincode}*\n*Ph: ${d.phone}*\n\n*Qty: ${d.quantity}*\n*Amount: ₹${base} + ${courier}*\n*Total: ₹${total}/-*\n____________________________________`;

    // 🔥 Payment Screenshot Request (Language based)
    let paymentNote = "";
    if (isEng) {
        paymentNote = "\n\n👉 Please send the screenshot after GPay.. 📸\n_(Packing starts only after receiving the screenshot)_";
    } else {
        paymentNote = "\n\nGpay ചെയ്തശേഷം സ്ക്രീൻഷോട്ട് അയക്കൂ.. 📸\n_(സ്ക്രീൻഷോട്ട് ലഭിച്ച ശേഷമാണ് പാക്കിംഗ് നടപടികൾ ആരംഭിക്കുക)_";
    }

    const footer = `\n\n*GPay to: ${adminPhone} (KAFAK LLP)*${paymentNote}`;

    // 4. DETERMINE TARGET PHONE (Updated with 'type' selector)
    let phoneNum = "";

    // 🔥 FIX: Select the correct dropdown using 'type' & 'index'
    const dropdown = document.getElementById(`wa-select-${type}-${index}`);
    let code = dropdown ? dropdown.value : '';

    if (code === 'W') phoneNum = d.whatsapp;
    else if (code === 'A') phoneNum = d.altphone;
    else if (code === 'M') phoneNum = d.phone;
    else if (code === 'G') phoneNum = d.paidNum; // 🔥 Paid Number Support
    else phoneNum = d.whatsapp || d.phone;

    // Clean & Open
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


// 🔥 UPDATED PRINT LOGIC (With Sequence Number & Non-Kerala State Dots)
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

            // 🔥 മാറ്റം: Undo/Revert Logic ഇവിടെയും ഉൾപ്പെടുത്തി
            let existingIndex = updates.findIndex(u => u.oid === d.orderid && u.action === 'meta' && u.meta !== undefined);
            let trueOldMeta = (existingIndex > -1 && updates[existingIndex].oldMeta !== undefined) ? updates[existingIndex].oldMeta : currentMeta;

            // 🔥 FIX: String comparison issue (W vs Empty string)
            let getContactCode = (m) => {
                if (m.includes('G')) return 'G';
                if (m.includes('A')) return 'A';
                if (m.includes('M')) return 'M';
                return 'W'; // Default is WhatsApp
            };

            let oldContact = getContactCode(trueOldMeta);
            let newContact = getContactCode(newMeta);
            let oldFlags = trueOldMeta.replace(/[MWAG]/g, '');
            let newFlags = newMeta.replace(/[MWAG]/g, '');

            // രണ്ടും ഫലത്തിൽ ഒരേ കോൺടാക്റ്റ് ആണോ എന്ന് ചെക്ക് ചെയ്യുന്നു
            let isEffectivelySame = (oldContact === newContact) && (oldFlags === newFlags);

            if (isEffectivelySame) {
                if (existingIndex > -1) {
                    delete updates[existingIndex].meta;
                    delete updates[existingIndex].oldMeta;
                    if (updates[existingIndex].provider === undefined) {
                        updates.splice(existingIndex, 1);
                    }
                }
            } else {
                if (existingIndex > -1) {
                    updates[existingIndex].meta = newMeta;
                } else {
                    let provOnlyIndex = updates.findIndex(u => u.oid === d.orderid && u.action === 'meta');
                    if (provOnlyIndex > -1) {
                        updates[provOnlyIndex].meta = newMeta;
                        updates[provOnlyIndex].oldMeta = trueOldMeta;
                    } else {
                        updates.push({ oid: d.orderid, action: 'meta', meta: newMeta, oldMeta: trueOldMeta, status: d.Status, time: new Date().getTime() });
                    }
                }
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
    // 🔥 മാറ്റം 1: വിൻഡോയ്ക്ക് വ്യത്യസ്തമായ പേര് കൊടുത്തു (Cache ഒഴിവാക്കാൻ)
    const printWin = window.open('', 'AddressPrintWindow', 'width=600,height=800');

    // CSS for accurate background printing
    // 🔥 മാറ്റം 2: Media Print ഉം കൃത്യമായ A6 സൈസും ഫോഴ്സ് ചെയ്യുന്നു
    let extraCss = `
        @media print {
            @page { size: A6 portrait; margin: 0; }
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    `;
    let htmlContent = `<html><head><title>KAFAK Print (${ordersToPrint.length})</title><link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@100..800&display=swap" rel="stylesheet"><style>${styles} ${extraCss}</style></head><body>`;

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

        // 🔥 STATE DOT LOGIC FOR PRINT LABEL
        let s = String(d.state || '').toUpperCase().trim();
        let stateDotHtml = '';
        if (s && s !== 'KERALA') {
            let dotColor = '#d63384'; // Default Other (Magenta)
            if (s.includes('LAK')) dotColor = '#0dcaf0'; // Lakshadweep (Blue)
            else if (s.includes('KARN')) dotColor = '#d97706'; // Karnataka (Yellow/Orange)
            else if (s.includes('TAMIL') || s.includes('TN')) dotColor = '#795548'; // Tamil Nadu (Brown)

            // Placed at Top Right corner
            stateDotHtml = `<div style="position:absolute; top:8mm; right:8mm; width:10mm; height:10mm; border-radius:50%; background-color:${dotColor}; border: 1.5px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 20;"></div>`;
        }

        htmlContent += `
        <div class="label-page">
            ${stateDotHtml}
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

    // Timeout added to make sure images load before print prompt
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

// 🔥 REVERT FROM TRACKED TO DISPATCHED
window.revertToDispatched = function (oid) {
    Swal.fire({
        title: 'Remove Tracking?',
        text: "ട്രാക്കിങ് നമ്പർ കളഞ്ഞ് പഴയ Dispatched ടാബിലേക്ക് മാറ്റണോ?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        confirmButtonText: 'Yes, Remove It'
    }).then((result) => {
        if (result.isConfirmed) {
            // ട്രാക്കിങ് നമ്പർ ശൂന്യമാക്കി സേവ് ചെയ്യുന്നു (Dispatched സ്റ്റാറ്റസ് നിലനിർത്തുന്നു)
            updateOrder(oid, 'Dispatched', '', true);
            // Meta-യിൽ നിന്ന് 'T' (Tracked) കളയുന്നു
            updateAdminMeta(oid, 'tracked_revert', '');

            showToast('info', 'Moved back to Dispatched Tab!');
        }
    });
}

// 🔥 REVERT FROM DISPATCHED TO PAID (Smart Message)
window.revertToPrinted = function (oid) {
    Swal.fire({
        title: 'Revert to Paid?',
        text: "ഇത് വീണ്ടും Paid ടാബിലേക്ക് മാറ്റണോ? കൊടുത്ത ഡേറ്റും ട്രാക്കിങ്ങും മാഞ്ഞുപോകും.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, Revert'
    }).then((result) => {
        if (result.isConfirmed) {
            // സ്റ്റാറ്റസ് തിരികെ Paid ആക്കുന്നു
            updateOrder(oid, 'Paid', null, true);

            // ഏത് ടാബിലേക്കാണ് പോയതെന്ന് നോക്കി കൃത്യമായ മെസ്സേജ് കാണിക്കുന്നു
            let order = allOrders.find(o => o.orderid === oid);
            let metaStr = String(order ? order.adminMeta : '');
            let isPrinted = metaStr.includes('P');

            if (isPrinted) {
                showToast('info', 'Moved back to Printed Tab!');
            } else {
                showToast('info', 'Moved back to Paid (New) Tab!');
            }
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



function getZoneKey(stateName) {
    if (!stateName) return 'REST OF INDIA';
    let s = String(stateName).toUpperCase().trim();
    if (courierRates && courierRates[s]) return s;
    let zones = Object.keys(courierRates || {});
    for (let z of zones) {
        if (z.toUpperCase() === s) return z;
    }
    return 'REST OF INDIA';
}

// 🔥 മാർജിൻ ഉൾപ്പെടെയുള്ള കൊറിയർ ചിലവ് കണ്ടുപിടിക്കാൻ
function getCourierRate(state, provider, qty) {
    let s = String(state || '').toUpperCase().trim();
    let p = String(provider || '').toUpperCase().trim();
    let q = parseInt(qty) || 1;

    let courierBase = 0;

    if (typeof courierRates !== 'undefined') {
        // 🔥 FIX: Underscore മാറ്റി Space ആക്കി (eg: TAMIL NADU DTDC)
        let zoneData = courierRates[`${s} ${p}`] || courierRates[`${s} DEFAULT`] || courierRates[s] || courierRates['REST OF INDIA'];

        if (zoneData && typeof zoneData === 'object' && zoneData.baseRate !== undefined) {
            courierBase = window.parseDynamicRate(zoneData.baseRate, q);
        } else if (zoneData && zoneData[q] !== undefined) {
            courierBase = Number(zoneData[q]);
        }
    }

    return courierBase;
}

function calculatePriceInfo(u, qty, state, provider) {
    const n = parseInt(qty) || 0;
    const basePrice = (typeof courierRates !== 'undefined' && courierRates.prices && courierRates.prices[n])
        ? Number(courierRates.prices[n])
        : (n * 650);

    // ഷീറ്റിൽ ഇതിനകം സേവ് ചെയ്ത ചാർജ് ഉണ്ടെങ്കിൽ അത് എടുക്കുന്നു, ഇല്ലെങ്കിൽ പുതിയത് കാൽക്കുലേറ്റ് ചെയ്യുന്നു
    let displayCharge = (u.Courier_Charge !== undefined && u.Courier_Charge !== "") ? Number(u.Courier_Charge) : getCourierRate(state, provider, n);

    // സിങ്ക് ചെയ്യാൻ ബാക്കിയുള്ള അപ്ഡേറ്റ് (Meta) വല്ലതും ഉണ്ടോ എന്ന് നോക്കുന്നു
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let myMeta = pendingUpdates.find(p => p.oid === u.orderid && p.action === 'meta');

    if (myMeta && myMeta.charge !== undefined) {
        displayCharge = Number(myMeta.charge);
    }

    // 🔥 പുതിയ മാറ്റം: വിലയുടെ ബ്രേക്ക്ഡൗൺ കൂടി നൽകുന്നു
    return {
        total: `₹${basePrice + displayCharge}/-`,
        breakdownText: `<span class="text-muted" style="font-size:9px; margin-right:4px;">(${basePrice} + ${displayCharge})</span> ₹${basePrice + displayCharge}/-`
    };
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
            dateFormat: "d M Y",
            defaultDate: selectedDate,
            maxDate: "today",
            theme: "material_blue",
            disableMobile: true,
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
            enableTime: true,
            dateFormat: "Y-m-d h:i K",
            defaultDate: new Date(),
            theme: "material_blue",
            time_24hr: false,
            disableMobile: true        // 🔥 FIX: ഇവിടെ false മാറ്റി true ആക്കി
        });
    }

    if (!txCalendarPicker) {
        txCalendarPicker = flatpickr("#tx-calendar", {
            inline: true,
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

// 🔥 1. ഡാഷ്‌ബോർഡ് ഡാറ്റ എടുക്കാൻ (Background Load - No Screen Block)
function fetchDashboardDataBg() {
    let y = selectedDate.getFullYear();
    let m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    let d = String(selectedDate.getDate()).padStart(2, '0');
    let dateStr = `${y}-${m}-${d}`;

    // (ശ്രദ്ധിക്കുക: മെയിൻ ലോഡർ നമ്മൾ ഒഴിവാക്കി, പകരം changeDashDate-ലെ ഇൻലൈൻ ലോഡർ മാത്രം വർക്ക് ചെയ്യും)

    fetch(`${scriptURL}?action=getDashboardData&date=${dateStr}`)
        .then(res => res.json())
        .then(res => {
            if (res.result === 'success') {
                dashboardData = res.data;
                renderDashboard();
            }
        }).catch(err => {
            console.error(err);
            $('#tx-details-area').html('<div class="text-center py-4 text-danger small"><i class="fas fa-exclamation-triangle"></i> Failed to load data. Please refresh.</div>');
        });
}

// 🔥 FIX: ഡാഷ്‌ബോർഡ് തുറക്കുമ്പോൾ തന്നെ തീയതിയും പേരും കാണിക്കാൻ (Force UI Update)
function openDashboard() {
    $('#drawer-overlay').fadeIn(200);
    $('#dashboard-drawer').addClass('open');

    // 🔥 NEW: ലോഗിൻ ചെയ്ത ആളുടെ പേര് എടുത്തു ഹെഡറിൽ ഭംഗിയായി കാണിക്കുന്നു
    let loggedUser = localStorage.getItem('kafakAdminUser') || 'Admin';
    // ആദ്യത്തെ അക്ഷരം ക്യാപിറ്റൽ ആക്കാൻ (ഉദാ: master -> Master)
    let displayName = loggedUser.charAt(0).toUpperCase() + loggedUser.slice(1);

    // ഹെഡറിലെ HTML അപ്ഡേറ്റ് ചെയ്യുന്നു (നിങ്ങളുടെ ഡിസൈൻ അതുപോലെ കൊടുത്തു)
    $('.drawer-header h5').html(`<i class="fas fa-chart-line me-2 text-primary"></i>Accounts <span class="badge bg-dark bg-opacity-10 text-dark border border-secondary border-opacity-25 ms-1" style="font-size:10px; position:relative; top:-2px;">${displayName}</span>`);

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

// 🔥 2. തീയതി മാറ്റുമ്പോൾ പഴയ ഡാറ്റ മായ്ക്കാൻ 
function changeDashDate() {
    if (dashDatePicker) dashDatePicker.setDate(selectedDate, false);
    if (expDatePicker) expDatePicker.setDate(selectedDate, false);
    if (txCalendarPicker) txCalendarPicker.setDate(selectedDate, false);

    updateArrowUI();

    let formattedDate = flatpickr.formatDate(selectedDate, "d M Y");
    if (selectedDate.toDateString() === new Date().toDateString()) {
        formattedDate = "Today, " + formattedDate;
    }
    $('#dash-date').val(formattedDate).text(formattedDate);

    $('#d-sales, #d-expense, #d-profit, #d-courier, #m-sales, #m-profit').text('...');

    // ലോഡിങ് ആനിമേഷൻ കൊടുക്കുന്നു
    $('#tx-details-area').html('<div class="text-center py-5 text-primary"><i class="fas fa-spinner fa-spin fs-2 mb-2"></i><br><span class="fw-bold small">Loading Data...</span></div>');

    // 🔥 പ്രധാനപ്പെട്ട മാറ്റം: തീയതി മാറ്റുമ്പോൾ താഴെയുള്ള പഴയ റിപ്പോർട്ടുകൾ ക്ലിയർ ചെയ്യുന്നു!
    $('#daybook-container, #detailed-overview-container, #yearly-overview-container, #material-stats-container, #extra-stats-container').remove();

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

// 🔥 സൂപ്പർ ഡേറ്റ് പാർസർ (100% ശരിയായി വായിക്കാൻ)
function parseOrderDate(str) {
    if (!str) return new Date(NaN);
    let s = String(str).trim();
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d;

    // തീയതി സാധാരണ ഫോർമാറ്റിൽ അല്ലെങ്കിൽ, അത് സ്വയം ശരിയാക്കുന്നു
    let parts = s.split(/[\/\-\sT:]+/);
    if (parts.length >= 3) {
        let p1 = parseInt(parts[0]), p2 = parseInt(parts[1]), p3 = parseInt(parts[2]);
        if (p1 > 1000) return new Date(p1, p2 - 1, p3); // YYYY-MM-DD
        if (p3 > 1000) {
            if (p2 > 12) return new Date(p3, p1 - 1, p2); // MM/DD/YYYY
            return new Date(p3, p2 - 1, p1); // DD/MM/YYYY
        }
    }
    return new Date(NaN);
}

// 🔥 UPDATE DASHBOARD MAIN CARDS (With Breakdown & JSON Fixes)
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

    $('.helper-text-dash').remove();
    $('#d-profit').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(Sales - Courier - Exp)</div>');

    if (d.profit >= 0) {
        $('#d-profit').removeClass('text-danger').addClass('text-success');
        $('#d-status-text').text("Cash in Hand 🚀").css('color', '#2e7d32');
    } else {
        $('#d-profit').removeClass('text-success').addClass('text-danger');
        $('#d-status-text').text("Needs Attention 📉").css('color', '#dc3545');
    }

    let mY = selectedDate.getFullYear();
    let mM = selectedDate.getMonth();

    let trueIncome = 0, trueProductCost = 0, trueCourierExp = 0, trueTotalCourier = 0;
    let monthBottles = 0, yearBottles = 0;
    let monthOrders = 0, yearOrders = 0;

    let orderBreakdown = {}; // 🔥 NEW: ഓർഡറുകൾ എണ്ണി വെക്കാൻ
    let costBreakdown = {};  // 🔥 NEW: ബോട്ടിൽ ചിലവുകൾ എണ്ണി വെക്കാൻ

    allOrders.forEach(o => {
        // 🔥 FIX: കൃത്യമായ ഫിൽറ്റർ തിരികെ കൊണ്ടുവന്നു
        let status = String(o.Status || 'Pending').trim();
        let isValidStatus = ['Paid', 'Dispatched', 'Delivered', 'Completed'].includes(status);
        if (!isValidStatus) return;

        let pDate = parseOrderDate(o.paidDate || o.timestamp);
        let oYear = pDate.getFullYear();
        let oMonth = pDate.getMonth();
        let qty = parseInt(o.quantity) || 0;


        if (oYear === mY) {
            yearOrders++;
            yearBottles += qty;

            if (oMonth === mM) {
                monthOrders++;
                monthBottles += qty;

                let amt = parseInt(o.grandTotal) || parseInt(o.Grand_Total) || 0;
                if (isNaN(amt) || amt <= 0) {
                    let pInfo = calculatePriceInfo(o, qty, o.state, o.provider || o.Courier_Provider);
                    amt = parseInt(pInfo.total.replace(/[^0-9]/g, '')) || 0;
                }
                trueIncome += amt;

                let key = `₹${amt}`;
                if (!orderBreakdown[key]) orderBreakdown[key] = 0;
                orderBreakdown[key]++;

                // 👇 ഇവിടെയാണ് മാറ്റം വരുത്തേണ്ടത് 👇
                let pCost = parseFloat(o.Product_Base_Cost);
                let finalRowCost = (!isNaN(pCost) && pCost > 0) ? pCost : (qty * 330);
                trueProductCost += finalRowCost;

                // 🔥 ബോട്ടിൽ ചിലവ് ഓരോന്നായി എണ്ണി വെക്കുന്നു
                if (qty > 0) {
                    let perBottleCost = finalRowCost / qty;
                    let cKey = `₹${Math.round(perBottleCost)}`;
                    if (!costBreakdown[cKey]) costBreakdown[cKey] = 0;
                    costBreakdown[cKey] += qty;
                }
                // 👆 പുതിയ കോഡ് കഴിഞ്ഞു 👆
            }
        }

        // കൊറിയർ ചിലവ് (Dispatched Date വെച്ച്)
        if (status !== 'Paid') {
            let dDate = parseOrderDate(o['Dispatched Date'] || o.timestamp);
            if (dDate.getFullYear() === mY && dDate.getMonth() === mM) {
                let actualC = parseInt(o.actualCourierCost) || parseInt(o.Actual_Courier_Cost) || 0;
                let totalC = parseInt(o.Courier_Charge) || 0;

                if (totalC <= 0) totalC = getCourierRate(o.state, o.provider || o.Courier_Provider, qty);
                if (actualC <= 0) actualC = totalC > 20 ? totalC - 20 : totalC;

                trueCourierExp += actualC;
                trueTotalCourier += totalC;
            }
        }
    });

    let trueOtherExp = 0;
    let monthMaterialExp = 0;
    let materialBreakdownArray = [];

    // 🔥 NEW: കാറ്റഗറി തിരിച്ചുള്ള ബ്രേക്ക്ഡൗൺ സേവ് ചെയ്യാൻ
    let expenseCategories = { "Food": 0, "Travel": 0, "Ads": 0, "Refund": 0, "Other": [] };

    if (dashboardData && dashboardData.monthTimeline && dashboardData.monthTimeline.expense) {
        dashboardData.monthTimeline.expense.forEach(e => {
            let catName = String(e.cat || '').toLowerCase();
            let rawCatName = String(e.cat || '');

            if (catName.includes('material')) {
                monthMaterialExp += e.amount;
                materialBreakdownArray.push(e.amount);
            } else if (catName === 'salary') {
                // Do nothing for Salary
            } else if (!e.isCourier) {
                // 🔥 ബാക്കി എല്ലാം Other Expense-ൽ കൂട്ടുന്നു
                if (catName !== 'refund') trueOtherExp += e.amount;

                // 🔥 ബ്രേക്ക്ഡൗൺ ലിസ്റ്റിലേക്ക് മാറ്റുന്നു
                if (catName.includes('food')) expenseCategories["Food"] += e.amount;
                else if (catName.includes('travel') || catName.includes('transport')) expenseCategories["Travel"] += e.amount;
                else if (catName.includes('ads') || catName.includes('marketing')) expenseCategories["Ads"] += e.amount;
                else if (catName.includes('refund')) expenseCategories["Refund"] += e.amount;
                else {
                    // Other / Office Expense ആണെങ്കിൽ Vendor അല്ലെങ്കിൽ Description കൂടി സേവ് ചെയ്യുന്നു
                    let note = e.vendor || e.desc || 'Office Exp';
                    expenseCategories["Other"].push(`₹${e.amount} (${note})`);
                }
            }
        });
    }

    window.currentMaterialBreakdownStr = materialBreakdownArray.length > 0 ? materialBreakdownArray.join(' + ') : '';
    window.currentExpenseCategories = expenseCategories; // 🔥 ഗ്ലോബൽ ആയി സേവ് ചെയ്യുന്നു

    // 🔥 FIX: മെറ്റീരിയൽ ചിലവുകൾ ഇനി ലാഭത്തിൽ നിന്നും കുറയ്ക്കില്ല (Exclude from Net Profit)
    // അതായത്, നമ്മൾ നേരത്തെ കൂട്ടിയിരുന്ന `monthMaterialExp` ഇവിടെ നിന്നും ഒഴിവാക്കി!
    let totalExpenses = trueProductCost + trueCourierExp + trueOtherExp;
    let trueNetProfit = trueIncome - totalExpenses;

    window.currentLiveProfit = trueNetProfit > 0 ? trueNetProfit : 0;

    window.currentMonthStr = mName + " " + yName;
    window.currentIncome = trueIncome;
    window.currentProductCost = trueProductCost;
    window.currentCourier = trueCourierExp;
    window.currentOther = trueOtherExp;
    window.currentMaterial = monthMaterialExp;
    window.currentTotalCourier = trueTotalCourier;

    window.currentMonthOrders = monthOrders;
    window.currentMonthBottles = monthBottles;
    let breakdownArr = [];
    for (let a in orderBreakdown) {
        breakdownArr.push(`${a} x ${orderBreakdown[a]}`);
    }
    window.currentBreakdownStr = breakdownArr.join(', ');

    // 👇 പുതുതായി ചേർത്തത് 👇
    let costBreakdownArr = [];
    for (let c in costBreakdown) {
        costBreakdownArr.push(`${c} x ${costBreakdown[c]}`);
    }
    window.currentCostBreakdownStr = costBreakdownArr.join(', ');

    $('#sync-month-btn').remove();
    // 🔥 മാസ്റ്റർ ലോഗിൻ ആണെങ്കിൽ മാത്രം Sync ബട്ടൺ കാണിക്കുക
    if (localStorage.getItem('kafakAdminUser') === 'master') {
        $('.drawer-header').append(`<button id="sync-month-btn" class="btn btn-outline-primary ms-auto px-2 py-1" onclick="syncMonthToSheet()" style="font-size:10px; font-weight:bold; border-radius:6px; border-width: 1.5px;"><i class="fas fa-cloud-upload-alt me-1"></i>Save ${mName} ${yName} Data</button>`);
    }

    $('#m-sales').text('₹' + trueIncome.toLocaleString());
    $('#m-expense').text('₹' + totalExpenses.toLocaleString());
    $('#m-profit').text('₹' + trueNetProfit.toLocaleString());

    $('#m-sales').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(Delivered & Paid Orders Only)</div>');
    $('#m-expense').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(Bottle Cost + Full Courier + Other)</div>');
    $('#m-profit').parent().append('<div class="helper-text-dash text-muted mt-1" style="font-size:9px;">(True Business Net Profit)</div>');

    $('#extra-stats-container, #partner-shares-container, #material-stats-container').remove();

    let yearMaterialExp = 0;
    if (dashboardData && dashboardData.yearly && dashboardData.yearly.materialExp) {
        yearMaterialExp = dashboardData.yearly.materialExp;
    }

    // 🔥 MATERIAL PURCHASES BOX
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

    // 🔥 BOTTLES & ORDERS STATS UI 
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

    $('#tx-details-area').before(materialHtml + statsHtml);

    if (typeof txCalendarPicker !== 'undefined' && txCalendarPicker) txCalendarPicker.redraw();

    let dateKey = flatpickr.formatDate(selectedDate, "Y-m-d");
    if (typeof renderTransactionsForDate === 'function') renderTransactionsForDate(dateKey);

    if (typeof renderDayBookTable === 'function') renderDayBookTable();
    if (typeof renderDetailedMonthlyOverview === 'function') renderDetailedMonthlyOverview();
    if (typeof renderYearlyOverview === 'function') renderYearlyOverview();

    // 🔥 FIX: മാസം മാറ്റുമ്പോൾ തന്നെ സാലറി കാർഡുകളിലെ തുകയും അപ്ഡേറ്റ് ആകാൻ
    if (typeof renderPartnerList === 'function' && $('#partner-section').is(':visible')) {
        renderPartnerList();
    }
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

            // 🔥 എഡിറ്റ് ബട്ടൺ ഉണ്ടാക്കുന്നു (ഓട്ടോമാറ്റിക് കൊറിയർ ചാർജ് അല്ലാത്തവയ്ക്കും, ID ഉള്ളവയ്ക്കും മാത്രം)
            let editBtn = '';
            if (!item.isCourier && item.id) {
                editBtn = `<i class="fas fa-edit text-primary ms-3" style="cursor:pointer; font-size:16px;" onclick="openEditExpense('${item.id}', '${dateStr}', '${item.amount}', '${item.desc}', '${item.cat}', '${item.vendor || ''}')" title="Edit Expense"></i>`;
            }

            html += `
            <div class="d-flex justify-content-between align-items-center p-3 mb-2 bg-white border border-danger border-opacity-25 rounded-4 shadow-sm">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle d-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger" style="width:35px; height:35px; font-size:14px;">${icon}</div>
                    <div>
                        <div class="small fw-bold text-dark mb-1 d-flex align-items-center flex-wrap">${descText} ${proofBtn}</div>
                        <div class="text-muted" style="font-size:10px;">${subText}</div>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    <div class="fw-bold text-danger fs-6">-₹${item.amount.toLocaleString()}</div>
                    ${editBtn}
                </div>
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
        let priceInfo = calculatePriceInfo(order, order.quantity, order.state, order.provider || order.Courier_Provider);
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
    $('#exp-amount').val(''); // 🔥 NEW: Amount Blank ആക്കുന്നു!
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



// 🔥 PARTNER LIST RENDER (WITH FULL BREAKDOWN UI & MONTH NAVIGATION)
window.renderPartnerList = function () {
    if (!dashboardData || !dashboardData.partners) return;
    let partners = dashboardData.partners;

    let liveProfit = window.currentLiveProfit || 0;
    let tExp = (window.currentProductCost || 0) + (window.currentCourier || 0) + (window.currentOther || 0);

    let shares = {
        "Salam": Math.floor(liveProfit * 0.20),
        "Samad": Math.floor(liveProfit * 0.70),
        "Jazeela": Math.floor(liveProfit * 0.10)
    };

    // 🔥 Month Navigation UI Logic
    let today = new Date();
    let isCurrentMonth = (selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === today.getMonth());

    let monthLabel = isCurrentMonth ? `This Month (${window.currentMonthStr})` : `${window.currentMonthStr} Overview`;
    let prevBtn = `<button type="button" class="btn btn-sm btn-light border shadow-sm px-2 py-0 text-primary" style="font-size:11px; border-radius:6px;" onclick="loadPreviousMonthDayBook()"><i class="fas fa-chevron-left"></i> Prev</button>`;
    let nextBtn = !isCurrentMonth ? `<button type="button" class="btn btn-sm btn-light border shadow-sm px-2 py-0 text-primary" style="font-size:11px; border-radius:6px;" onclick="loadNextMonthDayBook()">Next <i class="fas fa-chevron-right"></i></button>` : `<span style="width:50px;"></span>`;

    // 🔥 Beautiful Breakdown UI 
    let breakdownHtml = `
    <div class="mb-3 p-3 bg-white border border-primary border-opacity-25 rounded-4 shadow-sm" style="font-size:12px;">
        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
            ${prevBtn}
            <h6 class="fw-bold text-primary m-0 text-center flex-grow-1" style="font-size:12px; letter-spacing:0.5px;">
                <i class="fas fa-calendar-check me-1"></i> ${monthLabel}
            </h6>
            ${nextBtn}
        </div>
        
        <div class="d-flex justify-content-between mb-1">
            <span class="text-muted fw-bold">Sales: <span class="text-dark">${window.currentMonthOrders}</span></span>
            <span class="text-muted fw-bold">Bottles: <span class="text-dark">${window.currentMonthBottles}</span></span>
        </div>
        <div class="text-secondary small mb-2 fst-italic" style="font-size:10px;">${window.currentBreakdownStr}</div>
        
        <div class="d-flex justify-content-between mb-1 mt-2">
            <span class="text-muted">Total Income:</span>
            <span class="fw-bold text-success">₹${(window.currentIncome || 0).toLocaleString()}</span>
        </div>
        <div class="d-flex justify-content-between mb-0">
            <span class="text-muted">Deductible Expense:</span>
            <span class="fw-bold text-danger">- ₹${tExp.toLocaleString()} <span style="font-size:9px;" class="badge bg-danger bg-opacity-10 text-danger ms-1">INCLUDED</span></span>
        </div>
        ${window.currentExpenseCategories["Food"] > 0 ? `<div class="d-flex justify-content-between mb-1" style="font-size:10px;"><span class="text-muted ps-2">🍔 Food:</span><span class="text-danger fw-bold">- ₹${window.currentExpenseCategories["Food"].toLocaleString()}</span></div>` : ''}
        ${window.currentExpenseCategories["Travel"] > 0 ? `<div class="d-flex justify-content-between mb-1" style="font-size:10px;"><span class="text-muted ps-2">⛽ Travel:</span><span class="text-danger fw-bold">- ₹${window.currentExpenseCategories["Travel"].toLocaleString()}</span></div>` : ''}
        ${window.currentExpenseCategories["Ads"] > 0 ? `<div class="d-flex justify-content-between mb-1" style="font-size:10px;"><span class="text-muted ps-2">📢 Ads:</span><span class="text-danger fw-bold">- ₹${window.currentExpenseCategories["Ads"].toLocaleString()}</span></div>` : ''}
        
        ${window.currentExpenseCategories["Other"].length > 0 ? `
            <div class="d-flex justify-content-between align-items-start mb-1" style="font-size:10px;">
                <span class="text-muted ps-2">📝 Other:</span>
                <span class="text-danger fw-bold text-end">${window.currentExpenseCategories["Other"].join('<br>')}</span>
            </div>` : ''}
            
        ${window.currentExpenseCategories["Refund"] > 0 ? `<div class="d-flex justify-content-between mb-1" style="font-size:10px;"><span class="text-muted ps-2">💸 Refund:</span><div><span class="text-secondary fw-bold">₹${window.currentExpenseCategories["Refund"].toLocaleString()}</span> <span class="badge bg-info bg-opacity-10 text-info ms-1" style="font-size:7px;">EXCLUDED</span></div></div>` : ''}
        <div class="d-flex justify-content-between mb-1 mt-1">
            <span class="fw-bold text-info" style="font-size:10px;">
                <i class="fas fa-ban"></i> Materials: ₹${(window.currentMaterial || 0).toLocaleString()}
                ${window.currentMaterialBreakdownStr ? `<br><span class="ms-3 text-secondary opacity-75" style="font-size:9px; font-weight:600;">${window.currentMaterialBreakdownStr}</span>` : ''}
            </span>
            <span class="badge bg-info bg-opacity-10 text-info" style="font-size:8px; height:fit-content;">EXCLUDED</span>
        </div>
        <div class="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom border-dashed border-secondary border-opacity-25 mt-1">
            <div class="text-warning fw-bold" style="font-size:10px;">
                <i class="fas fa-truck"></i> Courier ➔ Total: ₹${(window.currentTotalCourier || 0).toLocaleString()} <br>
                <span class="ms-3 text-muted" style="font-size:9px;">(Margin Saved: ₹${((window.currentTotalCourier || 0) - (window.currentCourier || 0)).toLocaleString()})</span>
            </div>
            <span class="badge bg-danger bg-opacity-10 text-danger" style="font-size:8px; margin-top:2px;">INCLUDED</span>
        </div>
        
        <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="fw-bold text-dark" style="font-size:13px;">Net Profit:</span>
            <span class="fw-bolder fs-5 ${liveProfit >= 0 ? 'text-success' : 'text-danger'}">₹${liveProfit.toLocaleString()}</span>
        </div>

        <div class="bg-light p-2 rounded-3 border">
            <div class="d-flex justify-content-between mb-1" style="font-size:11px;">
                <span class="fw-bold text-secondary">Salam (20%):</span>
                <span class="fw-bold text-dark">₹${shares.Salam.toLocaleString()}</span>
            </div>
            <div class="d-flex justify-content-between mb-1" style="font-size:11px;">
                <span class="fw-bold text-secondary">Samad (70%):</span>
                <span class="fw-bold text-dark">₹${shares.Samad.toLocaleString()}</span>
            </div>
            <div class="d-flex justify-content-between" style="font-size:11px;">
                <span class="fw-bold text-secondary">Jazeela (10%):</span>
                <span class="fw-bold text-dark">₹${shares.Jazeela.toLocaleString()}</span>
            </div>
        </div>
    </div>`;

    let html = breakdownHtml;

    if (isCurrentMonth) {
        html += `<div class="alert alert-warning p-2 mb-2 d-flex align-items-start gap-2 border-warning shadow-sm" style="font-size:10.5px; font-weight:700; background:#fff8e1; border-radius:8px;">
            <i class="fas fa-info-circle text-warning mt-1"></i> 
            <div>താഴെ കാണിക്കുന്ന തുക (Total Bal) എന്നത് അവരുടെ ഇതുവരെയുള്ള <b>എല്ലാ മാസത്തെയും ലാഭത്തിൽ നിന്നും അവർ എടുത്ത തുക കുറച്ചതിന് ശേഷമുള്ള</b> ബാക്കി ഫൈനൽ ബാലൻസ് ആണ്.</div>
        </div>`;

        for (let [name, data] of Object.entries(partners)) {
            let sheetPrevBal = typeof data === 'object' ? data.curr : data;
            let totalBal = sheetPrevBal;

            if (shares[name]) {
                totalBal += shares[name];
            }

            let formattedBal = Number(totalBal).toLocaleString('en-IN', { maximumFractionDigits: 0 });

            let withdrawnInfo = '';
            if (data.withdrawn > 0) {
                withdrawnInfo = `
                    <div class="mt-2 pt-2 border-top border-secondary border-opacity-10 d-flex justify-content-between w-100" style="font-size:10px; color:#ef4444;">
                        <span>Total Taken: <b>₹${data.withdrawn.toLocaleString()}</b></span>
                        <span>Last: <b>₹${data.lastAmt.toLocaleString()}</b> (${data.lastDate})</span>
                    </div>`;
            } else {
                withdrawnInfo = `<div class="mt-2 pt-2 border-top border-secondary border-opacity-10 text-muted" style="font-size:10px;">No salary taken yet.</div>`;
            }

            // 🔥 NEW ALIGNMENT FIX (Flex-grow added properly, width 100% bugs removed)
            html += `
            <div class="partner-card p-3 mb-2 border rounded-4 shadow-sm" onclick="selectPartner('${name}', ${totalBal})" style="cursor:pointer; transition:all 0.2s ease-in-out; background:#fff;">
                <div class="d-flex align-items-center w-100">
                    <div class="me-3">
                        <i class="fas fa-user-circle text-muted" style="font-size: 36px;"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-bolder text-dark" style="font-size:15px; letter-spacing:0.5px;">${name}</div>
                        <div class="text-success fw-bold mt-1" style="font-size:13px;">
                            Total Bal: ₹${formattedBal} 
                        </div>
                        <div class="text-muted mt-1" style="font-size:10px; font-weight:600;">
                            Prev: ₹${sheetPrevBal.toLocaleString()} <span class="mx-1">|</span> This Mth: ₹${(shares[name] || 0).toLocaleString()}
                        </div>
                        ${withdrawnInfo}
                    </div>
                    <div class="ms-2 d-flex align-items-center justify-content-center">
                        <i class="far fa-circle text-muted check-icon" style="font-size: 22px;"></i>
                    </div>
                </div>
            </div>`;
        }
    } else {
        html += `
        <div class="text-center mt-3 mb-2 text-danger fw-bold bg-danger bg-opacity-10 p-3 rounded-4 border border-danger border-opacity-25" style="font-size:11px;">
            <i class="fas fa-lock fs-5 mb-2"></i><br>
            സാലറി അക്കൗണ്ടിംഗ് കൃത്യമാകാൻ നിലവിലെ മാസത്തിൽ (Current Month) നിന്നും മാത്രമേ സാലറി കൊടുക്കാൻ സാധിക്കൂ.
            <div class="mt-3">
                <button type="button" class="btn btn-sm btn-danger fw-bold shadow-sm rounded-pill px-4" onclick="jumpToCurrentMonth()">
                    <i class="fas fa-calendar-day me-1"></i> Go to This Month
                </button>
            </div>
        </div>`;
    }

    $('#partner-list').html(html);
};

function selectPartner(name, amount) {
    $('.partner-card').removeClass('selected');
    $('.partner-card .check-icon').attr('class', 'far fa-circle text-muted check-icon');
    $(event.currentTarget).addClass('selected');
    $(event.currentTarget).find('.check-icon').attr('class', 'fas fa-check-circle text-success check-icon');
    $('#exp-vendor').val(name);
    if (amount !== undefined) {
        $('#exp-amount').val(amount);
    }
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

// 🔥 OPEN WHATSAPP (Fix for W/M/A Codes)
// 🔥 1. OPEN WHATSAPP (Fixed Unique ID)
window.openSimpleWA = function (index, btnElement, type = 'pending') {
    if (btnElement) highlightCard(btnElement);

    const d = allOrders[index];
    let phoneNum = "";

    // 🔥 FIX: Select the correct dropdown using 'type'
    const dropdown = document.getElementById(`wa-select-${type}-${index}`);
    let code = dropdown ? dropdown.value : '';

    if (code === 'W') phoneNum = d.whatsapp;
    else if (code === 'A') phoneNum = d.altphone;
    else if (code === 'M') phoneNum = d.phone;
    else if (code === 'G') phoneNum = d.paidNum;
    else phoneNum = d.whatsapp || d.phone;

    // Clean & Open
    let cleanNum = String(phoneNum || '').replace(/[^0-9]/g, '');
    if (cleanNum.length === 10) cleanNum = '91' + cleanNum;

    if (cleanNum) {
        window.open(`https://wa.me/${cleanNum}`, '_blank');
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


// 🔥 SAVE PAID NUMBER (Fixed Error & Offline Support)
window.savePaidNum = function (oid, val) {
    let order = allOrders.find(o => o.orderid === oid);
    if (!order) return;

    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let existingIndex = updates.findIndex(u => u.oid === oid && u.action === 'paidNum');

    // 🔥 യഥാർത്ഥ നമ്പർ കണ്ടുപിടിക്കുന്നു
    let trueOldNum = (existingIndex > -1 && updates[existingIndex].oldNum !== undefined) ? updates[existingIndex].oldNum : (order.paidNum || "");

    // Local Update
    order.paidNum = val;
    localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));

    // 🔥 പഴയതിലേക്ക് തന്നെയാണ് മാറ്റിയതെങ്കിൽ ഡിലീറ്റ് ചെയ്യുന്നു
    if (val === trueOldNum) {
        if (existingIndex > -1) updates.splice(existingIndex, 1);
    } else {
        if (existingIndex > -1) {
            updates[existingIndex].num = val;
        } else {
            updates.push({ oid: oid, action: 'paidNum', num: val, oldNum: trueOldNum });
        }
    }

    localStorage.setItem('pendingUpdates', JSON.stringify(updates));
    updateSyncButtonUI();

    setTimeout(() => { renderTabs(allOrders); }, 100);

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
                // മാച്ച് കണ്ടുപിടിച്ചു! (മാച്ച് ആയ നമ്പറും കൂടി തിരികെ അയക്കുന്നു)
                return { order: other, matchedNum: myN };
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

// 🔥 SEND PAYMENT RECEIPT WA (Fixed Unique ID & Preserved Logic)
window.sendPaymentWA = function (oid, index, type = 'paid') {
    let order = allOrders.find(o => o.orderid === oid);
    if (!order) { alert("Order Data Missing!"); return; }

    // 1. Get Selected Code from Dropdown (Unique ID Fix)
    // 🔥 FIX: Uses 'type' to find the specific dropdown
    let dropdown = document.getElementById(`wa-select-${type}-${index}`);
    let code = 'W'; // Default
    if (dropdown) code = dropdown.value;

    // 2. Pick Number based on Selection (Logic Preserved)
    let targetNum = "";
    if (code === 'M') targetNum = order.phone;
    else if (code === 'W') targetNum = order.whatsapp;
    else if (code === 'A') targetNum = order.altphone;
    else if (code === 'G') targetNum = order.paidNum; // Paid Number
    else targetNum = order.whatsapp || order.phone; // Fallback

    let cleanNum = String(targetNum || '').replace(/[^0-9]/g, '');
    if (cleanNum.length === 10) cleanNum = '91' + cleanNum;

    if (!cleanNum) { alert("No valid number found for selection!"); return; }

    // 3. Generate Message (Logic Preserved)
    //let lang = order.language || 'en';
    //let msg = "";
    let trackLink = `https://kafaklife.com/order.html?oid=${oid}`;

    // if (lang === 'ml') {
    //     msg = `✅ *പേയ്‌മെന്റ് ലഭിച്ചു!* നന്ദി❤️\n\n🚛 *4-5 ദിവസത്തിനുള്ളിൽ* ഓർഡർ നിങ്ങളുടെ കയ്യിൽ ലഭിക്കുന്നതാണ്.\n\n👇 *Order Status:*\n${trackLink}`;
    // } else {
    //     msg = `✅ *Payment Received!* Thank you❤️\nOrder ID: ${oid}\n\n🚛 Your order will be delivered within *4-5 days*.\n\n👇 *Order Status:*\n${trackLink}`;
    // }

    let msg = `✅ *Payment Received!* Thank you❤️\n*പേയ്‌മെന്റ് ലഭിച്ചു! നന്ദി*\n\n🚛 *Order will be delivered within 4-5 days.*\n*4-5 ദിവസത്തിനുള്ളിൽ ഓർഡർ നിങ്ങൾക്ക് ലഭിക്കുന്നതാണ്.*\n\n👇 *Order Status:*\n${trackLink}`;

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


window.changeCourier = function (oid, newProvider) {
    let oIdx = allOrders.findIndex(o => o.orderid === oid);

    if (oIdx > -1) {
        let o = allOrders[oIdx];
        let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
        let existingIndex = updates.findIndex(u => u.oid === oid && u.action === 'meta' && u.provider !== undefined);

        let trueOldProvider = (existingIndex > -1 && updates[existingIndex].oldProvider !== undefined) ? updates[existingIndex].oldProvider : (o.provider || o.Courier_Provider);
        let trueOldCharge = (existingIndex > -1 && updates[existingIndex].oldCharge !== undefined) ? updates[existingIndex].oldCharge : o.Courier_Charge;
        let trueOldTotal = (existingIndex > -1 && updates[existingIndex].oldTotal !== undefined) ? updates[existingIndex].oldTotal : o.Grand_Total;

        let n = parseInt(o.quantity) || 1;
        let newCourierCharge = getCourierRate(o.state, newProvider, n);

        // 🔥 Bottle Cost ഉം Total ഉം വെവ്വേറെ എടുക്കുന്നു
        let basePrice = ((typeof courierRates !== 'undefined' && courierRates.prices && courierRates.prices[n]) ? Number(courierRates.prices[n]) : (n * 650));
        let newTotal = basePrice + newCourierCharge;

        // പുതിയ ബ്രേക്ക്ഡൗൺ ടെക്സ്റ്റ് ഉണ്ടാക്കുന്നു
        let newBreakdownText = `<span class="text-muted" style="font-size:9px; margin-right:4px;">(${basePrice} + ${newCourierCharge})</span> ₹${newTotal}/-`;

        // Local Update
        o.provider = newProvider;
        o.Courier_Provider = newProvider;
        o.Courier_Charge = newCourierCharge;
        o.Grand_Total = newTotal;
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));

        // 🔥 പുതിയ ടെക്സ്റ്റ് സ്ക്രീനിൽ ആനിമേഷനോടെ കാണിക്കുന്നു
        $(`#price-box-${oid}`).html(newBreakdownText).css('color', '#ff9800').fadeOut(150).fadeIn(150, function () {
            $(this).css('color', '#198754');
        });

        if (newProvider === trueOldProvider) {
            if (existingIndex > -1) {
                delete updates[existingIndex].provider;
                delete updates[existingIndex].charge;
                delete updates[existingIndex].total;
                delete updates[existingIndex].oldProvider;
                delete updates[existingIndex].oldCharge;
                delete updates[existingIndex].oldTotal;

                if (updates[existingIndex].meta === undefined) updates.splice(existingIndex, 1);
            }
        } else {
            if (existingIndex > -1) {
                updates[existingIndex].provider = newProvider;
                updates[existingIndex].charge = newCourierCharge;
                updates[existingIndex].total = newTotal;
                updates[existingIndex].time = new Date().getTime();
            } else {
                let metaOnlyIndex = updates.findIndex(u => u.oid === oid && u.action === 'meta');
                if (metaOnlyIndex > -1) {
                    updates[metaOnlyIndex].provider = newProvider;
                    updates[metaOnlyIndex].charge = newCourierCharge;
                    updates[metaOnlyIndex].total = newTotal;
                    updates[metaOnlyIndex].oldProvider = trueOldProvider;
                    updates[metaOnlyIndex].oldCharge = trueOldCharge;
                    updates[metaOnlyIndex].oldTotal = trueOldTotal;
                } else {
                    updates.push({
                        oid: oid, action: 'meta',
                        provider: newProvider, charge: newCourierCharge, total: newTotal,
                        oldProvider: trueOldProvider, oldCharge: trueOldCharge, oldTotal: trueOldTotal,
                        time: new Date().getTime()
                    });
                }
            }
        }

        localStorage.setItem('pendingUpdates', JSON.stringify(updates));
        updateSyncButtonUI();

        Swal.fire({ icon: 'success', title: `${newProvider} Selected!`, text: `New Total: ₹${newTotal}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    }
}

window.loadOldTrackingOrders = function () {
    showAllTracking = true;
    renderTabs(allOrders); // വീണ്ടും റീ-റെൻഡർ ചെയ്യുന്നു
};

window.loadOldSentOrders = function () {
    window.showAllSent = true;
    renderTabs(allOrders);
};
window.loadOldPendingOrders = function () {
    window.showAllPending = true;
    renderTabs(allOrders);
};
window.loadOldDispNewOrders = function () {
    window.showAllDispNew = true;
    renderTabs(allOrders);
};


// 🔥 1. കാറ്റഗറി മാറ്റുമ്പോൾ Field മാറ്റാനുള്ള Helper Function
window.toggleEditPartnerSelect = function () {
    let cat = document.getElementById('edit-exp-cat').value;
    if (cat === 'Salary') {
        document.getElementById('edit-partner-section').style.display = 'block';
        document.getElementById('edit-vendor-section').style.display = 'none';
    } else {
        document.getElementById('edit-partner-section').style.display = 'none';
        document.getElementById('edit-vendor-section').style.display = 'block';
    }
};

// 🔥 2. എഡിറ്റ് വിൻഡോയിലെ കാർഡ് സെലക്ട് ചെയ്യാൻ
window.selectEditPartner = function (name, el) {
    $('#edit-partner-section .partner-card').removeClass('selected').css({ 'border-color': '#e2e8f0', 'background-color': '#fff' });
    $('#edit-partner-section .check-icon').attr('class', 'far fa-circle text-muted check-icon');

    $(el).addClass('selected').css({ 'border-color': '#198754', 'background-color': '#f6fdf9' });
    $(el).find('.check-icon').attr('class', 'fas fa-check-circle text-success check-icon');

    $('#edit-exp-partner-val').val(name);
};

// 🔥 SUBMIT EDITED EXPENSE TO SERVER
function submitEditedExpense(updateData) {
    Swal.fire({
        title: 'Updating...',
        text: 'Saving your changes to the server.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'editExpense', data: updateData })
    })
        .then(res => res.json())
        .then(res => {
            if (res.result === 'success') {
                Swal.fire({ icon: 'success', title: 'Updated!', text: 'Expense has been modified.', timer: 2000, showConfirmButton: false });
                // അപ്ഡേറ്റ് ചെയ്ത ശേഷം ഡാഷ്‌ബോർഡ് റീലോഡ് ചെയ്യുന്നു
                setTimeout(() => { location.reload(); }, 2000);
            } else {
                Swal.fire('Error', 'Could not find or update the expense.', 'error');
            }
        }).catch(err => {
            Swal.fire('Error', 'Network Error. Try again.', 'error');
        });
}






// 🔥 NEXT / PREV MONTH LOGIC
window.loadPreviousMonthDayBook = function () {
    let prevDate = new Date(selectedDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    selectedDate = prevDate;
    changeDashDate();
}

window.loadNextMonthDayBook = function () {
    let nextDate = new Date(selectedDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    // ഭാവിയിലോട്ട് പോകുന്നത് തടയാൻ
    let today = new Date();
    if (nextDate.getFullYear() > today.getFullYear() || (nextDate.getFullYear() === today.getFullYear() && nextDate.getMonth() > today.getMonth())) {
        return;
    }

    selectedDate = nextDate;
    changeDashDate();
}



// 🔥 1. DETAILED MONTHLY OVERVIEW (Fixed Date Parsing & Added Material Row)
// 🔥 1. DETAILED MONTHLY OVERVIEW (100% Sync with Salary Section)
window.renderDetailedMonthlyOverview = function () {
    if (!dashboardData || !dashboardData.monthTimeline) return;

    if ($('#detailed-overview-container').length === 0) {
        $('<div id="detailed-overview-container" class="mt-3 mb-4"></div>').insertAfter('#tx-details-area');
    }

    // 🔥 പുതിയ DIRECT SALE ബട്ടൺ ഡാഷ്‌ബോർഡിൽ ഏറ്റവും മുകളിലായി കൊടുക്കുന്നു!
    if ($('#btn-direct-sale').length === 0) {
        $(`
        <button id="btn-direct-sale" onclick="showOfflineSaleModal()" class="btn btn-warning w-100 fw-bold mt-2 mb-3 shadow-sm d-flex justify-content-center align-items-center gap-2" style="border-radius:12px; padding:12px; font-size:14px; border:2px solid #000; background-color:#ffc107; color:#000;">
            <i class="fas fa-shopping-cart fs-5"></i> <span>DIRECT / PARTNER SALE</span>
        </button>
        `).insertBefore('#tx-details-area');
    }

    let mY = selectedDate.getFullYear();
    let mM = selectedDate.getMonth();

    let tSales = 0, tBottles = 0, tBottleCost = 0;
    let tCourierCost = 0, tActualCourier = 0, tOtherExpense = 0, tMaterialExpense = 0;

    allOrders.forEach(o => {
        // 🔥 FIX: ഇവിടെയും പഴയ ഫിൽറ്റർ കൊടുത്തു
        let status = String(o.Status || 'Pending').trim();
        let isValidStatus = ['Paid', 'Dispatched', 'Delivered', 'Completed'].includes(status);
        if (!isValidStatus) return;

        let qty = parseInt(o.quantity) || 0;

        // 1. വരുമാനവും ബോട്ടിൽ ചിലവും
        let pDate = parseOrderDate(o.paidDate || o.timestamp);
        if (pDate.getFullYear() === mY && pDate.getMonth() === mM) {
            let amt = parseInt(o.grandTotal) || parseInt(o.Grand_Total) || 0;
            if (isNaN(amt) || amt <= 0) {
                let pInfo = calculatePriceInfo(o, qty, o.state, o.provider || o.Courier_Provider);
                amt = parseInt(pInfo.total.replace(/[^0-9]/g, '')) || 0;
            }
            tSales += amt;
            tBottles += qty;

            let dbCost = parseInt(o.Product_Base_Cost);
            tBottleCost += (!isNaN(dbCost) && dbCost > 0) ? dbCost : (qty * 330);
        }

        // 2. കൊറിയർ ചിലവ് 
        if (status !== 'Paid') {
            let dDate = parseOrderDate(o['Dispatched Date'] || o.timestamp);
            if (dDate.getFullYear() === mY && dDate.getMonth() === mM) {
                let actualC = parseInt(o.actualCourierCost) || parseInt(o.Actual_Courier_Cost) || 0;
                let totalC = parseInt(o.Courier_Charge) || 0;
                if (totalC <= 0) totalC = getCourierRate(o.state, o.provider || o.Courier_Provider, qty);
                if (actualC <= 0) actualC = totalC > 20 ? totalC - 20 : totalC;

                tCourierCost += totalC;
                tActualCourier += actualC;
            }
        }
    });

    if (dashboardData.monthTimeline.expense) {
        dashboardData.monthTimeline.expense.forEach(e => {
            if (!e.isCourier) {
                let catName = String(e.cat || '').toLowerCase();
                if (catName.includes('material')) {
                    tMaterialExpense += e.amount;
                } else if (catName !== 'salary' && catName !== 'refund') {
                    tOtherExpense += e.amount;
                }
            }
        });
    }

    // 🔥 FIX: മെറ്റീരിയൽ ചിലവ് ഇവിടെ നിന്നും ഒഴിവാക്കി (Not adding tMaterialExpense to totalExpense)
    let totalExpense = tBottleCost + tActualCourier + tOtherExpense;
    let netProfit = tSales - totalExpense;

    let salamShare = netProfit > 0 ? Math.floor(netProfit * 0.20) : 0;
    let samadShare = netProfit > 0 ? Math.floor(netProfit * 0.70) : 0;
    let jazeelaShare = netProfit > 0 ? netProfit - (salamShare + samadShare) : 0;

    let avgBottleRate = tBottles > 0 ? Math.round(tBottleCost / tBottles) : 330;

    let html = `
    <div class="bg-dark text-white p-4 rounded-4 shadow mb-2" style="background: linear-gradient(135deg, #1e293b, #0f172a);">
        <h6 class="fw-bold text-uppercase mb-4 text-center" style="letter-spacing:1px; color:#cbd5e1;">
            <i class="fas fa-chart-pie me-2"></i> Monthly Profit Breakdown
        </h6>
        
        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-50">
            <span class="text-light" style="font-size:13px;"><i class="fas fa-coins text-warning me-2"></i>Total Revenue (Sales)</span>
            <span class="fw-bold text-success fs-5">₹${tSales.toLocaleString()}</span>
        </div>

        <div class="mb-2 ps-3 border-start border-3 border-danger">
            <div class="text-danger fw-bold mb-2" style="font-size:11px; letter-spacing:0.5px;">MINUS EXPENSES (INCLUDED):</div>
            
            <div class="d-flex justify-content-between align-items-start mt-2">
                <div>
                    <div class="text-light" style="font-size:12px;">🍾 Bottle Making Cost</div>
                    <div class="text-warning" style="font-size:11px; font-weight:600;">(${tBottles} bottles × ₹${avgBottleRate})</div>
                </div>
                <span class="text-danger fw-bold" style="font-size:13px;">- ₹${tBottleCost.toLocaleString()}</span>
            </div>
            
            <div class="d-flex justify-content-between align-items-start mt-2">
                <div>
                    <div class="text-light" style="font-size:12px;">🚚 Courier & Transport</div>
                    <div class="text-warning" style="font-size:10px; font-weight:600;">(Total: ₹${tCourierCost.toLocaleString()} | Margin: ₹${(tCourierCost - tActualCourier).toLocaleString()})</div>
                </div>
                <span class="text-danger fw-bold" style="font-size:13px;">- ₹${tActualCourier.toLocaleString()}</span>
            </div>
            
            <div class="d-flex justify-content-between align-items-start mt-2 pb-2 border-bottom border-secondary border-opacity-50">
                <div>
                    <div class="text-light" style="font-size:12px;">🧾 Other Expenses</div>
                    <div class="text-danger opacity-75" style="font-size:10px; font-weight:600;">(Food, Travel, Ads, Misc)</div>
                </div>
                <span class="text-danger fw-bold" style="font-size:13px;">- ₹${tOtherExpense.toLocaleString()}</span>
            </div>
        </div>

        <div class="mt-3 p-2 rounded" style="background: rgba(13, 202, 240, 0.1); border-left: 3px solid #0dcaf0;">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-info fw-bold" style="font-size:12px;"><i class="fas fa-ban me-1"></i> 📦 Material Purchases</div>
                    <div class="text-info opacity-75" style="font-size:10px; font-weight:600;">(EXCLUDED from deduction)</div>
                </div>
                <span class="text-info fw-bold" style="font-size:13px;">₹${tMaterialExpense.toLocaleString()}</span>
            </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary border-opacity-50">
            <span class="fw-bold text-uppercase text-light" style="font-size:14px; letter-spacing:1px;">Actual Net Profit</span>
            <span class="${netProfit >= 0 ? 'text-success' : 'text-danger'} fw-bolder" style="font-size:24px;">
                ₹${netProfit.toLocaleString()}
            </span>
        </div>

        ${netProfit > 0 ? `
        <div class="mt-4 pt-3 border-top border-secondary border-opacity-25">
            <h6 class="text-center text-muted fw-bold mb-3" style="font-size:11px; letter-spacing:1px;">PROFIT SHARE SPLIT</h6>
            <div class="d-flex justify-content-between text-center">
                <div class="w-100 px-1 border-end border-secondary border-opacity-25">
                    <div class="text-info fw-bold mb-1" style="font-size:12px;">Salam <span class="text-warning" style="font-size:9px;">(20%)</span></div>
                    <div class="fw-bold text-white" style="font-size:13px;">₹${salamShare.toLocaleString()}</div>
                </div>
                <div class="w-100 px-1 border-end border-secondary border-opacity-25">
                    <div class="text-info fw-bold mb-1" style="font-size:12px;">Samad <span class="text-warning" style="font-size:9px;">(70%)</span></div>
                    <div class="fw-bold text-white" style="font-size:13px;">₹${samadShare.toLocaleString()}</div>
                </div>
                <div class="w-100 px-1">
                    <div class="text-info fw-bold mb-1" style="font-size:12px;">Jazeela <span class="text-warning" style="font-size:9px;">(10%)</span></div>
                    <div class="fw-bold text-white" style="font-size:13px;">₹${jazeelaShare.toLocaleString()}</div>
                </div>
            </div>
        </div>
        ` : `<div class="text-center mt-3 text-danger" style="font-size:11px;">No profits to share this month.</div>`}
    </div>`;

    $('#detailed-overview-container').html(html);
}

// 🔥 2. RENDER YEARLY OVERVIEW (100% Sync with Dashboard)
window.renderYearlyOverview = function () {
    let currentYear = selectedDate.getFullYear();
    let ySales = 0, yBottles = 0, yBottleCost = 0, yCourierCost = 0, yActualCourier = 0, yOtherExpense = 0;

    allOrders.forEach(o => {
        // 🔥 FIX: ഫിൽറ്റർ അപ്ഡേറ്റ് ചെയ്തു
        let status = String(o.Status || 'Pending').trim();
        let isValidStatus = ['Paid', 'Dispatched', 'Delivered', 'Completed'].includes(status);
        if (!isValidStatus) return;

        let qty = parseInt(o.quantity) || 0;

        let pDate = parseOrderDate(o.paidDate || o.timestamp);
        if (pDate.getFullYear() === currentYear) {
            let amt = parseInt(o.grandTotal) || parseInt(o.Grand_Total) || 0;
            if (isNaN(amt) || amt <= 0) {
                let pInfo = calculatePriceInfo(o, qty, o.state, o.provider || o.Courier_Provider);
                amt = parseInt(pInfo.total.replace(/[^0-9]/g, '')) || 0;
            }
            ySales += amt;
            yBottles += qty;

            let dbCost = parseInt(o.Product_Base_Cost);
            yBottleCost += (!isNaN(dbCost) && dbCost > 0) ? dbCost : (qty * 330);
        }

        if (status !== 'Paid') {
            let dDate = parseOrderDate(o['Dispatched Date'] || o.timestamp);
            if (dDate.getFullYear() === currentYear) {
                let actualC = parseInt(o.actualCourierCost) || parseInt(o.Actual_Courier_Cost) || 0;
                let totalC = parseInt(o.Courier_Charge) || 0;
                if (totalC <= 0) totalC = getCourierRate(o.state, o.provider || o.Courier_Provider, qty);
                if (actualC <= 0) actualC = totalC > 20 ? totalC - 20 : totalC;

                yCourierCost += totalC;
                yActualCourier += actualC;
            }
        }
    });

    if (dashboardData && dashboardData.yearTimeline && dashboardData.yearTimeline.expense) {
        dashboardData.yearTimeline.expense.forEach(e => {
            let catName = String(e.cat || '').toLowerCase();
            // Salary ഉം Refund ഉം അല്ലാത്ത എല്ലാ ചിലവുകളും കൂട്ടുന്നു
            if (!e.isCourier && catName !== 'salary' && catName !== 'refund') {
                yOtherExpense += (Number(e.amount) || 0);
            }
        });
    }

    // 🔥 യഥാർത്ഥ കൊറിയർ ചിലവാണ് കുറയ്ക്കേണ്ടത് (yActualCourier)
    let yTotalExpense = yBottleCost + yActualCourier + yOtherExpense;
    let yNetProfit = ySales - yTotalExpense;

    let profitMargin = ySales > 0 ? ((yNetProfit / ySales) * 100).toFixed(1) : 0;

    let html = `
    <div class="bg-white p-3 rounded-4 shadow-sm border border-primary border-opacity-25 mb-5">
        <h6 class="fw-bold text-dark mb-3 text-center" style="font-size:12px; letter-spacing:0.5px;">
            <i class="fas fa-calendar-check text-primary me-2"></i> YEARLY SNAPSHOT (${currentYear})
        </h6>
        <div class="d-flex justify-content-between text-center align-items-center">
            
            <div class="w-100 border-end border-secondary border-opacity-25 px-1">
                <div class="text-muted mb-1" style="font-size:9px; font-weight:800; letter-spacing:0.5px;">TOTAL SALES</div>
                <div class="fw-bold text-success" style="font-size:14px;">₹${ySales.toLocaleString()}</div>
                <div class="text-secondary mt-1" style="font-size:9px; font-weight:700;">
                    <i class="fas fa-wine-bottle" style="color:#d97706;"></i> ${yBottles} Bottles
                </div>
            </div>
            
            <div class="w-100 border-end border-secondary border-opacity-25 px-1">
                <div class="text-muted mb-1" style="font-size:9px; font-weight:800; letter-spacing:0.5px;">TOTAL EXPENSE</div>
                <div class="fw-bold text-danger" style="font-size:14px;">₹${yTotalExpense.toLocaleString()}</div>
                <div class="text-secondary mt-1" style="font-size:9px; font-weight:700;">
                    <i class="fas fa-truck opacity-75" style="color:#dc3545;"></i> ₹${yActualCourier.toLocaleString()} Courier
                </div>
            </div>
            
            <div class="w-100 px-1">
                <div class="text-muted mb-1" style="font-size:9px; font-weight:800; letter-spacing:0.5px;">NET PROFIT</div>
                <div class="fw-bold ${yNetProfit >= 0 ? 'text-primary' : 'text-danger'}" style="font-size:15px;">₹${yNetProfit.toLocaleString()}</div>
                <div class="text-secondary mt-1" style="font-size:9px; font-weight:700;" title="Profit Margin Percentage">
                    <i class="fas fa-chart-line opacity-75" style="color:${yNetProfit >= 0 ? '#198754' : '#dc3545'};"></i> Margin: ${profitMargin}%
                </div>
            </div>

        </div>
    </div>`;

    if ($('#yearly-overview-container').length === 0) {
        $('<div id="yearly-overview-container"></div>').insertAfter('#detailed-overview-container');
    }
    $('#yearly-overview-container').html(html);
}

// 🔥 സെറ്റിങ്സ് തുറക്കാനും, ലെഫ്റ്റ് ഡ്രോയർ അടയ്ക്കാനും ഉള്ള ഫംഗ്ഷൻ
window.openSettingsModal = function () {
    let drawer = $('#left-drawer');
    let overlay = $('#left-drawer-overlay');

    // മെനു തുറന്നിരിപ്പുണ്ടെങ്കിൽ അത് അടയ്ക്കുന്നു
    if (drawer.hasClass('open') || drawer.css('left') === '0px') {
        drawer.removeClass('open').css('left', '-100%');
        overlay.fadeOut(200);
    }

    // Bootstrap Modal നേരിട്ട് തുറക്കുന്നു (എറർ ഇല്ലാതെ)
    const myModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    myModal.show();

    // കൊറിയർ ഡാറ്റ ലോഡ് ചെയ്യുന്നു
    loadCourierSettings();
};

// 🔥 LOAD SETTINGS FROM SERVER (Network Error Fixed using Fetch)
window.loadCourierSettings = function () {
    $('#courier-settings-container').html('<div class="text-center text-muted p-3"><i class="fas fa-spinner fa-spin me-2"></i> Loading settings...</div>');

    fetch(`${scriptURL}?action=getSettings`)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success' && response.data) {
                renderSettingsUI(response.data);
            } else {
                $('#courier-settings-container').html('<div class="text-danger p-2 small text-center">Failed to load settings.</div>');
            }
        })
        .catch(error => {
            console.error("Fetch error:", error);
            $('#courier-settings-container').html('<div class="text-danger p-2 small text-center">Network error. Please check Apps Script.</div>');
        });
}

// 🔥 RENDER SETTINGS UI (With Smart Radio Buttons & Text Margin inputs)
function renderSettingsUI(settingsData) {
    let html = '';

    // Base Cost
    if (settingsData.length > 0 && settingsData[0]['Base Cost Per Bottle']) {
        $('#setting-base-cost').val(settingsData[0]['Base Cost Per Bottle']);
    }

    let statesMap = {};
    settingsData.forEach((row, index) => {
        let state = row.Parameter ? row.Parameter.trim().toUpperCase() : "";
        if (state) {
            if (!statesMap[state]) statesMap[state] = [];
            row.actualRow = index + 2;
            statesMap[state].push(row);
        }
    });

    for (let state in statesMap) {
        html += `
        <div class="mb-3 p-2 bg-light border border-secondary border-opacity-25 rounded shadow-sm">
            <h6 class="fw-bold text-dark mb-2 pb-1 border-bottom border-secondary border-opacity-25" style="font-size: 13px;">
                <i class="fas fa-map-marker-alt text-danger me-1"></i> ${state}
            </h6>`;

        let providersList = statesMap[state];
        let showRadio = providersList.length > 1;

        providersList.forEach(row => {
            let provider = row.Provider || "Standard";
            let defVal = String(row['Default'] || row['Col_6'] || row[''] || '').toLowerCase().trim();
            let isDefault = (defVal === 'default' || defVal === 'yes' || defVal === 'true');

            let radioId = `radio-${row.actualRow}`;
            let radioName = `def-${state.replace(/\s+/g, '')}`;

            let providerUIPart = '';

            if (showRadio) {
                providerUIPart = `
                    <div class="form-check m-0">
                        <input class="form-check-input border-primary" type="radio" name="${radioName}" id="${radioId}" ${isDefault ? 'checked' : ''} onchange="setDefaultCourier('${state}', ${row.actualRow})">
                        <label class="form-check-label fw-bold ${isDefault ? 'text-primary' : 'text-dark'}" for="${radioId}" style="font-size: 12px; cursor:pointer;">
                            ${provider} ${isDefault ? '<span class="badge bg-primary ms-1" style="font-size:8px;">DEFAULT</span>' : ''}
                        </label>
                    </div>`;
            } else {
                providerUIPart = `
                    <div class="m-0 fw-bold text-primary" style="font-size: 12px;">
                        <i class="fas fa-truck text-secondary me-1"></i> ${provider} 
                        <span class="badge bg-secondary bg-opacity-25 text-secondary ms-1" style="font-size:8px;">DEFAULT</span>
                    </div>`;
            }

            html += `
            <div class="mb-2 p-2 border ${(isDefault || !showRadio) ? 'border-primary shadow-sm' : 'border-secondary border-opacity-25'} rounded bg-white">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    ${providerUIPart}
                    <span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25" style="font-size: 8px;">Row: ${row.actualRow}</span>
                </div>
                
                <div class="input-group input-group-sm mb-1 mt-2">
                    <span class="input-group-text bg-light text-muted" style="font-size: 10px; padding: 0 5px;">Rates</span>
                    <input type="text" id="courier-rate-${row.actualRow}" class="form-control fw-bold text-dark" style="font-size: 11px;" value="${row['Base Rate String'] || ''}">
                </div>
                <div class="input-group input-group-sm">
                    <span class="input-group-text bg-light text-muted" style="font-size: 10px; padding: 0 5px;">Margin ₹</span>
                    <input type="text" id="courier-margin-${row.actualRow}" class="form-control fw-bold text-danger" style="font-size: 11px;" value="${row['Service Charge'] || 0}">
                    <button class="btn btn-outline-danger py-0 px-3 fw-bold" style="font-size: 10px;" onclick="updateCourierRate(${row.actualRow}, '${state}')">SAVE</button>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if (html === '') html = '<div class="text-muted p-2 small text-center">No courier regions found.</div>';

    html += `
    <div class="mt-4 pt-3 border-top border-secondary border-opacity-25">
        <h6 class="fw-bold text-dark mb-2" style="font-size: 12px;">
            <i class="fas fa-plus-circle text-success me-1"></i> Add New Courier Region
        </h6>
        <div class="p-2 bg-white border border-success border-opacity-50 rounded-3 shadow-sm">
            <div class="row g-2 mb-2">
                <div class="col-6">
                    <input type="text" id="new-state" class="form-control form-control-sm border-secondary border-opacity-25 fw-bold" style="font-size:11px;" placeholder="State (e.g. GOA)">
                </div>
                <div class="col-6">
                    <input type="text" id="new-provider" class="form-control form-control-sm border-secondary border-opacity-25 fw-bold" style="font-size:11px;" placeholder="Provider (e.g. DTDC)">
                </div>
            </div>
            <div class="row g-2 mb-2">
                <div class="col-6">
                    <input type="text" id="new-rates" class="form-control form-control-sm border-secondary border-opacity-25" style="font-size:11px;" placeholder="Rates (e.g. 1:80, 2:160)">
                </div>
                <div class="col-6">
                    <input type="text" id="new-margin" class="form-control form-control-sm border-secondary border-opacity-25" style="font-size:11px;" placeholder="Margin (e.g. 20 or 1:20, 2:30)">
                </div>
            </div>
            <button class="btn btn-sm btn-success w-100 fw-bold" style="font-size:11px; letter-spacing:0.5px;" onclick="addNewCourierRow()">+ SAVE NEW REGION</button>
        </div>
    </div>
    `;

    $('#courier-settings-container').html(html);
}
// 🔥 SET DEFAULT COURIER 
window.setDefaultCourier = function (state, rowNum) {
    showToast('info', 'Setting default...');

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'setDefaultCourier', state: state, row: rowNum })
    })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                showToast('success', 'Default courier updated!');
                loadCourierSettings();
            } else {
                showToast('error', 'Failed to update default');
            }
        })
        .catch(err => {
            showToast('error', 'Network issue');
        });
}

// 🔥 UPDATE BASE COST
window.updateBaseCost = function () {
    let newCost = $('#setting-base-cost').val();
    if (!newCost || isNaN(newCost) || newCost <= 0) return showToast('error', 'Enter valid amount.');
    if (!confirm(`Change Base Bottle Cost to ₹${newCost}? (Affects NEW orders only)`)) return;
    saveSettingToServer('Base Cost', 2, 'K', newCost);
}

// 🔥 UPDATE COURIER RATE
window.updateCourierRate = function (rowNumber, stateName) {
    let newRates = $(`#courier-rate-${rowNumber}`).val();
    let newMargin = $(`#courier-margin-${rowNumber}`).val();
    if (!confirm(`Update rates for ${stateName}?\n\nRates: ${newRates}\nMargin: ₹${newMargin}`)) return;

    saveSettingToServer(`Rates for ${stateName}`, rowNumber, 'D', newRates);
    setTimeout(() => { saveSettingToServer(`Margin for ${stateName}`, rowNumber, 'F', newMargin); }, 1500);
}

// 🔥 ADD NEW COURIER
window.addNewCourierRow = function () {
    let state = $('#new-state').val().trim().toUpperCase();
    let provider = $('#new-provider').val().trim();
    let rates = $('#new-rates').val().trim();
    let margin = $('#new-margin').val().trim();

    if (!state || !provider || !rates) return showToast('error', 'Missing Information!');
    if (!confirm(`Add new courier rate for ${state} (${provider})?`)) return;

    showToast('info', 'Adding new region...');
    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addCourierRow', state: state, provider: provider, rates: rates, margin: margin || 0 })
    })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                showToast('success', 'New courier added!');
                loadCourierSettings();
            }
        });
}

// 🔥 SAVE AJAX HELPER
function saveSettingToServer(settingName, row, col, val) {
    showToast('info', 'Updating...');
    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateSettingCell', row: row, col: col, value: val })
    })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') showToast('success', `${settingName} updated!`);
        });
}

// 🔥 SMART CATEGORY FIX & PARTNER UI RESTORE (Old Beautiful UI)
$(document).ready(function () {
    $(document).on('change', '#exp-category', function () {
        let cat = $(this).val();
        let vendorEl = $('#exp-vendor');

        // നമ്മൾ ഡ്രോപ്പ്ഡൗൺ ആക്കിയതൊക്കെ മാറ്റി വീണ്ടും ഇൻപുട്ട് ബോക്സ് ആക്കുന്നു
        if (vendorEl.is('select')) {
            let inputHtml = `<input type="text" id="exp-vendor" class="form-control mb-2" placeholder="Vendor / Shop Name" style="border: 2px solid #ced4da !important; border-radius: 8px; padding: 10px; background-color: #f8f9fa;">`;
            vendorEl.replaceWith(inputHtml);
            vendorEl = $('#exp-vendor');
        }

        if (cat === 'Salary') {
            // Salary ആണെങ്കിൽ മലയാളത്തിലുള്ള ആ പഴയ UI (Partner Cards) താഴേക്ക് വരുന്നു
            $('#partner-section').slideDown();
            vendorEl.prop('readonly', true).val('').attr('placeholder', 'Select Partner above 👆');

            // കാർഡുകൾ റെൻഡർ ചെയ്യാൻ ഫംഗ്ഷൻ വിളിക്കുന്നു
            if (typeof renderPartnerList === 'function') {
                renderPartnerList();
            }
        } else {
            // മറ്റ് ചിലവുകൾ ആണെങ്കിൽ അത് ഹൈഡ് ചെയ്യുന്നു
            $('#partner-section').slideUp();
            vendorEl.prop('readonly', false).val('').attr('placeholder', 'Vendor Name / Person');
            $('.partner-card').removeClass('selected');
            $('.partner-card .check-icon').attr('class', 'far fa-circle text-muted check-icon');
            $('#exp-amount').val(''); // 🔥 NEW: Amount Blank ആക്കുന്നു!
        }
    });

    // പുതിയ Expense ആഡ് ചെയ്യാൻ പ്ലസ് (+) ബട്ടൺ അല്ലെങ്കിൽ Expense ടാബ് അമർത്തുമ്പോൾ
    $('[data-bs-target="#expenseModal"], #tab-expense, [data-bs-target="#pills-expense"]').on('click', function () {
        setTimeout(() => {
            $('#exp-category').val('Materials').trigger('change');
            $('#partner-section').hide();
            $('#exp-vendor').prop('readonly', false).val('').attr('placeholder', 'Vendor Name / Person');
            $('#exp-amount').val(''); // 🔥 NEW: Amount Blank ആക്കുന്നു!

            // 🔥 FIX: ഫോം എപ്പോൾ തുറന്നാലും ആ സെക്കൻഡിലെ തീയതിയും സമയവും തനിയെ അപ്ഡേറ്റ് ആവാൻ!
            if (typeof expDatePicker !== 'undefined' && expDatePicker) {
                expDatePicker.setDate(new Date(), false);
            }
        }, 100);
    });
});


// 🔥 SYNC DATA TO GOOGLE SHEET 🔥
window.syncMonthToSheet = function () {
    let btn = $('#sync-month-btn');
    btn.html('<i class="fas fa-spinner fa-spin"></i> Saving...').prop('disabled', true);

    let liveProfit = window.currentLiveProfit || 0;

    let payload = {
        action: 'saveMonthReport',
        month: window.currentMonthStr,
        income: window.currentIncome || 0,
        productCost: window.currentProductCost || 0,
        courier: window.currentCourier || 0,
        other: window.currentOther || 0,
        netProfit: liveProfit,
        salam: Math.floor(liveProfit * 0.20),
        samad: Math.floor(liveProfit * 0.70),
        jazeela: Math.floor(liveProfit * 0.10),
        material: window.currentMaterial || 0
    };

    // AJAX post ന് പകരം JSON ആയി ഫെച്ച് ചെയ്യുന്നു
    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify(payload)
    }).then(res => res.json()).then(response => {
        btn.html('<i class="fas fa-check"></i> Saved!').removeClass('btn-outline-primary').addClass('btn-success text-white');
        setTimeout(() => {
            btn.html(`<i class="fas fa-cloud-upload-alt me-1"></i>Save ${window.currentMonthStr} Data`).removeClass('btn-success text-white').addClass('btn-outline-primary').prop('disabled', false);
        }, 3000);
    }).catch(error => {
        btn.html('<i class="fas fa-check"></i> Saved!').removeClass('btn-outline-primary').addClass('btn-success text-white');
        setTimeout(() => {
            btn.html(`<i class="fas fa-cloud-upload-alt me-1"></i>Save ${window.currentMonthStr} Data`).removeClass('btn-success text-white').addClass('btn-outline-primary').prop('disabled', false);
        }, 3000);
    });
};

// 🔥 FIX 1: Dynamic Rate Parser
function parseDynamicRate(rateString, qty) {
    if (!rateString) return 0;
    if (!isNaN(rateString)) return parseFloat(rateString); // വെറും നമ്പർ ആണെങ്കിൽ

    let rates = String(rateString).split(',');
    let matchedRate = 0;
    for (let i = 0; i < rates.length; i++) {
        let parts = rates[i].split(':');
        if (parts.length === 2) {
            let q = parseInt(parts[0].trim());
            let r = parseFloat(parts[1].trim());
            if (q === qty) return r;
            if (q < qty) matchedRate = r;
        }
    }
    return matchedRate;
}

// ==========================================
// 🔥 ADMIN LEFT DRAWER & LABEL PRINTING
// ==========================================

function injectLeftDrawer() {
    if ($('#left-drawer').length) return;

    let savedMrp = localStorage.getItem('label_mrp') || '750';
    let savedBatch = localStorage.getItem('label_batch') || 'HN25PTT02';

    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yy = String(today.getFullYear()).slice(-2);
    let defaultDate = `${dd} / ${mm} / ${yy}`;

    let drawerHtml = `
    <div id="left-drawer-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2050;" onclick="toggleLeftDrawer()"></div>
    
    <div id="left-drawer" style="position:fixed; top:0; left:-100%; width:100%; max-width:450px; height:100%; background:#f8fafc; z-index:2060; transition:left 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 2px 0 30px rgba(0,0,0,0.1); overflow:hidden; display:flex; flex-direction:column;">
        
        <div class="p-3 text-white d-flex justify-content-between align-items-center" style="background: linear-gradient(135deg, #1e293b, #0f172a);">
            <h6 class="m-0 fw-bold" style="letter-spacing:1px; font-size:14px;"><i class="fas fa-tools me-2 text-warning"></i> ADMIN TOOLS</h6>
            <i class="fas fa-times fs-5" style="cursor:pointer; opacity:0.8;" onclick="toggleLeftDrawer()"></i>
        </div>
        
        <ul class="nav nav-pills p-2 shadow-sm mx-2 mt-2" id="drawer-tabs" role="tablist" style="background:#e2e8f0; gap:5px;">
            <li class="nav-item flex-grow-1 text-center" role="presentation">
                <button class="nav-link active w-100 fw-bold rounded p-2 text-dark" style="font-size:12px;" data-bs-toggle="pill" data-bs-target="#drawer-design" type="button" role="tab"><i class="fas fa-print text-primary me-1"></i> Label</button>
            </li>
            <li class="nav-item flex-grow-1 text-center" role="presentation">
                <button class="nav-link w-100 fw-bold rounded p-2 text-dark" style="font-size:12px;" data-bs-toggle="pill" data-bs-target="#drawer-docs" type="button" role="tab"><i class="fas fa-folder-open text-warning me-1"></i> Docs</button>
            </li>
            <li class="nav-item flex-grow-1 text-center" role="presentation" id="tab-btn-settings">
                <button class="nav-link w-100 fw-bold rounded p-2 text-dark" style="font-size:12px;" data-bs-toggle="pill" data-bs-target="#drawer-settings" type="button" role="tab"><i class="fas fa-cog text-secondary me-1"></i> Setup</button>
            </li>
        </ul>

        <div class="tab-content flex-grow-1 p-3 overflow-auto" id="drawer-tabContent">
            
            <div class="tab-pane fade show active h-100" id="drawer-design" role="tabpanel">
                <h6 class="fw-bold text-dark mb-2" style="font-size:12px; letter-spacing:0.5px;">LIVE PREVIEW</h6>
                <div id="label-preview-box" class="shadow-sm mb-4 mx-auto" style="width: 100%; max-width: 350px; aspect-ratio: 210/59.4; position: relative; background: url('label_design.jpg') center/cover; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                    <div style="position: absolute; top: 17%; left: 82%; font-size: 8px; font-weight: 800; color: #000; line-height: 1.8;">
                        <div id="prev-mrp">${savedMrp} . 00</div>
                        <div id="prev-batch">${savedBatch}</div>
                        <div id="prev-date">${defaultDate}</div>
                    </div>
                </div>

                <div class="bg-white p-3 rounded-4 border border-secondary border-opacity-10 shadow-sm mx-auto" style="max-width: 350px;">
                    <label class="small fw-bold text-muted mb-1" style="font-size:11px;">MRP (₹)</label>
                    <input type="text" id="label-mrp" class="form-control mb-2 fw-bold border-secondary border-opacity-25" value="${savedMrp}" oninput="updateLabelPreview()">
                    
                    <label class="small fw-bold text-muted mb-1" style="font-size:11px;">BATCH NO.</label>
                    <input type="text" id="label-batch" class="form-control mb-2 fw-bold border-secondary border-opacity-25 text-uppercase" value="${savedBatch}" oninput="updateLabelPreview()">
                    
                    <label class="small fw-bold text-muted mb-1" style="font-size:11px;">DATE OF PKG</label>
                    <div class="input-group mb-4">
                        <span class="input-group-text bg-light text-primary border-secondary border-opacity-25"><i class="fas fa-calendar-alt"></i></span>
                        <input type="text" id="label-date" class="form-control fw-bold border-secondary border-opacity-25 bg-white" value="${defaultDate}" readonly onchange="updateLabelPreview()">
                    </div>
                    
                    <button class="btn w-100 fw-bold shadow text-white" style="background:#1e293b; font-size:13px; padding: 12px 0; border-radius: 12px;" onclick="printProductLabels()">
                        <i class="fas fa-file-pdf me-1 text-warning"></i> PRINT LABELS (A4)
                    </button>
                </div>
            </div>
            
            <div class="tab-pane fade h-100 flex-column justify-content-center" id="drawer-docs" role="tabpanel">
                <div class="text-center p-4 border border-dashed border-secondary border-opacity-25 rounded-4 bg-light text-muted small shadow-sm mx-auto" style="max-width: 350px;">
                    <i class="fas fa-cloud-upload-alt mb-3 text-primary opacity-50" style="font-size:40px;"></i><br>
                    <span style="font-weight:800; font-size:13px; color:#333;">Document Vault</span><br>
                    <span style="font-size:11px; line-height:1.5; display:inline-block; margin-top:5px;">Upload and store your company GST, FSSAI & other records directly to Google Drive.</span>
                    <button class="btn btn-outline-primary btn-sm rounded-pill mt-3 px-4 fw-bold" disabled>Coming Soon</button>
                </div>
            </div>
            
            <div class="tab-pane fade h-100" id="drawer-settings" role="tabpanel">
                <div class="bg-white p-4 rounded-4 border border-secondary border-opacity-10 shadow-sm text-center mx-auto mt-3" style="max-width: 350px;">
                    <div class="mb-3">
                        <div class="rounded-circle bg-secondary bg-opacity-10 d-inline-flex align-items-center justify-content-center" style="width:60px; height:60px;">
                            <i class="fas fa-truck text-secondary fs-3"></i>
                        </div>
                    </div>
                    <h6 class="fw-bold text-dark mb-2" style="font-size:14px;">Courier Settings</h6>
                    <p class="text-muted mb-4" style="font-size:11px;">Manage delivery partners, state zones, base cost and margin rates.</p>
                    
                    <button class="btn btn-dark w-100 fw-bold rounded-pill shadow-sm py-2" onclick="openSettingsModal();">
                        <i class="fas fa-sliders-h me-1 text-warning"></i> Open Settings
                    </button>
                </div>
            </div>
            
        </div>
    </div>
    
    <style>
        .flatpickr-calendar { z-index: 3000 !important; }
        #drawer-tabs .nav-link.active { background: #fff !important; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        #settingsModal { z-index: 10000 !important; }
        .modal-backdrop { z-index: 1000 !important; }
    </style>
    `;

    $('body').append(drawerHtml);

    // മാസ്റ്റർ അല്ലെങ്കിൽ Settings ടാബ് ഹൈഡ് ചെയ്യാൻ
    if (localStorage.getItem('kafakAdminUser') !== 'master') {
        $('#tab-btn-settings').hide();
    }

    if (typeof flatpickr !== 'undefined') {
        flatpickr("#label-date", {
            dateFormat: "d / m / y",
            defaultDate: today,
            disableMobile: true
        });
    }
}

// ഡ്രോയർ തുറക്കാനും അടയ്ക്കാനും (Width അപ്ഡേറ്റ് ചെയ്തതുകൊണ്ട് മാറ്റങ്ങൾ വരുത്തിയിട്ടുണ്ട്)
window.toggleLeftDrawer = function () {
    let drawer = $('#left-drawer');
    let overlay = $('#left-drawer-overlay');

    if (drawer.hasClass('open')) {
        drawer.removeClass('open').css('left', '-100%');
        overlay.fadeOut(200);
    } else {
        drawer.addClass('open').css('left', '0px');
        overlay.fadeIn(200);
    }
}

window.updateLabelPreview = function () {
    let mrp = $('#label-mrp').val();
    let batch = $('#label-batch').val().toUpperCase();
    let date = $('#label-date').val();

    $('#prev-mrp').text(`${mrp} . 00`);
    $('#prev-batch').text(batch);
    $('#prev-date').text(date);

    localStorage.setItem('label_mrp', mrp);
    localStorage.setItem('label_batch', batch);
}

window.toggleLeftDrawer = function () {
    let drawer = $('#left-drawer');
    let overlay = $('#left-drawer-overlay');
    if (drawer.css('left') === '0px') {
        drawer.css('left', '-420px');
        overlay.fadeOut(200);
    } else {
        drawer.css('left', '0px');
        overlay.fadeIn(200);
    }
}

window.printProductLabels = function () {
    let mrp = $('#label-mrp').val();
    let batch = $('#label-batch').val().toUpperCase();
    let date = $('#label-date').val();

    if (!mrp || !batch || !date) {
        showToast('error', 'Please fill all fields');
        return;
    }

    // 🔥 മാറ്റം 1: വിൻഡോയ്ക്ക് ഒരു പുതിയ പേര് കൊടുത്തു (Cache ഒഴിവാക്കാൻ)
    let printWin = window.open('', 'LabelPrintWindow', 'width=800,height=900');

    let html = `<html><head><title>KAFAK Product Labels</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
        /* 🔥 പ്രിന്റ് ചെയ്യുമ്പോൾ പേപ്പറിന് ഒട്ടും മാർജിൻ ഉണ്ടാകാതിരിക്കാൻ */
        @media print {
            @page { 
                size: 210mm 297mm; 
                margin: 0 !important; 
                padding: 0 !important; 
            }
            html, body {
                width: 210mm;
                height: 297mm;
                margin: 0 !important;
                padding: 0 !important;
            }
        }
        
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box !important;
        }

        body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            overflow: hidden; /* 🔥 എക്സ്ട്രാ സ്ക്രോൾ ബാർ വന്ന് സൈസ് കുറയാതിരിക്കാൻ */
        }
        
        .label-container {
            width: 210mm;
            height: 59.4mm; /* 🔥 297mm / 5 = കൃത്യം 59.4mm (ഒരു മില്ലിമീറ്റർ പോലും ഗ്യാപ്പ് വരില്ല) */
            position: relative;
            overflow: hidden;
            display: block;
            border: none; /* 🔥 പഴയ dashed ലൈൻ ഒഴിവാക്കി (അത് ചിലപ്പോൾ എക്സ്ട്രാ സ്പേസ് എടുക്കും) */
        }
        
        .label-bg {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            top: 0; left: 0; z-index: 1;
            image-rendering: -webkit-optimize-contrast; 
            image-rendering: high-quality;
        }
        
        .text-overlay {
            position: absolute;
            top: 10.5mm; 
            left: 174mm; 
            z-index: 10;
            font-size: 10px; 
            color: #000;
            line-height: 1.2; 
            letter-spacing: 0.5px;
            font-family: 'Montserrat', sans-serif !important;
            font-weight: 700;
        }
    </style>
    </head><body>`;

    for (let i = 0; i < 5; i++) {
        html += `
        <div class="label-container">
            <img src="label_design.jpg" class="label-bg" />
            <div class="text-overlay">
                <div>${mrp} . 00</div>
                <div>${batch}</div>
                <div>${date}</div>
            </div>
        </div>`;
    }

    html += `</body></html>`;

    printWin.document.write(html);
    printWin.document.close();

    setTimeout(() => {
        printWin.focus();
        printWin.print();
    }, 1000);
}

// 🔥 RESEND ORDER LOGIC (Message column & Expense Description updated with Dates - Return Free)
window.handleResendOrder = function (oid, index) {
    let order = allOrders[index];
    if (!order) return;

    confirmAction(`Ee order Return vannathano? Veendum ayakkan (Resend) mattano?`, () => {

        let oldTracking = order.tracking || 'No Tracking';
        let oldProvider = order.provider || order.Courier_Provider || 'Courier';

        // 🔥 Dispatched Date-um Delivered Date-um edukkunnu
        let dispDateStr = order['Dispatched Date'] ? new Date(order['Dispatched Date']).toLocaleDateString('en-GB') : '';
        let delDateStr = order['Delivered Date'] ? new Date(order['Delivered Date']).toLocaleDateString('en-GB') : '';

        // Randu date-um undenkil cherthu oru string aakkunnu
        let dateInfo = dispDateStr ? `Disp: ${dispDateStr}` : '';
        if (delDateStr) dateInfo += ` | Del: ${delDateStr}`;
        if (!dateInfo) dateInfo = 'Unknown Date';

        if (typeof openDashboard === 'function') openDashboard();

        let tabTrigger = new bootstrap.Tab(document.querySelector('#tab-expense'));
        tabTrigger.show();

        setTimeout(() => {
            $('#exp-category').val('Courier');
            $('#exp-vendor').val(oldProvider);

            // 🔥 മാറ്റം വരുത്തിയ ഭാഗം: Return Charge ഫ്രീ ആയതുകൊണ്ട് ഡിഫോൾട്ട് ആയി 0 കൊടുത്തു!
            $('#exp-amount').val(0);

            // 🔥 Expense Description-il dates koodi auto-fill cheyyunnu
            $('#exp-desc').val(`Return Loss | Ord: ${order.orderid.slice(-5)} | Trk: ${oldTracking} | ${dateInfo}`);

            $('#expense-form').css('border', '2px solid #f59e0b').css('padding', '10px').css('border-radius', '15px');

            // 🔥 Message column-lekk povulla text (Dates ulppede)
            let historyString = `[Old Courier: ${oldProvider} - ${oldTracking} (${dateInfo})]`;

            // Local datayilum thalkshanam kanikkan
            order.message = order.message ? order.message + " \n" + historyString : historyString;

            // Pazhaya datukal local memory-il ninnum maaykkunnu
            order['Dispatched Date'] = '';
            order['Delivered Date'] = '';

            updateAdminMeta(oid, 'resend', '');

            // updateOrder vazhi message sheet-lekk ayakkunnu
            updateOrder(oid, 'Paid', '', true, '', historyString);

            showToast('info', 'Return Marked! Tracking & Dates saved 📦');
        }, 500);
    });
}

// 🔥 മാർജിൻ ഇല്ലാതെ യഥാർത്ഥ കൊറിയർ ചിലവ് (Base Rate) മാത്രം കണ്ടുപിടിക്കാൻ
function getBaseCourierRate(state, provider, qty) {
    let s = String(state || '').toUpperCase().trim();
    let p = String(provider || '').toUpperCase().trim();
    let q = parseInt(qty) || 1;

    let courierBase = 0;

    if (typeof courierRates !== 'undefined') {
        // 🔥 FIX: Underscore മാറ്റി Space ആക്കി
        let zoneData = courierRates[`${s} ${p}`] || courierRates[`${s} DEFAULT`] || courierRates[s] || courierRates['REST OF INDIA'];

        if (zoneData && typeof zoneData === 'object' && zoneData.baseRate !== undefined) {
            courierBase = window.parseDynamicRate(zoneData.baseRate, q);
        } else if (zoneData && zoneData[q] !== undefined) {
            courierBase = Number(zoneData[q]);
        }
    }

    // ഷീറ്റിൽ നിന്നും കിട്ടിയില്ലെങ്കിൽ, ടോട്ടൽ തുകയിൽ നിന്നും ഒരു ഡീഫോൾട്ട് മാർജിൻ കുറയ്ക്കുന്നു
    if (courierBase === 0) {
        let total = getCourierRate(state, provider, qty);
        courierBase = total > 20 ? total - 20 : total;
    }

    return courierBase;
}

window.jumpToCurrentMonth = function () {
    selectedDate = new Date();
    changeDashDate();
};



// ടാബ് മാറ്റാൻ
window.toggleOfflineForm = function () {
    let type = document.querySelector('input[name="saleType"]:checked').value;
    if (type === 'offline') {
        document.getElementById('form-offline').style.display = 'block';
        document.getElementById('form-partner').style.display = 'none';
        calcOfflineTotal();
    } else {
        document.getElementById('form-offline').style.display = 'none';
        document.getElementById('form-partner').style.display = 'block';
        calcPartnerTotal();
    }
}

// ഡ്രോപ്പ്ഡൗൺ മാറ്റുമ്പോൾ വില ഓട്ടോമാറ്റിക് ആയി വരാൻ
window.updateOfflineFields = function () {
    let opt = document.getElementById('off-item').options[document.getElementById('off-item').selectedIndex];
    document.getElementById('off-price').value = opt.getAttribute('data-price');
    document.getElementById('off-cost').value = opt.getAttribute('data-cost');
    calcOfflineTotal();
}

// ലോക്കൽ സെയിൽ കാൽക്കുലേഷൻ
window.calcOfflineTotal = function () {
    let price = parseInt(document.getElementById('off-price').value) || 0;
    let cost = parseInt(document.getElementById('off-cost').value) || 0;
    let qty = parseInt(document.getElementById('off-qty').value) || 1;

    let tot = price * qty;
    let prof = tot - (cost * qty);

    document.getElementById('final-total').innerText = tot.toLocaleString();
    document.getElementById('profit-display').innerText = `Profit Margin: ₹${prof.toLocaleString()}`;
}

// പാർട്ണർ സെയിൽ കാൽക്കുലേഷൻ
window.calcPartnerTotal = function () {
    let grams = parseFloat(document.getElementById('part-grams').value) || 0;
    let rate = parseFloat(document.getElementById('part-rate').value) || 0;
    let margin = parseFloat(document.getElementById('part-margin').value) || 0;

    let sp = rate + margin;
    document.getElementById('part-sp').innerText = sp;

    let kg = grams / 1000;
    let tot = Math.round(kg * sp);
    let prof = Math.round(kg * margin);

    document.getElementById('final-total').innerText = tot.toLocaleString();
    document.getElementById('profit-display').innerText = `Company Profit: ₹${prof.toLocaleString()}`;
}

// ഡാറ്റാബേസിലേക്ക് സേവ് ചെയ്യാൻ
function submitDirectSale(data) {
    Swal.fire({ title: 'Adding to Accounts...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'submitOffline', data: data })
    })
        .then(res => res.json())
        .then(res => {
            if (res.result === 'success') {
                Swal.fire('Saved!', 'Amount added to company accounts.', 'success');
                fetchOrders(true); // സ്ക്രീൻ റിഫ്രഷ് ചെയ്യുന്നു
            } else {
                Swal.fire('Error', 'Failed to save', 'error');
            }
        });
}



// 🔥 DELETE OFFLINE SALE
window.deleteOfflineSale = function (oid) {
    confirmAction("Are you sure you want to delete this sale completely?", () => {
        Swal.fire({ title: 'Deleting...', didOpen: () => Swal.showLoading() });
        fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteOrder', oid: oid })
        }).then(res => res.json()).then(res => {
            if (res.result === 'success') {
                Swal.fire('Deleted!', 'The entry has been removed.', 'success');
                fetchOrders(true); // ഫുൾ ഡാറ്റ റീഫ്രഷ് ചെയ്യുന്നു
            } else {
                Swal.fire('Error', 'Failed to delete', 'error');
            }
        });
    });
}


//---------------new

// 🔥 1. UNIFIED CREATE & EDIT WINDOW FOR DIRECT SALES (With Clear Delete Indication)
window.showOfflineSaleModal = function (editOid = null) {
    let o = null;
    if (editOid) o = allOrders.find(x => x.orderid === editOid);

    let isPartner = o ? (o.house === 'Partner Bulk') : false;
    let isMasterUser = localStorage.getItem('kafakAdminUser') === 'master';

    let savedRate = (typeof courierRates !== 'undefined' && courierRates.partnerRate) ? courierRates.partnerRate : 170;
    let savedMargin = (typeof courierRates !== 'undefined' && courierRates.partnerMargin) ? courierRates.partnerMargin : 50;

    let offName = o ? (o.name === 'Walk-in Customer' ? '' : o.name) : '';
    let offQty = o ? o.quantity : 1;
    let offPrice = 650, offCost = 330;
    if (o && !isPartner) {
        offPrice = Math.round((o.grandTotal || o.Grand_Total) / offQty);
        offCost = Math.round(o.Product_Base_Cost / offQty);
    }

    let partName = o && isPartner ? o.name.replace('Partner:', '').trim() : 'Salam';
    let partGrams = '';
    let partRate = savedRate;
    let partMargin = savedMargin;
    if (o && isPartner && o.message) {
        let match = o.message.match(/(\d+)gm/);
        if (match) partGrams = match[1];
        let rMatch = o.message.match(/₹(\d+)\+(\d+)/);
        if (rMatch) { partRate = parseInt(rMatch[1]); partMargin = parseInt(rMatch[2]); }
    }

    // 🔥 NEW: Clear Visual Indication for Receipt Removal
    let receiptUI = '';
    if (o && o.receipt && String(o.receipt).trim() !== '') {
        receiptUI = `
            <div id="existing-receipt-box" class="mb-2 p-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded d-flex justify-content-between align-items-center">
                <a href="${o.receipt}" target="_blank" class="fw-bold text-success text-decoration-none" style="font-size:11px;"><i class="fas fa-image"></i> View Current Receipt</a>
                <button type="button" class="btn btn-sm btn-danger py-0 px-2 shadow-sm" onclick="$('#existing-receipt-box').fadeOut(200, function(){$('#receipt-removed-msg').fadeIn(200);}); $('#remove-receipt-flag').val('true');"><i class="fas fa-trash"></i> Remove</button>
            </div>
            <div id="receipt-removed-msg" class="mb-2 p-2 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded text-danger fw-bold shadow-sm" style="display:none; font-size:11px;">
                <i class="fas fa-exclamation-circle me-1"></i> Receipt marked for deletion! (Update to save)
            </div>
            <input type="hidden" id="remove-receipt-flag" value="false">
        `;
    } else {
        receiptUI = `<input type="hidden" id="remove-receipt-flag" value="false">`;
    }

    let deleteBtn = (editOid && isMasterUser) ? `<hr class="border-secondary border-opacity-25"><button type="button" class="btn btn-outline-danger w-100 mt-2 fw-bold shadow-sm py-2" style="border-radius:12px; font-size:13px;" onclick="deleteOfflineSale('${editOid}')"><i class="fas fa-trash-alt"></i> DELETE ENTRY</button>` : '';

    let html = `
    <div style="text-align:left; font-size:13px;">
        <div class="d-flex justify-content-center mb-3 gap-2">
            <input type="radio" class="btn-check" name="saleType" id="sale-offline" value="offline" autocomplete="off" ${!isPartner ? 'checked' : ''} onchange="toggleOfflineForm()">
            <label class="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold" for="sale-offline">🛍️ Local Sale</label>

            <input type="radio" class="btn-check" name="saleType" id="sale-partner" value="partner" autocomplete="off" ${isPartner ? 'checked' : ''} onchange="toggleOfflineForm()">
            <label class="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold" for="sale-partner">🤝 Partner Bulk</label>
        </div>

        <div id="form-offline" style="display:${!isPartner ? 'block' : 'none'};">
            <label class="fw-bold mb-1 small text-muted">Customer Name (Optional)</label>
            <input type="text" id="off-name" class="form-control mb-2 fw-bold border-secondary border-opacity-25" value="${offName}" placeholder="Walk-in Customer">
            
            <label class="fw-bold mb-1 small text-muted">Select Item</label>
            <select id="off-item" class="form-select mb-2 fw-bold border-secondary border-opacity-25" onchange="updateOfflineFields()">
                <option value="650g Bottle" data-price="650" data-cost="330">🍯 650g Bottle</option>
                <option value="500g Bottle" data-price="500" data-cost="250">🍯 500g Bottle</option>
                <option value="300g Bottle" data-price="300" data-cost="150">🍯 300g Bottle</option>
                <option value="1Kg Bottle" data-price="1000" data-cost="500">🍯 1Kg Bottle</option>
                <option value="Custom Item" data-price="0" data-cost="0">✏️ Custom Item...</option>
            </select>
            
            <div class="row g-2 mb-2">
                <div class="col-6">
                    <label class="fw-bold mb-1 small text-muted">Selling Price (₹)</label>
                    <input type="number" id="off-price" class="form-control fw-bold border-secondary border-opacity-25 text-primary" value="${offPrice}" oninput="calcOfflineTotal()">
                </div>
                <div class="col-6">
                    <label class="fw-bold mb-1 small text-muted">Base Cost (₹)</label>
                    <input type="number" id="off-cost" class="form-control fw-bold border-secondary border-opacity-25 text-danger" value="${offCost}" oninput="calcOfflineTotal()">
                </div>
            </div>
            
            <label class="fw-bold mb-1 small text-muted">Quantity (No of Bottles)</label>
            <input type="number" id="off-qty" class="form-control mb-3 fw-bold border-secondary border-opacity-25" value="${offQty}" min="1" oninput="calcOfflineTotal()">
        </div>

        <div id="form-partner" style="display:${isPartner ? 'block' : 'none'};">
            <label class="fw-bold mb-1 small text-muted">Select Partner</label>
            <select id="part-name" class="form-select mb-2 fw-bold border-secondary border-opacity-25">
                <option value="Salam" ${partName === 'Salam' ? 'selected' : ''}>Salam</option>
                <option value="Samad" ${partName === 'Samad' ? 'selected' : ''}>Samad</option>
                <option value="Jazeela" ${partName === 'Jazeela' ? 'selected' : ''}>Jazeela</option>
            </select>

            <label class="fw-bold mb-1 small text-muted">Weight in Grams (eg: 1200, 8500)</label>
            <div class="input-group mb-2">
                <input type="number" id="part-grams" class="form-control fw-bold border-secondary border-opacity-25 fs-5" value="${partGrams}" placeholder="0" oninput="calcPartnerTotal()">
                <span class="input-group-text fw-bold text-muted border-secondary border-opacity-25 bg-light">gm</span>
            </div>

            <div class="row g-2 mb-2">
                <div class="col-6">
                    <label class="fw-bold mb-1 small text-muted">Cost/Kg (₹)</label>
                    <input type="number" id="part-rate" class="form-control fw-bold border-secondary border-opacity-25" value="${partRate}" oninput="calcPartnerTotal()">
                </div>
                <div class="col-6">
                    <label class="fw-bold mb-1 small text-muted">Margin/Kg (₹)</label>
                    <input type="number" id="part-margin" class="form-control fw-bold text-success border-secondary border-opacity-25" value="${partMargin}" oninput="calcPartnerTotal()">
                </div>
            </div>
            <div class="text-muted text-end fw-bold" style="font-size:10px;">Selling Price per Kg = ₹<span id="part-sp">${Number(partRate) + Number(partMargin)}</span></div>
        </div>

        <div class="mt-3 p-3 bg-light rounded-4 border text-center shadow-sm">
            <div class="small text-muted fw-bold text-uppercase mb-1" style="letter-spacing:1px;">Total Amount to Pay</div>
            <div class="fs-1 fw-bolder text-dark">₹<span id="final-total">0</span></div>
            <div class="text-success small fw-bold mt-1 mb-3" id="profit-display">Profit: ₹0</div>
            
            <div class="text-start border-top pt-2">
                ${receiptUI}
                <label class="fw-bold mb-1 small text-primary"><i class="fas fa-upload"></i> ${o && o.receipt ? 'Replace Receipt' : 'Upload Receipt'} (Optional)</label>
                <input type="file" id="offline-proof" class="form-control form-control-sm border-secondary border-opacity-25" accept="image/*">
            </div>
        </div>
        ${deleteBtn}
    </div>
    `;

    if (!$('#swal-zindex-fix').length) {
        $('<style id="swal-zindex-fix">').html('.swal2-container { z-index: 99999 !important; }').appendTo('head');
    }

    Swal.fire({
        title: editOid ? '✏️ Update Sale' : '🍯 Direct Sales',
        html: html,
        showCancelButton: true,
        confirmButtonText: editOid ? '<i class="fas fa-save"></i> UPDATE SALE' : '<i class="fas fa-check-circle"></i> ADD TO ACCOUNTS',
        confirmButtonColor: editOid ? '#2563eb' : '#198754',
        didOpen: () => {
            if (isPartner) calcPartnerTotal(); else calcOfflineTotal();
        },
        preConfirm: async () => {
            let type = document.querySelector('input[name="saleType"]:checked').value;
            let data = {};

            if (type === 'offline') {
                let itemName = document.getElementById('off-item').value;
                let price = parseInt(document.getElementById('off-price').value) || 0;
                let cost = parseInt(document.getElementById('off-cost').value) || 0;
                let qty = parseInt(document.getElementById('off-qty').value) || 1;
                if (itemName === 'Custom Item') itemName = 'Direct Item';

                data = {
                    type: 'Local Sale',
                    name: document.getElementById('off-name').value || 'Walk-in Customer',
                    desc: `${qty}x ${itemName} (₹${price}/ea)`,
                    quantity: qty,
                    total: price * qty,
                    baseCost: cost * qty
                };
            } else {
                let grams = parseFloat(document.getElementById('part-grams').value);
                if (!grams || grams <= 0) { Swal.showValidationMessage('Enter valid grams!'); return false; }
                let rate = parseFloat(document.getElementById('part-rate').value) || 0;
                let margin = parseFloat(document.getElementById('part-margin').value) || 0;

                let kg = grams / 1000;
                let base = Math.round(kg * rate);
                let tot = Math.round(kg * (rate + margin));

                data = {
                    type: 'Partner Bulk',
                    name: "Partner: " + document.getElementById('part-name').value,
                    desc: `${grams}gm Bulk Honey (₹${rate}+${margin}/kg)`,
                    quantity: 0,
                    total: tot,
                    baseCost: base
                };
            }

            let fileInput = document.getElementById('offline-proof');
            let fileData = null;
            let fileName = null;

            if (fileInput && fileInput.files.length > 0) {
                Swal.showLoading();
                try {
                    let compressed = await compressImage(fileInput.files[0]);
                    fileData = compressed.data;
                    fileName = compressed.name;
                } catch (err) {
                    Swal.showValidationMessage('Image compression failed!');
                    return false;
                }
            }

            data.fileData = fileData;
            data.fileName = fileName;
            data.editOid = editOid;
            data.removeReceipt = document.getElementById('remove-receipt-flag') ? document.getElementById('remove-receipt-flag').value === 'true' : false;

            return data;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            submitDirectSale(result.value);
        }
    });
}

// 🔥 2. UNIFIED CREATE & EDIT WINDOW FOR EXPENSES (With Clear Delete Indication)
window.showAddExpenseModal = function (editId = null) {
    let eObj = null;
    if (editId && dashboardData && dashboardData.monthTimeline) {
        eObj = dashboardData.monthTimeline.expense.find(x => x.id === editId);
    }

    let oldDate = eObj ? new Date(eObj.date) : new Date();
    let oldCat = eObj ? eObj.cat : 'Materials';
    let oldVendor = eObj ? eObj.vendor : '';
    let oldDesc = eObj ? eObj.desc : '';
    let oldAmount = eObj ? eObj.amount : '';
    let oldProof = eObj ? eObj.proof : '';

    let isMasterUser = localStorage.getItem('kafakAdminUser') === 'master';
    let editSalaryOption = isMasterUser ? `<option value="Salary" ${oldCat === 'Salary' ? 'selected' : ''}>👤 Salary Payment</option>` : '';

    // 🔥 NEW: Clear Visual Indication for Expense Receipt Removal
    let receiptUI = '';
    if (oldProof && String(oldProof).trim() !== '') {
        receiptUI = `
            <div id="existing-exp-receipt-box" class="mb-2 p-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded d-flex justify-content-between align-items-center">
                <a href="${oldProof}" target="_blank" class="fw-bold text-success text-decoration-none" style="font-size:11px;"><i class="fas fa-image"></i> View Current Receipt</a>
                <button type="button" class="btn btn-sm btn-danger py-0 px-2 shadow-sm" onclick="$('#existing-exp-receipt-box').fadeOut(200, function(){$('#exp-receipt-removed-msg').fadeIn(200);}); $('#remove-exp-receipt-flag').val('true');"><i class="fas fa-trash"></i> Remove</button>
            </div>
            <div id="exp-receipt-removed-msg" class="mb-2 p-2 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded text-danger fw-bold shadow-sm" style="display:none; font-size:11px;">
                <i class="fas fa-exclamation-circle me-1"></i> Receipt marked for deletion! (Update to save)
            </div>
            <input type="hidden" id="remove-exp-receipt-flag" value="false">
        `;
    } else {
        receiptUI = `<input type="hidden" id="remove-exp-receipt-flag" value="false">`;
    }

    let deleteBtnHtml = (editId && isMasterUser) ? `<hr class="border-secondary border-opacity-25 mt-4"><button type="button" class="btn btn-outline-danger w-100 fw-bold shadow-sm py-2" style="border-radius:12px; font-size:13px;" onclick="deleteExpenseItem('${editId}')"><i class="fas fa-trash-alt"></i> DELETE EXPENSE</button>` : '';

    if (!$('#swal-zindex-fix').length) {
        $('<style id="swal-zindex-fix">').html('.swal2-container { z-index: 99999 !important; } .flatpickr-calendar { z-index: 100000 !important; }').appendTo('head');
    }

    Swal.fire({
        title: editId ? '✏️ Edit Expense' : 'Add New Expense 🧾',
        html: `
            <div style="text-align:left; font-size:14px;">
                <label class="fw-bold" style="color:#2563eb;">📅 Date & Time</label>
                <div class="input-group mb-2">
                    <span class="input-group-text bg-white text-primary border-end-0"><i class="fas fa-calendar-alt"></i></span>
                    <input type="text" id="exp-date" class="form-control bg-white border-start-0 fw-bold" placeholder="Select Date & Time..." readonly>
                </div>

                <label class="fw-bold mt-2">📂 Category</label>
                <select id="exp-category" class="form-select mb-2" onchange="togglePartnerSelect()">
                    <option value="Material Purchase" ${oldCat.includes('Material') ? 'selected' : ''}>Material Purchase</option>
                    <option value="Packaging Material" ${oldCat.includes('Packaging') ? 'selected' : ''}>Packaging Material</option>
                    <option value="Marketing/Ads" ${oldCat.includes('Ads') || oldCat.includes('Marketing') ? 'selected' : ''}>Marketing / Ads</option>
                    <option value="Transport/Fuel" ${oldCat.includes('Travel') || oldCat.includes('Transport') ? 'selected' : ''}>Transport / Fuel</option>
                    ${editSalaryOption}
                    <option value="Office Expense" ${oldCat === 'Office Expense' ? 'selected' : ''}>Office Expense</option>
                    <option value="Refund" ${oldCat === 'Refund' ? 'selected' : ''}>Refund</option>
                    <option value="Other" ${oldCat === 'Other' ? 'selected' : ''}>Other</option>
                </select>

                <div id="partner-section" style="display:${oldCat === 'Salary' ? 'block' : 'none'}; background:#f0f9ff; padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid #bae6fd;">
                    <label class="fw-bold text-primary" style="font-size:11px;">SELECT PARTNER:</label>
                    <div id="partner-list" class="d-flex flex-column gap-2 mt-1"></div>
                </div>

                <label class="fw-bold">🏪 Vendor / Shop Name</label>
                <input type="text" id="exp-vendor" class="form-control mb-2" value="${oldVendor}" placeholder="Ex: Lulu Hypermarket">

                <label class="fw-bold">📝 Description</label>
                <textarea id="exp-desc" class="form-control mb-2" rows="2" placeholder="Details...">${oldDesc}</textarea>

                <label class="fw-bold">💰 Amount (₹)</label>
                <input type="number" id="exp-amount" class="form-control mb-2" value="${oldAmount}" placeholder="0.00">
                
                <div class="mt-3 p-3 bg-light rounded-4 border">
                    ${receiptUI}
                    <label class="fw-bold mb-1 small text-primary"><i class="fas fa-upload"></i> ${oldProof ? 'Replace Receipt' : 'Upload Proof'} (Optional)</label>
                    <input type="file" id="exp-proof" class="form-control form-control-sm border-secondary border-opacity-25" accept="image/*">
                </div>

                <button id="btn-save-exp" class="btn btn-primary w-100 mt-3 py-2 fw-bold shadow-sm" onclick="submitExpense(event, '${editId || ''}')" style="border-radius: 50px;">
                    <i class="fas fa-save"></i> ${editId ? 'UPDATE EXPENSE' : 'SAVE EXPENSE'}
                </button>
                ${deleteBtnHtml}
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
            if (typeof renderPartnerList === 'function') renderPartnerList();
            if (oldCat === 'Salary') setTimeout(() => { selectPartner(oldVendor); }, 500);

            flatpickr("#exp-date", {
                enableTime: true,
                dateFormat: "Y-m-d\\TH:i",
                altInput: true,
                altFormat: "F j, Y at h:i K",
                defaultDate: oldDate,
                time_24hr: false,
                disableMobile: true
            });
        }
    });
}


// 🔥 3. UNIFIED SUBMIT EXPENSE (Handles Create & Update)
async function submitExpense(e, editId = null) {
    e.preventDefault();
    let btn = $('#btn-save-exp');
    let originalText = btn.html();
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
            btn.prop('disabled', false).html(originalText);
            return;
        }
    }

    let selectedD = $('#exp-date').val() || flatpickr.formatDate(new Date(), "Y-m-d");

    let formData = {
        id: editId || ('EXP-' + Date.now()),
        date: selectedD,
        category: $('#exp-category').val(),
        vendor: $('#exp-vendor').val(),
        description: $('#exp-desc').val(),
        amount: $('#exp-amount').val(),
        fileData: fileData,
        fileName: fileName,
        editId: editId, // 🔥 അപ്ഡേറ്റ് ആണെന്ന് ബാക്കെൻഡ് തിരിച്ചറിയാൻ
        removeReceipt: document.getElementById('remove-exp-receipt-flag') ? document.getElementById('remove-exp-receipt-flag').value === 'true' : false
    };

    if (!navigator.onLine && !editId) {
        saveExpenseOffline(formData, selectedD);
        btn.prop('disabled', false).html(originalText);
        return;
    }

    let actionName = editId ? 'editExpense' : 'addExpense';

    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: actionName, data: formData }) })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                Swal.fire({ icon: 'success', title: 'Saved!', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
                if (editId) {
                    setTimeout(() => { location.reload(); }, 1500);
                } else {
                    resetExpenseForm(selectedD);
                }
            } else {
                if (!editId) saveExpenseOffline(formData, selectedD);
            }
        })
        .catch(err => {
            if (!editId) saveExpenseOffline(formData, selectedD);
        })
        .finally(() => btn.prop('disabled', false).html(originalText));
}

// 🔥 4. UPDATE DAY BOOK TO CALL UNIFIED MODALS
window.renderDayBookTable = function () {
    if (!dashboardData || !dashboardData.monthTimeline) return;

    let isMasterUser = localStorage.getItem('kafakAdminUser') === 'master';

    let mY = selectedDate.getFullYear();
    let mM = selectedDate.getMonth();
    let monthName = selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    let currentDate = new Date();
    let isCurrentMonth = (mY === currentDate.getFullYear() && mM === currentDate.getMonth());

    let viewMode = $('#daybook-view-mode').length > 0 ? $('#daybook-view-mode').val() : 'accounting';
    let courierMode = $('#courier-charge-mode').length > 0 ? $('#courier-charge-mode').val() : 'actual';

    let dailyData = {};
    const initDate = (dStr) => { if (!dailyData[dStr]) dailyData[dStr] = { income: { orders: [], totalAmount: 0, totalBottles: 0 }, courier: { items: [], totalAmount: 0 }, expenses: [] }; };

    allOrders.forEach(o => {
        let status = o.Status || 'Pending';
        if (status === 'Pending' || status === 'Sent' || status === 'Archive' || status === 'Refunded') return;

        let qty = parseInt(o.quantity) || 0;
        let pDate = parseOrderDate(o.paidDate || o.timestamp);

        let totalCourier = parseInt(o.Courier_Charge) || 0;
        if (isNaN(totalCourier) || totalCourier <= 0) totalCourier = getCourierRate(o.state, o.provider || o.Courier_Provider, qty);
        let actualCourier = parseInt(o.actualCourierCost) || parseInt(o.Actual_Courier_Cost) || 0;
        if (isNaN(actualCourier) || actualCourier <= 0) actualCourier = totalCourier > 20 ? totalCourier - 20 : totalCourier;

        let applyCourierCost = (courierMode === 'actual') ? actualCourier : totalCourier;
        let saleType = (o.house === 'Local Sale' || o.house === 'Partner Bulk') ? o.house : 'Online';

        if (pDate.getFullYear() === mY && pDate.getMonth() === mM) {
            let dStr = flatpickr.formatDate(pDate, "Y-m-d");
            initDate(dStr);

            let amt = parseInt(o.grandTotal) || parseInt(o.Grand_Total) || 0;
            if (isNaN(amt) || amt <= 0) {
                let pInfo = calculatePriceInfo(o, qty, o.state, o.provider || o.Courier_Provider);
                amt = parseInt(pInfo.total.replace(/[^0-9]/g, '')) || 0;
            }

            dailyData[dStr].income.orders.push({ qty: qty, amt: amt, type: saleType, name: o.name, oid: o.orderid, receipt: o.receipt, msg: o.message });
            dailyData[dStr].income.totalAmount += amt;
            dailyData[dStr].income.totalBottles += qty;

            if (viewMode === 'profit' && applyCourierCost > 0 && saleType === 'Online') {
                dailyData[dStr].courier.items.push({ charge: applyCourierCost });
                dailyData[dStr].courier.totalAmount += applyCourierCost;
            }
        }

        if (viewMode === 'accounting' && status !== 'Paid') {
            let dDate = parseOrderDate(o['Dispatched Date'] || o.timestamp);
            if (dDate.getFullYear() === mY && dDate.getMonth() === mM && saleType === 'Online') {
                let dStr = flatpickr.formatDate(dDate, "Y-m-d");
                initDate(dStr);
                if (applyCourierCost > 0) {
                    dailyData[dStr].courier.items.push({ charge: applyCourierCost });
                    dailyData[dStr].courier.totalAmount += applyCourierCost;
                }
            }
        }
    });

    if (dashboardData.monthTimeline.expense) {
        dashboardData.monthTimeline.expense.forEach(e => {
            if (e.isCourier) return;
            let dDate = new Date(e.date);
            if (dDate.getFullYear() === mY && dDate.getMonth() === mM) {
                let dStr = flatpickr.formatDate(dDate, "Y-m-d");
                initDate(dStr);
                dailyData[dStr].expenses.push(e);
            }
        });
    }

    let sortedDates = Object.keys(dailyData).sort((a, b) => new Date(b) - new Date(a));
    let grandIncome = 0, grandCourier = 0, grandExpense = 0;

    if ($('#daybook-container').length === 0) $('<div id="daybook-container" class="mt-4 mb-4 pb-4"></div>').insertAfter('#tx-details-area');
    let nextMonthBtnHtml = !isCurrentMonth ? `<button class="btn btn-sm btn-dark rounded-pill fw-bold ms-2 shadow-sm" style="font-size:9px; padding: 5px 12px;" onclick="loadNextMonthDayBook()">NEXT MTH <i class="fas fa-chevron-right ms-1"></i></button>` : '';

    let html = `
    <div class="bg-white p-3 rounded-4 shadow-sm border border-secondary border-opacity-25 mt-4 mb-5">
        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
            <h6 class="fw-bold text-dark m-0" style="font-size:13px; letter-spacing:0.5px;"><i class="fas fa-book-open text-primary me-2"></i> DAY BOOK</h6>
            <div class="d-flex align-items-center">
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 me-2" style="font-size:11px;">${monthName.toUpperCase()}</span>
                <button class="btn btn-sm btn-outline-dark rounded-pill fw-bold" style="font-size:9px; padding: 5px 12px;" onclick="loadPreviousMonthDayBook()"><i class="fas fa-chevron-left me-1"></i> PREV</button>
                ${nextMonthBtnHtml}
            </div>
        </div>
        <div class="d-flex flex-wrap justify-content-center mb-3 gap-2">
            <select id="daybook-view-mode" class="form-select form-select-sm w-auto fw-bold text-secondary border-secondary shadow-sm" style="font-size:11px; border-radius:8px;" onchange="renderDayBookTable()">
                <option value="accounting" ${viewMode === 'accounting' ? 'selected' : ''}>📊 Accounting View</option>
                <option value="profit" ${viewMode === 'profit' ? 'selected' : ''}>💸 Daily Profit View</option>
            </select>
            <select id="courier-charge-mode" class="form-select form-select-sm w-auto fw-bold text-secondary border-secondary shadow-sm" style="font-size:11px; border-radius:8px;" onchange="renderDayBookTable()">
                <option value="actual" ${courierMode === 'actual' ? 'selected' : ''}>🚚 Courier Charge Only (Default)</option>
                <option value="total" ${courierMode === 'total' ? 'selected' : ''}>🚚 Courier Charge + Margin</option>
            </select>
        </div>
        <div>`;

    sortedDates.forEach(dateStr => {
        let data = dailyData[dateStr];
        let displayDate = new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        let dayHtml = `<div class="mb-3 bg-light border border-secondary border-opacity-25 rounded-3 overflow-hidden shadow-sm"><div class="fw-bold text-dark border-bottom px-2 py-1 d-flex align-items-center" style="font-size:11px; background:#e2e8f0;"><i class="far fa-calendar-alt me-1 text-muted"></i> ${displayDate}</div><div class="p-2 bg-white">`;
        let hasData = false;

        if (data.income.orders.length > 0) {
            hasData = true;
            grandIncome += data.income.totalAmount;
            let normalGroups = {}, offlineGroups = [], partnerGroups = [];

            data.income.orders.forEach(o => {
                if (o.type === 'Local Sale') offlineGroups.push(o);
                else if (o.type === 'Partner Bulk') partnerGroups.push(o);
                else {
                    let q = parseInt(o.qty) || 1;
                    if (!normalGroups[q]) normalGroups[q] = { totalAmt: 0, count: 0 };
                    normalGroups[q].totalAmt += o.amt;
                    normalGroups[q].count++;
                }
            });

            let bdParts = [];
            Object.keys(normalGroups).sort((a, b) => a - b).forEach(q => {
                bdParts.push(`₹${normalGroups[q].totalAmt.toLocaleString()}(<span class="text-dark fw-bold">${normalGroups[q].count}x${q}</span><i class="fas fa-wine-bottle ms-1 text-muted" style="font-size:9px;"></i>)`);
            });

            let breakdownText = bdParts.join(' <span class="text-muted mx-1">+</span> ');

            dayHtml += `
            <div class="d-flex justify-content-between align-items-start mb-2 pb-2 ${offlineGroups.length === 0 && partnerGroups.length === 0 ? 'border-bottom border-dashed border-secondary border-opacity-10' : ''}">
                <div>
                    <div class="fw-bold text-success" style="font-size:12px;">
                        <i class="fas fa-arrow-down me-1"></i> ${data.income.orders.length} Sale(s), <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 ms-1">${data.income.totalBottles} <i class="fas fa-wine-bottle"></i></span>
                    </div>
                    <div class="text-secondary mt-1" style="font-size:10px; line-height:1.5;">-- Online: (${breakdownText || '0'})</div>
                </div>
                <div class="fw-bold text-success fs-6">₹${data.income.totalAmount.toLocaleString()}</div>
            </div>`;

            if (offlineGroups.length > 0) {
                offlineGroups.forEach(o => {
                    let custName = o.name || 'Walk-in Customer';
                    dayHtml += `
                    <div class="d-flex justify-content-between align-items-center mb-2 ms-3 p-2 bg-light rounded border border-primary border-opacity-25">
                        <div class="d-flex flex-column">
                            <span class="text-primary fw-bold" style="font-size:11.5px;"><i class="fas fa-store me-1"></i> ₹${o.amt} (<span class="text-dark">${o.qty}</span><i class="fas fa-wine-bottle ms-1 text-muted" style="font-size:10px;"></i>)</span>
                            <span class="text-muted mt-1" style="font-size:9.5px; font-weight:600;"><i class="fas fa-user-circle me-1"></i>${custName}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-primary py-1 px-3 shadow-sm" style="font-size:10px; border-radius:6px; font-weight:800;" onclick="showOfflineSaleModal('${o.oid}')"><i class="fas fa-edit me-1"></i> Edit</button>
                    </div>`;
                });
            }
            if (partnerGroups.length > 0) {
                partnerGroups.forEach(p => {
                    let pName = String(p.name).replace('Partner:', '').trim();
                    let descText = String(p.msg || '').split('(')[0].trim() || 'Bulk Sale';
                    dayHtml += `
                    <div class="d-flex justify-content-between align-items-center mb-2 ms-3 p-2 bg-light rounded border border-warning border-opacity-50">
                        <div class="d-flex flex-column">
                            <span class="text-dark fw-bold" style="font-size:11.5px;"><i class="fas fa-handshake text-warning me-1"></i> ${pName} <span class="ms-1 text-success">₹${p.amt}</span></span>
                            <span class="text-muted mt-1" style="font-size:9px; font-weight:600;"><i class="fas fa-info-circle me-1"></i>${descText}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-dark py-1 px-3 shadow-sm" style="font-size:10px; border-radius:6px; font-weight:800;" onclick="showOfflineSaleModal('${p.oid}')"><i class="fas fa-edit text-warning me-1"></i> Edit</button>
                    </div>`;
                });
            }
            if (offlineGroups.length > 0 || partnerGroups.length > 0) dayHtml += `<div class="border-bottom border-dashed border-secondary border-opacity-10 mb-2 mt-2"></div>`;
        }

        if (data.courier.items.length > 0) {
            hasData = true;
            grandCourier += data.courier.totalAmount;
            dayHtml += `<div class="d-flex justify-content-between align-items-start mb-2 pb-2 border-bottom border-dashed border-secondary border-opacity-10">
                <div><div class="fw-bold text-danger" style="font-size:12px;"><i class="fas fa-truck me-1"></i> Courier Charge</div></div>
                <div class="fw-bold text-danger fs-6">₹${data.courier.totalAmount.toLocaleString()}</div>
            </div>`;
        }

        if (data.expenses.length > 0) {
            hasData = true;
            data.expenses.forEach(e => {
                grandExpense += e.amount;
                let proofHtml = e.proof && String(e.proof).trim() !== "" ? `<a href="${e.proof}" target="_blank" class="btn btn-sm btn-light border py-0 px-1 ms-1 shadow-sm" style="font-size:9px; border-radius:4px;"><i class="fas fa-image text-primary"></i></a>` : '';
                let editHtml = (e.id && isMasterUser) ? `<button onclick="showAddExpenseModal('${e.id}')" class="btn btn-sm btn-outline-primary py-0 px-1 ms-2" style="font-size:8px; border-radius:4px;"><i class="fas fa-edit"></i> Edit</button>` : '';
                let title = e.cat || 'Expense';
                let subText = e.vendor ? `<span class="fw-bold text-dark">${e.vendor}</span>` : e.desc;
                if (e.vendor && e.desc) subText = `<span class="fw-bold text-dark">${e.vendor}</span>, ${e.desc}`;

                dayHtml += `
                <div class="d-flex justify-content-between align-items-start mb-2 pb-2 border-bottom border-dashed border-secondary border-opacity-10 last-border-none">
                    <div>
                        <div class="fw-bold text-danger" style="font-size:12px;"><i class="fas fa-receipt me-1"></i> ${title} ${proofHtml}</div>
                        <div class="text-secondary mt-1" style="font-size:10px;">-- ${subText} ${editHtml}</div>
                    </div>
                    <div class="fw-bold text-danger fs-6">₹${e.amount.toLocaleString()}</div>
                </div>`;
            });
        }

        dayHtml += `</div></div>`;
        dayHtml = dayHtml.replace(/border-bottom border-dashed border-secondary border-opacity-10 last-border-none/g, '');
        if (hasData) html += dayHtml;
    });

    html += `</div>
        <div class="mt-2 pt-3" style="border-top: 2px dashed #cbd5e1;">
            <div class="d-flex justify-content-between px-2 mb-2" style="font-size:12px; font-weight:700;"><span class="text-muted"><i class="fas fa-plus-circle text-success me-1"></i> Total Income:</span><span class="text-success fw-bold fs-6">₹${grandIncome.toLocaleString()}</span></div>
            <div class="d-flex justify-content-between px-2 mb-2" style="font-size:12px; font-weight:700;"><span class="text-muted"><i class="fas fa-minus-circle text-danger me-1"></i> Total Courier:</span><span class="text-danger fw-bold">₹${grandCourier.toLocaleString()}</span></div>
            <div class="d-flex justify-content-between px-2 mb-3" style="font-size:12px; font-weight:700;"><span class="text-muted"><i class="fas fa-minus-circle text-danger me-1"></i> Other Expenses:</span><span class="text-danger fw-bold">₹${grandExpense.toLocaleString()}</span></div>
            <div class="d-flex justify-content-between align-items-center px-3 py-3 rounded-4 shadow-sm" style="background:#f8fafc; border: 1px solid #e2e8f0;">
                <span class="text-dark" style="font-size:12px; font-weight:800; letter-spacing:1px;">NET FLOW (AS PER VIEW):</span>
                <span class="${grandIncome - grandCourier - grandExpense >= 0 ? 'text-success' : 'text-danger'} fw-bold" style="font-size:18px;">₹${Math.abs(grandIncome - grandCourier - grandExpense).toLocaleString()}</span>
            </div>
        </div>
    </div>`;

    $('#daybook-container').html(html);
}