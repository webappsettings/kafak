// 🔴 1. UPDATE YOUR NEW GOOGLE SCRIPT ID HERE
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

  // --- 1. EDIT MODE CHECK ---
  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');

  if (oid) {
    // എഡിറ്റ് മോഡ് ആണെങ്കിൽ ലോഡർ കാണിക്കുന്നു
    $('#main-loader').show();
    fetchOrderDetails(oid);
  } else {
    $('#main-loader').fadeOut();
  }

  // --- 2. PINCODE LISTENER ---
  $('#pincode').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, ''); // Numbers only
    availablePin = false;
    checkPincode(this.value.trim());
  });

  // --- 3. POST OFFICE LISTENER ---
  $('#officename').change(function () {
    $('#postoffice').val($(this).val());
  });

  // --- 4. PRICE CALCULATION ---
  $('#quantity, #state').on('change keyup', function () {
    const qty = $('#quantity').val();
    if (qty) {
      const priceText = calculateAmountString(qty);
      $('#amt').text(priceText);
      $('#totalAmt').text(calculateTotalString(priceText));
      $('.price-show').show();
    }
  });

  // Ensure WhatsApp Input is Numbers Only
  $('#whatsapp').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
  });
});

// ==========================================
// 🚀 SMART WIZARD LOGIC (STEP 1 -> STEP 2)
// ==========================================

function handleStep1() {
  const phone = $('#phone').val().replace(/\D/g, '');
  const nameInput = $('#name');
  const nameSection = $('#name-section');
  const btn = $('#btnNext');

  // Basic Validation
  if (phone.length !== 10) {
    alert("Please enter a valid 10-digit mobile number");
    return;
  }

  // CASE A: Name field is visible (User is New & entering name)
  if (nameSection.is(':visible')) {
    if (nameInput.val().trim() === "") {
      alert("Please enter your name to continue");
      nameInput.focus();
      return;
    }
    // New User -> Fill WhatsApp with Phone & Go
    $('#whatsapp').val(phone);
    proceedToStep2();
    return;
  }

  // CASE B: Checking User (First Click)
  const oldText = btn.text();
  btn.text("Checking...").prop('disabled', true);

  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(response => {
      btn.text(oldText).prop('disabled', false);

      if (response.result === 'success') {
        // EXISTING USER -> Auto Fill
        const d = response.data;
        $('#name').val(d.name);
        $('#welcome-text').text(`Welcome back, ${d.name}! 👋`);

        // Fill WhatsApp (Saved one OR Phone)
        $('#whatsapp').val(d.whatsapp || phone);

        // Fill Address
        if ($('#house').val() === '') $('#house').val(d.house);
        if ($('#place').val() === '') $('#place').val(d.place);
        if (d.pincode && $('#pincode').val() === '') {
          $('#pincode').val(d.pincode);
          availablePin = true;
          checkPincode(String(d.pincode), d.postoffice);
        }

        proceedToStep2();

      } else {
        // NEW USER -> Show Name Field
        nameSection.slideDown();
        nameInput.focus();
        $('#welcome-text').text(''); // Clear welcome text
      }
    })
    .catch(err => {
      // Network Error -> Treat as New User to allow manual entry
      btn.text(oldText).prop('disabled', false);
      nameSection.slideDown();
      nameInput.focus();
    });
}

function proceedToStep2() {
  $('#step-1').fadeOut(200, function () {
    $('#step-2').fadeIn(200);

    // Update Progress Bar
    $('#progressBar').css('width', '50%');
    $('#dot-1').addClass('completed').html('✓');
    $('#dot-2').addClass('active');
  });
}

function backToStep1() {
  $('#step-2').fadeOut(200, function () {
    $('#step-1').fadeIn(200);

    // Reset Progress
    $('#progressBar').css('width', '0%');
    $('#dot-1').removeClass('completed').html('1');
    $('#dot-2').removeClass('active');
  });
}

// ==========================================
// 📦 CORE FUNCTIONS
// ==========================================

// --- SUBMIT ORDER (With Spinner) ---
function submitOrder() {
  const btn = $('#submitBtn');

  // Disable & Show Spinner
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
    whatsapp: $('#whatsapp').val(), // Now taken from visible input
    quantity: $('#quantity').val(),
    message: $('#message').val()
  };

  fetch(sc, {
    method: 'POST',
    body: JSON.stringify({ orderData: formData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        successSubmitData = { orderid: data.orderid, timestamp: data.timestamp, data: formData };

        $('.main-card').hide(); // Hide the form card
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

// --- FETCH ORDER DETAILS (Safe Mode) ---
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

        // Fill Data
        $('#name').val(d.name || '');
        $('#phone').val(d.phone || '');
        $('#whatsapp').val(d.whatsapp || d.phone); // Fill WhatsApp
        $('#pincode').val(d.pincode || '');
        $('#state').val(d.state || '');
        $('#quantity').val(d.quantity || '');
        $('#message').val(d.message || '');
        $('#welcome-text').text('Editing Order ✏️');

        availablePin = true;

        // Safe Address Split
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

        enableInputs();

        // 🔴 IMPORTANT: Auto-Switch to Step 2 for Editing
        proceedToStep2();
        // Update button text
        $('#submitBtn').text('UPDATE ORDER');

      } else {
        alert('Order ID not found.');
        window.location.href = 'order.html';
      }
    })
    .catch(err => {
      $('#main-loader').fadeOut();
      alert('Data load error. You can edit manually.');
      enableInputs();
      proceedToStep2(); // Show form even if error
    });
}

function enableInputs() {
  $('#quantity').prop('disabled', false);
  $('#submitBtn').prop('disabled', false);
  $('.price-show').show();
  $('#quantity').trigger('change');
}

// --- PINCODE CHECK ---
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

      if (Array.isArray(data) && data.length > 0) {
        availablePin = true;
        $('#district').val(data[0].district || '');
        $('#state').val(data[0].statename || '');
        $('.pincodeEnable').show();
        $('#quantity').prop('disabled', false);

        const officeDropdown = $('#officename');
        const officeInput = $('#postoffice');

        if (data.length === 1) {
          let poName = cleanPOName(data[0].officename);
          officeInput.val(poName).show();
          officeDropdown.hide().empty();
        } else {
          officeDropdown.empty().append('<option value="">Select Post Office</option>');
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
    } catch (err) { console.log("Pin Error", err); }
  }
}

function cleanPOName(name) {
  if (name.match(/(BO|SO|HO)$/)) return name.replace(/\s(BO|SO|HO)$/, ' PO');
  return name;
}

// --- WHATSAPP & CALCULATIONS ---
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
  const orderTime = successSubmitData.timestamp; // Timestamp
  const d = successSubmitData.data;
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;

  const amountTextW = calculateAmountString(d.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);

  // ⌚ Clock Icon Added
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

// --- FORM VALIDATION ---
jQuery.validator.addMethod("pinavail", function (value, element) {
  return this.optional(element) || availablePin;
}, 'പിൻകോഡ് തെറ്റാണ്!');

$("#order-form").validate({
  errorElement: 'span',
  errorClass: 'error text-danger',
  ignore: ":hidden", // Ignore hidden step 1 inputs when in step 2
  rules: {
    name: { required: true },
    phone: { required: true, number: true, minlength: 10, maxlength: 10 },
    whatsapp: { required: true, number: true, minlength: 10, maxlength: 10 },
    house: { required: true },
    place: { required: true },
    pincode: { required: true, number: true, minlength: 6, pinavail: true },
    quantity: { required: true }
  },
  messages: {
    name: { required: "പേര് നൽകുക" },
    phone: { required: "ഫോൺ നമ്പർ നൽകുക", minlength: "10 അക്ക നമ്പർ" },
    whatsapp: { required: "വാട്സാപ്പ് നമ്പർ നൽകുക" },
    house: { required: "വീട്ടുപേര് നൽകുക" },
    place: { required: "സ്ഥലം നൽകുക" },
    pincode: { required: "പിൻകോഡ് നൽകുക", pinavail: "തെറ്റായ പിൻകോഡ്" },
    quantity: { required: "എണ്ണം തിരഞ്ഞെടുക്കൂ" }
  },
  submitHandler: function (form) {
    submitOrder();
  }
});