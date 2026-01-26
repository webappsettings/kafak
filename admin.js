
const scriptURL = 'https://script.google.com/macros/s/AKfycbytJW88K8vaC1MOdd2GvEYGXdkLucaTFrpDNCA8XlvPfv1eC-WiW4sd6qSFJH3NFM0tvQ/exec';

let allOrders = [];
let html5QrCode;
let scanStep = 0; // 0: None, 1: Scan Order, 2: Scan Tracking
let tempOid = null;

// --- 1. INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
});

function fetchOrders() {
    fetch(`${scriptURL}?action=getAllOrders`)
        .then(res => res.json())
        .then(response => {
            document.getElementById('loader').style.display = 'none';
            if (response.result === 'success') {
                allOrders = response.data;
                renderOrders(allOrders);
            } else {
                alert('Error: ' + response.message);
            }
        })
        .catch(err => {
            document.getElementById('loader').innerHTML = `<p class="text-danger">Network Error: ${err}</p>`;
        });
}

// --- 2. RENDER CARDS (Old Style) ---
function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">No orders found.</div>';
        return;
    }

    orders.forEach((d, i) => {
        let date = new Date(d.timestamp).toLocaleDateString('en-IN');
        let btnClass = d.Status === 'Sent' ? 'btn-secondary' : 'btn-success';
        let btnText = d.Status === 'Sent' ? 'Sent ✅' : '<i class="fab fa-whatsapp"></i> WhatsApp';

        // Tracking info logic
        let trackInfo = d.Status === 'Dispatched'
            ? '<span class="badge bg-primary ms-2">Dispatched 🚚</span>'
            : '';

        let html = `
        <div class="col-12 col-md-6 col-lg-4 mb-3">
            <div class="order-card p-3" id="card-${i}">
                <div class="card-top">
                    <div>
                        <span class="badge-id">${d.orderid}</span>
                        ${trackInfo}
                    </div>
                    <span class="date-text">${date}</span>
                </div>
                
                <div class="d-flex align-items-start mt-2">
                    <input type="checkbox" class="custom-check mt-1 order-cb" value="${i}" onchange="highlightCard(${i}, this.checked)">
                    <div class="w-100 ms-2">
                        <div class="cust-name">${d.name}</div>
                        <div class="cust-place">${d.place}, ${d.district}</div>
                        <div class="fw-bold small text-muted">Qty: ${d.quantity} | Ph: ${d.phone}</div>

                        <div class="action-area">
                            <div class="input-group input-group-sm mb-2">
                                <select class="form-select" id="contact-${i}">
                                    <option value="${d.whatsapp}">WA: ${d.whatsapp}</option>
                                    <option value="${d.phone}">PH: ${d.phone}</option>
                                </select>
                            </div>
                            <button class="btn btn-sm ${btnClass} w-100 fw-bold" onclick="sendWA(${i}, this)">${btnText}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

// --- 3. SELECTION & SEARCH ---
function toggleAll(checked) {
    document.querySelectorAll('.order-cb').forEach(cb => {
        cb.checked = checked;
        highlightCard(cb.value, checked);
    });
}

function highlightCard(index, checked) {
    const card = document.getElementById(`card-${index}`);
    if (checked) card.classList.add('selected');
    else card.classList.remove('selected');
}

function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allOrders.filter(o =>
        o.name.toLowerCase().includes(term) ||
        String(o.phone).includes(term) ||
        String(o.orderid).toLowerCase().includes(term)
    );
    renderOrders(filtered);
}

// --- 4. WHATSAPP LOGIC ---
function sendWA(index, btn) {
    const order = allOrders[index];
    const phone = document.getElementById(`contact-${index}`).value;
    const msg = `Hi ${order.name}, your order (${order.orderid}) is packed! 🍯\nWe will ship it soon.`;

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');

    // Update Button UI
    btn.className = 'btn btn-secondary btn-sm w-100 fw-bold';
    btn.innerText = 'Sent ✅';

    // Update Sheet Status (Background)
    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'updateStatus', oid: order.orderid, status: 'Sent' })
    });
}

// --- 5. SCANNER LOGIC (Order -> Tracking) ---
function startScanner(mode) {
    const modal = document.getElementById('scanner-modal');
    modal.style.display = 'flex';
    scanStep = 1;
    tempOid = null;

    document.getElementById('scan-msg').innerText = "STEP 1: Scan Order QR Code";
    document.getElementById('scan-msg').style.color = "white";
    document.getElementById('scan-status').innerText = "";

    // Init Scanner
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess
    ).catch(err => {
        alert("Camera access denied or error: " + err);
        closeScannerModal();
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            closeScannerModal();
        }).catch(() => {
            closeScannerModal();
        });
    } else {
        closeScannerModal();
    }
}

function closeScannerModal() {
    document.getElementById('scanner-modal').style.display = 'none';
}

function onScanSuccess(decodedText, decodedResult) {
    // STEP 1: Scan Order ID (Must start with ORD-)
    if (scanStep === 1) {
        if (decodedText.startsWith("ORD-")) {
            tempOid = decodedText;

            // Visual Feedback
            document.getElementById('scan-status').innerText = `✅ Order Found: ${tempOid}`;
            document.getElementById('scan-msg').innerText = "STEP 2: Now Scan TRACKING Barcode";
            document.getElementById('scan-msg').style.color = "#ffeb3b";

            // Brief pause
            scanStep = 2;
            html5QrCode.pause();
            setTimeout(() => html5QrCode.resume(), 1500);
        }
    }
    // STEP 2: Scan Tracking Number
    else if (scanStep === 2) {
        if (!decodedText.startsWith("ORD-")) { // Avoid rescanning the order code
            html5QrCode.pause();

            if (confirm(`Link Tracking ID: ${decodedText}\nTo Order: ${tempOid}?`)) {
                saveTracking(tempOid, decodedText);
                stopScanner();
            } else {
                html5QrCode.resume();
            }
        }
    }
}

function saveTracking(oid, tracking) {
    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateTracking', oid: oid, tracking: tracking })
    })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                alert("Tracking Saved! Order marked Dispatched.");
                fetchOrders(); // Reload list
            } else {
                alert("Error saving tracking.");
            }
        })
        .catch(err => alert("Network Error: " + err));
}

// --- 6. PRINT LOGIC (A6 + Barcode + QR) ---
function printSelected() {
    const selected = document.querySelectorAll('.order-cb:checked');
    if (selected.length === 0) {
        alert("Please select orders to print!");
        return;
    }

    const area = document.getElementById('print-area');
    area.innerHTML = '';

    // Generate HTML
    selected.forEach(cb => {
        const idx = cb.value;
        area.innerHTML += createLabelHTML(allOrders[idx], idx);
    });

    // Wait for DOM, Generate Codes, then Print
    setTimeout(() => {
        selected.forEach(cb => {
            const idx = cb.value;
            const d = allOrders[idx];

            // Barcode (Order ID)
            try {
                JsBarcode(`#barcode-${idx}`, d.orderid, {
                    format: "CODE128",
                    height: 30,
                    displayValue: false,
                    margin: 0
                });
            } catch (e) { console.log("Barcode error", e); }

            // QR Code (Google Maps)
            try {
                document.getElementById(`qrcode-${idx}`).innerHTML = ""; // clear previous
                const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.place + ',' + d.district)}`;
                new QRCode(document.getElementById(`qrcode-${idx}`), {
                    text: mapLink,
                    width: 50,
                    height: 50
                });
            } catch (e) { console.log("QR error", e); }
        });

        // Trigger Print
        setTimeout(() => window.print(), 500);
    }, 100);
}

function createLabelHTML(d, idx) {
    let po = d.postoffice ? `${d.postoffice}` : '';
    return `
    <div class="label-page">
        <div class="header-sec">
            <div id="qrcode-${idx}" class="qr-box"></div>
            <svg id="barcode-${idx}" class="barcode-box"></svg>
        </div>

        <div class="to-label">To,</div>
        <div class="cust-details">
            ${d.name}<br>
            ${d.house}<br>
            ${d.place} ${po ? ',' + po : ''}<br>
            ${d.district}, KERALA
        </div>
        <div class="cust-pin">PIN: ${d.pincode}</div>
        
        <div class="phone-display">PH: ${d.phone}</div>

        <div class="support-box">
            <div style="font-size:18px">📞</div>
            <div>
                7788990313, 9895082689<br>
                If unreachable, call or WhatsApp us
            </div>
        </div>

        <div class="footer">
            <div class="fragile-icon">
                <svg class="fragile-svg" viewBox="0 0 24 24">
                    <path d="M18.1,5.1c0,0-2.2-2.8-2.6-3.2C15.1,1.5,14.6,1.2,14,1.2h-4c-0.6,0-1.1,0.3-1.5,0.7C8.1,2.3,5.9,5.1,5.9,5.1 C5.3,5.8,5,6.7,5,7.6v5.8c0,1.9,1.1,3.6,2.8,4.4v3h-1v2h10.4v-2h-1v-3c1.7-0.8,2.8-2.5,2.8-4.4V7.6C19,6.7,18.7,5.8,18.1,5.1z M10.4,4.2L11,3.5l3.5,6l0.9-0.5L11.5,2.5l0.9-0.5l0.5,0.9l-0.9,0.5L12.5,4l0.6-0.8L10.4,4.2z"/><path d="M12,14L12,14c-0.6,0-1-0.4-1-1v-2l-2,3.5l-0.9-0.5L10,10.6L8.8,12.7L7.9,12.2l2-3.5L9,7.3l2.5,4.3l0.9-0.5l-2-3.5 L12,5l1.6,2.7l-2,3.5l0.9,0.5l2.5-4.3l-0.9-1.5l2-3.5l0.9,0.5L15.1,6L14,8v5C14,13.6,13.6,14,12,14z"/>
                </svg>
                <div class="fragile-text">FRAGILE</div>
            </div>
            <div class="from-sec">
                From,<br>
                KAFAK LLP, 10/174, Kunnathery,<br>
                Thaikkattukara P.O, Aluva - 683106,<br>
                Ernakulam District, Kerala, India.<br>
                Phone: 778899 0 313
            </div>
        </div>
    </div>`;
}