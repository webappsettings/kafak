// 🔴 1. GOOGLE SCRIPT URL
const sc = `https://script.google.com/macros/s/AKfycbxU7zcRqyJtGIq422hnS3tIRcNJSRBy6a4Q8f1fLU8IZCNdxPa2VO4tn9uPDyXWZp_4/exec`;

// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null;
var availablePin = false;
var successSubmitData;

$(document).ready(function () {

  // ==========================================
  // 🔐 ADMIN ONLY: MARK PAID BUTTON
  // ==========================================
  const isAdmin = localStorage.getItem('kafakAdmin') === 'true';
  const urlOid = new URLSearchParams(window.location.search).get('oid');

  if (isAdmin && urlOid) {
    // സ്റ്റാറ്റസ് ചെക്ക് ചെയ്യുന്നു
    const isWTSent = localStorage.getItem(`sent_${urlOid}`) === 'true';
    const isPaid = localStorage.getItem(`paid_${urlOid}`) === 'true';

    let adminHTML = "";

    // ഘട്ടം 1: വാട്സാപ്പ് കൺഫേം ചെയ്തിട്ടില്ലെങ്കിൽ അത് മാത്രം കാണിക്കുക
    if (!isWTSent) {
      adminHTML = `
                <button id="btn-sent-${urlOid}" onclick="adminAction('${urlOid}', 'Sent')" 
                    class="btn btn-success btn-sm fw-bold w-100 py-2 shadow">
                    💬 CONFIRM SENT (WhatsApp)
                </button>
            `;
    }
    // ഘട്ടം 2: വാട്സാപ്പ് അയച്ചു കഴിഞ്ഞാൽ പെയ്ഡ് ബട്ടൺ കാണിക്കുക
    else {
      adminHTML = `
                <button id="btn-paid-${urlOid}" onclick="adminAction('${urlOid}', 'Paid')" 
                    class="btn btn-sm fw-bold w-100 py-2 shadow ${isPaid ? 'btn-secondary opacity-50' : 'btn-warning'}"
                    ${isPaid ? 'disabled' : ''}>
                    ${isPaid ? '💰 PAIDED ✅' : '💰 MARK AS PAID'}
                </button>
            `;
    }

    const adminUI = `
            <div id="admin-action-bar" style="position: fixed; bottom: 0; left: 0; width: 100%; background: #1a1a1a; padding: 15px; z-index: 10000; border-radius: 20px 20px 0 0; box-shadow: 0 -5px 15px rgba(0,0,0,0.3);">
                <div class="container">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold small text-warning" style="font-size:10px;">ADMIN TOOL: #${urlOid}</span>
                        <button onclick="closeAdminBar()" class="btn btn-link text-white p-0" style="text-decoration:none;">✕</button>
                    </div>
                    <div id="admin-btn-container">
                        ${adminHTML}
                    </div>
                </div>
            </div>
        `;
    $('body').append(adminUI);
    $('body').css('padding-bottom', '100px');
  }

  // ==========================================
  // 🚀 1. AUTO LOGIN (IMPROVED)
  // ==========================================
  const savedData = localStorage.getItem('kafakUser');
  let autoLoggedIn = false;

  if (savedData && !urlOid) {
    try {
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

        $('#step-1').removeClass('active').hide();
        $('#step-2').addClass('active').fadeIn();
        $('#progressBar').css('width', '50%');
        $('#dot-1').addClass('completed').html('✓');
        $('#dot-2').addClass('active');

        showSummary(u);
        autoLoggedIn = true;
      }
    } catch (e) {
      localStorage.removeItem('kafakUser');
    }
  }

  if (!autoLoggedIn && !urlOid) {
    $('#step-1').addClass('active').show();
  }

  // --- 2. LANGUAGE & EDIT MODE CHECK ---
  const langParam = urlParams.get('lang');
  if (langParam && translations[langParam]) {
    $('.lang-select').val(langParam);
    changeLanguage(langParam);
  }

  if (urlOid) {
    $('#main-loader').show();
    $('#step-1').hide();
    fetchOrderDetails(urlOid);
  } else {
    $('#main-loader').fadeOut();
  }

  // --- 3. INPUT LISTENERS ---
  $('#pincode').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
    availablePin = false;
    $('.pincodeEnable').slideUp();
    $('#quantity').prop('disabled', true).val('');
    $('.price-show').hide();
    checkPincode(this.value.trim());
  });

  $('#officename').change(function () {
    $('#postoffice').val($(this).val());
  });

  $('#quantity, #state').on('change keyup', function () {
    const qty = $('#quantity').val();
    if (qty) {
      const priceText = calculateAmountString(qty);
      $('#amt').text(priceText);
      $('#totalAmt').text(calculateTotalString(priceText));
      $('.price-show').show();
    }
  });

  $('#phone, #whatsapp, #pincode').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
  });
});

// --- CORE FUNCTIONS ---

function handleStep1() {
  const phone = $('#phone').val().replace(/\D/g, '');
  const tempNameInput = $('#temp_name');
  const nameSection = $('#name-section');
  const btn = $('#btnNext');

  if (phone.length !== 10) { alert("ദയവായി 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക"); return; }

  if (nameSection.is(':visible')) {
    if (tempNameInput.val().trim() === "") { alert("നിങ്ങളുടെ പേര് നൽകുക"); return; }
    $('#name').val(tempNameInput.val());
    $('#whatsapp').val(phone);
    saveLocalData({ name: tempNameInput.val(), phone: phone });
    enableEditMode();
    proceedToStep2();
    return;
  }

  const originalContent = btn.html();
  btn.html('Checking...').prop('disabled', true);

  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(response => {
      btn.html(originalContent).prop('disabled', false);
      if (response.result === 'success') {
        const d = response.data;
        $('#name').val(d.name);
        $('#whatsapp').val(d.whatsapp || phone);
        $('#house').val(d.house);
        $('#place').val(d.place);
        if (d.pincode) {
          $('#pincode').val(d.pincode);
          availablePin = true;
          checkPincode(String(d.pincode), d.postoffice);
        }
        saveLocalData(d);
        showSummary(d);
        proceedToStep2();
      } else {
        nameSection.slideDown();
        tempNameInput.focus();
      }
    });
}

function saveLocalData(newData) {
  let currentData = localStorage.getItem('kafakUser') ? JSON.parse(localStorage.getItem('kafakUser')) : {};
  const updatedData = { ...currentData, ...newData };
  localStorage.setItem('kafakUser', JSON.stringify(updatedData));
}

function proceedToStep2() {
  $('#step-1').fadeOut(200, function () {
    $('#step-2').fadeIn(200);
    $('#progressBar').css('width', '50%');
    $('#dot-1').addClass('completed').html('✓');
    $('#dot-2').addClass('active');
  });
}

function backToStep1() {
  $('#step-2').fadeOut(200, function () {
    $('#step-1').fadeIn(200);
    $('#progressBar').css('width', '0%');
    $('#dot-1').removeClass('completed').html('1');
    $('#dot-2').removeClass('active');
  });
}

function showSummary(data) {
  $('#summary-name').text(data.name);
  $('#summary-phone').text(data.phone || $('#phone').val());
  let addr = `${data.house || ''}, ${data.place || ''}`;
  if (data.pincode) addr += ` - ${data.pincode}`;
  $('#summary-address').text(addr);
  $('#address-inputs').hide();
  $('#saved-address-card').fadeIn();
  $('#quantity').prop('disabled', false);
}

function enableEditMode() {
  $('#saved-address-card').hide();
  $('#address-inputs').fadeIn();
  if ($('#pincode').val()) $('.pincodeEnable').slideDown();
}

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
  saveLocalData(formData);
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
        if ($('#address-inputs').is(':visible')) $('.pincodeEnable').slideDown();
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
  const s = $('#state').val().toLowerCase();
  let courier = s === 'kerala' ? courierRates.kerala[n] : courierRates.outside[n];
  if (s === 'lakshadweep') courier = (n * 100) + 20;
  return `Amount(₹): ${base} + ${courier || 0}`;
}

function calculateTotalString(str) {
  const nums = str.match(/\d+/g);
  return `Total(₹): ${parseInt(nums[0]) + parseInt(nums[1])}/-`;
}

function sendToWhatsapp() {
  const phone = '7788990313';
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
        $('#whatsapp').val(d.whatsapp || d.phone);
        $('#pincode').val(d.pincode);
        $('#state').val(d.state);
        $('#quantity').val(d.quantity);
        $('#house').val(d.house);
        $('#place').val(d.place);
        checkPincode(d.pincode, d.postoffice);
        enableEditMode();
        proceedToStep2();
      }
    });
}

function markAsPaid(oid) {
  if (!confirm(`Confirm payment for Order #${oid}?`)) return;
  const btn = $('#admin-bar button');
  btn.text('Updating...').prop('disabled', true);
  fetch(sc, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'updateStatus', oid: oid, status: 'Paid' }) })
    .then(() => { alert("Payment Updated! ✅"); location.reload(); });
}


function adminAction(oid, status) {
  if (!confirm(`ഈ ഓർഡർ ${status} ആയി മാർക്ക് ചെയ്യട്ടെ?`)) return;

  const btnContainer = $('#admin-btn-container');
  const originalBtn = btnContainer.find('button');
  originalBtn.prop('disabled', true).text('Updating...');

  fetch(sc, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ action: 'updateStatus', oid: oid, status: status })
  }).then(() => {
    // ലോക്കൽ സ്റ്റോറേജിൽ സേവ് ചെയ്യുന്നു
    const storageKey = status === 'Sent' ? `sent_${oid}` : `paid_${oid}`;
    localStorage.setItem(storageKey, 'true');

    alert(`${status} Updated! ✅`);

    // UI മാറ്റം വരുത്തുന്നു
    if (status === 'Sent') {
      // Confirm Sent കഴിഞ്ഞാൽ അത് ഹൈഡ് ചെയ്ത് Mark Paid കാണിക്കുന്നു
      const paidBtn = `
                <button id="btn-paid-${oid}" onclick="adminAction('${oid}', 'Paid')" 
                    class="btn btn-warning btn-sm fw-bold w-100 py-2 shadow">
                    💰 MARK AS PAID
                </button>
            `;
      btnContainer.fadeOut(300, function () {
        $(this).html(paidBtn).fadeIn();
      });
    } else {
      // Mark Paid കഴിഞ്ഞാൽ ഗ്രേ ഔട്ട് ആക്കുന്നു
      originalBtn.removeClass('btn-warning').addClass('btn-secondary opacity-50');
      originalBtn.text('💰 PAIDED ✅').prop('disabled', true);
    }
  }).catch(err => {
    alert("Error updating status.");
    originalBtn.prop('disabled', false).text('Retry');
  });
}

const translations = {
  ml: { step1_title: "നിങ്ങളുടെ ഫോൺ നമ്പർ?", next_btn: "അടുത്തത് ➔", order_btn: "ഓർഡർ ചെയ്യാം ✅" },
  en: { step1_title: "What is your Phone Number?", next_btn: "NEXT STEP ➔", order_btn: "PLACE ORDER ✅" }
};

function changeLanguage(lang) {
  $('[data-i18n]').each(function () {
    const key = $(this).data('i18n');
    if (translations[lang][key]) $(this).text(translations[lang][key]);
  });
}

$("#order-form").validate({
  submitHandler: function () { submitOrder(); }
});