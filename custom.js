// 🔴 1. GOOGLE SCRIPT URL
const sc = `https://script.google.com/macros/s/AKfycbzzBowat6eZU-1IWFvxK8Beqi_mfgWx2DAae8NhYEGQ1pohBciil9ULNXb7UnDV61g1fA/exec`;

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
  const isAdminDevice = localStorage.getItem('kafakAdmin') === 'true';
  const urlParams = new URLSearchParams(window.location.search);
  const urlOid = urlParams.get('oid');

  if (isAdminDevice && urlOid) {
    const adminBar = `
          <div id="admin-bar" style="position: fixed; bottom: 0; left: 0; width: 100%; background: #212529; padding: 15px; border-radius: 20px 20px 0 0; box-shadow: 0 -5px 20px rgba(0,0,0,0.2); z-index: 9999; display: flex; gap: 10px; align-items: center; justify-content: center;">
              <span class="text-white fw-bold small">ADMIN:</span>
              <button onclick="markAsPaid('${urlOid}')" class="btn btn-warning fw-bold btn-sm flex-grow-1" style="max-width: 200px;">
                  💰 MARK AS PAID
              </button>
          </div>
      `;
    $('body').append(adminBar);
    $('body').css('padding-bottom', '80px');
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