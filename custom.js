// 🔴 GOOGLE SCRIPT URL
const sc = `https://script.google.com/macros/s/AKfycby_Ju8fR6emPAF9MMOULRZfnQDmODOju38I4Mjfo-yt1FZjgtud6Q42-YALC0KUCo-fwg/exec`;

const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

// TRANSLATIONS
const translations = {
  ml: {
    lbl_phone: "ഫോൺ നമ്പർ", ph_phone: "മൊബൈൽ നമ്പർ", btn_next: "തുടരുക", welcome_back: "സ്വാഗതം!",
    btn_edit: "വിലാസം മാറ്റാം", lbl_house: "വീട്ടുപേര് / നമ്പർ", ph_house: "വീട്ടുപേര്",
    lbl_place: "സ്ഥലം", lbl_pincode: "പിൻകോഡ്", lbl_qty: "എത്ര ബോട്ടിൽ വേണം?",
    lbl_msg: "മെസ്സേജ് (ആവശ്യമെങ്കിൽ)", courier_included: "(കൂരിയർ ചാർജ് ഉൾപ്പെടെ)",
    btn_update: "ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്യാം", btn_order: "ഓർഡർ ചെയ്യാം", lbl_name: "നിങ്ങളുടെ പേര്",
    ph_name: "പേര്", lbl_whatsapp: "വാട്സാപ്പ് നമ്പർ", lbl_select_po: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കുക",
    lbl_altphone: "മറ്റൊരു നമ്പർ (Optional)", lbl_summary: "ഓർഡർ വിവരങ്ങൾ", lbl_address: "വിലാസം",
    order_success: "ഓർഡർ ലഭിച്ചു!", redirect_wa: "വാട്സാപ്പിലേക്ക് പോകുന്നു...", open_wa: "വാട്സാപ്പ് ഓപ്പൺ ചെയ്യാം",
    loading: "വിവരങ്ങൾ എടുക്കുന്നു...", err_phone: "10 അക്ക മൊബൈൽ നമ്പർ നൽകുക!", err_name: "പേര് നൽകുക",
    err_whatsapp: "ശരിയായ 10 അക്ക വാട്സാപ്പ് നമ്പർ നൽകുക", err_pincode: "ശരിയായ 6 അക്ക പിൻകോഡ് നൽകുക",
    err_checking_pin: "പിൻകോഡ് പരിശോധിക്കുന്നു...", err_pin_not_found: "പിൻകോഡ് കണ്ടെത്തിയില്ല.",
    err_select_po: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കുക", err_house: "വീട്ടുപേര് നൽകുക", err_place: "സ്ഥലം നൽകുക",
    err_qty: "എത്ര ബോട്ടിൽ എന്ന് തിരഞ്ഞെടുക്കുക",
    confirm_home: "ഹോമിലേക്ക് പോകണോ? വിവരങ്ങൾ നഷ്ടപ്പെടും.", alert_title: "ശ്രദ്ധിക്കുക"
  },
  en: {
    lbl_phone: "Phone Number", ph_phone: "Enter Mobile Number", btn_next: "CONTINUE", welcome_back: "Welcome Back!",
    btn_edit: "EDIT ADDRESS", lbl_house: "House Name / No", ph_house: "House Name",
    lbl_place: "Place / Area", lbl_pincode: "Pincode", lbl_qty: "Select Quantity",
    lbl_msg: "Message (Optional)", courier_included: "(Courier Charge Included)",
    btn_update: "UPDATE ORDER", btn_order: "PLACE ORDER", lbl_name: "Full Name",
    ph_name: "Your Name", lbl_whatsapp: "WhatsApp Number", lbl_select_po: "Select Post Office",
    lbl_altphone: "Alternate Phone (Optional)", lbl_summary: "Order Summary", lbl_address: "Address",
    order_success: "Order Placed!", redirect_wa: "Redirecting to WhatsApp...", open_wa: "Open WhatsApp",
    loading: "Fetching details...", err_phone: "Please enter valid 10 digit number!", err_name: "Please enter your name",
    err_whatsapp: "Please enter valid 10 digit WhatsApp number", err_pincode: "Please enter valid 6 digit Pincode",
    err_checking_pin: "Checking Pincode...", err_pin_not_found: "Pincode not found.",
    err_select_po: "Please select Post Office", err_house: "Please enter House Name", err_place: "Please enter Place",
    err_qty: "Please select quantity",
    confirm_home: "Go home? Data will be lost.", alert_title: "Alert"
  }
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

  $('#phone').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#edit-phone').on('input', function () { this.value = this.value.replace(/\D/g, ''); }); // 🔴 Edit Phone Input
  $('#whatsapp').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#altphone').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#pincode').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#quantity, #quick-qty').change(function () { updatePrice($(this).val(), $(this).attr('id') === 'quick-qty'); });

  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get('oid')) {
    fetchOrder(urlParams.get('oid'));
  } else {
    // 🔴 AUTO LOGIN
    const saved = localStorage.getItem('kafakUser');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.name && u.phone && u.house) {
          userData = u;
          editingOrderId = null;
          showLoader(false);
          showReturningUserView(u, false);
          return;
        }
      } catch (e) { }
    }

    showLoader(false);
    $('#step-0').fadeIn();
    updateFooterButtons('step-0');
    setTimeout(() => $('#phone').focus(), 500);
  }
});

function updateFooterButtons(view) {
  $('#btn-group-0').hide();
  $('#btn-group-wizard').hide();
  $('#btn-group-returning').hide();

  if (view === 'step-0') $('#btn-group-0').show();
  if (view === 'wizard') $('#btn-group-wizard').css({ 'display': 'flex', 'gap': '1rem' });
  if (view === 'returning') $('#btn-group-returning').show();
}

function changeLanguage(lang) {
  $('[data-i18n]').each(function () {
    const key = $(this).data('i18n');
    if (translations[lang][key]) $(this).text(translations[lang][key]);
  });
  if (lang === 'ml') {
    $('#phone').attr('placeholder', translations.ml.ph_phone);
    $('#name').attr('placeholder', translations.ml.ph_name);
    $('#house').attr('placeholder', translations.ml.ph_house);
  } else {
    $('#phone').attr('placeholder', translations.en.ph_phone);
    $('#name').attr('placeholder', translations.en.ph_name);
    $('#house').attr('placeholder', translations.en.ph_house);
  }
}

function showAlert(msg) {
  const lang = $('.form-select').val();
  Swal.fire({ text: msg, icon: 'warning', confirmButtonText: 'OK', confirmButtonColor: '#000', customClass: { popup: 'ios-popup', confirmButton: 'ios-btn' } });
}

function getAlert(key) {
  const lang = $('.form-select').val();
  return translations[lang][key] || key;
}

function confirmHome() {
  const lang = $('.form-select').val();
  Swal.fire({ text: translations[lang].confirm_home, icon: 'question', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'No', confirmButtonColor: '#000', cancelButtonColor: '#f2f2f2', customClass: { popup: 'ios-popup', confirmButton: 'ios-btn', cancelButton: 'ios-btn-cancel' } }).then((result) => { if (result.isConfirmed) window.location.href = "index.html"; });
}

function showLoader(show) {
  const lang = $('.form-select').val();
  if (translations && translations[lang]) {
    $('#loader-text').text(translations[lang].loading || "Loading...");
  }
  if (show) $('#full-loader').fadeIn(); else $('#full-loader').fadeOut();
}

function handlePhoneNext() {
  const phone = $('#phone').val();
  if (!/^[0-9]{10}$/.test(phone)) { showAlert(getAlert('err_phone')); return; }

  showLoader(true);
  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(res => {
      showLoader(false);
      $('#step-0').hide();

      let localData = null;
      try {
        const u = JSON.parse(localStorage.getItem('kafakUser'));
        if (u && u.phone === phone) localData = u;
      } catch (e) { }

      if (res.result === 'success') {
        const d = res.data;
        const finalUser = localData ? { ...d, ...localData } : d;

        if (d.orderid && d.Status && d.Status !== 'Dispatched') {
          userData = finalUser;
          editingOrderId = d.orderid;
          showReturningUserView(userData, true);
        } else {
          userData = finalUser;
          editingOrderId = null;
          if (finalUser.name && finalUser.house) {
            showReturningUserView(finalUser, false);
          } else {
            startWizard();
          }
        }
      } else {
        if (localData) {
          userData = localData;
          editingOrderId = null;
          showReturningUserView(localData, false);
        } else {
          editingOrderId = null;
          $('#whatsapp').val(phone);
          startWizard();
        }
      }
    })
    .catch(e => { showLoader(false); showAlert("Network Error!"); });
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
        localStorage.setItem('kafakUser', JSON.stringify(d));

        if (d.Status === 'Dispatched') {
          editingOrderId = null;
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

function showReturningUserView(d, isActiveOrder) {
  $('#returning-user-view').fadeIn();
  updateFooterButtons('returning');

  $('#saved-name').text(d.name);

  $('#edit-phone').val(d.phone); // 🔴 PREFILL PHONE
  $('#edit-house').val(d.house);
  $('#edit-place').val(d.place);
  $('#edit-pincode').val(d.pincode);
  $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district);
  $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone);
  $('#edit-altphone').val(d.altphone || '');

  updateSummaryDisplay();

  if (isActiveOrder) {
    $('#quick-qty').val(d.quantity).trigger('change');
    $('#quick-msg').val(d.message);
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്യാം" : "UPDATE ORDER");
  } else {
    $('#quick-qty').val('').trigger('change');
    $('#quick-msg').val('');
    $('#quick-price').text('₹0');
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ ചെയ്യാം" : "PLACE ORDER");
  }
}

function updateSummaryDisplay() {
  const house = $('#edit-house').val() || '';
  const place = $('#edit-place').val() || '';
  const po = $('#edit-postoffice').val() || '';
  const pin = $('#edit-pincode').val() || '';
  const dist = $('#edit-district').val() || '';
  const wa = $('#edit-whatsapp').val() || '';
  const alt = $('#edit-altphone').val();
  const phone = $('#edit-phone').val() || '';

  let addr = `${house}, ${place}`;
  if (po) addr += `, ${po}`;
  addr += ` - ${pin}`;

  $('#saved-address-text').text(addr);
  $('#saved-place-dist').text(dist);
  $('#saved-phone-text').text(phone);
  $('#saved-wa-text span').text(wa);

  if (alt) {
    $('#saved-alt-text span').text(alt);
    $('#saved-alt-text').show();
  } else {
    $('#saved-alt-text').hide();
  }
}

async function handleEditPincode(pin) {
  if (pin.length === 6) {
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`);
      const data = await res.json();
      if (data && data.length > 0) {
        $('#edit-district').val(data[0].district);
        $('#edit-state').val(data[0].statename);

        if (data.length > 1) {
          const dd = $('#edit-postoffice-select');
          dd.empty().append('<option value="">Select PO...</option>');
          data.forEach(p => dd.append(`<option value="${p.officename}">${p.officename}</option>`));
          $('#edit-po-wrapper').show();
        } else {
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

  if ($('#edit-po-wrapper').is(':visible') && !$('#edit-postoffice-select').val()) {
    showAlert(getAlert('err_select_po')); return;
  }

  // Use values from EDIT INPUTS (Handling phone change too)
  const finalData = {
    orderid: editingOrderId,
    name: $('#saved-name').text(),
    phone: $('#edit-phone').val(), // 🔴 UPDATED PHONE
    whatsapp: $('#edit-whatsapp').val(),
    altphone: $('#edit-altphone').val(),
    house: $('#edit-house').val(),
    place: $('#edit-place').val(),
    pincode: $('#edit-pincode').val(),
    postoffice: $('#edit-postoffice').val(),
    district: $('#edit-district').val(),
    state: $('#edit-state').val(),
    quantity: $('#quick-qty').val(),
    message: $('#quick-msg').val()
  };

  localStorage.setItem('kafakUser', JSON.stringify(finalData));
  postOrder(finalData);
}

function startWizard() {
  $('#wizard-view').fadeIn();
  updateFooterButtons('wizard');
  currentStep = 1;
  showStep(1);
}

function showStep(s) {
  $('.wiz-step').hide();
  $(`.wiz-step[data-step="${s}"]`).fadeIn();
  const pct = (s / 7) * 100;
  $('#wiz-progress').css('width', `${pct}%`);
  const btn = $('#btn-wiz-next');
  const lang = $('.form-select').val();
  if (s === 7) { btn.html(translations[lang].btn_order); btn.addClass('btn-brand-green'); }
  else { btn.html(translations[lang].btn_next); btn.removeClass('btn-brand-green'); }

  // 🔴 FOCUS LOGIC: Focus input, but NOT for Step 6 (Select) or it jumps
  if (s !== 6) {
    setTimeout(() => { $(`.wiz-step[data-step="${s}"] input`).first().focus(); }, 300);
  }
}

async function nextStep() {
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
        userData.district = data[0].district; // 🔴 DISTRICT CAPTURE
        userData.state = data[0].statename;

        if (data.length > 1) {
          $('#po-select').empty().append('<option value="">Select...</option>');
          data.forEach(p => $('#po-select').append(`<option value="${p.officename}">${p.officename}</option>`));
          currentStep = 3.5; showStep(3.5); return;
        } else {
          userData.postoffice = data[0].officename;
          currentStep = 4; showStep(4); return; // Skip to 4 directly
        }
      } else { showAlert(getAlert('err_pin_not_found')); }
    } catch (e) { $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next); showAlert(getAlert('err_pincode')); return; }
  }

  if (currentStep === 3.5) {
    if (!$('#po-select').val()) return showAlert(getAlert('err_select_po'));
    userData.postoffice = $('#po-select').val();
    currentStep = 4; showStep(4); return;
  }

  // 🔴 WIZARD STEP 4 VALIDATION & FOCUS
  if (currentStep === 4) {
    if (!$('#house').val()) { showAlert(getAlert('err_house')); $('#house').focus(); return; }
    if (!$('#place').val()) { showAlert(getAlert('err_place')); $('#place').focus(); return; }
    // Show Dist/PO for confirmation
    $('#display-po').text(userData.postoffice);
    $('#display-dist').text(userData.district);
  }

  if (currentStep === 5) { const alt = $('#altphone').val(); if (alt && !/^[0-9]{10}$/.test(alt)) return showAlert(getAlert('err_phone')); }
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
  // 🔴 RENDER DISTRICT
  let addr = `${$('#house').val()}, ${$('#place').val()}\n${userData.postoffice}\n${userData.district} - ${$('#pincode').val()}`;
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
    house: $('#house').val(),
    place: $('#place').val(), // 🔴 CAPTURE PLACE
    pincode: $('#pincode').val(),
    postoffice: userData.postoffice,
    district: userData.district,
    state: userData.state || 'Kerala',
    quantity: $('#quantity').val(),
    message: $('#message').val()
  };
  localStorage.setItem('kafakUser', JSON.stringify(finalData));
  postOrder(finalData);
}

function updatePrice(qty, isQuick) {
  if (!qty) return;
  const n = parseInt(qty);
  const base = n * 650;
  const rate = courierRates.kerala[n] || 0;
  const total = base + rate;
  const txt = `Total: ₹${total}/-`;
  if (isQuick) $('#quick-price').text(txt); else $('#wiz-price').text(txt);
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

  // 🔴 WHATSAPP FORMAT FIXED
  const format = `\n____________________________________\n*${d.name.trim().toUpperCase()}*\n*${d.house.trim().toUpperCase()}*\n*${d.place.trim().toUpperCase()}*\n*${(d.postoffice || '').trim().toUpperCase()}*\n*${(d.district || '').trim().toUpperCase()}*\n*${d.state.trim().toUpperCase()}*\n*Pin: ${d.pincode.trim()}*\n*Ph: ${d.phone.trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;

  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}