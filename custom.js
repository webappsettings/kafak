// 🔴 1. UPDATE YOUR NEW GOOGLE SCRIPT ID HERE
const sc = `https://script.google.com/macros/s/AKfycbyIRamtjufuR-ADwMDidaqLxw5-leivVN1NyNhxDI0QeD0GemVUbPLWSFPwnrecGUOkpg/exec`;


// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null;
var availablePin = false;
var successSubmitData;

$(document).ready(function () {

  // --- 1. CHECK LOCAL STORAGE (NEW FEATURE) ---
  loadUserData();

  // --- 2. EDIT MODE HANDLING ---
  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');

  if (oid) {
    $('#submitBtn').text('ഓർഡർ എടുക്കുന്നു...').prop('disabled', true);
    // Edit mode-ൽ കാർഡ് കാണിക്കണ്ട, എല്ലാം തുറന്നു വെക്കണം
    enableEditMode();
    fetchOrderDetails(oid);
  } else {
    $('#main-loader').fadeOut();
  }

  // --- 3. PINCODE LOGIC ---
  $('#pincode').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
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

      // Fill Fields
      $('#name').val(u.name);
      $('#phone').val(u.phone);
      $('#whatsapp').val(u.whatsapp);
      $('#house').val(u.house);
      $('#place').val(u.place);
      $('#pincode').val(u.pincode);

      // Update Summary Card
      $('#summary-name').text(u.name);
      $('#summary-house').text(u.house);
      $('#summary-place').text(u.place);
      $('#summary-pin').text(u.pincode);
      $('#summary-post').text(u.postoffice);

      // Hide Personal Section & Show Summary
      $('#personal-section').slideUp();
      $('#saved-address-card').fadeIn();

      // Important: Trigger Pincode Logic to set State/District & PO Logic behind the scenes
      checkPincode(u.pincode, u.postoffice);

    } catch (e) {
      console.error("Local storage error", e);
    }
  }
}

// --- ENABLE EDIT MODE (When clicking Edit button) ---
function enableEditMode() {
  $('#saved-address-card').hide();
  $('#personal-section').slideDown();
}

// --- PINCODE FUNCTION ---
async function checkPincode(pin, autoSelectPO = null) {
  availablePin = false;
  // Don't disable quantity here if loading from storage, just check validity

  // Hide fields initially
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
          // Single PO
          let poName = data[0].officename;
          if (poName.match(/(BO|SO|HO)$/)) poName = poName.replace(/\s(BO|SO|HO)$/, ' PO');

          officeInput.val(poName).show();
          officeDropdown.hide().empty();
        }
        else {
          // Multiple PO
          officeDropdown.empty().append('<option value="">Select Post Office (പോസ്റ്റ് ഓഫീസ്?)</option>');
          data.forEach(item => {
            let label = item.officename;
            if (label.match(/(BO|SO|HO)$/)) label = label.replace(/\s(BO|SO|HO)$/, ' PO');
            officeDropdown.append(`<option value="${label}">${label}</option>`);
          });
          officeDropdown.show();
          officeInput.hide().val('');

          // Auto Select PO if available
          if (autoSelectPO) {
            // Wait a microsecond for dropdown to render
            setTimeout(() => {
              // Try to match exact value or text
              let match = $("#officename option").filter(function () {
                return $(this).val() == autoSelectPO || $(this).text() == autoSelectPO;
              }).val();

              if (match) {
                officeDropdown.val(match).trigger('change');
              } else {
                // Fallback
                officeInput.val(autoSelectPO);
              }
            }, 100);
          }
        }
      }
    } catch (err) {
      console.log("Pincode error", err);
      availablePin = false;
    }
  }
}

// --- SUBMIT FUNCTION ---
function submitOrder() {
  $('#submitBtn').prop('disabled', true).text(editingOrderId ? 'Updating...' : 'Processing...');

  // If section is hidden, jQuery validate might skip hidden fields unless we allow it.
  // Since we filled them, they should be valid.

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

  // 🔴 SAVE TO LOCAL STORAGE (Future Use)
  localStorage.setItem('kafakUser', JSON.stringify(formData));

  fetch(sc, {
    method: 'POST',
    body: JSON.stringify({ orderData: formData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        successSubmitData = { orderid: data.orderid, timestamp: data.timestamp, data: formData };
        alert(editingOrderId ? 'ഓർഡർ അപ്ഡേറ്റ് ചെയ്തു! ✅' : 'ഓർഡർ വിജയകരമായി രേഖപ്പെടുത്തി! ✅');
        $('#honeyForm').hide();
        $('#saved-address-card').hide(); // Hide summary too
        showSuccess();
        sendToWhatsapp();
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

// --- HELPER FUNCTIONS ---
function fetchOrderDetails(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`)
    .then(res => res.json())
    .then(response => {
      $('#main-loader').fadeOut();
      if (response.result === 'success') {
        const d = response.data;
        editingOrderId = d.orderid;
        $('#name').val(d.name); $('#phone').val(d.phone); $('#pincode').val(d.pincode);
        $('#state').val(d.state); $('#quantity').val(d.quantity); $('#message').val(d.message);
        $('#whatsapp').val(d.whatsapp);
        availablePin = true;
        const addrParts = d.addressFull.split(', ');
        if (addrParts.length >= 2) {
          $('#house').val(addrParts[0]); $('#place').val(addrParts[1]);
          checkPincode(d.pincode, addrParts[2] || ''); // Load PO logic
          $('#district').val(addrParts[3] || '');
        } else {
          $('#house').val(d.addressFull);
          checkPincode(d.pincode);
        }
        $('#quantity').prop('disabled', false);
        $('#submitBtn').text('Update Order').prop('disabled', false);
        $('.price-show').show();
        $('#quantity').trigger('change');
        alert('എഡിറ്റ് ചെയ്യാൻ ഓർഡർ റെഡിയാണ്.');
      } else {
        alert('ഈ ഓർഡർ എഡിറ്റ് ചെയ്യാൻ സാധിക്കില്ല.');
        window.location.href = window.location.pathname.split('?')[0];
      }
    })
    .catch(err => { $('#main-loader').fadeOut(); alert('നെറ്റ്‌വർക്ക് തകരാർ! വീണ്ടും ശ്രമിക്കുക.'); });
}

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

function showSuccess() { $('#response').show(); $('#showsuccess').show(); }

function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successSubmitData.orderid;
  const d = successSubmitData.data;
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;
  const amountTextW = calculateAmountString(d.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);
  const extra1 = `*✅ Honey order confirmed!* 🍯\n🔖 *#${orderid}*\n🔗 _${editLink}_\n(Click link to edit order)`;
  const postLabel = d.postoffice || '';
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
*${totalTextW}*
____________________________________
\n*Please GPay to the number below...*
\n*${phone} (KAFAK LLP)*\n`;
  const message = encodeURIComponent(extra1 + wtspformat);
  window.open(`https://api.whatsapp.com/send?phone=91${phone}&text=${message}`, '_blank');
}

// --- VALIDATION ---
jQuery.validator.addMethod("pinavail", function (value, element) {
  return this.optional(element) || availablePin;
}, 'പിൻകോഡ് തെറ്റാണ്!');

$("#honeyForm").validate({
  errorElement: 'span',
  errorClass: 'error text-danger',
  // 🔴 IMPORTANT: Do not ignore hidden fields because personal section is hidden!
  ignore: [],
  rules: {
    name: { required: true },
    phone: { required: true, number: true, minlength: 10, maxlength: 10 },
    whatsapp: { required: true, number: true, minlength: 10, maxlength: 10 },
    house: { required: true },
    place: { required: true },
    pincode: { required: true, number: true, minlength: 6, pinavail: true },
    officename: { required: function () { return $('#officename').is(':visible'); } },
    postoffice: { required: true },
    quantity: { required: true }
  },
  messages: {
    name: { required: "നിങ്ങളുടെ പേര് നൽകുക" },
    phone: { required: "ഫോൺ നമ്പർ നൽകുക", number: "നമ്പറുകൾ മാത്രം", minlength: "10 അക്ക നമ്പർ", maxlength: "10 അക്ക നമ്പർ" },
    whatsapp: { required: "വാട്സാപ്പ് നമ്പർ നൽകുക", number: "നമ്പറുകൾ മാത്രം", minlength: "10 അക്ക നമ്പർ" },
    house: { required: "വീട്ടുപേര് നൽകുക" },
    place: { required: "സ്ഥലം നൽകുക" },
    pincode: { required: "പിൻകോഡ് നൽകുക", number: "നമ്പറുകൾ മാത്രം", minlength: "6 അക്ക നമ്പർ", pinavail: "ഈ പിൻകോഡ് ലഭ്യമല്ല" },
    officename: { required: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കൂ" },
    postoffice: { required: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കൂ" },
    quantity: { required: "എത്ര ബോട്ടിൽ വേണമെന്ന് തിരഞ്ഞെടുക്കൂ" }
  },
  submitHandler: function (form) {
    submitOrder();
  },
});