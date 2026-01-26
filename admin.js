// 🔐 PAGE ACCESS SECURITY CHECK
if (localStorage.getItem('kafakAdminLoggedIn') !== 'true') {
    window.location.href = "admin.html"; // ലോഗിൻ ചെയ്തിട്ടില്ലെങ്കിൽ ലോഗിൻ സെക്ഷനിലേക്ക് മാറ്റുന്നു
}

// 🔴 1. GOOGLE SCRIPT URL (Replace with your deployment URL)
const scriptURL = "https://script.google.com/macros/s/AKfycbzQErIZrh_LBrysFtBmOrR_kPmHH1nOcW9jy6mfUrKs7IVTvBUBdYGvkenSONYOsFna/exec";

let allOrders = [];
let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

// Courier Rates for display (Optional)
const courierRates = {
    kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
    outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
});

// 1. ഓർഡറുകൾ സെർവറിൽ നിന്ന് ലോഡ് ചെയ്യുന്നു
function fetchOrders() {
    $('#loader').show();
    fetch(`${scriptURL}?action=getAllOrders`)
        .then(res => res.json())
        .then(response => {
            $('#loader').hide();
            if (response.result === 'success') {
                allOrders = response.data;
                renderTabs(); // ലോഡ് ചെയ്ത ശേഷം ലിസ്റ്റ് കാണിക്കുന്നു
            }
        })
        .catch(err => {
            $('#loader').html(`<p class="text-danger">Error loading data. Check Internet.</p>`);
        });
}

// 2. ലിസ്റ്റ് റെൻഡർ ചെയ്യുന്നു (സെർച്ച് + ലോക്കൽ ഓവർറൈഡ്)
function renderTabs() {
    const term = $('#searchInput').val() ? $('#searchInput').val().toLowerCase() : "";
    const lists = {
        pending: $('#list-pending').empty(),
        sent: $('#list-sent').empty(),
        paid: $('#list-paid').empty()
    };

    let counts = { p: 0, s: 0, pd: 0 };

    allOrders.forEach((d, i) => {
        // ലോക്കൽ മാറ്റം ഉണ്ടോ എന്ന് നോക്കുന്നു
        let local = pendingUpdates.find(item => item.oid === d.orderid);
        let status = local ? local.status : (d.Status || 'Pending');

        // സെർച്ച് ഫിൽട്ടർ (Name, Phone, ID)
        const name = d.name ? d.name.toLowerCase() : "";
        const phone = d.phone ? d.phone.toString() : "";
        const oid = d.orderid ? d.orderid.toLowerCase() : "";

        if (name.includes(term) || phone.includes(term) || oid.includes(term)) {
            let cardHTML = createCardHTML(d, i, status);

            if (status === 'Pending') { counts.p++; lists.pending.append(cardHTML); }
            else if (status === 'Sent') { counts.s++; lists.sent.append(cardHTML); }
            else if (status === 'Paid' || status === 'Paided') { counts.pd++; lists.paid.append(cardHTML); }
        }
    });

    // ബാഡ്ജ് കൗണ്ടുകൾ അപ്‌ഡേറ്റ് ചെയ്യുന്നു
    $('#count-pending').text(counts.p);
    $('#count-sent').text(counts.s); // പകരമായി Sent ടാബ് ഉണ്ടെങ്കിൽ
    $('#count-paid').text(counts.pd);

    // സിങ്ക് ബട്ടൺ അപ്‌ഡേറ്റ്
    const syncBtn = $('#sync-btn');
    if (pendingUpdates.length > 0) {
        syncBtn.show().html(`🔄 SYNC UPDATES (${pendingUpdates.length})`);
    } else {
        syncBtn.hide();
    }
}

// 3. കാർഡ് നിർമ്മാണം (Dynamic HTML)
function createCardHTML(d, index, status) {
    let priceText = calculatePrice(d.quantity, d.state || "kerala");
    let editLink = `order.html?oid=${d.orderid}`;

    return `
    <div class="col-12 col-md-6 mb-3">
        <div class="card order-card shadow-sm border-0 rounded-4">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-light text-dark fw-bold">#${d.orderid}</span>
                    <span class="badge ${status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}">${status.toUpperCase()}</span>
                </div>
                <h5 class="fw-bold mb-1">${d.name.toUpperCase()}</h5>
                <p class="text-muted small mb-2">${d.place}, ${d.district}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-bold text-success">${priceText}</span>
                    <a href="${editLink}" class="btn btn-sm btn-outline-primary rounded-pill px-3">Open Link</a>
                </div>
            </div>
        </div>
    </div>`;
}

// 4. സെർവറിലേക്ക് സിങ്ക് ചെയ്യുന്നു
function syncWithServer() {
    if (pendingUpdates.length === 0) return;
    if (!confirm(`${pendingUpdates.length} മാറ്റങ്ങൾ സെർവറിൽ സേവ് ചെയ്യട്ടെ?`)) return;

    const btn = $('#sync-btn');
    btn.prop('disabled', true).text('Syncing...');

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
                // ലോക്കൽ ബട്ടൺ സ്റ്റേറ്റുകളും ക്ലിയർ ചെയ്യുന്നു
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sent_') || key.startsWith('paid_')) localStorage.removeItem(key);
                });
                pendingUpdates = [];
                alert("വിജയകരമായി സിങ്ക് ചെയ്തു! ✅");
                fetchOrders();
            }
        })
        .catch(err => {
            alert("Sync Error! ഇന്റർനെറ്റ് പരിശോധിക്കുക.");
            btn.prop('disabled', false).text('Retry Sync');
        });
}

// ഹെൽപ്പർ: പ്രൈസ് കാൽക്കുലേഷൻ
function calculatePrice(qty, state) {
    let n = parseInt(qty) || 0;
    let base = n * 650;
    let s = state.toLowerCase();
    let courier = s === 'kerala' ? courierRates.kerala[n] : courierRates.outside[n];
    if (s === 'lakshadweep') courier = (n * 100) + 20;
    return `₹${base + (courier || 0)}/-`;
}

// സെർച്ച് ഫങ്ക്ഷൻ
function filterOrders() {
    renderTabs();
}

function logoutAdmin() {
    if (confirm("Logout ചെയ്യട്ടെ?")) {
        localStorage.removeItem('kafakAdminLoggedIn');
        localStorage.removeItem('kafakAdmin');
        location.reload();
    }
}