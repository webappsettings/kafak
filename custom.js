// 🔴 1. GOOGLE SCRIPT URL
const sc = `https://script.google.com/macros/s/AKfycbzQErIZrh_LBrysFtBmOrR_kPmHH1nOcW9jy6mfUrKs7IVTvBUBdYGvkenSONYOsFna/exec`;

// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null;
var availablePin = false;
var successSubmitData;

$(document).ready(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const urlOid = urlParams.get('oid');
  const isAdmin = localStorage.getItem('kafakAdmin') === 'true';

  // ==========================================
  // 🔐 ADMIN ONLY: SMART LOCAL SYNC BAR
  // ==========================================
  if (isAdmin && urlOid) {
    // ലോക്കൽ പെൻഡിംഗ് അപ്‌ഡേറ്റുകൾ പരിശോധിക്കുന്നു
    const isWTSent = localStorage.getItem(`sent_${urlOid}`) === 'true';
    const isPaid = localStorage.getItem(`paid_${urlOid}`) === 'true';

    let adminHTML = "";

    // Step 1: Confirm Sent മാത്രം കാണിക്കുന്നു
    if (!isWTSent) {
      adminHTML = `<button id="btn-sent-${urlOid}" onclick="adminActionLocal('${urlOid}', 'Sent')" class="btn btn-success btn-sm fw-bold w-100 py-2 shadow">💬 CONFIRM SENT (Local)</button>`;
    }
    // Step 2: Sent ആയിക്കഴിഞ്ഞാൽ Mark Paid കാണിക്കുന്നു
    else {
      adminHTML = `<button id="btn-paid-${urlOid}" onclick="adminActionLocal('${urlOid}', 'Paid')" 
                    class="btn btn-sm fw-bold w-100 py-2 shadow ${isPaid ? 'btn-secondary opacity-50' : 'btn-warning'}" 
                    ${isPaid ? 'disabled' : ''}>
                    ${isPaid ? '💰 PAIDED ✅' : '💰 MARK AS PAID'}
                  </button>`;
    }

    const adminUI = `
        <div id="admin-action-bar" style="position: fixed; bottom: 0; left: 0; width: 100%; background: #1a1a1a; padding: 15px; z-index: 10000; border-radius: 20px 20px 0 0; box-shadow: 0 -5px 15px rgba(0,0,0,0.3);">
            <div class="container">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-bold small text-warning" style="font-size:10px;">ADMIN TOOL (LOCAL): #${urlOid}</span>
                    <button onclick="closeAdminBar()" class="btn btn-link text-white p-0" style="text-decoration:none;">✕</button>
                </div>
                <div id="admin-btn-container">${adminHTML}</div>
            </div>
        </div>`;
    $('body').append(adminUI);
    $('body').css('padding-bottom', '100px');
  }

  // --- AUTO LOGIN & OTHER LISTENER LOGIC ---
  const savedData = localStorage.getItem('kafakUser');
  if (savedData && !urlOid) {
    const u = JSON.parse(savedData);
    if (u.phone) {
      $('#phone').val(u.phone);
      $('#name').val(u.name || '');
      $('#whatsapp').val(u.whatsapp || u.phone);
      $('#house').val(u.house || '');
      $('#place').val(u.place || '');
      if (u.pincode) {
        $('#pincode').val(u.pincode);
        availablePin = true;
        checkPincode(String(u.pincode), u.postoffice);
      }
      $('#step-1').hide();
      $('#step-2').fadeIn();
      showSummary(u);
    }
  }

  // Edit Link വഴി വരുമ്പോൾ Loader കാണിക്കുന്നു
  if (urlOid) {
    $('#main-loader').show();
    $('#step-1').hide();
    fetchOrderDetails(urlOid);
  } else {
    $('#main-loader').fadeOut();
  }
});

// ==========================================
// 🚀 LOCAL ACTION LOGIC (No Server Wait)
// ==========================================
function adminActionLocal(oid, status) {
  if (!confirm(`ഈ ഓർഡർ ${status} ആയി മാർക്ക് ചെയ്യട്ടെ?` || "Mark this order?")) return;

  // 1. പെൻഡിംഗ് ലിസ്റ്റ് അപ്‌ഡേറ്റ് ചെയ്യുന്നു
  let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

  // പഴയ ഇൻട്രി ഉണ്ടെങ്കിൽ കളയുന്നു (Duplicate ഒഴിവാക്കാൻ)
  updates = updates.filter(item => item.oid !== oid || item.status !== status);
  updates.push({ oid: oid, status: status, time: new Date().getTime() });

  localStorage.setItem('pendingUpdates', JSON.stringify(updates));

  // 2. ബട്ടൺ ലേബൽ അപ്‌ഡേറ്റ് ചെയ്യാൻ സ്റ്റാറ്റസ് ലോക്കലായി സേവ് ചെയ്യുന്നു
  localStorage.setItem(`${status === 'Paid' ? 'paid' : 'sent'}_${oid}`, 'true');

  alert(`ലോക്കലായി സേവ് ചെയ്തു: ${status} ✅\nAdmin Panel തുറക്കുമ്പോൾ Sync ചെയ്യുക.`);
  location.reload(); // ബട്ടൺ മാറാൻ പേജ് റിഫ്രഷ് ചെയ്യുന്നു
}

function closeAdminBar() {
  $('#admin-action-bar').fadeOut();
  $('body').css('padding-bottom', '0');
}

// ==========================================
// 📦 CORE FUNCTIONS (Submit, Pincode etc.)
// ==========================================
function submitOrder() {
  const btn = $('#submitBtn');
  btn.prop('disabled', true).html('Processing...');
  const formData = {
    orderid: editingOrderId || null,
    name: $('#name').val(),
    phone: $('#phone').val(),
    house: $('#house').val(),
    place: $('#place').val(),
    postoffice: $('#postoffice').val() || $('#officename').val(),
    pincode: $('#pincode').val(),
    district: $('#district').val(),
    state: $('#state').val(),
    whatsapp: $('#whatsapp').val(),
    quantity: $('#quantity').val(),
    message: $('#message').val()
  };

  fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: formData }) })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        successSubmitData = { orderid: data.orderid, timestamp: data.timestamp, data: formData };
        $('.main-card').hide();
        $('#showsuccess').show();
        setTimeout(sendToWhatsapp, 1500);
      }
    });
}

async function checkPincode(pinInput, autoSelectPO = null) {
  const pin = String(pinInput).trim();
  if (pin.length === 6) {
    try {
      const response = await fetch(`pincode_json_files/${pin}.json`);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        availablePin = true;
        $('#district').val(data[0].district || '');
        $('#state').val(data[0].statename || '');
        $('.pincodeEnable').slideDown();
        $('#quantity').prop('disabled', false);
        const officeDropdown = $('#officename');
        const officeInput = $('#postoffice');
        if (data.length === 1) {
          officeInput.val(data[0].officename).show();
          officeDropdown.hide();
        } else {
          officeDropdown.empty().append('<option value="">തിരഞ്ഞെടുക്കൂ...</option>');
          data.forEach(item => officeDropdown.append(`<option value="${item.officename}">${item.officename}</option>`));
          officeDropdown.show();
          if (autoSelectPO) officeDropdown.val(autoSelectPO);
        }
      }
    } catch (err) { console.log(err); }
  }
}

function calculateAmountString(qty) {
  const n = parseInt(qty);
  const base = n * 650;
  const s = $('#state').val() ? $('#state').val().toLowerCase() : 'kerala';
  let courier = s === 'kerala' ? courierRates.kerala[n] : courierRates.outside[n];
  if (s === 'lakshadweep') courier = (n * 100) + 20;
  return `Amount(₹): ${base} + ${courier || 0}`;
}

function calculateTotalString(str) {
  const nums = str.match(/\d+/g);
  return `Total(₹): ${parseInt(nums[0]) + parseInt(nums[1])}/-`;
}

function sendToWhatsapp() {
  const phone = '7788990313'; // KAFAK LLP
  const orderid = successSubmitData.orderid;
  const d = successSubmitData.data;
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;
  const amountText = calculateAmountString(d.quantity) + ' (Courier)';
  const totalText = calculateTotalString(amountText);

  const extra = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderid}\`\`\`\n⌚ _${successSubmitData.timestamp}_\n🔗 _${editLink}_`;
  const format = `\n____________________________________\n*${d.name.trim().toUpperCase()}*\n*${d.house.trim().toUpperCase()}*\n*${d.place.trim().toUpperCase()}*\n*${(d.postoffice || '').trim().toUpperCase()}*\n*${d.district.trim().toUpperCase()}*\n*${d.state.trim().toUpperCase()}*\n*Pin: ${d.pincode.trim()}*\n*Ph: ${d.phone.trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;

  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}

function fetchOrderDetails(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`)
    .then(res => res.json())
    .then(response => {
      $('#main-loader').fadeOut();
      if (response.result === 'success') {
        const d = response.data;
        editingOrderId = d.orderid;
        $('#name').val(d.name);
        $('#phone').val(d.phone);
        $('#pincode').val(d.pincode);
        $('#state').val(d.state);
        $('#quantity').val(d.quantity);
        $('#house').val(d.house);
        $('#place').val(d.place);
        checkPincode(d.pincode, d.postoffice);
        enableEditMode();
      }
    });
}