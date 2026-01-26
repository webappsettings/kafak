// 🔴 1. UPDATE YOUR NEW GOOGLE SCRIPT ID HERE (Previously updated one)
const sc = `https://script.google.com/macros/s/AKfycby_1PorN19SVT-nghojK6v6Qv0vdUUAJx9v5rXlDuQw1ruPXIRTaC-ymjhYGjOszGDkRw/exec`;

// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null;
var availablePin = false;
var successSubmitData;

$(document).ready(function () {

  // --- 1. CHECK LOCAL STORAGE ---
  loadUserData();

  // --- 2. EDIT MODE HANDLING ---
  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');

  if (oid) {
    $('#submitBtn').text('ഓർഡർ എടുക്കുന്നു...').prop('disabled', true);
    enableEditMode();
    fetchOrderDetails(oid);
  } else {
    $('#main-loader').fadeOut();
  }

  // --- 3. AUTO-FILL CUSTOMER DETAILS (PHONE FIRST MODE) ---
  $('#phone').on('keyup', function () {
    var phone = $(this).val().replace(/\D/g, '');

    if (phone.length === 10 && !editingOrderId) {

      $('#name').attr('placeholder', 'Searching...');

      fetch(`${sc}?action=getCustomer&phone=${phone}`)
        .then(res => res.json())
        .then(response => {
          $('#name').attr('placeholder', 'Full Name (പേര്)');

          if (response.result === 'success') {
            var d = response.data;

            $('#name').val(d.name);

            if ($('#whatsapp').val().trim() === '') {
              $('#whatsapp').val(d.whatsapp);
            }

            $('#house').focus();

            if (d.pincode) {
              $('#pincode').val(d.pincode);
              availablePin = true;
              // 🔴 FIX: Convert pincode to String before calling function
              // ഇത് നമ്പറിനെ ടെക്സ്റ്റ് ആക്കി മാറ്റുന്നു, അപ്പോൾ വർക്ക് ആകും
              checkPincode(String(d.pincode), d.postoffice);
            }
          }
        });
    }
  });

  // --- 4. PINCODE INPUT LISTENER ---
  $('#pincode').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');

    // Reset validation ONLY when user types manually
    availablePin = false;

    checkPincode(this.value.trim());
  });

  // Post Office Listener
  $('#officename').change(function () {
    $('#postoffice').val($(this).val());
  });

  // Price Calculation
  $('#quantity, #state').on('change keyup', function () {
    const qty = $('#quantity').val();
    if (qty) {
      const priceText = calculateAmountString(qty);
      $('#amt').text(priceText);
      $('#totalAmt').text(calculateTotalString(priceText));
      $('.price-show').show();
    }
  });
});

// --- LOAD USER DATA FROM LOCAL STORAGE ---
function loadUserData() {
  const savedUser = localStorage.getItem('kafakUser');
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);

      $('#name').val(u.name);
      $('#phone').val(u.phone);
      $('#whatsapp').val(u.whatsapp);
      $('#house').val(u.house);
      $('#place').val(u.place);
      $('#pincode').val(u.pincode);

      $('#summary-name').text(u.name);
      $('#summary-house').text(u.house);
      $('#summary-place').text(u.place);
      $('#summary-pin').text(u.pincode);
      $('#summary-post').text(u.postoffice);

      $('#personal-section').slideUp();
      $('#saved-address-card').fadeIn();

      availablePin = true;
      checkPincode(String(u.pincode), u.postoffice);

    } catch (e) {
      console.error("Local storage error", e);
    }
  }
}

function enableEditMode() {
  $('#saved-address-card').hide();
  $('#personal-section').slideDown();
}

// --- PINCODE FUNCTION (Modified) ---
async function checkPincode(pinInput, autoSelectPO = null) {
  // 🔴 FIX: Ensure pin is treated as a string
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

      if (Array.isArray(data) && data.length > 0) {
        availablePin = true;

        $('#district').val(data[0].district || '');
        $('#state').val(data[0].statename || '');
        $('.pincodeEnable').show(); // Show District/State

        $('#quantity').prop('disabled', false); // Enable Quantity

        const officeDropdown = $('#officename');
        const officeInput = $('#postoffice');

        if (data.length === 1) {
          let poName = data[0].officename;
          if (poName.match(/(BO|SO|HO)$/)) poName = poName.replace(/\s(BO|SO|HO)$/, ' PO');

          officeInput.val(poName).show();
          officeDropdown.hide().empty();
        }
        else {
          officeDropdown.empty().append('<option value="">Select Post Office (പോസ്റ്റ് ഓഫീസ്?)</option>');
          data.forEach(item => {
            let label = item.officename;
            if (label.match(/(BO|SO|HO)$/)) label = label.replace(/\s(BO|SO|HO)$/, ' PO');
            officeDropdown.append(`<option value="${label}">${label}</option>`);
          });
          officeDropdown.show();
          officeInput.hide().val('');

          if (autoSelectPO) {
            setTimeout(() => {
              let match = $("#officename option").filter(function () {
                return $(this).val() == autoSelectPO || $(this).text() == autoSelectPO;
              }).val();

              if (match) {
                officeDropdown.val(match).trigger('change');
              } else {
                officeInput.val(autoSelectPO);
              }
            }, 100);
          }
        }
      }
    } catch (err) {
      console.log("Pincode error", err);
    }
  }
}

// --- SUBMIT FUNCTION ---
function submitOrder() {
  $('#submitBtn').prop('disabled', true).text(editingOrderId ? 'Updating...' : 'Processing...');

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

  localStorage.setItem('kafakUser', JSON.stringify(formData));

  fetch(sc, {
    method: 'POST',
    body: JSON.stringify({ orderData: formData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        successSubmitData = { orderid: data.orderid, timestamp: data.timestamp, data: formData };

        $('#honeyForm').hide();
        $('#saved-address-card').hide();

        showSuccess();
        setTimeout(sendToWhatsapp, 1500);

      } else {
        alert('Error: ' + data.message);
        $('#submitBtn').prop('disabled', false).text('Try Again');
      }
    })
    .catch(err => {
      alert('കണക്ഷൻ തകരാർ! വീണ്ടും ശ്രമിക്കുക.');
      $('#submitBtn').prop('disabled', false).text('Try Again');
    });
}

// --- FETCH ORDER DETAILS (FIXED) ---
// --- FETCH ORDER DETAILS (ULTIMATE FIX) ---
function fetchOrderDetails(oid) {
  // ലോഡർ കാണിക്കുന്നു
  $('#main-loader').show();

  fetch(`${sc}?action=getOrder&oid=${oid}`)
    .then(res => res.text()) // ആദ്യം ടെക്സ്റ്റ് ആയി എടുക്കുന്നു (JSON എറർ ഒഴിവാക്കാൻ)
    .then(text => {
      try {
        return JSON.parse(text); // ജെയ്‌സൺ ആക്കാൻ ശ്രമിക്കുന്നു
      } catch (e) {
        console.error("Server Error:", text);
        throw new Error("Server returned Invalid Data");
      }
    })
    .then(response => {
      $('#main-loader').fadeOut();

      if (response.result === 'success') {
        const d = response.data;
        editingOrderId = d.orderid;

        // 1. Basic Fields Fill (Safe Mode)
        // ഡാറ്റ ഉണ്ടെങ്കിൽ മാത്രം വാല്യൂ കൊടുക്കും, ഇല്ലെങ്കിൽ എംപ്റ്റി
        $('#name').val(d.name || '');
        $('#phone').val(d.phone || '');
        $('#pincode').val(d.pincode || '');
        $('#state').val(d.state || '');
        $('#quantity').val(d.quantity || '');
        $('#message').val(d.message || '');
        $('#whatsapp').val(d.whatsapp || '');

        // Pincode validation true ആക്കുന്നു
        availablePin = true;

        // 2. Address Splitting (Extra Safe)
        try {
          let fullAddr = d.addressFull ? String(d.addressFull) : '';
          let addrParts = fullAddr.split(', ');

          if (addrParts.length >= 2) {
            $('#house').val(addrParts[0]);
            $('#place').val(addrParts[1]);
            // പോസ്റ്റ് ഓഫീസ് ഓട്ടോമാറ്റിക് ആയി വരാൻ
            checkPincode(String(d.pincode), addrParts[2] || '');
            $('#district').val(addrParts[3] || '');
          } else {
            $('#house').val(fullAddr);
            // പിൻകോഡ് മാത്രം ചെക്ക് ചെയ്യുന്നു
            if (d.pincode) checkPincode(String(d.pincode));
          }
        } catch (addrErr) {
          console.log("Address Error ignored", addrErr);
          if (d.pincode) checkPincode(String(d.pincode));
        }

        // 3. FINAL STEP: Enable Buttons (ഇത് എപ്പോഴും നടക്കണം)
        enableInputs();

      } else {
        alert('ഓർഡർ കണ്ടുപിടിക്കാൻ സാധിച്ചില്ല (ID Not Found).');
        window.location.href = 'order.html'; // തിരിച്ച് വിടുന്നു
      }
    })
    .catch(err => {
      console.error("Fetch Error:", err);
      $('#main-loader').fadeOut();

      // എറർ വന്നാലും കസ്റ്റമറെ ബ്ലോക്ക് ചെയ്യരുത്. ബട്ടൺ എനേബിൾ ചെയ്യുന്നു.
      alert('ഡാറ്റ ലോഡ് ചെയ്യുന്നതിൽ ചെറിയ തടസ്സം. നിങ്ങൾക്ക് മാന്വലായി എഡിറ്റ് ചെയ്യാം.');
      enableInputs();
    });
}

// ബട്ടണും ക്വാണ്ടിറ്റിയും എനേബിൾ ചെയ്യാനുള്ള പ്രത്യേക ഫങ്ക്ഷൻ
function enableInputs() {
  $('#quantity').prop('disabled', false);
  $('#submitBtn').text('UPDATE ORDER').prop('disabled', false);
  $('.price-show').show();
  $('#quantity').trigger('change');
}

// --- HELPER FUNCTIONS ---
function calculateAmountString(quantityText) {
  const numberOfBottles = parseInt(quantityText);
  if (isNaN(numberOfBottles)) return '';
  const basePrice = 650;
  const amount = numberOfBottles * basePrice;
  const stateVal = $('#state').val().trim().toLowerCase();
  let courierCharge = 0;
  if (stateVal === 'kerala') courierCharge = courierRates.kerala[numberOfBottles] || 0;
  else if (stateVal === 'lakshadweep') courierCharge = (numberOfBottles * 100) + 20;
  else courierCharge = courierRates.outside[numberOfBottles] || 0;
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

  // 🔴 Get Timestamp from response
  const orderTime = successSubmitData.timestamp;

  const d = successSubmitData.data;
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;

  const amountTextW = calculateAmountString(d.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);

  // 🔴 CHANGE: Added Date & Time in Italics (_${orderTime}_)
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

// --- VALIDATION ---
jQuery.validator.addMethod("pinavail", function (value, element) {
  return this.optional(element) || availablePin;
}, 'പിൻകോഡ് തെറ്റാണ്!');

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
    officename: { required: function () { return $('#officename').is(':visible'); } },
    postoffice: { required: function () { return $('#postoffice').is(':visible'); } },
    quantity: { required: true }
  },
  messages: {
    name: { required: "നിങ്ങളുടെ പേര് നൽകുക" },
    phone: { required: "ഫോൺ നമ്പർ നൽകുക", number: "നമ്പറുകൾ മാത്രം", minlength: "10 അക്ക നമ്പർ", maxlength: "10 അക്ക നമ്പർ" },
    whatsapp: { required: "വാട്സാപ്പ് നമ്പർ നൽകുക", number: "നമ്പറുകൾ മാത്രം", minlength: "10 അക്ക നമ്പർ" },
    house: { required: "വീട്ടുപേര് നൽകുക" },
    place: { required: "സ്ഥലം നൽകുക" },
    pincode: { required: "പിൻകോഡ് നൽകുക", number: "നമ്പറുകൾ മാത്രം", minlength: "6 അക്ക നമ്പർ", pinavail: "ഈ പിൻകോഡ് ലഭ്യമല്ല / തെറ്റാണ്" },
    officename: { required: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കൂ" },
    postoffice: { required: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കൂ" },
    quantity: { required: "എത്ര ബോട്ടിൽ വേണമെന്ന് തിരഞ്ഞെടുക്കൂ" }
  },
  submitHandler: function (form) {
    submitOrder();
  },
});