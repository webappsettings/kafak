// 🔴 1. UPDATE YOUR GOOGLE SCRIPT ID HERE
const sc = `https://script.google.com/macros/s/AKfycbytJW88K8vaC1MOdd2GvEYGXdkLucaTFrpDNCA8XlvPfv1eC-WiW4sd6qSFJH3NFM0tvQ/exec`;

// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null;
var availablePin = false;
var successSubmitData;

$(document).ready(function () {

  // ============================================================
  // 🚀 1. AUTO LOGIN (IMPROVED)
  // ============================================================
  const savedData = localStorage.getItem('kafakUser');
  let autoLoggedIn = false;

  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');

  // Edit Mode അല്ലെങ്കിൽ മാത്രം Auto Login നോക്കിയാൽ മതി
  if (savedData && !oid) {
    try {
      const u = JSON.parse(savedData);

      if (u.phone) {
        // 1. Fill Hidden Inputs
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

        // 2. FORCE UI SWITCH (Hide Step 1, Show Step 2)
        $('#step-1').removeClass('active').hide();
        $('#step-2').addClass('active').fadeIn();

        // 3. Update Progress Bar
        $('#progressBar').css('width', '50%');
        $('#dot-1').addClass('completed').html('✓');
        $('#dot-2').addClass('active');

        // 4. Show Summary Card
        u.name = u.name || "Customer";
        showSummary(u);

        autoLoggedIn = true;
      }
    } catch (e) {
      console.log('Local data error', e);
      localStorage.removeItem('kafakUser');
    }
  }

  // Auto Login നടന്നില്ലെങ്കിൽ, Step 1 വ്യക്തമായി കാണിക്കുക
  if (!autoLoggedIn && !oid) {
    $('#step-1').addClass('active').show();
    $('#step-2').removeClass('active').hide();
  }
  // ============================================================


  // --- 2. LANGUAGE & URL CHECK ---
  const langParam = urlParams.get('lang');
  if (langParam && translations[langParam]) {
    $('.lang-select').val(langParam);
    changeLanguage(langParam);
  }

  // --- 3. EDIT MODE CHECK ---
  if (oid) {
    $('#main-loader').show();
    $('#step-1').hide();
    fetchOrderDetails(oid);
  } else {
    $('#main-loader').fadeOut();
  }

  // --- 4. INPUT LISTENERS ---
  $('#pincode').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
    availablePin = false;

    $('.pincodeEnable').slideUp();
    $('#officename').hide();
    $('#postoffice').hide();
    $('#quantity').prop('disabled', true).val('');
    $('.price-show').hide();

    $('#pincode-error').remove();
    $('#officename-error').remove();
    $('#postoffice-error').remove();
    $('.form-control-custom').removeClass('error');

    checkPincode(this.value.trim());
  });

  $('#officename').change(function () {
    $('#postoffice').val($(this).val());
    $('#officename-error').remove();
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

// ==========================================
// 🚀 SMART WIZARD LOGIC
// ==========================================

function handleStep1() {
  const phone = $('#phone').val().replace(/\D/g, '');
  const tempNameInput = $('#temp_name');
  const nameSection = $('#name-section');
  const btn = $('#btnNext');

  if (phone.length !== 10) {
    alert("ദയവായി 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക");
    return;
  }

  // CASE A: New User Step 1 (Manual Entry)
  if (nameSection.is(':visible')) {
    if (tempNameInput.val().trim() === "") {
      alert("നിങ്ങളുടെ പേര് നൽകുക");
      tempNameInput.focus();
      return;
    }
    $('#name').val(tempNameInput.val());
    $('#whatsapp').val(phone);

    // 🔴 IMPORTANT: Save Data IMMEDIATELY on Next Click
    saveLocalData({
      name: tempNameInput.val(),
      phone: phone,
      whatsapp: phone
    });

    enableEditMode();
    proceedToStep2();
    return;
  }

  // CASE B: Checking User (API Call)
  const originalContent = btn.html();
  btn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Checking...')
    .prop('disabled', true);

  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(response => {
      btn.html(originalContent).prop('disabled', false);

      if (response.result === 'success') {
        const d = response.data;

        // Fill Form
        $('#name').val(d.name);
        $('#whatsapp').val(d.whatsapp || phone);
        $('#house').val(d.house);
        $('#place').val(d.place);

        if (d.pincode) {
          $('#pincode').val(d.pincode);
          availablePin = true;
          checkPincode(String(d.pincode), d.postoffice);
        }

        // Save & Show Summary
        saveLocalData(d);
        showSummary(d);
        proceedToStep2();

      } else {
        // New User -> Ask Name
        nameSection.slideDown();
        tempNameInput.focus();
      }
    })
    .catch(err => {
      btn.html(originalContent).prop('disabled', false);
      nameSection.slideDown();
      tempNameInput.focus();
    });
}

// Helper to save safely
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

// ==========================================
// 📦 SUMMARY & EDIT LOGIC
// ==========================================

function showSummary(data) {
  $('#summary-name').text(data.name);
  $('#summary-phone').text(data.phone || $('#phone').val());
  $('#summary-whatsapp').text(data.whatsapp || $('#phone').val());

  let addr = `${data.house || ''}, ${data.place || ''}`;
  if (data.postoffice) addr += `, ${data.postoffice}`;
  if (data.pincode) addr += ` - ${data.pincode}`;

  $('#summary-address').text(addr);

  $('#address-inputs').hide();
  $('#saved-address-card').fadeIn();
  $('#quantity').prop('disabled', false);
}

function enableEditMode() {
  $('#saved-address-card').hide();
  $('#address-inputs').fadeIn();

  if ($('#pincode').val()) {
    $('.pincodeEnable').slideDown();
  }
}

// ==========================================
// 📦 CORE FUNCTIONS
// ==========================================

function submitOrder() {
  const btn = $('#submitBtn');
  btn.prop('disabled', true).html(
    `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...`
  );

  const poValue = $('#postoffice').val();

  const formData = {
    orderid: editingOrderId || null,
    name: $('#name').val(),
    phone: $('#phone').val(),
    house: $('#house').val(),
    place: $('#place').val(),
    postoffice: poValue,
    pincode: $('#pincode').val(),
    district: $('#district').val(),
    state: $('#state').val(),
    whatsapp: $('#whatsapp').val(),
    quantity: $('#quantity').val(),
    message: $('#message').val()
  };

  // Save to Local Storage
  saveLocalData(formData);

  fetch(sc, {
    method: 'POST',
    body: JSON.stringify({ orderData: formData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        successSubmitData = { orderid: data.orderid, timestamp: data.timestamp, data: formData };
        $('.main-card').hide();
        showSuccess();
        setTimeout(sendToWhatsapp, 1500);
      } else {
        alert('Error: ' + data.message);
        btn.prop('disabled', false).text('Try Again');
      }
    })
    .catch(err => {
      alert('Network Error! Please try again.');
      btn.prop('disabled', false).text('Try Again');
    });
}

function fetchOrderDetails(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`)
    .then(res => res.text())
    .then(text => {
      try { return JSON.parse(text); }
      catch (e) { throw new Error("Server Data Error"); }
    })
    .then(response => {
      $('#main-loader').fadeOut();

      if (response.result === 'success') {
        const d = response.data;
        editingOrderId = d.orderid;

        $('#name').val(d.name || '');
        $('#phone').val(d.phone || '');
        $('#whatsapp').val(d.whatsapp || d.phone);
        $('#pincode').val(d.pincode || '');
        $('#state').val(d.state || '');
        $('#quantity').val(d.quantity || '');
        $('#message').val(d.message || '');

        availablePin = true;

        try {
          let fullAddr = d.addressFull ? String(d.addressFull) : '';
          let addrParts = fullAddr.split(', ');
          if (addrParts.length >= 2) {
            $('#house').val(addrParts[0]);
            $('#place').val(addrParts[1]);
            checkPincode(String(d.pincode), addrParts[2] || '');
            $('#district').val(addrParts[3] || '');
          } else {
            $('#house').val(fullAddr);
            if (d.pincode) checkPincode(String(d.pincode));
          }
        } catch (e) {
          if (d.pincode) checkPincode(String(d.pincode));
        }

        enableEditMode();
        proceedToStep2();
        $('#submitBtn').text('UPDATE ORDER');

      } else {
        alert('Order ID not found.');
        window.location.href = 'order.html';
      }
    })
    .catch(err => {
      $('#main-loader').fadeOut();
      alert('Data load error. You can edit manually.');
      enableEditMode();
      proceedToStep2();
    });
}

async function checkPincode(pinInput, autoSelectPO = null) {
  const pin = String(pinInput).trim();
  if (!autoSelectPO) {
    $('#officename').hide();
    $('#postoffice').hide().val('');
  }

  if (pin.length === 6) {
    try {
      const response = await fetch(`pincode_json_files/${pin}.json`);
      if (!response.ok) throw new Error('Not found');
      const data = await response.json();

      if ($('#pincode').val().trim() !== pin) return;

      if (Array.isArray(data) && data.length > 0) {
        availablePin = true;
        $('#district').val(data[0].district || '');
        $('#state').val(data[0].statename || '');

        if ($('#address-inputs').is(':visible')) {
          $('.pincodeEnable').slideDown();
        }

        $('#quantity').prop('disabled', false);

        const officeDropdown = $('#officename');
        const officeInput = $('#postoffice');

        if (data.length === 1) {
          let poName = cleanPOName(data[0].officename);
          officeInput.val(poName).show();
          officeDropdown.hide().empty();
        } else {
          officeDropdown.empty().append('<option value="">തിരഞ്ഞെടുക്കൂ...</option>');
          data.forEach(item => {
            officeDropdown.append(`<option value="${cleanPOName(item.officename)}">${cleanPOName(item.officename)}</option>`);
          });
          officeDropdown.show();
          officeInput.hide().val('');

          if (autoSelectPO) {
            setTimeout(() => {
              let match = $("#officename option").filter(function () {
                return $(this).val() == autoSelectPO || $(this).text() == autoSelectPO;
              }).val();
              if (match) officeDropdown.val(match).trigger('change');
              else officeInput.val(autoSelectPO);
            }, 100);
          }
        }
      }
    } catch (err) {
      console.log("Pin Error", err);
      if ($('#pincode').val().trim() !== pin) return;
    }
  }
}

function cleanPOName(name) {
  if (name.match(/(BO|SO|HO)$/)) return name.replace(/\s(BO|SO|HO)$/, ' PO');
  return name;
}

// --- CALCULATIONS & WHATSAPP ---
function calculateAmountString(quantityText) {
  const n = parseInt(quantityText);
  if (isNaN(n)) return '';
  const basePrice = 650;
  const amount = n * basePrice;
  const stateVal = $('#state').val().trim().toLowerCase();
  let courierCharge = 0;
  if (stateVal === 'kerala') courierCharge = courierRates.kerala[n] || 0;
  else if (stateVal === 'lakshadweep') courierCharge = (n * 100) + 20;
  else courierCharge = courierRates.outside[n] || 0;
  return `Amount(₹): ${amount} + ${courierCharge}`;
}

function calculateTotalString(amountString) {
  const numbers = amountString.match(/\d+/g);
  if (!numbers || numbers.length < 2) return '';
  return `Total(₹): ${parseInt(numbers[0]) + parseInt(numbers[1])}/-`;
}

function showSuccess() { $('#showsuccess').show(); }

function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successSubmitData.orderid;
  const orderTime = successSubmitData.timestamp;
  const d = successSubmitData.data;

  const currentLang = $('.lang-select').val() || 'ml';
  const editLink = `kafaklife.com/order.html?oid=${orderid}&lang=${currentLang}`;

  const amountTextW = calculateAmountString(d.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);

  const extra1 = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderid}\`\`\`\n⌚ _${orderTime}_\n🔗 _${editLink}_\n(Click link to edit order)`;

  const postLabel = d.postoffice || '';
  const customerMsg = d.message ? `\n\n💬 *Note:* _${d.message}_` : '';

  const wtspformat = `
____________________________________\n
*${d.name.trim().toUpperCase()}*
*${d.house.trim().toUpperCase()}*
*${d.place.trim().toUpperCase()}*
*${postLabel.trim().toUpperCase()}*
*${d.district.trim().toUpperCase()}*
*${d.state.trim().toUpperCase()}*
*Pin: ${d.pincode.trim()}*
*Ph: ${d.phone.trim()}*\n
*Qty: ${d.quantity}*
*${amountTextW}*\n
*${totalTextW}*${customerMsg}
____________________________________
\n*Please GPay to the number below...*
_(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്യുക)_ 👇
\n*${phone} (KAFAK LLP)*\n`;

  const message = encodeURIComponent(extra1 + wtspformat);
  window.location.href = `https://wa.me/91${phone}?text=${message}`;
}

// --- TRANSLATION ---
const translations = {
  ml: {
    home: "ഹോം",
    step1_title: "നിങ്ങളുടെ ഫോൺ നമ്പർ?",
    step1_desc: "ഓർഡർ ചെയ്യാൻ മൊബൈൽ നമ്പർ നൽകുക",
    new_user_name: "ആദ്യമായിട്ടാണല്ലോ.. പേര് എന്താണ്?",
    your_name: "നിങ്ങളുടെ പേര്",
    next_btn: "അടുത്തത് ➔",
    step2_title: "വിലാസം നൽകുക 🏠",
    label_name: "പേര് (വേണമെങ്കിൽ മാറ്റാം)",
    label_whatsapp: "വാട്സാപ്പ് നമ്പർ",
    ph_house: "വീട്ടുപേര്",
    ph_place: "സ്ഥലം",
    ph_pincode: "പിൻകോഡ് (6 digits)",
    label_qty: "എത്ര ബോട്ടിൽ വേണം? 👇",
    select_opt: "തിരഞ്ഞെടുക്കൂ...",
    ph_msg: "എന്തെങ്കിലും പറയാനുണ്ടോ? (Optional)",
    back_btn: "പുറകോട്ട്",
    order_btn: "ഓർഡർ ചെയ്യാം ✅",
    order_success: "ഓർഡർ ലഭിച്ചു!",
    redirecting: "വാട്സാപ്പിലേക്ക് പോകുന്നു..."
  },
  en: {
    home: "Home",
    step1_title: "What is your Phone Number?",
    step1_desc: "Enter mobile number to verify",
    new_user_name: "First time here? What's your name?",
    your_name: "Your Name",
    next_btn: "NEXT STEP ➔",
    step2_title: "Delivery Address 🏠",
    label_name: "Name (Editable)",
    label_whatsapp: "WhatsApp Number",
    ph_house: "House Name / No",
    ph_place: "Place / Street",
    ph_pincode: "Pincode (6 digits)",
    label_qty: "Choose Quantity 👇",
    select_opt: "Select...",
    ph_msg: "Any message? (Optional)",
    back_btn: "Back",
    order_btn: "PLACE ORDER ✅",
    order_success: "Order Placed!",
    redirecting: "Redirecting to WhatsApp..."
  }
};

function changeLanguage(lang) {
  $('[data-i18n]').each(function () {
    const key = $(this).data('i18n');
    if (translations[lang][key]) $(this).text(translations[lang][key]);
  });
  $('[data-i18n-ph]').each(function () {
    const key = $(this).data('i18n-ph');
    if (translations[lang][key]) $(this).attr('placeholder', translations[lang][key]);
  });
}

// --- VALIDATION ---
jQuery.validator.addMethod("pinavail", function (value, element) {
  return this.optional(element) || availablePin;
}, 'തെറ്റായ പിൻകോഡ്');

$("#order-form").validate({
  errorElement: 'span',
  errorClass: 'error text-danger',
  ignore: [],
  rules: {
    name: { required: true },
    phone: { required: true, number: true, minlength: 10, maxlength: 10 },
    whatsapp: { required: true, number: true, minlength: 10, maxlength: 10 },
    house: { required: true },
    place: { required: true },
    pincode: { required: true, number: true, minlength: 6, pinavail: true },

    officename: {
      required: function () { return $('#officename').is(':visible'); }
    },
    quantity: { required: true }
  },
  messages: {
    name: { required: "പേര് നൽകുക" },
    phone: { required: "ഫോൺ നമ്പർ നൽകുക", minlength: "10 അക്ക നമ്പർ" },
    whatsapp: { required: "വാട്സാപ്പ് നമ്പർ നൽകുക" },
    house: { required: "വീട്ടുപേര് നൽകുക" },
    place: { required: "സ്ഥലം നൽകുക" },
    pincode: { required: "പിൻകോഡ് നൽകുക", pinavail: "തെറ്റായ പിൻകോഡ്" },
    officename: { required: "പോസ്റ്റ് ഓഫീസ് നിർബന്ധമാണ്" },
    quantity: { required: "എണ്ണം തിരഞ്ഞെടുക്കൂ" }
  },
  submitHandler: function (form) {
    submitOrder();
  }
});