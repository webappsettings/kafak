const scriptURL = "https://script.google.com/macros/s/AKfycbzrsNY0LWb9GDDYXftb-LSgPDUw-u6CVh6rB-FDPKL6hCs4d9JXHr3obipyN25i48v0xQ/exec";

// Beep Sound
const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT1GAg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAgEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAEBAgMDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AA==");

// Globals
let isScanProcessing = false;
let dashboardData = null;
let selectedDate = new Date();
let courierRates = JSON.parse(localStorage.getItem('adminRatesCache')) || {};
let allOrders = [];
let html5QrCode;
let scanMode = '';
let scanStep = 0;
let tempOid = null;

// 🔴 INITIALIZATION & AUTH CHECK
$(document).ready(function () {
    // 🔥 FIX: Redirect Issue Solved (Checking correct key 'kafakAdmin')
    if (localStorage.getItem('kafakAdmin') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    // Load Data
    fetchOrders();

    // Default Date for Expense
    let expDateInput = document.getElementById('exp-date');
    if (expDateInput) expDateInput.valueAsDate = new Date();

    // Background Rates
    fetchRatesBackground();
});

// Sound Helper
function playBeep() {
    let ctx = new (window.AudioContext || window.webkitAudioContext)();
    let osc = ctx.createOscillator();
    osc.type = "sine"; osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination); osc.start();
    setTimeout(() => osc.stop(), 100);
}

// 🔴 1. LOGIN FUNCTIONS
function isStorageAvailable() {
    try { localStorage.setItem('test', 'test'); localStorage.removeItem('test'); return true; }
    catch (e) { return false; }
}

window.attemptLogin = function () {
    if (!isStorageAvailable()) { alert("Storage error."); return; }
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;

    if (user === "admin" && pass === "kafak123") {
        localStorage.setItem('kafakAdmin', 'true'); // ✅ Correct Key
        showDashboard();
    } else {
        document.getElementById('loginMsg').innerText = "❌ Incorrect!";
    }
};

window.logoutAdmin = function () {
    confirmAction("Logout?", () => {
        localStorage.removeItem('kafakAdmin');
        localStorage.removeItem('allOrdersCache');
        window.location.href = "index.html";
    });
};

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    fetchOrders();
}

// --- HELPERS ---
function showToast(icon, title) {
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: icon, title: title });
}

function confirmAction(text, callback) {
    Swal.fire({ text: text, icon: 'question', showCancelButton: true, confirmButtonColor: '#000', confirmButtonText: 'Yes' })
        .then((result) => { if (result.isConfirmed) callback(); });
}

function fetchRatesBackground() {
    fetch(`${scriptURL}?action=getRates`)
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success' && data.rates) {
                courierRates = data.rates;
                localStorage.setItem('adminRatesCache', JSON.stringify(courierRates));
            }
        });
}

// --- CORE ORDERS LOGIC (OLD UI PRESERVED) ---
function fetchOrders(forceLoad = false) {
    let savedOrders = localStorage.getItem('allOrdersCache');
    if (savedOrders && !forceLoad) {
        allOrders = JSON.parse(savedOrders);
        renderTabs(allOrders);
        return;
    }

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
        .catch(() => document.getElementById('loader').style.display = 'none');
}

function renderTabs(orders) {
    const pendingList = document.getElementById('list-pending');
    const paidList = document.getElementById('list-paid');
    const dispatchedList = document.getElementById('list-dispatched');

    if (!pendingList) return; // Safety check

    pendingList.innerHTML = ''; paidList.innerHTML = ''; dispatchedList.innerHTML = '';

    let counts = { pending: 0, paid: 0, dispatched: 0 };
    let btlCounts = { pending: 0, paid: 0, dispatched: 0 };
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let dispatchedOrders = orders.filter(o => {
        let local = pendingUpdates.find(u => u.oid === o.orderid);
        let s = local ? local.status : (o.Status || 'Pending');
        return s === 'Dispatched';
    });

    let latestDispatchedDateLabel = dispatchedOrders.length > 0 ? getTimelineLabel(dispatchedOrders[0].timestamp) : "";
    let lastDateMap = { pending: '', paid: '', dispatched: '' };

    orders.forEach((d, i) => {
        let localUpdate = pendingUpdates.find(item => item.oid === d.orderid);
        let status = localUpdate ? localUpdate.status : (d.Status || 'Pending');
        let isCompact = false;

        if (status === 'Completed' || status === 'Archive') return;

        let targetList = null;
        let type = '';

        if (status === 'Pending' || status === 'Sent') { targetList = pendingList; type = 'pending'; counts.pending++; }
        else if (status === 'Paid') { targetList = paidList; type = 'paid'; counts.paid++; }
        else if (status === 'Dispatched') {
            targetList = dispatchedList; type = 'dispatched'; counts.dispatched++;
            if (getTimelineLabel(d.timestamp) !== latestDispatchedDateLabel) isCompact = true;
        }

        if (targetList) {
            btlCounts[type] += (parseInt(d.quantity) || 0);
            let orderDate = d.timestamp ? getTimelineLabel(d.timestamp) : "Unknown";

            if (orderDate !== lastDateMap[type]) {
                targetList.innerHTML += `<div class="col-12 sticky-date-wrapper"><div class="timeline-badge">${orderDate}</div></div>`;
                lastDateMap[type] = orderDate;
            }
            targetList.innerHTML += createCardHTML(d, i, type, status, isCompact);
        }
    });

    updateBadgeUI('count-pending', counts.pending, btlCounts.pending);
    updateBadgeUI('count-paid', counts.paid, btlCounts.paid);
    updateBadgeUI('count-dispatched', counts.dispatched, btlCounts.dispatched);
}

function updateBadgeUI(elementId, count, bottles) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = count;
        // Logic for bottle badge...
    }
}

function createCardHTML(d, index, type, currentStatus, isCompact) {
    let priceInfo = calculatePriceInfo(d.quantity, d.state);
    let safe = (val) => String(val || '').toUpperCase();
    let dateObj = new Date(d.timestamp);
    let formattedDate = dateObj.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });

    // COMPACT VIEW FOR OLD DISPATCHED
    if (isCompact) {
        return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="order-card p-2 shadow-sm" style="border-left: 4px solid #2196f3;">
                <div class="d-flex justify-content-between align-items-center" onclick="toggleCardUI(this.closest('.order-card'))">
                    <div style="font-size:12px;">
                        <span class="fw-bold">${safe(d.name)}</span> <span class="text-muted">(${d.phone})</span>
                        ${d.tracking ? `<br><span class="badge bg-light text-dark border">TRK: ${d.tracking}</span>` : ''}
                    </div>
                    <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); updateOrder('${d.orderid}', 'Completed')">Done?</button>
                </div>
                <div class="full-card-content mt-2 border-top pt-2" style="display:none;">
                    ${createCardHTML(d, index, type, currentStatus, false)}
                </div>
            </div>
        </div>`;
    }

    // FULL CARD
    let buttons = '';
    if (type === 'pending') {
        buttons = `<button class="btn-custom btn-wa w-100" onclick="event.stopPropagation(); sendWA(${index})"><i class="fab fa-whatsapp"></i> Send Invoice</button>`;
        if (currentStatus === 'Sent') buttons = `<div class="d-flex gap-2 w-100"><button class="btn-custom btn-paid flex-grow-1" onclick="updateOrder('${d.orderid}', 'Paid')">💰 Paid</button><button class="btn-custom btn-wa flex-grow-1" onclick="sendWA(${index})">Resend</button></div>`;
    } else if (type === 'paid') {
        buttons = `<button class="btn-custom btn-dispatch w-100" onclick="updateOrder('${d.orderid}', 'Dispatched')">📦 Dispatch</button>`;
    } else if (type === 'dispatched') {
        buttons = `<button class="btn-custom btn-track w-100 mb-1" onclick="editTracking('${d.orderid}', '${d.tracking || ''}')">🚚 ${d.tracking ? d.tracking : 'Add Tracking'}</button>
                   <button class="btn-custom btn-complete w-100" onclick="updateOrder('${d.orderid}', 'Completed')">✅ Complete</button>`;
    }

    return `
    <div class="col-12 col-md-6 col-lg-4">
        <div class="order-card status-${currentStatus} p-3">
            <div class="d-flex justify-content-between mb-2">
                <span class="order-id">#${d.orderid.split('-')[1]}</span>
                <span class="text-muted small">${formattedDate}</span>
            </div>
            <div class="cust-name">${safe(d.name)}</div>
            <div class="cust-details">
                <b>${safe(d.house)}</b>, ${safe(d.place)}<br>
                ${safe(d.district)}, ${safe(d.state)} - <b>${d.pincode}</b>
            </div>
            <div class="info-box mt-2"><span>${d.quantity} Bottles</span><span class="fw-bold text-success">${priceInfo.total}</span></div>
            <div class="action-area mt-2">${buttons}</div>
        </div>
    </div>`;
}

function updateSyncButtonUI() {
    let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let btn = document.getElementById('sync-btn');
    if (btn) {
        btn.style.display = pendingUpdates.length > 0 ? 'flex' : 'none';
        document.getElementById('sync-badge-count').innerText = pendingUpdates.length;
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
        let matches = allOrders.filter(o => (o.name || '').toLowerCase().includes(term) || String(o.phone).includes(term) || (o.orderid || '').toLowerCase().includes(term));
        matches.forEach(d => {
            searchList.innerHTML += createCardHTML(d, 0, 'pending', d.Status, false);
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

    confirmAction(`Sync ${pendingUpdates.length} updates?`, () => {
        let trackingUpdates = pendingUpdates.filter(u => u.tracking);
        let statusUpdates = pendingUpdates.filter(u => !u.tracking);
        let promises = [];

        if (statusUpdates.length > 0) promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'bulkUpdateStatus', updates: statusUpdates }) }));
        trackingUpdates.forEach(u => promises.push(fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'updateTracking', oid: u.oid, tracking: u.tracking }) })));

        Promise.all(promises).then(() => {
            localStorage.removeItem('pendingUpdates');
            showToast('success', 'Synced!');
            updateSyncButtonUI();
        });
    });
}

function discardLocalChanges() {
    confirmAction("Discard local changes?", () => {
        localStorage.removeItem('pendingUpdates');
        renderTabs(allOrders);
        updateSyncButtonUI();
    });
}

function sendWA(index) {
    const d = allOrders[index];
    const n = parseInt(d.quantity);
    const dateObj = d.timestamp ? new Date(d.timestamp) : new Date();
    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour12: true });
    const priceInfo = calculatePriceInfo(n, d.state);

    const msg = `*✅ Order Confirmed!* 🍯\n${d.name}\n${d.house}, ${d.place}\nQty: ${n}\nTotal: ${priceInfo.total}\n\nPay to: 7788990313`;
    window.open(`https://wa.me/91${d.phone}?text=${encodeURIComponent(msg)}`, '_blank');

    if (d.Status === 'Pending') updateOrder(d.orderid, 'Sent');
}

// --- PRINTING ---
function printSelected() {
    // Basic Print Logic Stub
    alert("Printing not implemented in this snippet.");
}

// --- SCANNER LOGIC (Old UI Complex Mode) ---
function startScanner(mode) {
    scanMode = mode;
    $('#scanner-modal').css('display', 'flex');
    $('#scan-result-box').hide();

    let boxConfig = (mode === 'tracking') ? { width: 320, height: 150 } : { width: 250, height: 250 };

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: boxConfig }, onScanSuccess);
}

function stopScanner() {
    if (html5QrCode) html5QrCode.stop().then(() => $('#scanner-modal').hide());
}

function onScanSuccess(decodedText) {
    if (isScanProcessing) return;
    isScanProcessing = true;
    playBeep();

    if (scanMode === 'dispatch') {
        if (decodedText.startsWith("ORD-")) {
            updateOrder(decodedText, 'Dispatched');
            showScanFeedback("DISPATCHED ✅", decodedText);
        } else {
            showScanFeedback("INVALID QR ❌", decodedText);
        }
    } else if (scanMode === 'tracking') {
        // Complex logic simplified for brevity
        showScanFeedback("SCANNED", decodedText);
    }

    setTimeout(() => { isScanProcessing = false; }, 2000);
}

function showScanFeedback(status, code) {
    $('#scan-status-text').text(status);
    $('#scan-info-text').text(code);
    $('#scan-result-box').slideDown();
}

// ✅ Correct Cancel Action
function cancelDispatchAction() {
    $('#scan-result-box').slideUp();
    setTimeout(() => {
        if (html5QrCode) html5QrCode.resume();
        isScanProcessing = false;
    }, 1000);
}

// --- UTILS ---
function getTimelineLabel(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString() ? "Today" : d.toLocaleDateString('en-GB');
}

function toggleCardUI(card) {
    let content = card.querySelector('.full-card-content');
    if (content) content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

function getZoneKey(state) {
    if (!state) return 'north';
    let s = state.toUpperCase().trim();
    if (s === 'KERALA') return 'kerala';
    if (s === 'TAMIL NADU') return 'tn';
    if (s === 'KARNATAKA') return 'ka';
    if (s === 'ANDHRA PRADESH') return 'ap';
    if (s === 'TELANGANA') return 'ts';
    if (s === 'LAKSHADWEEP') return 'lakshadweep';
    return 'north';
}

function calculatePriceInfo(qty, state) {
    const n = parseInt(qty) || 0;
    const base = n * 650;
    const zone = getZoneKey(state);
    let courier = 0;
    if (courierRates[zone] && courierRates[zone][n]) courier = courierRates[zone][n];
    return { total: `₹${base + courier}/-` };
}

// ==========================================
// 🔥 DASHBOARD LOGIC (NEW SLIDE OVER)
// ==========================================

function openDashboard() {
    $('#drawer-overlay').fadeIn();
    $('#dashboard-drawer').addClass('open');
    selectedDate = new Date();
    updateDateDisplay();
    fetchDashboardData();
}

function closeDashboard() {
    $('#drawer-overlay').fadeOut();
    $('#dashboard-drawer').removeClass('open');
}

function updateDateDisplay() {
    let today = new Date();
    let isToday = selectedDate.toDateString() === today.toDateString();
    $('#current-date-display').text(isToday ? "Today" : selectedDate.toLocaleDateString());
    $('#btn-next-date').prop('disabled', isToday);
    let dateInput = document.getElementById('exp-date');
    if (dateInput) dateInput.valueAsDate = selectedDate;
}

function changeDate(d) {
    selectedDate.setDate(selectedDate.getDate() + d);
    updateDateDisplay();
    fetchDashboardData();
}

function fetchDashboardData() {
    let dateStr = selectedDate.toISOString().split('T')[0];
    $('#d-sales, #d-profit').text('...');

    fetch(`${scriptURL}?action=getDashboardData&date=${dateStr}`)
        .then(res => res.json())
        .then(res => {
            dashboardData = res.data;
            renderDashboard();
        });
}

function renderDashboard() {
    if (!dashboardData) return;
    let d = dashboardData.daily;
    let m = dashboardData.monthly;

    $('#d-sales').text(d.sales);
    $('#d-expense').text(d.expense);
    $('#d-courier').text(d.courier);
    $('#d-profit').text(d.profit);
    $('#m-sales').text(m.sales);
    $('#m-expense').text(m.expense);
    $('#m-profit').text(m.profit);

    let html = '';
    if (d.list) {
        d.list.forEach(i => {
            let icon = i.proof ? `<a href="${i.proof}" target="_blank">📷</a>` : '';
            html += `<div class="d-flex justify-content-between p-2 border-bottom">
                <div><div class="fw-bold small">${i.desc}</div><div class="text-muted" style="font-size:10px">${i.category}</div></div>
                <div class="text-danger fw-bold">-${i.amount} ${icon}</div>
            </div>`;
        });
    }
    $('#daily-timeline').html(html || '<div class="text-center text-muted small">No Data</div>');
    renderPartnerList();
}

function togglePartnerSelect() {
    let cat = $('#exp-category').val();
    let section = $('#partner-section');
    let vendor = $('#exp-vendor');

    if (cat === 'Salary') {
        section.slideDown();
        vendor.prop('readonly', true).val('');
    } else {
        section.slideUp();
        vendor.prop('readonly', false);
    }
}

function renderPartnerList() {
    if (!dashboardData || !dashboardData.partners) return;
    let html = '';
    for (let [name, bal] of Object.entries(dashboardData.partners)) {
        html += `<div class="partner-card" onclick="selectPartner('${name}')">
            <span class="fw-bold small">${name}</span>
            <span class="text-success fw-bold small">Bal: ${bal}</span>
        </div>`;
    }
    $('#partner-list').html(html);
}

function selectPartner(name) {
    $('.partner-card').removeClass('selected');
    $(event.currentTarget).addClass('selected');
    $('#exp-vendor').val(name + ' Salary');
}

async function submitExpense(e) {
    e.preventDefault();
    let btn = $('#btn-save-exp');
    btn.prop('disabled', true).text('SAVING...');

    let fileInput = document.getElementById('exp-proof');
    let fileData = null, fileName = null;

    if (fileInput.files.length > 0) {
        try {
            let compressed = await compressImage(fileInput.files[0]);
            fileData = compressed.data;
            fileName = compressed.name;
        } catch (err) { alert("Image Error"); return; }
    }

    let formData = {
        date: $('#exp-date').val(),
        category: $('#exp-category').val(),
        vendor: $('#exp-vendor').val(),
        description: $('#exp-desc').val() || "Expense",
        amount: $('#exp-amount').val(),
        fileData: fileData, fileName: fileName
    };

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addExpense', data: formData })
    }).then(res => res.json()).then(d => {
        if (d.result === 'success') {
            alert("Saved!");
            $('#expense-form')[0].reset();
            fetchDashboardData();
            $('#tab-overview').click();
        } else {
            alert("Error");
        }
        btn.prop('disabled', false).text('SAVE DATA');
    });
}

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 800 / img.width;
                canvas.width = 800; canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve({ data: canvas.toDataURL('image/jpeg', 0.6), name: "Proof.jpg" });
            };
        };
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
function renderOrders(orders) {
    const container = $('#orders-container');
    container.empty();
    orders.forEach(o => {
        let statusClass = `status-${o.Status || 'Pending'}`;
        let html = `
        <div class="order-card" onclick="window.location.href='order.html?oid=${o.orderid}'">
            <div class="order-header"><span>#${o.orderid.slice(-5)}</span><span>${o.timestamp.split('T')[0]}</span></div>
            <div class="order-name">${o.name} <span class="badge bg-dark">${o.quantity}</span></div>
            <div class="text-muted small">${o.place}</div>
            <div class="d-flex justify-content-between mt-2 align-items-center">
                <span class="status-badge ${statusClass}">${o.Status || 'Pending'}</span>
                <span class="fw-bold">₹${o.grandTotal}</span>
            </div>
        </div>`;
        container.append(html);
    });
}

// 2. DASHBOARD LOGIC
function openDashboard() {
    $('#drawer-overlay').fadeIn();
    $('#dashboard-drawer').addClass('open');
    selectedDate = new Date();
    updateDateDisplay();
    fetchDashboardData();
}

function closeDashboard() {
    $('#drawer-overlay').fadeOut();
    $('#dashboard-drawer').removeClass('open');
}

function updateDateDisplay() {
    let today = new Date();
    let isToday = selectedDate.toDateString() === today.toDateString();
    $('#current-date-display').text(isToday ? "Today" : selectedDate.toDateString());
    $('#btn-next-date').prop('disabled', isToday);
    document.getElementById('exp-date').valueAsDate = selectedDate;
}

function changeDate(d) {
    selectedDate.setDate(selectedDate.getDate() + d);
    updateDateDisplay();
    fetchDashboardData();
}

function fetchDashboardData() {
    let dateStr = selectedDate.toISOString().split('T')[0];
    $('#d-sales, #d-profit').text('...');

    fetch(`${scriptURL}?action=getDashboardData&date=${dateStr}`)
        .then(res => res.json())
        .then(res => {
            dashboardData = res.data;
            renderDashboard();
        });
}

function renderDashboard() {
    let d = dashboardData.daily;
    let m = dashboardData.monthly;

    $('#d-sales').text(d.sales);
    $('#d-expense').text(d.expense);
    $('#d-courier').text(d.courier);
    $('#d-profit').text(d.profit);

    $('#m-sales').text(m.sales);
    $('#m-expense').text(m.expense);
    $('#m-profit').text(m.profit);

    let html = '';
    d.list.forEach(i => {
        let icon = i.proof ? `<a href="${i.proof}" target="_blank">📷</a>` : '';
        html += `<div class="d-flex justify-content-between p-2 border-bottom">
            <div><div class="fw-bold small">${i.desc}</div><div class="text-muted" style="font-size:10px">${i.category}</div></div>
            <div class="text-danger fw-bold">-${i.amount} ${icon}</div>
        </div>`;
    });
    $('#daily-timeline').html(html || '<div class="text-center text-muted small">No Data</div>');

    renderPartnerList();
}

// 3. SALARY AUTO-FILL
function togglePartnerSelect() {
    let cat = $('#exp-category').val();
    if (cat === 'Salary') {
        $('#partner-section').slideDown();
        $('#exp-vendor').prop('readonly', true).val('');
    } else {
        $('#partner-section').slideUp();
        $('#exp-vendor').prop('readonly', false);
    }
}

function renderPartnerList() {
    if (!dashboardData) return;
    let html = '';
    for (let [name, bal] of Object.entries(dashboardData.partners)) {
        // Data attribute holds the balance
        html += `<div class="partner-card" onclick="selectPartner('${name}', ${bal})">
            <span class="fw-bold small">${name}</span>
            <span class="text-success fw-bold small">Bal: ${bal}</span>
        </div>`;
    }
    $('#partner-list').html(html);
}

function selectPartner(name, balance) {
    $('.partner-card').removeClass('selected');
    $(event.currentTarget).addClass('selected');

    $('#exp-vendor').val(name + ' Salary'); // Auto-fill Description

    // 🔥 AUTO FILL AMOUNT IF NEEDED (Optional)
    // You can uncomment next line if you want to auto-fill the full balance
    // $('#exp-amount').val(balance > 0 ? balance : 0); 
}

// 4. SUBMIT EXPENSE
async function submitExpense(e) {
    e.preventDefault();
    let btn = $('#btn-save-exp');
    btn.prop('disabled', true).text('SAVING...');

    let fileInput = document.getElementById('exp-proof');
    let fileData = null, fileName = null;

    if (fileInput.files.length > 0) {
        try {
            let compressed = await compressImage(fileInput.files[0]);
            fileData = compressed.data;
            fileName = compressed.name;
        } catch (err) { alert("Image Error"); return; }
    }

    let formData = {
        date: $('#exp-date').val(),
        category: $('#exp-category').val(),
        vendor: $('#exp-vendor').val(), // This will have "Salam Salary" etc.
        description: $('#exp-desc').val() || "Expense",
        amount: $('#exp-amount').val(),
        fileData: fileData, fileName: fileName
    };

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addExpense', data: formData })
    }).then(res => res.json()).then(d => {
        if (d.result === 'success') {
            alert("Saved!");
            $('#expense-form')[0].reset();
            fetchDashboardData(); // Refresh Data
            $('#tab-overview').click(); // Go back to overview
        } else {
            alert("Error");
        }
        btn.prop('disabled', false).text('SAVE DATA');
    });
}

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 800 / img.width;
                canvas.width = 800; canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve({ data: canvas.toDataURL('image/jpeg', 0.6), name: "Proof.jpg" });
            };
        };
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

