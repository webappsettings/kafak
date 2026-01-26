// 🔴 1. UPDATE YOUR NEW GOOGLE SCRIPT ID HERE
const sc = `https://script.google.com/macros/s/AKfycbw2zFbJuK3KoK1-ga2KYukpFI3XksC1RXae6n_GVcuPee2U8DI3tVZZiNmsLOij-vizxg/exec`;

// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null; // To store ID if editing
var availablePin = false;  // Validation variable
var successSubmitData;     // To store data for WhatsApp

$(document).ready(function () {

  // --- 1. HANDLE LOADING & EDIT MODE ---
  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');

  if (oid) {
    // എഡിറ്റ് മോഡ് ആണെങ്കിൽ ലോഡർ കളയണ്ട, ഡാറ്റ വന്ന ശേഷം കളയാം
    $('#submitBtn').text('Loading Order...').prop('disabled', true);
    fetchOrderDetails(oid);
  } else {
    // എഡിറ്റ് അല്ലെങ്കില്‍ ലോഡർ ഉടനെ മാറ്റുക (Fix for Loading Image)
    $('#main-loader').fadeOut();
  }

  // --- 2. PINCODE LOGIC (RESTORED) ---
  // പിൻകോഡ് അടിച്ചാൽ മാത്രം സ്ഥലം വരുന്ന പഴയ കോഡ് നിർബന്ധമാണ്
  $('#pincode').on('input', async function () {
    this.value = this.value.replace(/[^0-9]/g, ''); // Numbers only
    const pin = this.value.trim();

    // Reset fields
    availablePin = false;
    $('#quantity').prop('disabled', true).val('');
    $('.price-show').hide();

    if (pin.length === 6) {
      try {
        const response = await fetch(`pincode_json_files/${pin}.json`);
        if (!response.ok) throw new Error('Not found');
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          availablePin = true; // Valid Pincode

          // Auto-fill District & State
          $('#district').val(data[0].district || '');
          $('#state').val(data[0].statename || '');
          $('.pincodeEnable').show();

          // Enable Quantity
          $('#quantity').prop('disabled', false);

          // Populate Post Office Dropdown
          const officeDropdown = $('#officename');
          officeDropdown.empty().append('<option value="">Select Post Office</option>');
          data.forEach(item => {
            officeDropdown.append(`<option value="${item.officename}">${item.officename}</option>`);
          });
          officeDropdown.show();
          $('#postoffice').hide();
        }
      } catch (err) {
        console.log("Pincode error", err);
        availablePin = false;
      }
    }
  });

  // Post Office Selection
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
      $('#main-loader').fadeOut(); // Data vannal loader kalayuka

      if (response.result === 'success') {
        const d = response.data;
        editingOrderId = d.orderid;

        // Fill Form
        $('#name').val(d.name);
        $('#phone').val(d.phone);
        $('#pincode').val(d.pincode);
        $('#state').val(d.state);
        $('#quantity').val(d.quantity);
        $('#message').val(d.message);

        // Manual validation override for edit mode
        availablePin = true;

        // Address Split
        const addrParts = d.addressFull.split(', ');
        if (addrParts.length >= 2) {
          $('#house').val(addrParts[0]);
          $('#place').val(addrParts[1]);
          $('#postoffice').val(addrParts[2] || '').show();
          $('#district').val(addrParts[3] || '');
          $('#officename').hide(); // Hide dropdown in edit mode to keep it simple
        } else {
          $('#house').val(d.addressFull);
        }

        $('#quantity').prop('disabled', false);
        $('#submitBtn').text('Update Order').prop('disabled', false);
        $('.price-show').show(); // Show price
        $('#quantity').trigger('change'); // Recalculate price

        alert('Order loaded for editing.');
      } else {
        alert('Order not found or cannot be edited.');
        window.location.href = window.location.pathname.split('?')[0]; // Reset URL
      }
    })
    .catch(err => {
      $('#main-loader').fadeOut();
      alert('Network Error');
    });
}

// --- 4. SUBMIT FUNCTION (Corrected) ---
function submitOrder() {
  $('#submitBtn').prop('disabled', true).text(editingOrderId ? 'Updating...' : 'Processing...');

  const formData = {
    orderid: editingOrderId || null,
    name: $('#name').val(),
    phone: $('#phone').val(),
    house: $('#house').val(),
    place: $('#place').val(),
    postoffice: $('#postoffice').val(),
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
        alert(editingOrderId ? 'Order Updated Successfully!' : 'Order Placed Successfully!');

        // Hide form & Show Success
        $('#honeyForm').hide();
        showSuccess();
        sendToWhatsapp();
      } else {
        alert('Error: ' + data.message);
        $('#submitBtn').prop('disabled', false).text('Try Again');
      }
    })
    .catch(err => {
      alert('Connection Error!');
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

  // Edit Link
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;

  const amountTextW = calculateAmountString(d.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);

  // 🔴 CHANGE: Removed ``` and added * for Bold
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
}, 'Please enter correct pincode');

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
    officename: { required: true },
    quantity: { required: true }
  },
  submitHandler: function (form) {
    submitOrder(); // Calls the function properly now
  },
});