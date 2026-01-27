// 🔴 1. GOOGLE SCRIPT URL
const sc = `https://script.google.com/macros/s/AKfycbzVBmDpR4byla5f6Sdxa7tqi125PlbP4SgqkR9xdQkdop6eBAHNPS6qn5pRz899TZ9DSQ/exec`;

const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let editingOrderId = null;
var availablePin = false;
var successSubmitData;

$(document).ready(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const urlOid = urlParams.get('oid');
  const isAdmin = localStorage.getItem('kafakAdmin') === 'true';

  // --- ADMIN BAR SETUP (Instant Load from Cache) ---
  if (isAdmin && urlOid) {
    const adminUI = `
            <div id="admin-action-bar" style="display:none; position: fixed; bottom: 0; left: 0; width: 100%; background: #1a1a1a; padding: 15px; z-index: 10000; border-radius: 20px 20px 0 0; box-shadow: 0 -5px 15px rgba(0,0,0,0.3);">
                <div class="container">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold small text-warning" style="font-size:10px;">ADMIN TOOL: #${urlOid}</span>
                        <button onclick="closeAdminBar()" class="btn btn-link text-white p-0" style="text-decoration:none;">✕</button>
                    </div>
                    <div id="admin-btn-container"></div>
                </div>
            </div>`;
    $('body').append(adminUI);

    // 🔴 പ്രധാന മാറ്റം: അഡ്മിൻ പാനലിലെ Cache ഉപയോഗിച്ച് ബട്ടൺ ഉടൻ ശരിയാക്കുന്നു
    let cachedOrders = JSON.parse(localStorage.getItem('allOrdersCache') || "[]");
    let cachedOrder = cachedOrders.find(o => o.orderid === urlOid);
    // Cache-ൽ ഡാറ്റ ഉണ്ടെങ്കിൽ അത് എടുക്കും, അല്ലെങ്കിൽ 'Pending' എന്ന് വിചാരിക്കും
    let initialStatus = cachedOrder ? cachedOrder.Status : 'Pending';

    // ഇത് വിളിക്കുന്നതോടെ സെർവർ ലോഡിംഗിന് മുൻപേ ബട്ടൺ ശരിയായിട്ടുണ്ടാകും
    updateAdminUI(initialStatus, urlOid);
  }

  // --- AUTO LOGIN & FORM LOGIC ---
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
    } catch (e) { localStorage.removeItem('kafakUser'); }
  }

  if (!autoLoggedIn && !urlOid) {
    $('#step-1').addClass('active').show();
  }

  // --- LANGUAGE & EDIT MODE CHECK ---
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

  // --- INPUT LISTENERS ---
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

// --- HELPER FUNCTIONS ---

// 🔴 പുതിയ അഡ്മിൻ UI അപ്‌ഡേറ്റ് ഫങ്ക്ഷൻ (ഇതാണ് പ്രധാനം)
function updateAdminUI(serverStatus, oid) {
  // 1. ലോക്കൽ പെൻഡിംഗ് മാറ്റങ്ങൾ ഉണ്ടോ എന്ന് നോക്കുന്നു
  let pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
  let localUpdate = pendingUpdates.find(item => item.oid === oid);

  // 2. ലോക്കൽ മാറ്റത്തിനാണ് മുൻഗണന. അതില്ലെങ്കിൽ സെർവർ സ്റ്റാറ്റസ് എടുക്കും.
  let currentStatus = localUpdate ? localUpdate.status : (serverStatus || 'Pending');

  let btnHTML = '';

  // 3. സ്റ്റാറ്റസ് അനുസരിച്ച് ബട്ടൺ മാറ്റുന്നു
  if (currentStatus === 'Pending') {
    btnHTML = `<button onclick="adminAction('${oid}', 'Sent')" class="btn btn-success btn-sm fw-bold w-100 py-2 shadow">💬 CONFIRM SENT (WhatsApp)</button>`;
  } else if (currentStatus === 'Sent') {
    btnHTML = `<button onclick="adminAction('${oid}', 'Paid')" class="btn btn-warning btn-sm fw-bold w-100 py-2 shadow">💰 MARK AS PAID</button>`;
  } else if (currentStatus === 'Paid' || currentStatus === 'Dispatched') {
    btnHTML = `<button class="btn btn-secondary btn-sm fw-bold w-100 py-2 shadow opacity-50" disabled>💰 PAID / DISPATCHED ✅</button>`;
  }

  // 4. UI അപ്‌ഡേറ്റ് ചെയ്യുന്നു
  $('#admin-btn-container').html(btnHTML);
  $('#admin-action-bar').fadeIn();
  $('body').css('padding-bottom', '100px');
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

        // 🔴 ഇവിടെ നമ്മൾ സെർവറിൽ നിന്ന് കിട്ടിയ സ്റ്റാറ്റസ് വെച്ച് അഡ്മിൻ ബാർ അപ്‌ഡേറ്റ് ചെയ്യുന്നു
        // d.Status ഇല്ലെങ്കിൽ അത് പഴയ ഷീറ്റിൽ കോളം ഇല്ലാത്തത് കൊണ്ടാകാം, അതുകൊണ്ട് ഡിഫോൾട്ട് 'Pending' കൊടുക്കുന്നു.
        // ഷീറ്റിൽ നിന്ന് സ്റ്റാറ്റസ് കിട്ടാൻ Google Script-ൽ 'getAllOrders' പോലെ 'getOrderDetails'-ലും Status അയക്കുന്നുണ്ടെന്ന് ഉറപ്പാക്കണം.
        // അല്ലെങ്കിൽ fetchOrders-ൽ നിന്ന് കിട്ടുന്ന ലിസ്റ്റ് വെച്ച് നോക്കേണ്ടി വരും. 
        // തൽക്കാലം 'fetchOrderDetails' response-ൽ Status ഉണ്ടെന്ന് കരുതുന്നു. (ഇല്ലെങ്കിൽ താഴെ ഒരു Fix ഉണ്ട്)

        // Fix: getOrderDetails-ൽ നിലവിൽ Status ഫീൽഡ് ഇല്ല. 
        // അതിനാൽ ഫോണിലെ allOrdersCache-ൽ നിന്ന് ഈ ഓർഡറിന്റെ സ്റ്റാറ്റസ് കണ്ടുപിടിക്കുന്നു.
        let cachedOrders = JSON.parse(localStorage.getItem('allOrdersCache') || "[]");
        let cachedOrder = cachedOrders.find(o => o.orderid === oid);
        let serverStatus = cachedOrder ? cachedOrder.Status : 'Pending';

        updateAdminUI(serverStatus, oid);

        checkPincode(d.pincode, d.postoffice);
        enableEditMode();
        proceedToStep2();
      }
    });
}

// 🔴 അഡ്മിൻ ആക്ഷൻ (Local Save First)
function adminAction(oid, status) {
  if (!confirm(`ഈ ഓർഡർ ${status} ആയി മാർക്ക് ചെയ്യട്ടെ?`)) return;

  // 1. പെൻഡിംഗ് ലിസ്റ്റ് അപ്‌ഡേറ്റ് (പഴയത് കളയുന്നു)
  let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
  updates = updates.filter(item => item.oid !== oid);
  updates.push({ oid: oid, status: status, time: new Date().getTime() });
  localStorage.setItem('pendingUpdates', JSON.stringify(updates));

  // 2. UI ഉടൻ അപ്‌ഡേറ്റ് ചെയ്യുന്നു (Reload വേണ്ട)
  alert(`ലോക്കലായി സേവ് ചെയ്തു: ${status} ✅`);

  // Reload ചെയ്യുന്നതിന് പകരം UI മാറ്റുന്നു (Smooth Experience)
  updateAdminUI(status, oid);
}

// --- STANDARD FUNCTIONS (No Changes) ---
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
  const s = $('#state').val() ? $('#state').val().toLowerCase() : 'kerala';
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

function closeAdminBar() {
  $('#admin-action-bar').fadeOut();
  $('body').css('padding-bottom', '0');
}

const translations = {
  ml: {
    step1_title: "നിങ്ങളുടെ ഫോൺ നമ്പർ?",
    step1_desc: "ഓർഡർ ചെയ്യാൻ മൊബൈൽ നമ്പർ നൽകുക",
    your_name: "നിങ്ങളുടെ പേര്",
    next_btn: "അടുത്തത് ➔",
    order_btn: "ഓർഡർ ചെയ്യാം ✅"
  },
  en: {
    step1_title: "What is your Phone Number?",
    step1_desc: "Enter mobile number to verify",
    your_name: "Your Name",
    next_btn: "NEXT STEP ➔",
    order_btn: "PLACE ORDER ✅"
  }
};

function changeLanguage(lang) {
  $('[data-i18n]').each(function () {
    const key = $(this).data('i18n');
    if (translations[lang] && translations[lang][key]) $(this).text(translations[lang][key]);
  });
}

$("#order-form").validate({
  submitHandler: function () { submitOrder(); }
});