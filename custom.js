// 🔴 1. UPDATE YOUR NEW GOOGLE SCRIPT ID HERE
const cd = 'AKfycbxf2hnyuoPFcV8pN4pRsI7kwVr6RyE-n9Fk5jxHiX-MLzyVeHlkMORUVvAczE8mfy7iFg';
const sc = `https://script.google.com/macros/s/${cd}/exec`;



const form = document.getElementById('honeyForm');
var successSubmitData;
const pincodeInput = document.getElementById('pincode');
const officeDropdown = document.getElementById('officename');
const districtInput = document.getElementById('district');
const stateInput = document.getElementById('state');
const postoffice = document.getElementById('postoffice');
const quantitySelect = document.getElementById('quantity');
const submitBtn = document.getElementById('submitBtn');

var availablePin = false;
var pincodeData = [];
var targetPostOffice = null;

// 🔴 2. NEW COURIER RATES
const courierRates = {
  kerala: {
    1: 80, 2: 140, 3: 190, 4: 240,
    5: 290, 6: 340, 8: 480, 10: 500
  },
  outside: {
    1: 110, 2: 200, 3: 280, 4: 350,
    5: 430, 6: 510, 8: 640, 10: 840
  }
};

window.addEventListener('DOMContentLoaded', () => {

  // --- PINCODE LISTENER (Remains mostly same) ---
  pincodeInput.addEventListener('input', async function () {
    const pin = this.value.trim();

    // Reset Fields
    quantitySelect.value = "";
    quantitySelect.disabled = true;
    $('.price-show').hide();
    postoffice.value = '';
    districtInput.value = '';
    stateInput.value = '';
    officeDropdown.innerHTML = '<option value="">Select Post Office (പോസ്റ്റ് ഓഫീസ്?)</option>';
    officeDropdown.style.display = 'none';
    $('.pincodeEnable').hide();

    if (pin.length !== 6) return;

    try {
      const response = await fetch(`pincode_json_files/${pin}.json`);
      if (!response.ok) throw new Error('Pincode not found');

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('No data');

      pincodeData = data;
      const district = data[0].district || '';
      const state = data[0].statename || '';

      districtInput.value = district;
      stateInput.value = state;
      availablePin = true;
      $('.pincodeEnable').show();

      // Enable Quantity
      quantitySelect.disabled = false;

      // Post Office Logic
      if (data.length === 1) {
        const label = `${data[0].officename.replace(/\s(BO|SO|HO)$/, ' PO')}`;
        postoffice.style.display = 'block';
        postoffice.value = label;
        officeDropdown.innerHTML = `<option value="${label}" selected>${label}</option>`;
        officeDropdown.style.display = 'none';
      } else {
        officeDropdown.innerHTML = '<option value="">Select Post Office (പോസ്റ്റ് ഓഫീസ്?)</option>';
        data.forEach(item => {
          const label = `${item.officename.replace(/\s(BO|SO|HO)$/, ' PO')}`;
          const opt = document.createElement('option');
          opt.value = label;
          opt.textContent = label;
          officeDropdown.appendChild(opt);
        });
        officeDropdown.style.display = 'block';
        postoffice.style.display = 'none';
      }
    } catch (error) {
      console.warn('Error loading pincode:', error.message);
      availablePin = false;
    }
  });

  officeDropdown.addEventListener('change', function () {
    postoffice.value = '';
  });

  // URL Parameter Check (Optional: If you want to keep edit functionality, 
  // you need to add 'action=get' to the new backend script. 
  // For now, this is kept safe but might not retrieve data if backend doesn't support it)
  const queryString = window.location.search;
  const urlParams = queryString.substring(1);
  if (urlParams) {
    // getData(urlParams, 'url'); // Commented out until backend supports 'get'
  } else {
    document.getElementById('main-loader').style.display = 'none';
  }
});

// 🔴 3. UPDATED CALCULATION LOGIC
function calculateAmountString(quantityText) {
  const numberOfBottles = parseInt(quantityText);
  const basePricePerBottle = 650;

  if (isNaN(numberOfBottles)) return '';

  const amount = numberOfBottles * basePricePerBottle;
  // Get state from input and normalize
  const stateVal = document.getElementById('state').value.trim().toLowerCase();
  let courierCharge = 0;

  if (stateVal === 'kerala') {
    courierCharge = courierRates.kerala[numberOfBottles] || 0;
  }
  else if (stateVal === 'lakshadweep') {
    // Lakshadweep: (100 * Qty) + 20
    courierCharge = (numberOfBottles * 100) + 20;
  }
  else {
    // Default to Outside Kerala rates if state is not Kerala/Lakshadweep
    // (Or you can check specific states if needed)
    courierCharge = courierRates.outside[numberOfBottles] || 0;
  }

  return `Amount(₹): ${amount} + ${courierCharge}`;
}

function calculateTotalString(amountString) {
  const numbers = amountString.match(/\d+/g);
  if (!numbers || numbers.length < 2) return '';
  const amount = parseInt(numbers[0]);
  const courierCharge = parseInt(numbers[1]);
  const total = amount + courierCharge;
  return `Total(₹): ${total}/-`;
}

quantitySelect.addEventListener('change', function () {
  $('.price-show, #quantity-error').hide();
  const quantityText = this.value;
  if (quantityText != '') {
    const amountText = calculateAmountString(quantityText);
    const totalText = calculateTotalString(amountText);
    document.getElementById('amt').textContent = amountText + ' (Courier charge)';
    document.getElementById('totalAmt').textContent = totalText;
    $('.price-show').show();
  }
});

// 🔴 4. UPDATED SUBMIT FUNCTION (Uses fetch & matches new backend structure)
function onSubmit() {
  const formData = new FormData(form);
  const orderData = {};
  formData.forEach((value, key) => {
    orderData[key] = value;
  });

  // Generate Code
  const orderCode = localStorage.getItem('kfkcode') || generateCode(orderData.phone);
  localStorage.setItem('kfkcode', orderCode);
  orderData.kfkcode = orderCode;

  // Prepare Payload for new Backend
  const payload = { orderData: orderData };

  // UI Updates
  document.getElementById('loader').style.display = 'block';

  fetch(sc, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById('loader').style.display = 'none';

      if (data.result === 'success') {
        // Success handling
        successSubmitData = {
          orderid: data.orderid,
          timestamp: data.timestamp,
          data: orderData
        };

        console.log('Order Success:', successSubmitData);
        disableFormFields();
        showSuccess();
        sendToWhatsapp(); // Auto open WhatsApp
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    })
    .catch(err => {
      console.error('Submission Error:', err);
      document.getElementById('loader').style.display = 'none';
      showFailure();
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 300);
    });
}

// --- HELPER FUNCTIONS ---

function generateCode(phone) {
  const epoch = Date.now();
  const device = getDeviceType();
  return `${phone}@${epoch}@${device}`;
}

function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'iphone';
  return 'desktop';
}

function showSuccess() {
  document.getElementById('response').style.display = 'flex';
  document.getElementById('showsuccess').style.display = 'flex';
}

function showFailure() {
  document.getElementById('response').style.display = 'flex';
  document.getElementById('showfailure').style.display = 'flex';
}

function disableFormFields() {
  document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
}

function enableFormFields() {
  document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
}

// Edit Button Logic
document.getElementById('editBtn2').addEventListener('click', function () {
  $(this).hide();
  enableFormFields();
  document.getElementById('whatsapp-btn-wrp').style.display = 'inline-flex';
  document.getElementById('response').style.display = 'none';
  document.getElementById('showsuccess').style.display = 'none';
});

// 🔴 5. WHATSAPP LOGIC (Updated to use new data structure)
function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successSubmitData.orderid;
  const submitTime = successSubmitData.timestamp;
  const d = successSubmitData.data;

  const postLabel = d.officename || d.postoffice || '';

  // Recalculate amounts for message to ensure accuracy
  const amountTextW = calculateAmountString(d.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);

  const extra1 = `*✅ Honey order confirmed!* 🍯\n🔖 \`\`\`#${orderid}\`\`\`\n🔗 _kafaklife.com_\n⌚ \`\`\`${submitTime}\`\`\``;
  const msg = d.message ? `\n\n💬 _${d.message.trim()}_\n` : '\n';

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
*${totalTextW}*${msg}
____________________________________

*Please GPay to the number below and send the screenshot here. We will pack your order after receiving it.*\n
*(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്ത് സ്ക്രീന്‍ഷോട്ട് അയക്കൂ.. സ്ക്രീന്‍ഷോട്ട് അയച്ച ശേഷം ഓർഡർ പാക്ക് ചെയ്യും)* 👇
\n*${phone} (KAFAK LLP)*\n`;

  const message = encodeURIComponent(extra1 + wtspformat);
  window.open(`whatsapp://send?phone=91${phone}&text=${message}`, '_blank');
}

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