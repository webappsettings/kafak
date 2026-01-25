// 🔴 1. UPDATE YOUR NEW GOOGLE SCRIPT ID HERE
const sc = `https://script.google.com/macros/s/AKfycbw2zFbJuK3KoK1-ga2KYukpFI3XksC1RXae6n_GVcuPee2U8DI3tVZZiNmsLOij-vizxg/exec`;

// Courier Rates
const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null; // To store ID if editing

$(document).ready(function () {

  // --- 1. CHECK FOR EDIT MODE ---
  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');

  if (oid) {
    // Show loading state
    $('#submitBtn').text('Loading Order...').prop('disabled', true);
    fetchOrderDetails(oid);
  }

  // Pincode & Calculation Listeners (Same as before)
  $('#pincode').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
  });

  $('#quantity, #state').on('change keyup', function () {
    const qty = $('#quantity').val();
    const priceText = calculateAmountString(qty);
    // Show logic for price display if needed
  });

  // --- SUBMIT FUNCTION ---
  $('#order-form').submit(function (e) {
    e.preventDefault();
    $('#submitBtn').prop('disabled', true).text(editingOrderId ? 'Updating...' : 'Processing...');

    const formData = {
      orderid: editingOrderId || null, // Send ID if editing
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

          // Alert user
          alert(editingOrderId ? 'Order Updated Successfully!' : 'Order Placed Successfully!');

          // Show Success & WhatsApp
          document.getElementById('honeyForm').style.display = 'none'; // Hide form
          showSuccess();
          sendToWhatsapp();
        } else {
          alert('Error: ' + (data.message || 'Something went wrong.'));
          $('#submitBtn').prop('disabled', false).text(editingOrderId ? 'Update Order' : 'Place Order');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Connection Error!');
        $('#submitBtn').prop('disabled', false).text('Try Again');
      });
  });
});

// --- FETCH ORDER FOR EDITING ---
function fetchOrderDetails(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`)
    .then(res => res.json())
    .then(response => {
      if (response.result === 'success') {
        const d = response.data;
        editingOrderId = d.orderid;

        // Fill Form Fields
        $('#name').val(d.name);
        $('#phone').val(d.phone);
        $('#pincode').val(d.pincode);
        $('#state').val(d.state);
        $('#quantity').val(d.quantity);
        $('#message').val(d.message);

        // Address Handling (Try to split back if possible, else put full in House)
        const addrParts = d.addressFull.split(', ');
        if (addrParts.length >= 2) {
          $('#house').val(addrParts[0]);
          $('#place').val(addrParts[1]);
          $('#postoffice').val(addrParts[2] || '');
          $('#district').val(addrParts[3] || '');
        } else {
          $('#house').val(d.addressFull); // Fallback
        }

        // Enable fields and button
        $('#quantity').prop('disabled', false);
        $('#submitBtn').text('Update Order').prop('disabled', false);

        // Trigger price calculation
        // $('#quantity').trigger('change'); 

        alert('Order loaded for editing. You can make changes now.');
      } else {
        alert(response.message || 'Could not load order.');
        window.location.href = window.location.pathname; // Remove query param
      }
    });
}

// --- CALCULATION & WHATSAPP FUNCTIONS ---
// (Copy paste the calculateAmountString and sendToWhatsapp logic from previous final code here)
// Important: In sendToWhatsapp, change the link to include the Edit Link.

function calculateAmountString(quantityText) {
  // ... (Same as previous code) ...
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
  // ... (Same as previous code) ...
  const numbers = amountString.match(/\d+/g);
  if (!numbers || numbers.length < 2) return '';
  return `Total(₹): ${parseInt(numbers[0]) + parseInt(numbers[1])}/-`;
}

// --- WHATSAPP LOGIC WITH EDIT LINK ---
function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successSubmitData.orderid;
  const d = successSubmitData.data;

  // 🔴 IMPORTANT: This is the Edit Link
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;

  const amountTextW = calculateAmountString(d.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);

  const extra1 = `*✅ Honey order confirmed!* 🍯\n🔖 \`\`\`#${orderid}\`\`\`\n🔗 _${editLink}_\n(Click link to edit order)`;

  // ... (Rest of the WhatsApp message format same as before) ...
  const postLabel = d.officename || d.postoffice || '';
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
  window.open(`whatsapp://send?phone=91${phone}&text=${message}`, '_blank');
}
// ... (Validation logic same as before) ...

// Validation Logic
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
  messages: {
    name: { required: "Please enter your name" },
    phone: { required: "Enter valid phone" },
    pincode: { required: "Enter pincode", pinavail: "Invalid Pincode" },
    officename: { required: "Select Post Office" }
  },
  submitHandler: function (form) {
    onSubmit();
    setTimeout(function () {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 300);
  },
});