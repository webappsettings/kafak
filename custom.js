const form = document.getElementById('honeyForm');
const cd = 'AKfycbxKMWSq5IaxR4_yVFcCJ9oakRXuMY0L28Gu50e0WBdXgQFnL--snXpLYA6NbxlG9KWzsw';
const sc = `https://script.google.com/macros/s/${cd}/exec`;

var successSubmitData;
const pincodeInput = document.getElementById('pincode');
const officeDropdown = document.getElementById('officename');
const districtInput = document.getElementById('district');
const stateInput = document.getElementById('state');
const postoffice = document.getElementById('postoffice');
const quantitySelect = document.getElementById('quantity');
const submitBtn = document.getElementById('submitBtn');

var availablePin = false;
var locationSet;


var pincodeData = [];
var targetPostOffice = null;

window.addEventListener('DOMContentLoaded', () => {

  

  pincodeInput.addEventListener('input', async function () {
const pin = this.value.trim();
postoffice.value = '';
districtInput.value = '';
stateInput.value = '';
officeDropdown.innerHTML = '<option value="">Select Post Office (പോസ്റ്റ് ഓഫീസ്?)</option>';
officeDropdown.style.display = 'none';
$('.pincodeEnable').hide();

if (pin.length !== 6) {
return;
}

try {
const response = await fetch(`pincode_json_files/${pin}.json`);

if (!response.ok) {
  throw new Error('Pincode file not found');
}

const data = await response.json();

if (!Array.isArray(data) || data.length === 0) {
  throw new Error('No data inside pincode file');
}

pincodeData = data;

const district = data[0].district || '';
const state = data[0].statename || '';
districtInput.value = district;
stateInput.value = state;
availablePin = true;
$('.pincodeEnable').show();

if (data.length === 1) {
  const label = `${data[0].officename.replace(/\s(BO|SO|HO)$/, ' PO')}`;
  postoffice.style.display = 'block';
  postoffice.value = label;
  officeDropdown.innerHTML = `<option value="${label}" selected>${label}</option>`;
  officeDropdown.style.display = 'none';
  officeDropdown.value = '';
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

  // alert('targetPostOffice= '+ targetPostOffice)

  if (targetPostOffice) {
    officeDropdown.value = targetPostOffice;

    postoffice.value = '';
    postoffice.style.display = 'none';
    targetPostOffice = null;

  }
}
} catch (error) {
console.warn('Error loading pincode:', error.message);
availablePin = false;
pincodeData = [];
postoffice.value = '';
districtInput.value = '';
stateInput.value = '';
officeDropdown.innerHTML = '<option value="">Select Post Office (പോസ്റ്റ് ഓഫീസ്?)</option>';
officeDropdown.style.display = 'none';
$('.pincodeEnable').hide();
// Optional: show a nice message to user
// alert('Pincode data not available');
}
});

  officeDropdown.addEventListener('change', function () {
    postoffice.value = '';
  });

  const queryString = window.location.search;
  const urlParams = queryString.substring(1);
 

  if(urlParams) {
   getData(urlParams, 'url')
 } else {
   const kfkcode = localStorage.getItem('kfkcode');
   if (kfkcode) {
    document.getElementById('main-loader').style.display = 'flex';
    disableFormFields();
    getData(kfkcode, 'mem')
  } else {
    document.getElementById('main-loader').style.display = 'none';
  }
}

  
});


function getData(kfkcode, frm) {


  fetch(`${sc}?action=get&kfkcode=${kfkcode}&frm=${frm}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById('main-loader').style.display = 'none';
        if (data.result === 'success') {
          document.getElementById('editBtn2').style.display = 'block';
          document.getElementById('whatsapp-btn-wrp').style.display = 'none';
          successSubmitData = data;
          console.log('getsuccessSubmitData=', successSubmitData)
          const d = data.data;
          form.name.value = d.name;
          form.phone.value = d.phone;
          form.pincode.value = d.pincode;
          
          if (d.postoffice) {
            form.postoffice.style.display = 'block';
            form.postoffice.value = d.postoffice
          } else {
            form.postoffice.style.display = 'none';
          }

          if ('officename' in d && d.officename) {
            officeDropdown.style.display = 'block';
            targetPostOffice = d.officename;

            const event = new Event('input', { bubbles: true });
            form.pincode.dispatchEvent(event);

 
          } else {
            officeDropdown.style.display = 'none';
          }

          form.district.value = d.district;
          form.state.value = d.state;
          form.quantity.value = d.quantity;
          form.message.value = d.message;
          form.house.value = d.house;
          form.place.value = d.place;
          $('.price-show').show();

          quantitySelect.dispatchEvent(new Event('change'));
          disableFormFields();
        } else {
          //localStorage.removeItem('kfkcode');
          // submitBtn.style.display = 'block';
          enableFormFields();
        }
      })
      .catch(err => {
        document.getElementById('main-loader').style.display = 'none';
        console.error("Error fetching order:", err);
      });
}



function generateCode(phone) {
  const epoch = Date.now();
  const device = getDeviceType();
  const browser = getBrowserInfo();
  return `${phone}@${epoch}@${device}@${browser}`;
}

function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'iphone';
  if (/windows/.test(ua)) return 'windows';
  if (/mac/.test(ua)) return 'mac';
  return 'unknown';
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let name = 'unknown', version = '';
  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) {
    name = 'chrome';
    version = ua.match(/chrome\/([\d.]+)/i)?.[1] || '';
  } else if (/edg/i.test(ua)) {
    name = 'msedge';
    version = ua.match(/edg\/([\d.]+)/i)?.[1] || '';
  } else if (/firefox/i.test(ua)) {
    name = 'firefox';
    version = ua.match(/firefox\/([\d.]+)/i)?.[1] || '';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    name = 'safari';
    version = ua.match(/version\/([\d.]+)/i)?.[1] || '';
  }
  return `${name}${version.split('.')[0] || ''}`;
}

function onSubmit() {

      const formData = new FormData(form);
      const orderData = {};
      formData.forEach((value, key) => {
        if (key !== 'g-recaptcha-response') {
          orderData[key] = value;
        }
      });

      const orderCode = localStorage.getItem('kfkcode') || generateCode(orderData.phone);
      localStorage.setItem('kfkcode', orderCode);
      orderData.kfkcode = orderCode;

      const fullData = {
        userData: {},
        orderData: orderData
      };

      $.ajax({
        method: 'POST',
        url: sc,
        data: JSON.stringify(fullData),
        dataType: 'json',
        contentType: false,
        processData: false,
        beforeSend: function () {
          document.getElementById('loader').style.display = 'block';
          // submitBtn.style.display = 'none';
        }
      })
        .done(function (callback) {
          successSubmitData = callback;
          document.getElementById('loader').style.display = 'none';
          // document.getElementById('sendWhatsApp').style.display = 'block';
          locationSet = 'u'+successSubmitData.userLoc+'-o'+successSubmitData.orderLoc
          localStorage.setItem('loc', locationSet);
          console.log(locationSet)
          disableFormFields();
          showSuccess();
          sendToWhatsapp();
          console.log('successSubmitData=',successSubmitData)
          
        })
        .fail(function (callback) {
          console.error(callback);
          // submitBtn.style.display = 'block';
          document.getElementById('loader').style.display = 'none';
          showFailure();
          setTimeout(function () {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth'
            });
          }, 300);
        });
    
  
}

function getCourierCharge(bottles) {
  switch (bottles) {
    case 1: return 80;
    case 2: return 140;
    case 3: return 190;
    case 4: return 240;
    case 5: return 290;
    case 6: return 340;
    case 8: return 480;
    case 10: return 500;
    default: return 0;
  }
}

function calculateAmountString(quantityText) {
  const numberOfBottles = parseInt(quantityText);
  const basePricePerBottle = 500;
  if (isNaN(numberOfBottles)) return '';
  const amount = numberOfBottles * basePricePerBottle;
  const courierCharge = getCourierCharge(numberOfBottles);
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
  if(quantityText != '') {
    const amountText = calculateAmountString(quantityText);
    const totalText = calculateTotalString(amountText);
    document.getElementById('amt').textContent = amountText + ' (Courier charge)';
    document.getElementById('totalAmt').textContent = totalText;
    $('.price-show').show();
  }
});

function showSuccess() {
  document.getElementById('response').style.display = 'flex';
  document.getElementById('showsuccess').style.display = 'flex';
}

function showFailure() {
  document.getElementById('response').style.display = 'flex';
  document.getElementById('showfailure').style.display = 'flex';
}

function disableFormFields() {
  document.querySelectorAll('input, select, textarea').forEach(function (element) {
    element.disabled = true;
  });
}

function enableFormFields() {
  document.querySelectorAll('input, select, textarea').forEach(function (element) {
    element.disabled = false;
  });
}

/*document.getElementById('editBtn1').addEventListener('click', function () {
  enableFormFields();
  submitBtn.style.display = 'block';
  document.getElementById('sendWhatsApp').style.display = 'none';
  document.getElementById('response').style.display = 'none';
  document.getElementById('showsuccess').style.display = 'none';
});*/

document.getElementById('editBtn2').addEventListener('click', function () {
  $(this).hide();
  enableFormFields();
  // submitBtn.style.display = 'block';
  document.getElementById('whatsapp-btn-wrp').style.display = 'inline-flex';
  document.getElementById('response').style.display = 'none';
  document.getElementById('showsuccess').style.display = 'none';
  /*document.getElementById('sendWhatsApp').style.display = 'none';
  */
});


/*document.getElementById('sendWhatsAppBtn').addEventListener('click', function () {
  sendToWhatsapp()
});*/


function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successSubmitData.orderid;
  const submitTime = successSubmitData.timestamp;
  const successData = successSubmitData.data;
console.log('successData', successData)
  const postLabel = successData.officename || successData.postoffice || '';

  const amountTextW = calculateAmountString(successData.quantity) + ' (Courier)';
  const totalTextW = calculateTotalString(amountTextW);
  const extra1 = `*✅ Honey order confirmed!* 🍯\n🔖 \`\`\`#${orderid}\`\`\`\n🔗 _kafaklife.com/order?${locationSet}_\n⌚ \`\`\`${submitTime}\`\`\``;
  const msg = successData.message ? `\n\n💬 _${successData.message.trim()}_\n` : '\n';
  const wtspformat = `
____________________________________\n
*${successData.name.trim().toUpperCase()}*
*${successData.house.trim().toUpperCase()}*
*${successData.place.trim().toUpperCase()}*
*${postLabel.trim().toUpperCase()}*
*${successData.district.trim().toUpperCase()}*
*${successData.state.trim().toUpperCase()}*
*Pin: ${successData.pincode.trim()}*
*Ph: ${successData.phone.trim()}*\n
*Qty: ${successData.quantity}*
*${amountTextW}*\n
*${totalTextW}*${msg}
____________________________________

*Please GPay to the number below and send the screenshot here. We will pack your order after receiving it.*\n
*(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്ത് സ്ക്രീന്‍ഷോട്ട് അയക്കൂ.. സ്ക്രീന്‍ഷോട്ട് അയച്ച ശേഷം ഓർഡർ പാക്ക് ചെയ്യും)* 👇
\n*${phone} (KAFAK LLP)*\n`;

  const message = encodeURIComponent(extra1 + wtspformat);
  window.open(`whatsapp://send?phone=91${phone}&text=${message}`, '_blank');
}

jQuery.validator.addMethod("pinavail", function(value, element) {
  return this.optional( element ) || availablePin;
}, 'Please enter correct pincode');

$("#honeyForm").validate({
  errorElement: 'span',
  errorClass: 'error text-danger',
  errorPlacement: function (error, element) {
    if (element.hasClass("btn-check")) {
      error.appendTo(element.parent().parent().parent());
    } else {
      error.appendTo(element.parent());
    }
  },
  rules: {
    name: {
      required: true,
    },
    phone: {
      required: true,
      number: true,
      minlength: 10,
      maxlength: 10
    },
    house: {
      required: true,
    },
    place: {
      required: true,
    },
    pincode: {
      required: true,
      number: true,
      minlength: 6,
      pinavail: true
    },
    officename: {
      required: true,
    },
    quantity: {
      required: true,
    }
  },
  messages: {
    name: {
      required: "Please enter your name",
    },
    phone: {
      required: "Please enter your phone number",
      number: "Please enter valid phone number",
      minlength: "Please enter valid phone number",
      maxlength: "Please enter valid phone number",
    },
    house: {
      required: "Please enter house name/flat number",
    },
    place: {
      required: "Please enter place name",
    },
    pincode: {
      required: "Please enter pincode",
      number: "Please enter pincode",
      minlength: "Please enter correct pincode"
    },
    officename: {
      required: "Please select postoffice",
    },
    quantity: {
      required: "Please select quantity",
    }
  },
  submitHandler: function (form) {

     onSubmit();

    setTimeout(function () {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 300);
    
  },
});