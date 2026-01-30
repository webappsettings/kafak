// ------------------------------------------------------------------------------
// 🔴 CONFIGURATION & GLOBALS
// ------------------------------------------------------------------------------
const sc = `https://script.google.com/macros/s/AKfycbwGuY0HqWoZeVZ9R30-GAghp6gpxa5l9uLwilp-AxrI1gCrlHPFxKmpplmwNXqtjSRqcg/exec`;

const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

const translations = {
  ml: {
    lbl_phone: "ഫോൺ നമ്പർ", ph_phone: "മൊബൈൽ നമ്പർ", btn_next: "തുടരുക", welcome_back: "സ്വാഗതം!",
    btn_edit: "വിലാസം മാറ്റാം", lbl_house: "വീട്ടുപേര് / നമ്പർ", ph_house: "വീട്ടുപേര്",
    lbl_place: "സ്ഥലം", lbl_pincode: "പിൻകോഡ്", lbl_qty: "എത്ര ബോട്ടിൽ വേണം?",
    lbl_msg: "മെസ്സേജ് (ആവശ്യമെങ്കിൽ)", courier_included: "(കൊറിയര്‍ ചാർജ് ഉൾപ്പെടെ)",
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
let myCustId = null;
let localUsersMap = {};
let currentLoginPhone = null;
let isEditMode = false;

// 🛡️ SAFE STORAGE
const SafeStorage = {
  getItem: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  setItem: function (key, val) { try { localStorage.setItem(key, val); } catch (e) { } },
  removeItem: function (key) { try { localStorage.removeItem(key); } catch (e) { } }
};

// ------------------------------------------------------------------------------
// 🔴 GLOBAL HELPERS
// ------------------------------------------------------------------------------
window.showLoader = function (show) {
  const lang = $('.form-select').val() || 'en';
  if (translations && translations[lang]) $('#loader-text').text(translations[lang].loading || "Loading...");
  if (show) $('#full-loader').show(); else $('#full-loader').hide(); // 🔥 No Fade, Instant Hide
}

window.showAlert = function (msg) {
  Swal.fire({ text: msg, icon: 'warning', confirmButtonText: 'OK', confirmButtonColor: '#000', customClass: { popup: 'ios-popup', confirmButton: 'ios-btn' } });
}

window.getAlert = function (key) {
  const lang = $('.form-select').val() || 'en';
  return translations[lang][key] || key;
}

window.updateWizardLocDisplay = function () {
  $('#display-po').text((userData.postoffice || '').toUpperCase());
  $('#display-dist-state').text(`${$('#place').val() || ''}, ${userData.district || ''}`.toUpperCase());
}

// ------------------------------------------------------------------------------
// 🔴 DOCUMENT READY
// ------------------------------------------------------------------------------
$(document).ready(function () {
  injectVideoCSS();

  const qtyOpts = `<option value="1">1 Bottle (650g)</option><option value="2">2 Bottles (1.30 kg)</option><option value="3">3 Bottles (1.95 kg)</option><option value="4">4 Bottles (2.60 kg)</option><option value="5">5 Bottles (3.25 kg)</option><option value="6">6 Bottles (3.90 kg)</option><option value="8">8 Bottles (5.20 kg)</option><option value="10">10 Bottles (6.50 kg)</option>`;
  $('#quantity').append(qtyOpts);
  $('#quick-qty').append(qtyOpts);

  $('#phone, #edit-phone, #whatsapp, #altphone, #pincode').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#quantity, #quick-qty').change(function () { updatePrice($(this).val(), $(this).attr('id') === 'quick-qty'); });

  const saved = SafeStorage.getItem('kafakUsers');
  if (saved) { try { localUsersMap = JSON.parse(saved); } catch (e) { localUsersMap = {}; } }
  else {
    const oldUser = SafeStorage.getItem('kafakUser');
    if (oldUser) { try { const u = JSON.parse(oldUser); if (u.phone) { localUsersMap[u.phone] = u; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap)); SafeStorage.removeItem('kafakUser'); } } catch (e) { } }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');
  const isAdmin = SafeStorage.getItem('kafakAdmin') === 'true';

  if (urlParams.get('mode') === 'test') {
    $('body').append('<button onclick="testVideo()" style="position:fixed; bottom:20px; right:20px; z-index:999999; padding:15px; background:red; color:white; border:none; border-radius:50px; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.3);">🔴 TEST VIDEO</button>');
    window.testVideo = function () {
      playVideoAnimation("MANAF", () => { console.log("Video Test Started"); });
    }
  }

  // 🔥 INSTANT EDIT LOAD (NO RELOAD EFFECT)
  if (oid) {
    if (isAdmin) {
      setupAdminView(oid);
    } else {
      let foundLocally = false;
      const phones = Object.keys(localUsersMap);

      // 1. Check Local First -> SHOW INSTANTLY
      for (let ph of phones) {
        if (localUsersMap[ph].orderid === oid) {
          showLoader(false);
          $('#step-0').hide(); // Ensure step-0 is gone
          loadOrderData(localUsersMap[ph]); // Instant Load
          foundLocally = true;
          syncUserDataBackground(ph); // Background Update
          break;
        }
      }

      // 2. Only fetch from server if NOT local
      if (!foundLocally) {
        fetchOrder(oid);
      }
    }
  } else {
    // Normal Visit
    showLoader(false);
    $('#step-0').show(); // 🔥 CHANGED: .show() instead of .fadeIn() to stop flicker
    updateFooterButtons('step-0');
    setTimeout(() => $('#phone').focus(), 500);
  }
});

// ------------------------------------------------------------------------------
// 🔴 CORE APP LOGIC
// ------------------------------------------------------------------------------
window.handlePhoneNext = function () {
  const phone = $('#phone').val();
  if (!/^[0-9]{10}$/.test(phone)) { showAlert(getAlert('err_phone')); return; }
  currentLoginPhone = phone;

  preloadHoneyVideo();

  if (localUsersMap[phone]) {
    loadOrderData(localUsersMap[phone]);
    syncUserDataBackground(phone);
    return;
  }

  // 🔥 FLICKER FIX: Use .hide() and .show() instantly
  editingOrderId = null;
  $('#step-0').hide();
  $('#whatsapp').val(phone);
  startWizard(); // Shows #wizard-view instantly

  backgroundUserCheck(phone);
}

function loadOrderData(d) {
  $('#step-0').hide(); userData = d; editingOrderId = d.orderid; currentLoginPhone = d.phone;
  if (d.phone) {
    localUsersMap[d.phone] = { ...localUsersMap[d.phone], ...d };
    SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));
  }
  if (d.Status === 'Dispatched' || d.Status === 'Completed') { editingOrderId = null; showReturningUserView(d, false); } else { showReturningUserView(d, true); }
}

function syncUserDataBackground(phone) {
  let localData = localUsersMap[phone];
  let custIdParam = localData.custId ? `&custId=${localData.custId}` : '';
  if ($('#quick-qty').length > 0 && $('#status-checker').length === 0) {
    $('#quick-qty').parent().append('<small id="status-checker" class="text-muted ms-2" style="font-size:10px;"><i class="fas fa-circle-notch fa-spin"></i> Checking...</small>');
  }
  fetch(`${sc}?action=getCustomer&phone=${phone}${custIdParam}`)
    .then(res => res.json())
    .then(res => {
      $('#status-checker').remove();
      if (res.result === 'success' && res.data) {
        let serverData = res.data;
        if (serverData.Status === 'Dispatched' || serverData.Status === 'Completed') {
          editingOrderId = null; $('#display-oid').hide();
          if ($('#quick-qty').val() == localData.quantity) $('#quick-qty').val('').trigger('change');
        }
        let mergedData = { ...localData, ...serverData };
        localUsersMap[phone] = mergedData;
        SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));
        updateStatusUI(mergedData);
      }
    })
    .catch(err => $('#status-checker').remove());
}

function backgroundUserCheck(phone) {
  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(res => {
      if (res.result === 'success' && res.data && res.data.custId) myCustId = res.data.custId;
    }).catch(e => console.log("Bg check fail"));
}

// ------------------------------------------------------------------------------
// 🔴 WIZARD FUNCTIONS (FLICKER FIX)
// ------------------------------------------------------------------------------
function updateFooterButtons(view) {
  $('#btn-group-0').hide(); $('#btn-group-wizard').hide(); $('#btn-group-returning').hide();
  if (view === 'step-0') $('#btn-group-0').show();
  if (view === 'wizard') $('#btn-group-wizard').css({ 'display': 'flex', 'gap': '1rem' });
  if (view === 'returning') $('#btn-group-returning').show();
}

window.startWizard = function () {
  $('#wizard-view').show(); // 🔥 CHANGED: Instant Show
  updateFooterButtons('wizard');
  currentStep = 1;
  showStep(1);
}

window.showStep = function (s) {
  $('.wiz-step').hide();

  // 🔥 FLICKER FIX: First step shows instantly, subsequent steps fade
  if (s === 1) {
    $(`.wiz-step[data-step="${s}"]`).show();
  } else {
    $(`.wiz-step[data-step="${s}"]`).fadeIn(200);
  }

  const pct = (s / 7) * 100; $('#wiz-progress').css('width', `${pct}%`);
  const btn = $('#btn-wiz-next'); const lang = $('.form-select').val();

  if (s === 7) {
    btn.html(translations[lang].btn_order);
    btn.addClass('btn-brand-green');
    updatePrice($('#quantity').val(), false);
  } else {
    btn.html(translations[lang].btn_next);
    btn.removeClass('btn-brand-green');
  }
  if (s !== 6) setTimeout(() => { $(`.wiz-step[data-step="${s}"] input`).first().focus(); }, 300);
}

window.nextStep = async function () {
  if (currentStep === 1 && !$('#name').val()) return showAlert(getAlert('err_name'));
  if (currentStep === 2 && !/^[0-9]{10}$/.test($('#whatsapp').val())) return showAlert(getAlert('err_whatsapp'));
  if (currentStep === 3) {
    const pin = $('#pincode').val(); if (!/^[0-9]{6}$/.test(pin)) return showAlert(getAlert('err_pincode'));
    $('#btn-wiz-next').prop('disabled', true).text(getAlert('err_checking_pin'));
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`); if (!res.ok) throw new Error("404"); let data = await res.json();
      data = data.map(item => ({ ...item, officename: item.officename.replace(/\s*(B\.?O\.?|S\.?O\.?)\s*$/i, ' PO') }));
      $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next);
      if (data && data.length > 0) {
        poList = data; userData.district = data[0].district; userData.state = data[0].statename;
        const dl = $('#place-list'); dl.empty(); data.forEach(p => dl.append(`<option value="${p.officename}">`));
        if (data.length > 1) { $('#po-select').empty().append('<option value="">Select...</option>'); data.forEach(p => $('#po-select').append(`<option value="${p.officename}">${p.officename}</option>`)); currentStep = 3.5; showStep(3.5); return; }
        else { userData.postoffice = data[0].officename; currentStep = 4; showStep(4); return; }
      } else { showAlert(getAlert('err_pin_not_found')); }
    } catch (e) { $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next); showAlert(getAlert('err_pincode')); return; }
  }
  if (currentStep === 3.5) { if (!$('#po-select').val()) return showAlert(getAlert('err_select_po')); userData.postoffice = $('#po-select').val(); currentStep = 4; showStep(4); return; }
  if (currentStep === 4) { if (!$('#house').val()) { showAlert(getAlert('err_house')); $('#house').focus(); return; } currentStep = 5; showStep(5); return; }
  if (currentStep === 5) {
    if (!$('#place').val()) { showAlert(getAlert('err_place')); $('#place').focus(); return; }
    updateWizardLocDisplay();
    currentStep = 6; showStep(6); return;
  }
  if (currentStep === 6) { const alt = $('#altphone').val(); if (alt && !/^[0-9]{10}$/.test(alt)) return showAlert(getAlert('err_phone')); }
  if (currentStep === 7) { if (!$('#quantity').val()) { showAlert(getAlert('err_qty')); return; } submitWizardOrder(); return; }
  currentStep++; showStep(currentStep);
}

window.prevStep = function () {
  if (currentStep === 1) return location.reload();
  if (currentStep === 4 && poList.length > 1) { currentStep = 3.5; showStep(3.5); return; }
  if (currentStep === 4 && poList.length <= 1) { currentStep = 3; showStep(3); return; }
  if (currentStep === 3.5) { currentStep = 3; showStep(3); return; }
  currentStep--; showStep(currentStep);
}

function submitWizardOrder() {
  const finalData = {
    orderid: editingOrderId, name: $('#name').val(), phone: $('#phone').val(), whatsapp: $('#whatsapp').val(),
    altphone: $('#altphone').val(), house: $('#house').val(), place: $('#place').val(), pincode: $('#pincode').val(),
    postoffice: userData.postoffice, district: userData.district, state: userData.state || 'Kerala',
    quantity: $('#quantity').val(), message: '', custId: myCustId
  };
  localUsersMap[finalData.phone] = finalData; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));
  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

// ------------------------------------------------------------------------------
// 🔴 RETURNING USER (INSTANT LOAD)
// ------------------------------------------------------------------------------
function showReturningUserView(d, isActiveOrder) {
  // 🔥 CHANGED: .show() instead of .fadeIn()
  $('#returning-user-view').show();
  updateFooterButtons('returning'); isEditMode = isActiveOrder;
  if (d.orderid) $('#display-oid').text('#' + d.orderid).show(); else $('#display-oid').hide();

  $('#saved-name').text(d.name); $('#edit-phone').val(d.phone); $('#edit-house').val(d.house);
  $('#edit-place').val(d.place); $('#edit-pincode').val(d.pincode); $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district); $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone); $('#edit-altphone').val(d.altphone || '');

  updateSummaryDisplay(); updateStatusUI(d);

  $('#quick-qty option').prop('disabled', false);
  if (isActiveOrder) {
    $('#quick-qty').val(d.quantity).trigger('change');
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്യാം" : "UPDATE ORDER");
    if (d.Status === 'Paid') { const currentQty = parseInt(d.quantity); $('#quick-qty option').each(function () { if (parseInt($(this).val()) < currentQty) $(this).prop('disabled', true); }); }
  } else {
    $('#quick-qty').val('').trigger('change'); $('#quick-price-box').hide();
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ ചെയ്യാം" : "PLACE ORDER");
  }
  checkForChanges();
}

function updateStatusUI(d) {
  $('#status-card-container').remove();
  let html = '';
  if (d.offer === true) {
    html += `<div class="p-3 mb-3 rounded shadow-sm text-center" style="background: linear-gradient(135deg, #fff3cd 0%, #ffecb3 100%); border: 1px solid #ffeeba;"><h5 class="fw-bold text-warning mb-1"><i class="fas fa-crown"></i> Platinum Customer</h5><small class="text-dark">You have unlocked special priority packing!</small></div>`;
  }
  if (d.Status === 'Paid') {
    html += `<div class="p-3 mb-3 rounded shadow-sm bg-success text-white text-center"><h5 class="fw-bold mb-1">✅ Payment Received!</h5><small>Your honey is being freshly packed.</small></div>`;
  } else if (d.Status === 'Dispatched' || d.Status === 'Completed') {
    let trackingHtml = d.tracking ? `<div class="mt-2 bg-white text-primary p-1 rounded fw-bold" onclick="navigator.clipboard.writeText('${d.tracking}')" style="cursor:pointer; font-size:14px;">📦 Track: ${d.tracking} <i class="far fa-copy"></i></div>` : '';
    html += `<div class="p-3 mb-3 rounded shadow-sm bg-primary text-white text-center"><h5 class="fw-bold mb-1">🚚 Order Dispatched!</h5><small>Your honey is on the way.</small>${trackingHtml}</div>`;
    $('#btn-edit-address').hide();
  } else {
    $('#btn-edit-address').show();
  }
  if (html) $('#returning-user-view').prepend(`<div id="status-card-container">${html}</div>`);
}

// ------------------------------------------------------------------------------
// 🔴 PRICE & VALIDATION
// ------------------------------------------------------------------------------
window.updatePrice = function (qty, isQuick) {
  if (!qty) return;
  const n = parseInt(qty); const base = n * 650; const courier = courierRates.kerala[n] || 0; const total = base + courier;
  const container = isQuick ? $('#quick-price-box') : $('#wiz-price-box');
  container.find('.qty-count').text(n); container.find('.val-base').text(base); container.find('.val-courier').text(courier); container.find('.val-total').text(total); container.fadeIn();
  if (!isQuick) {
    let altHtml = $('#altphone').val() ? `, ${$('#altphone').val()}` : '';
    let addrHtml = `<span class="dt-name">${$('#name').val()}</span><span class="dt-addr">${$('#house').val()}, ${$('#place').val()}<br>${(userData.postoffice || '').toUpperCase()}, ${(userData.district || '').toUpperCase()}<br>${(userData.state || '').toUpperCase()} - ${$('#pincode').val()}</span><div class="dt-phone"><i class="fas fa-phone-alt"></i> ${$('#phone').val()}${altHtml}</div><div class="dt-wa"><i class="fab fa-whatsapp"></i> ${$('#whatsapp').val()}</div>`;
    $('#wiz-final-addr').html(addrHtml); $('#wiz-deliver-box').fadeIn();
  }
  if (isQuick) checkForChanges();
}

window.submitQuickOrder = function () {
  if (!$('#quick-qty').val()) { showAlert(getAlert('err_qty')); return; }
  const newPhone = $('#edit-phone').val();
  if (!newPhone || newPhone.length !== 10) { showAlert(getAlert('err_phone')); return; }
  if (!$('#edit-house').val().trim()) { showAlert(getAlert('err_house')); return; }
  const pin = $('#edit-pincode').val();
  if (!pin || pin.length !== 6) { showAlert(getAlert('err_pincode')); return; }
  if (!$('#edit-postoffice').val()) { showAlert(getAlert('err_select_po')); return; }
  const wa = $('#edit-whatsapp').val();
  if (!wa || wa.length !== 10) { showAlert(getAlert('err_whatsapp')); return; }

  const finalData = { orderid: editingOrderId, name: $('#saved-name').text(), phone: newPhone, whatsapp: wa, altphone: $('#edit-altphone').val(), house: $('#edit-house').val(), place: $('#edit-place').val(), pincode: pin, postoffice: $('#edit-postoffice').val(), district: $('#edit-district').val(), state: $('#edit-state').val(), quantity: $('#quick-qty').val(), message: '', custId: myCustId };

  if (currentLoginPhone && currentLoginPhone !== newPhone) delete localUsersMap[currentLoginPhone];
  localUsersMap[newPhone] = finalData;
  SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));

  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

// ------------------------------------------------------------------------------
// 🎥 VIDEO ANIMATION LOGIC (WITH SLIDE-IN BADGE)
// ------------------------------------------------------------------------------
function injectVideoCSS() {
  $('body').append(`
    <style>
        #videoModal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background: #000; z-index:99999; flex-direction:column; align-items:center; justify-content:center; }
        
        .video-container { position: relative; width: 320px; height: 576px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid #333; }
        video { width: 100%; height: 100%; object-fit: cover; }

        /* 🏷️ FINAL BADGE CSS */
        .digital-label {
            position: absolute;
            top: 67%; 
            left: 53%; 
            /* Start: Shifted Right (-30%) & Small */
            transform: translate(-30%, -50%) scale(0.7); 
            
            width: 128px; 
            height: 128px; 
            border-radius: 50%;
            background: radial-gradient(circle, #ffffff 40%, #ffe6a0 100%);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(0, 0, 0, 0.1);
            
            display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
            z-index: 10;
            opacity: 0; 
            
            /* Slide Animation */
            transition: all 1s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        /* Visible State */
        .digital-label.visible { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1); 
        }

        .digital-label img { width: 50px; opacity: 0.95; margin-bottom: 3px; }
        .digital-label .packed-text { font-size: 8px; color: #5d4037; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 2px; }
        .digital-label .name-text { font-size: 14px; font-weight: 900; color: #2c1e1a; text-transform: uppercase; font-family: 'Courier New', monospace; border-bottom: 2px dashed #8d6e63; padding-bottom: 2px; }

        .loading-txt { color: #d4a017; margin-top: 20px; font-family: sans-serif; font-size: 12px; letter-spacing: 2px; opacity: 0.8; }
    </style>
    
    <div id="videoModal">
        <div class="video-container">
            <video id="honeyVideo" muted playsinline preload="auto">
                <source src="honey_rotate.mp4" type="video/mp4">
            </video>
            
            <div class="digital-label" id="customLabel">
                <img src="images/kafak_logo.png" alt="Kafak">
                <div class="packed-text">RESERVED FOR</div>
                <div class="name-text" id="vid-username">User</div>
            </div>
        </div>
        <div class="loading-txt">PREPARING YOUR ORDER...</div>
    </div>
    `);
}

function preloadHoneyVideo() {
  const v = document.getElementById('honeyVideo');
  if (v) v.load();
}

function playVideoAnimation(userName, apiCallback) {
  $('#videoModal').css('display', 'flex').fadeIn();

  const video = document.getElementById('honeyVideo');
  const label = document.getElementById('customLabel');

  $('#vid-username').text(userName);
  label.classList.remove('visible'); // Reset

  video.currentTime = 0;
  video.play().catch(e => console.log("Auto-play blocked", e));

  apiCallback();

  // ⏱️ TIMING (4.7s)
  setTimeout(() => {
    label.classList.add('visible');
  }, 4700);

  setTimeout(() => {
    if (window.orderSuccess === true) {
      // Continue
    }
  }, 8000);
}

// ------------------------------------------------------------------------------
// 🔴 SERVER POST
// ------------------------------------------------------------------------------
function postOrder(data) {
  window.orderSuccess = false;
  fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: data }) })
    .then(res => res.json())
    .then(res => {
      if (res.result === 'success') {
        successData = { ...data, orderid: res.orderid, timestamp: res.timestamp };
        if (res.custId) { data.custId = res.custId; myCustId = res.custId; localUsersMap[data.phone] = data; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap)); }

        window.orderSuccess = true;

        setTimeout(() => {
          $('#videoModal').fadeOut();
          $('#order-form').hide();
          $('#showsuccess').fadeIn();
          updateFooterButtons('none');
          setTimeout(sendToWhatsapp, 1500);
        }, 6000);
      }
    })
    .catch(() => {
      $('#videoModal').fadeOut();
      showAlert("Connection failed. Try again.");
    });
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

  const safe = (val) => String(val || '').trim().toUpperCase();

  const format = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${String(d.pincode || '').trim()}*\n*Ph: ${String(d.phone || '').trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;

  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}

// ------------------------------------------------------------------------------
// 🔴 ADMIN LOGIC & HELPERS
// ------------------------------------------------------------------------------
function setupAdminView(oid) {
  const adminUI = `<div id="admin-action-bar" style="display:none; position: fixed; bottom: 0; left: 0; width: 100%; background: white; padding: 15px; z-index: 12000; border-top: 1px solid #ddd; box-shadow: 0 -4px 20px rgba(0,0,0,0.15);"><div class="container p-0 d-flex justify-content-between align-items-center"><div id="admin-btn-container" style="flex-grow:1; margin-right:15px;"></div><button onclick="window.location.href='admin.html'" class="btn btn-light rounded-circle shadow-sm" style="width:45px; height:45px; border:1px solid #eee; display:flex; align-items:center; justify-content:center;"><i class="fas fa-times text-danger" style="font-size:20px;"></i></button></div></div>`;
  $('body').append(adminUI); $('body').css('padding-bottom', '100px');
  $('.footer-action').after(`<div class="text-center py-4"><button onclick="clearAdminCache()" class="btn btn-sm btn-outline-secondary" style="font-size:10px; opacity:0.7;">🛠️ Admin: Clear Cache</button></div>`);

  let cachedOrders = JSON.parse(SafeStorage.getItem('allOrdersCache') || "[]");
  let cachedOrder = cachedOrders.find(o => o.orderid === oid);

  if (cachedOrder) {
    showLoader(false);
    updateAdminUI(cachedOrder.Status || 'Pending', oid);
    loadOrderData(cachedOrder);
  } else {
    fetchOrder(oid);
  }
}

window.updateAdminUI = function (serverStatus, oid) {
  let pendingUpdates = JSON.parse(SafeStorage.getItem('pendingUpdates') || "[]");
  let localUpdate = pendingUpdates.find(item => item.oid === oid);
  let currentStatus = localUpdate ? localUpdate.status : (serverStatus || 'Pending');

  let btnHTML = '';

  if (currentStatus === 'Pending') {
    btnHTML = `<button onclick="adminAction('${oid}', 'Sent')" class="btn btn-primary btn-sm fw-bold w-100 shadow-sm">💬 MARK SENT (BLUE)</button>`;
  } else if (currentStatus === 'Sent') {
    btnHTML = `<button onclick="adminAction('${oid}', 'Paid')" class="btn btn-warning btn-sm fw-bold w-100 shadow-sm text-dark">💰 MARK PAID (YELLOW)</button>`;
  } else {
    let statusText = currentStatus === 'Dispatched' ? 'DISPATCHED' : (currentStatus === 'Completed' ? 'COMPLETED' : 'PAID');
    btnHTML = `<button class="btn btn-secondary btn-sm fw-bold w-100 shadow-sm" disabled>${statusText} ✅</button>`;
  }

  $('#admin-btn-container').html(btnHTML);
  $('#admin-action-bar').slideDown();
}

window.adminAction = function (oid, status) {
  if (!confirm(`ഈ ഓർഡർ '${status}' ആയി മാർക്ക് ചെയ്യട്ടെ?`)) return;

  let updates = JSON.parse(SafeStorage.getItem('pendingUpdates') || "[]");
  updates = updates.filter(item => item.oid !== oid);
  updates.push({ oid: oid, status: status, time: new Date().getTime() });
  SafeStorage.setItem('pendingUpdates', JSON.stringify(updates));

  let allOrders = JSON.parse(SafeStorage.getItem('allOrdersCache') || "[]");
  let orderIndex = allOrders.findIndex(o => o.orderid === oid);
  if (orderIndex !== -1) {
    allOrders[orderIndex].Status = status;
    SafeStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
  }

  updateAdminUI(status, oid);

  const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
  });
  Toast.fire({ icon: 'success', title: `Saved: ${status}` });
}

window.clearAdminCache = function () {
  if (confirm("Cache ക്ലിയർ ചെയ്ത് റീലോഡ് ചെയ്യണോ?")) {
    SafeStorage.removeItem('allOrdersCache');
    location.reload();
  }
}

function fetchOrder(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`).then(res => res.json()).then(res => {
    showLoader(false);
    if (res.result === 'success') {
      let d = res.data;
      if (d.custId) { myCustId = d.custId; }

      if (d.phone && localUsersMap[d.phone]) {
        const local = localUsersMap[d.phone];
        if (!d.district && local.district) d.district = local.district;
        if (!d.custId && local.custId) d.custId = local.custId;
      }

      if (SafeStorage.getItem('kafakAdmin') === 'true') {
        let cachedOrders = JSON.parse(SafeStorage.getItem('allOrdersCache') || "[]");
        let cachedOrder = cachedOrders.find(o => o.orderid === oid);
        let status = cachedOrder ? cachedOrder.Status : (d.Status || 'Pending');
        updateAdminUI(status, oid);
      }

      loadOrderData(d);
    } else {
      $('#step-0').fadeIn();
      updateFooterButtons('step-0');
    }
  }).catch(() => { showLoader(false); $('#step-0').fadeIn(); updateFooterButtons('step-0'); });
}

// ------------------------------------------------------------------------------
// 🔴 HELPER UPDATES
// ------------------------------------------------------------------------------
function updateSummaryDisplay() {
  const house = $('#edit-house').val() || '';
  const place = $('#edit-place').val() || '';
  const po = $('#edit-postoffice').val() || '';
  const pin = $('#edit-pincode').val() || '';
  const dist = $('#edit-district').val() || '';
  const wa = $('#edit-whatsapp').val() || '';
  const alt = $('#edit-altphone').val();
  const phone = $('#edit-phone').val() || '';

  let addr = `${house}, ${place}, ${po}, ${dist}, ${pin}`.toUpperCase().replace(/,\s*,/g, ',').replace(/\s\s+/g, ' ');

  $('#saved-address-text').text(addr);
  $('#saved-place-dist').text('');
  $('#saved-phone-text').text(phone);
  $('#saved-wa-text span').text(wa);

  if (alt) {
    $('#saved-alt-text span').text(alt);
    $('#saved-alt-text').show();
  } else {
    $('#saved-alt-text').hide();
  }

  checkForChanges();
}

function checkForChanges() {
  const btn = $('#btn-quick-submit');
  if (!isEditMode) {
    btn.prop('disabled', false).css('opacity', '1');
    return;
  }
  const current = {
    phone: $('#edit-phone').val(),
    house: $('#edit-house').val(),
    place: $('#edit-place').val(),
    pincode: $('#edit-pincode').val(),
    postoffice: $('#edit-postoffice').val(),
    whatsapp: $('#edit-whatsapp').val(),
    altphone: $('#edit-altphone').val(),
    quantity: $('#quick-qty').val()
  };
  const isDiff = (key, val) => String(userData[key] || '').trim() !== String(val || '').trim();
  const hasChanges =
    isDiff('phone', current.phone) ||
    isDiff('house', current.house) ||
    isDiff('place', current.place) ||
    isDiff('pincode', current.pincode) ||
    isDiff('postoffice', current.postoffice) ||
    isDiff('whatsapp', current.whatsapp) ||
    isDiff('altphone', current.altphone) ||
    isDiff('quantity', current.quantity);

  if (hasChanges) {
    btn.prop('disabled', false).css('opacity', '1');
  } else {
    btn.prop('disabled', true).css('opacity', '0.5');
  }
}

function toggleAddressEdit() { $('.address-box').slideToggle(); }
function selectEditPO(val) { $('#edit-postoffice').val(val); updateSummaryDisplay(); }