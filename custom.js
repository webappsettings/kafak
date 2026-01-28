// 🔴 GOOGLE SCRIPT URL
const sc = `https://script.google.com/macros/s/AKfycbzVBmDpR4byla5f6Sdxa7tqi125PlbP4SgqkR9xdQkdop6eBAHNPS6qn5pRz899TZ9DSQ/exec`;
// 🔴 GOOGLE SCRIPT URL
const sc = `https://script.google.com/macros/s/AKfycbzVBmDpR4byla5f6Sdxa7tqi125PlbP4SgqkR9xdQkdop6eBAHNPS6qn5pRz899TZ9DSQ/exec`;

const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

let currentStep = 0;
let editingOrderId = null;
let userData = {};
let successData = null;
let poList = [];

$(document).ready(function () {
  const qtyOpts = `
        <option value="1">1 Bottle (650g)</option>
        <option value="2">2 Bottles (1.30 kg)</option>
        <option value="3">3 Bottles (1.95 kg)</option>
        <option value="4">4 Bottles (2.60 kg)</option>
        <option value="5">5 Bottles (3.25 kg)</option>
        <option value="6">6 Bottles (3.90 kg)</option>
        <option value="8">8 Bottles (5.20 kg)</option>
        <option value="10">10 Bottles (6.50 kg)</option>
    `;
  $('#quantity').append(qtyOpts);
  $('#quick-qty').append(qtyOpts);

  // Listeners
  $('#phone').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#whatsapp').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#altphone').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#pincode').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#quantity, #quick-qty').change(function () { updatePrice($(this).val(), $(this).attr('id') === 'quick-qty'); });

  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get('oid')) {
    // Edit Mode Link
    fetchOrder(urlParams.get('oid'));
  } else {
    // Normal Load -> Show Phone
    showLoader(false);
    $('#step-0').fadeIn();
    updateFooterButtons('step-0');
    setTimeout(() => $('#phone').focus(), 500);
  }
});

// 🔴 FOOTER LOGIC
function updateFooterButtons(view) {
  $('#btn-group-0').hide();
  $('#btn-group-wizard').hide();
  // Note: Returning user button is inside the returning view HTML now for layout reasons, 
  // but we ensure logic flows correctly.

  if (view === 'step-0') $('#btn-group-0').show();
  if (view === 'wizard') $('#btn-group-wizard').css('display', 'flex');
}

// 🔴 MAIN FLOW HANDLER
function handlePhoneNext() {
  const phone = $('#phone').val();
  const regex = /^[0-9]{10}$/;
  if (!regex.test(phone)) { showAlert(getAlert('err_phone')); return; }

  showLoader(true);
  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(res => {
      showLoader(false);
      $('#step-0').hide();

      if (res.result === 'success') {
        const d = res.data;
        userData = d;

        // CASE 1: Active Order (Pending/Sent/Paid) -> Show Edit Mode
        if (d.orderid && d.Status && d.Status !== 'Dispatched') {
          editingOrderId = d.orderid;
          showReturningUserView(d, true); // true = Active Order (Pre-fill Qty)
        }
        // CASE 2: Returning User (Dispatched/Completed) -> Show Create Mode (Collapsed)
        else if (d.name) {
          editingOrderId = null; // New Order
          showReturningUserView(d, false); // false = New Order (Clear Qty)
        }
        // CASE 3: New User but found in Local Storage?
        else {
          checkLocalStorage(phone);
        }
      } else {
        // New User (Server returned not-found)
        checkLocalStorage(phone);
      }
    })
    .catch(e => { showLoader(false); showAlert("Network Error!"); });
}

// 🔴 LOCAL STORAGE CHECK (Auto-Fill / Skip Wizard)
function checkLocalStorage(phone) {
  const saved = localStorage.getItem('kafakUser');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      if (u.phone === phone && u.name && u.house && u.pincode) {
        // We have enough data locally, skip wizard
        userData = u;
        editingOrderId = null;
        showReturningUserView(u, false);
        return;
      }
    } catch (e) { }
  }
  // Else start wizard
  editingOrderId = null;
  $('#whatsapp').val(phone);
  startWizard();
}

function fetchOrder(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`)
    .then(res => res.json())
    .then(res => {
      showLoader(false);
      $('#step-0').hide();

      if (res.result === 'success') {
        const d = res.data;
        userData = d;
        if (d.Status === 'Dispatched') {
          editingOrderId = null; // Treat as new if dispatched
          showReturningUserView(d, false);
        } else {
          editingOrderId = d.orderid;
          showReturningUserView(d, true);
        }
      } else {
        $('#step-0').fadeIn();
        updateFooterButtons('step-0');
      }
    })
    .catch(() => { showLoader(false); $('#step-0').fadeIn(); updateFooterButtons('step-0'); });
}

// 🔴 RETURNING VIEW (COLLAPSED) LOGIC
function showReturningUserView(d, isActiveOrder) {
  $('#returning-user-view').fadeIn();
  // Hide footer buttons (handled inside view)
  updateFooterButtons('none');

  // Fill Fields
  $('#saved-name').text(d.name);
  $('#edit-house').val(d.house);
  $('#edit-place').val(d.place);
  $('#edit-pincode').val(d.pincode);
  $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district);
  $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone);
  $('#edit-altphone').val(d.altphone || '');

  // Update Summary Text
  updateSummaryDisplay();

  // Logic for Qty/Msg
  if (isActiveOrder) {
    $('#quick-qty').val(d.quantity).trigger('change');
    $('#quick-msg').val(d.message);
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്യാം" : "UPDATE ORDER");
  } else {
    // New Order for Old User -> Clear Qty
    $('#quick-qty').val('').trigger('change');
    $('#quick-msg').val('');
    $('#quick-price').text('₹0');
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ ചെയ്യാം" : "PLACE ORDER");
  }
}

// 🔴 LIVE UPDATE SUMMARY TEXT
function updateSummaryDisplay() {
  const house = $('#edit-house').val() || '';
  const place = $('#edit-place').val() || '';
  const po = $('#edit-postoffice').val() || '';
  const pin = $('#edit-pincode').val() || '';
  const wa = $('#edit-whatsapp').val() || $('#phone').val();

  let addr = `${house}, ${place}`;
  if (po) addr += `, ${po}`;
  addr += ` - ${pin}`;

  $('#saved-address-text').text(addr);
  $('#saved-phone-text').text($('#phone').val());
  $('#saved-wa-text span').text(wa);
}

// 🔴 EDIT PINCODE LOGIC (Fetch POs)
async function handleEditPincode(pin) {
  if (pin.length === 6) {
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`);
      const data = await res.json();
      if (data && data.length > 0) {
        $('#edit-district').val(data[0].district);
        $('#edit-state').val(data[0].statename);

        if (data.length > 1) {
          // Show Dropdown
          const dd = $('#edit-postoffice-select');
          dd.empty().append('<option value="">Select PO...</option>');
          data.forEach(p => dd.append(`<option value="${p.officename}">${p.officename}</option>`));
          $('#edit-po-wrapper').show();
        } else {
          // Single PO
          $('#edit-postoffice').val(data[0].officename);
          $('#edit-po-wrapper').hide();
          updateSummaryDisplay();
        }
      }
    } catch (e) { }
  }
}

function selectEditPO(val) {
  $('#edit-postoffice').val(val);
  updateSummaryDisplay();
}

function toggleAddressEdit() { $('.address-box').slideToggle(); }

function submitQuickOrder() {
  if (!$('#quick-qty').val()) { showAlert(getAlert('err_qty')); return; }

  // Always take data from edit inputs (they are pre-filled with saved data anyway)
  const finalData = {
    orderid: editingOrderId,
    name: $('#saved-name').text(),
    phone: $('#phone').val(),
    whatsapp: $('#edit-whatsapp').val(),
    altphone: $('#edit-altphone').val(),

    house: $('#edit-house').val(),
    place: $('#edit-place').val(),
    pincode: $('#edit-pincode').val(),
    postoffice: $('#edit-postoffice').val(),
    district: $('#edit-district').val(), // Ensure District Updated
    state: $('#edit-state').val(),

    quantity: $('#quick-qty').val(),
    message: $('#quick-msg').val()
  };

  // Save to local for next time
  localStorage.setItem('kafakUser', JSON.stringify(finalData));

  postOrder(finalData);
}

// --- WIZARD FUNCTIONS (Keep as is, just ensure validation calls showLoader) ---
function startWizard() {
  $('#wizard-view').fadeIn();
  updateFooterButtons('wizard');
  currentStep = 1;
  showStep(1);
}
// ... (Keep existing wizard steps nextStep, prevStep, showStep, renderReview) ...
// (I will paste the rest of functions to ensure full file is correct)

function showStep(s) {
  $('.wiz-step').hide();
  $(`.wiz-step[data-step="${s}"]`).fadeIn();
  const pct = (s / 7) * 100;
  $('#wiz-progress').css('width', `${pct}%`);

  const btn = $('#btn-wiz-next');
  const lang = $('.form-select').val();

  if (s === 7) {
    btn.html(translations[lang].btn_order);
    btn.addClass('btn-brand-green');
  } else {
    btn.html(translations[lang].btn_next);
    btn.removeClass('btn-brand-green');
  }
  setTimeout(() => { $(`.wiz-step[data-step="${s}"] input`).first().focus(); }, 300);
}

async function nextStep() {
  // Validation same as before
  if (currentStep === 1 && !$('#name').val()) return showAlert(getAlert('err_name'));
  if (currentStep === 2 && !/^[0-9]{10}$/.test($('#whatsapp').val())) return showAlert(getAlert('err_whatsapp'));

  if (currentStep === 3) {
    const pin = $('#pincode').val();
    if (!/^[0-9]{6}$/.test(pin)) return showAlert(getAlert('err_pincode'));

    $('#btn-wiz-next').prop('disabled', true).text(getAlert('err_checking_pin'));
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`);
      const data = await res.json();
      $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next);

      if (data && data.length > 0) {
        poList = data;
        userData.district = data[0].district;
        userData.state = data[0].statename;

        if (data.length > 1) {
          $('#po-select').empty().append('<option value="">Select...</option>');
          data.forEach(p => $('#po-select').append(`<option value="${p.officename}">${p.officename}</option>`));
          currentStep = 3.5; showStep(3.5); return;
        } else {
          userData.postoffice = data[0].officename;
          $('#display-place').text(data[0].officename);
          $('#display-dist').text(data[0].district);
        }
      } else { showAlert(getAlert('err_pin_not_found')); }
    } catch (e) {
      $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next);
      showAlert(getAlert('err_pincode')); return;
    }
  }

  if (currentStep === 3.5) {
    if (!$('#po-select').val()) return showAlert(getAlert('err_select_po'));
    userData.postoffice = $('#po-select').val();
    $('#display-place').text(userData.postoffice);
    $('#display-dist').text(userData.district);
    currentStep = 4; showStep(4); return;
  }

  if (currentStep === 4 && !$('#house').val()) return showAlert(getAlert('err_house'));
  if (currentStep === 6 && !$('#quantity').val()) return showAlert(getAlert('err_qty'));

  if (currentStep === 6) { renderReview(); currentStep = 7; showStep(7); return; }
  if (currentStep === 7) { submitWizardOrder(); return; }

  currentStep++; showStep(currentStep);
}

function prevStep() {
  if (currentStep === 1) return location.reload();
  if (currentStep === 4 && poList.length > 1) { currentStep = 3.5; showStep(3.5); return; }
  if (currentStep === 4 && poList.length <= 1) { currentStep = 3; showStep(3); return; }
  if (currentStep === 3.5) { currentStep = 3; showStep(3); return; }
  currentStep--; showStep(currentStep);
}

function renderReview() {
  $('#rev-name').text($('#name').val());
  $('#rev-phone').text($('#phone').val());
  let addr = `${$('#house').val()}, ${userData.postoffice}\n${userData.district} - ${$('#pincode').val()}`;
  $('#rev-address').text(addr);
  $('#rev-qty').text(`${$('#quantity').val()} Bottle(s)`);
  $('#rev-total').text($('#wiz-price').text());
}

function submitWizardOrder() {
  const finalData = {
    orderid: editingOrderId,
    name: $('#name').val(),
    phone: $('#phone').val(),
    whatsapp: $('#whatsapp').val(),
    altphone: $('#altphone').val(),
    pincode: $('#pincode').val(),
    house: $('#house').val(),
    place: userData.postoffice,
    postoffice: userData.postoffice,
    district: userData.district,
    state: userData.state || 'Kerala',
    quantity: $('#quantity').val(),
    message: $('#message').val()
  };
  postOrder(finalData);
}

function postOrder(data) {
  showLoader(true);
  fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: data }) })
    .then(res => res.json())
    .then(res => {
      showLoader(false);
      if (res.result === 'success') {
        successData = { ...data, orderid: res.orderid, timestamp: res.timestamp };
        $('#order-form').hide();
        $('#showsuccess').fadeIn();
        updateFooterButtons('none');
        setTimeout(sendToWhatsapp, 1500);
      }
    })
    .catch(() => { showLoader(false); showAlert("Failed. Try again."); });
}

function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successData.orderid;
  const d = successData;
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;

  const n = parseInt(d.quantity);
  const base = n * 650;
  const courier = courierRates.kerala[n] || 0;
  const amountText = `Amount(₹): ${base} + ${courier}`;
  const totalText = `Total(₹): ${base + courier}/-`;

  const extra = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderid}\`\`\`\n⌚ _${successData.timestamp}_\n🔗 _${editLink}_`;

  // Updated Format to include District from 'd' which is successData
  const format = `\n____________________________________\n*${d.name.trim().toUpperCase()}*\n*${d.house.trim().toUpperCase()}*\n*${d.place.trim().toUpperCase()}*\n*${(d.postoffice || '').trim().toUpperCase()}*\n*${(d.district || '').trim().toUpperCase()}*\n*${d.state.trim().toUpperCase()}*\n*Pin: ${d.pincode.trim()}*\n*Ph: ${d.phone.trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;

  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}

// ... (Helpers: updatePrice, changeLanguage, showAlert, getAlert, confirmHome, showLoader) ... 
// Ensure all helpers from previous version are included.
// For brevity, assuming helpers are same as before.
function updatePrice(qty, isQuick) {
  if (!qty) return;
  const n = parseInt(qty);
  const base = n * 650;
  const rate = courierRates.kerala[n] || 0;
  const total = base + rate;
  const txt = `Total: ₹${total}/-`;
  if (isQuick) $('#quick-price').text(txt); else $('#wiz-price').text(txt);
}

function showAlert(msg) {
  const lang = $('.form-select').val();
  Swal.fire({
    text: msg,
    icon: 'warning',
    confirmButtonText: 'OK',
    confirmButtonColor: '#000',
    customClass: { popup: 'ios-popup', title: 'ios-title', content: 'ios-content', confirmButton: 'ios-btn' }
  });
}

function getAlert(key) {
  const lang = $('.form-select').val();
  return translations[lang][key] || key;
}

function confirmHome() {
  const lang = $('.form-select').val();
  Swal.fire({
    text: translations[lang].confirm_home,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    confirmButtonColor: '#000',
    cancelButtonColor: '#f2f2f2',
    customClass: { popup: 'ios-popup', content: 'ios-content', confirmButton: 'ios-btn', cancelButton: 'ios-btn-cancel' }
  }).then((result) => {
    if (result.isConfirmed) window.location.href = "index.html";
  });
}

function showLoader(show) {
  const lang = $('.form-select').val();
  const txt = translations[lang] ? translations[lang].loading : "Loading...";
  $('#loader-text').text(txt);
  if (show) $('#full-loader').fadeIn(); else $('#full-loader').fadeOut();
}