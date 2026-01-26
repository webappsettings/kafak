// 🔴 1. UPDATE YOUR NEW GOOGLE SCRIPT ID HERE
const sc = `https://script.google.com/macros/s/AKfycbw2zFbJuK3KoK1-ga2KYukpFI3XksC1RXae6n_GVcuPee2U8DI3tVZZiNmsLOij-vizxg/exec`;

// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null;
var availablePin = false;
var successSubmitData;

$(document).ready(function () {

  // --- 1. HANDLE LOADING & EDIT MODE ---
  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');

  if (oid) {
    $('#submitBtn').text('ഓർഡർ എടുക്കുന്നു...').prop('disabled', true);
    fetchOrderDetails(oid);
  } else {
    $('#main-loader').fadeOut();
  }

  // --- 2. PINCODE LOGIC ---
  $('#pincode').on('input', async function () {
    this.value = this.value.replace(/[^0-9]/g, '');
    const pin = this.value.trim();

    // Reset fields
    availablePin = false;
    $('#quantity').prop('disabled', true).val('');
    $('.price-show').hide();

    // Hide both PO fields initially
    $('#officename').hide();
    $('#postoffice').hide().val('');

    if (pin.length === 6) {
      try {
        const response = await fetch(`pincode_json_files/${pin}.json`);
        if (!response.ok) throw new Error('Not found');
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          availablePin = true;

          // Auto-fill District & State
          $('#district').val(data[0].district || '');
          $('#state').val(data[0].statename || '');
          $('.pincodeEnable').show();

          $('#quantity').prop('disabled', false);

          // POST OFFICE LOGIC
          const officeDropdown = $('#officename');
          const officeInput = $('#postoffice');

          if (data.length === 1) {
            // CASE 1: Single PO
            let poName = data[0].officename;
            if (poName.match(/(BO|SO|HO)$/)) {
              poName = poName.replace(/\s(BO|SO|HO)$/, ' PO');
            }
            officeInput.val(poName).show();
            officeDropdown.hide().empty();
          }
          else {
            // CASE 2: Multiple PO
            officeDropdown.empty().append('<option value="">Select Post Office (പോസ്റ്റ് ഓഫീസ്?)</option>');
            data.forEach(item => {
              let label = item.officename;
              if (label.match(/(BO|SO|HO)$/)) {
                label = label.replace(/\s(BO|SO|HO)$/, ' PO');
              }
              officeDropdown.append(`<option value="${label}">${label}</option>`);
            });
            officeDropdown.show();
            officeInput.hide().val('');
          }

        }
      } catch (err) {
        console.log("Pincode error", err);
        availablePin = false;
      }
    }
  });

  // Post Office Selection Listener
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

// --- 3. FETCH ORDER FOR EDITING ---
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
        $('#message').val(d.message);

        availablePin = true;

        const addrParts = d.addressFull.split(', ');
        if (addrParts.length >= 2) {
          $('#house').val(addrParts[0]);
          $('#place').val(addrParts[1]);
          $('#postoffice').val(addrParts[2] || '').show();
          $('#district').val(addrParts[3] || '');
          $('#officename').hide();
        } else {
          $('#house').val(d.addressFull);
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
    .catch(err => {
      $('#main-loader').fadeOut();
      alert('നെറ്റ്‌വർക്ക് തകരാർ! വീണ്ടും ശ്രമിക്കുക.');
    });
}

// --- 4. SUBMIT FUNCTION ---
function submitOrder() {
  $('#submitBtn').prop('disabled', true).text(editingOrderId ? 'Updating...' : 'Processing...');

  const poValue = $('#postoffice').val();

  if (!poValue) {
    alert("ദയവായി പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കൂ.");
    $('#submitBtn').prop('disabled', false).text(editingOrderId ? 'Update Order' : 'Place Order');
    return;
  }

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

  fetch(sc, {
    method: 'POST',
    body: JSON.stringify({ orderData: formData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        successSubmitData = { orderid: data.orderid, timestamp: data.timestamp, data: formData };

        // Alert in Malayalam/English mix
        alert(editingOrderId ? 'ഓർഡർ അപ്ഡേറ്റ് ചെയ്തു! ✅' : 'ഓർഡർ വിജയകരമായി രേഖപ്പെടുത്തി! ✅');

        $('#honeyForm').hide();
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

function showSuccess() {
  $('#response').show();
  $('#showsuccess').show();
}

function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successSubmitData.orderid;
  const d = successSubmitData.data;

  const editLink = `kafaklife.com/order.html?oid=${orderid}`;

  const amountTextW = calculateAmountString(d.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);

  // WhatsApp Message
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

// --- MALAYALAM VALIDATION ---
jQuery.validator.addMethod("pinavail", function (value, element) {
  return this.optional(element) || availablePin;
}, 'പിൻകോഡ് തെറ്റാണ്!'); // Malayalam Error

$("#honeyForm").validate({
  errorElement: 'span',
  errorClass: 'error text-danger',
  rules: {
    name: { required: true },
    phone: { required: true, number: true, minlength: 10, maxlength: 10 },
    whatsapp: { required: true, number: true, minlength: 10, maxlength: 10 },
    house: { required: true },
    place: { required: true },
    pincode: { required: true, number: true, minlength: 6, pinavail: true },
    quantity: { required: true }
  },
  // 🔴 MALAYALAM MESSAGES ADDED HERE
  messages: {
    name: { required: "നിങ്ങളുടെ പേര് നൽകുക" },
    phone: {
      required: "ഫോൺ നമ്പർ നൽകുക",
      number: "നമ്പറുകൾ മാത്രം നൽകുക",
      minlength: "10 അക്ക നമ്പർ നൽകുക",
      maxlength: "10 അക്ക നമ്പർ നൽകുക"
    },
    whatsapp: {
      required: "വാട്സാപ്പ് നമ്പർ നൽകുക",
      number: "നമ്പറുകൾ മാത്രം നൽകുക",
      minlength: "10 അക്ക നമ്പർ നൽകുക"
    },
    house: { required: "വീട്ടുപേര് / House Name നൽകുക" },
    place: { required: "സ്ഥലം / Place നൽകുക" },
    pincode: {
      required: "പിൻകോഡ് നൽകുക",
      number: "നമ്പറുകൾ മാത്രം നൽകുക",
      minlength: "6 അക്ക നമ്പർ നൽകുക",
      pinavail: "ഈ പിൻകോഡ് ലഭ്യമല്ല / തെറ്റാണ്"
    },
    officename: { required: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കൂ" },
    quantity: { required: "എത്ര ബോട്ടിൽ വേണമെന്ന് തിരഞ്ഞെടുക്കൂ" }
  },
  submitHandler: function (form) {
    submitOrder();
  },
});