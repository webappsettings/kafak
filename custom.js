// ------------------------------------------------------------------------------
// 🔴 CONFIGURATION & GLOBALS
// ------------------------------------------------------------------------------
const sc = `https://script.google.com/macros/s/AKfycbwGuY0HqWoZeVZ9R30-GAghp6gpxa5l9uLwilp-AxrI1gCrlHPFxKmpplmwNXqtjSRqcg/exec`;

// Client-side estimation (Server does final calc)
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

// Global Variables
let currentStep = 0;
let editingOrderId = null;
let userData = {};
let successData = null;
let poList = [];
let myCustId = null;
let localUsersMap = {};
let currentLoginPhone = null;
let isEditMode = false;
let logoImageObj = new Image(); // Preload Image Object

// 🛡️ SAFE STORAGE WRAPPER
const SafeStorage = {
  getItem: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  setItem: function (key, val) { try { localStorage.setItem(key, val); } catch (e) { } },
  removeItem: function (key) { try { localStorage.removeItem(key); } catch (e) { } }
};

// ------------------------------------------------------------------------------
// 🔴 GLOBAL HELPERS (Defined at top to fix ReferenceError)
// ------------------------------------------------------------------------------

window.showLoader = function (show) {
  const lang = $('.form-select').val() || 'en';
  if (translations && translations[lang]) {
    $('#loader-text').text(translations[lang].loading || "Loading...");
  }
  if (show) $('#full-loader').fadeIn(); else $('#full-loader').fadeOut();
}

window.showAlert = function (msg) {
  Swal.fire({ text: msg, icon: 'warning', confirmButtonText: 'OK', confirmButtonColor: '#000', customClass: { popup: 'ios-popup', confirmButton: 'ios-btn' } });
}

window.getAlert = function (key) {
  const lang = $('.form-select').val() || 'en';
  return translations[lang][key] || key;
}

// ------------------------------------------------------------------------------
// 🔴 DOCUMENT READY
// ------------------------------------------------------------------------------
$(document).ready(function () {
  injectAnimationCSS(); // Inject Canvas CSS

  // Preload Logo
  logoImageObj.src = 'images/kafak_logo.png'; // ⚠️ ENSURE THIS PATH IS CORRECT

  // Populate Quantity
  const qtyOpts = `<option value="1">1 Bottle (650g)</option><option value="2">2 Bottles (1.30 kg)</option><option value="3">3 Bottles (1.95 kg)</option><option value="4">4 Bottles (2.60 kg)</option><option value="5">5 Bottles (3.25 kg)</option><option value="6">6 Bottles (3.90 kg)</option><option value="8">8 Bottles (5.20 kg)</option><option value="10">10 Bottles (6.50 kg)</option>`;
  $('#quantity').append(qtyOpts);
  $('#quick-qty').append(qtyOpts);

  // Input Filters
  $('#phone, #edit-phone, #whatsapp, #altphone, #pincode').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#quantity, #quick-qty').change(function () { updatePrice($(this).val(), $(this).attr('id') === 'quick-qty'); });

  // Load Local Storage
  const saved = SafeStorage.getItem('kafakUsers');
  if (saved) { try { localUsersMap = JSON.parse(saved); } catch (e) { localUsersMap = {}; } }
  else {
    const oldUser = SafeStorage.getItem('kafakUser');
    if (oldUser) { try { const u = JSON.parse(oldUser); if (u.phone) { localUsersMap[u.phone] = u; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap)); SafeStorage.removeItem('kafakUser'); } } catch (e) { } }
  }

  // URL Params Check (Admin/Edit)
  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');
  const isAdmin = SafeStorage.getItem('kafakAdmin') === 'true';

  if (oid) {
    if (isAdmin) {
      setupAdminView(oid);
    } else {
      // CUSTOMER EDIT LOGIC (Hybrid)
      let foundLocally = false;
      const phones = Object.keys(localUsersMap);
      for (let ph of phones) {
        if (localUsersMap[ph].orderid === oid) {
          loadOrderData(localUsersMap[ph]);
          foundLocally = true;
          showLoader(false);
          syncUserDataBackground(ph); // Sync in background
          break;
        }
      }
      if (!foundLocally) fetchOrder(oid);
    }
  } else {
    showLoader(false);
    $('#step-0').fadeIn();
    updateFooterButtons('step-0');
    setTimeout(() => $('#phone').focus(), 500);
  }
});

// ------------------------------------------------------------------------------
// 🔴 CORE APP LOGIC (THE SUPER FAST FLOW)
// ------------------------------------------------------------------------------

// 🔥 STEP 1: HANDLE PHONE INPUT
window.handlePhoneNext = function () {
  const phone = $('#phone').val();
  if (!/^[0-9]{10}$/.test(phone)) { showAlert(getAlert('err_phone')); return; }
  currentLoginPhone = phone;

  // SCENARIO 1: LOCAL DATA EXISTS -> SHOW EDIT VIEW INSTANTLY
  if (localUsersMap[phone]) {
    console.log("🚀 Local data found. Loading UI instantly...");
    loadOrderData(localUsersMap[phone]);
    // Background Sync (Silent)
    syncUserDataBackground(phone);
    return;
  }

  // SCENARIO 2: NO LOCAL DATA -> SHOW WIZARD INSTANTLY (Assume New User)
  console.log("🚀 No local data. Showing Wizard instantly...");
  editingOrderId = null;
  $('#step-0').hide();
  $('#whatsapp').val(phone);
  startWizard();

  // Optional: Check server in background just in case they are old user on new device
  // If found, we update 'myCustId' silently for the final submit
  backgroundUserCheck(phone);
}

// Helper: Load Data into UI
function loadOrderData(d) {
  $('#step-0').hide(); userData = d; editingOrderId = d.orderid; currentLoginPhone = d.phone;
  if (d.phone) { localUsersMap[d.phone] = { ...localUsersMap[d.phone], ...d }; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap)); }

  // If completed/dispatched, treat as new order history but clear ID
  if (d.Status === 'Dispatched' || d.Status === 'Completed') {
    editingOrderId = null;
    showReturningUserView(d, false);
  } else {
    showReturningUserView(d, true);
  }
}

// 🔄 Background Sync (Updates Status/Loyalty silently)
function syncUserDataBackground(phone) {
  let localData = localUsersMap[phone];
  let custIdParam = localData.custId ? `&custId=${localData.custId}` : '';

  // Non-intrusive indicator
  $('#quick-qty').parent().append('<small id="status-checker" class="text-muted ms-2" style="font-size:10px;"><i class="fas fa-circle-notch fa-spin"></i> Checking status...</small>');

  fetch(`${sc}?action=getCustomer&phone=${phone}${custIdParam}`)
    .then(res => res.json())
    .then(res => {
      $('#status-checker').remove();
      if (res.result === 'success' && res.data) {
        let serverData = res.data;

        // STATUS LOGIC: If dispatched, force new order mode
        if (serverData.Status === 'Dispatched' || serverData.Status === 'Completed') {
          console.log("Sync: Order Dispatched. Switching to New Order mode.");
          editingOrderId = null;
          $('#display-oid').hide();
          if ($('#quick-qty').val() == localData.quantity) {
            $('#quick-qty').val('').trigger('change'); // Clear qty
          }
        }

        // MERGE & SAVE
        let mergedData = { ...localData, ...serverData };
        localUsersMap[phone] = mergedData;
        SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));

        // REFRESH CARDS
        updateStatusUI(mergedData);
      }
    })
    .catch(err => $('#status-checker').remove());
}

// Silent Check for New Device users
function backgroundUserCheck(phone) {
  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(res => {
      if (res.result === 'success' && res.data && res.data.custId) {
        myCustId = res.data.custId; // Capture ID for correct linking
        // We don't interrupt the Wizard. We just link the ID.
      }
    }).catch(e => console.log("Bg check fail"));
}

// ------------------------------------------------------------------------------
// 🔴 WIZARD LOGIC
// ------------------------------------------------------------------------------
function updateFooterButtons(view) {
  $('#btn-group-0').hide(); $('#btn-group-wizard').hide(); $('#btn-group-returning').hide();
  if (view === 'step-0') $('#btn-group-0').show();
  if (view === 'wizard') $('#btn-group-wizard').css({ 'display': 'flex', 'gap': '1rem' });
  if (view === 'returning') $('#btn-group-returning').show();
}

window.startWizard = function () { $('#wizard-view').fadeIn(); updateFooterButtons('wizard'); currentStep = 1; showStep(1); }

window.showStep = function (s) {
  $('.wiz-step').hide(); $(`.wiz-step[data-step="${s}"]`).fadeIn();
  const pct = (s / 7) * 100; $('#wiz-progress').css('width', `${pct}%`);
  const btn = $('#btn-wiz-next');
  const lang = $('.form-select').val();

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
    const pin = $('#pincode').val();
    if (!/^[0-9]{6}$/.test(pin)) return showAlert(getAlert('err_pincode'));
    $('#btn-wiz-next').prop('disabled', true).text(getAlert('err_checking_pin'));
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`);
      if (!res.ok) throw new Error("404");
      let data = await res.json();
      data = data.map(item => ({ ...item, officename: item.officename.replace(/\s*(B\.?O\.?|S\.?O\.?)\s*$/i, ' PO') }));
      $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next);
      if (data && data.length > 0) {
        poList = data; userData.district = data[0].district; userData.state = data[0].statename;
        const dl = $('#place-list'); dl.empty();
        data.forEach(p => dl.append(`<option value="${p.officename}">`));
        if (data.length > 1) {
          $('#po-select').empty().append('<option value="">Select...</option>');
          data.forEach(p => $('#po-select').append(`<option value="${p.officename}">${p.officename}</option>`));
          currentStep = 3.5; showStep(3.5); return;
        } else {
          userData.postoffice = data[0].officename; currentStep = 4; showStep(4); return;
        }
      } else { showAlert(getAlert('err_pin_not_found')); }
    } catch (e) {
      $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next);
      showAlert(getAlert('err_pincode')); return;
    }
  }
  if (currentStep === 3.5) { if (!$('#po-select').val()) return showAlert(getAlert('err_select_po')); userData.postoffice = $('#po-select').val(); currentStep = 4; showStep(4); return; }
  if (currentStep === 4) { if (!$('#house').val()) { showAlert(getAlert('err_house')); $('#house').focus(); return; } currentStep = 5; showStep(5); return; }
  if (currentStep === 5) { if (!$('#place').val()) { showAlert(getAlert('err_place')); $('#place').focus(); return; } $('#display-po').text(userData.postoffice); $('#display-dist-state').text(`${$('#place').val()}, ${userData.district}`.toUpperCase()); }
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

window.updateWizardLocDisplay = function () { $('#display-po').text((userData.postoffice || '').toUpperCase()); $('#display-dist-state').text(`${$('#place').val() || ''}, ${userData.district || ''}`.toUpperCase()); }

function submitWizardOrder() {
  const finalData = {
    orderid: editingOrderId, name: $('#name').val(), phone: $('#phone').val(), whatsapp: $('#whatsapp').val(),
    altphone: $('#altphone').val(), house: $('#house').val(), place: $('#place').val(), pincode: $('#pincode').val(),
    postoffice: userData.postoffice, district: userData.district, state: userData.state || 'Kerala',
    quantity: $('#quantity').val(), message: '', custId: myCustId
  };
  localUsersMap[finalData.phone] = finalData; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));
  // 🔥 TRIGGER ANIMATION
  startHoneyAnimation(finalData.name, () => postOrder(finalData));
}

// ------------------------------------------------------------------------------
// 🔴 RETURNING USER & STATUS
// ------------------------------------------------------------------------------
function showReturningUserView(d, isActiveOrder) {
  $('#returning-user-view').fadeIn(); updateFooterButtons('returning'); isEditMode = isActiveOrder;
  if (d.orderid) $('#display-oid').text('#' + d.orderid).show(); else $('#display-oid').hide();

  $('#saved-name').text(d.name); $('#edit-phone').val(d.phone); $('#edit-house').val(d.house);
  $('#edit-place').val(d.place); $('#edit-pincode').val(d.pincode); $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district); $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone); $('#edit-altphone').val(d.altphone || '');

  updateSummaryDisplay();
  updateStatusUI(d);

  $('#quick-qty option').prop('disabled', false);
  if (isActiveOrder) {
    $('#quick-qty').val(d.quantity).trigger('change');
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്യാം" : "UPDATE ORDER");
    if (d.Status === 'Paid') {
      const currentQty = parseInt(d.quantity);
      $('#quick-qty option').each(function () { if (parseInt($(this).val()) < currentQty) $(this).prop('disabled', true); });
    }
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
  // Offer Card
  if (d.offer === true) {
    html += `<div class="p-3 mb-3 rounded shadow-sm text-center" style="background: linear-gradient(135deg, #fff3cd 0%, #ffecb3 100%); border: 1px solid #ffeeba;">
            <h5 class="fw-bold text-warning mb-1"><i class="fas fa-crown"></i> Platinum Customer</h5>
            <small class="text-dark">You have unlocked special priority packing!</small>
        </div>`;
  }
  // Status Cards
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
  const n = parseInt(qty);
  const base = n * 650;
  const courier = courierRates.kerala[n] || 0;
  const total = base + courier;

  const container = isQuick ? $('#quick-price-box') : $('#wiz-price-box');
  container.find('.qty-count').text(n);
  container.find('.val-base').text(base);
  container.find('.val-courier').text(courier);
  container.find('.val-total').text(total);
  container.fadeIn();

  if (!isQuick) {
    let altHtml = $('#altphone').val() ? `, ${$('#altphone').val()}` : '';
    let addrHtml = `<span class="dt-name">${$('#name').val()}</span><span class="dt-addr">${$('#house').val()}, ${$('#place').val()}<br>${(userData.postoffice || '').toUpperCase()}, ${(userData.district || '').toUpperCase()}<br>${(userData.state || '').toUpperCase()} - ${$('#pincode').val()}</span><div class="dt-phone"><i class="fas fa-phone-alt"></i> ${$('#phone').val()}${altHtml}</div><div class="dt-wa"><i class="fab fa-whatsapp"></i> ${$('#whatsapp').val()}</div>`;
    $('#wiz-final-addr').html(addrHtml);
    $('#wiz-deliver-box').fadeIn();
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

  const finalData = {
    orderid: editingOrderId, name: $('#saved-name').text(), phone: newPhone,
    whatsapp: $('#edit-whatsapp').val(), altphone: $('#edit-altphone').val(), house: $('#edit-house').val(),
    place: $('#edit-place').val(), pincode: pin, postoffice: $('#edit-postoffice').val(),
    district: $('#edit-district').val(), state: $('#edit-state').val(),
    quantity: $('#quick-qty').val(), message: '', custId: myCustId
  };

  if (currentLoginPhone && currentLoginPhone !== newPhone) delete localUsersMap[currentLoginPhone];
  localUsersMap[newPhone] = finalData;
  SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));

  // 🔥 TRIGGER ANIMATION
  startHoneyAnimation(finalData.name, () => postOrder(finalData));
}

// ------------------------------------------------------------------------------
// 🍯 IMPROVED HONEY ANIMATION (FIXED)
// ------------------------------------------------------------------------------

function injectAnimationCSS() {
  $('body').append(`
    <style>
        #honeyModal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:#fff; z-index:99999; flex-direction:column; align-items:center; justify-content:center; }
        #honeyCanvas { width: 300px; height: 400px; }
        .anim-text { margin-top:20px; font-weight:bold; color:#d4a017; font-family:sans-serif; letter-spacing:1px; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
    </style>
    <div id="honeyModal"><canvas id="honeyCanvas" width="300" height="400"></canvas><div class="anim-text">FILLING YOUR BOTTLE...</div></div>
    `);
}

function startHoneyAnimation(userName, apiCallback) {
  $('#honeyModal').css('display', 'flex').fadeIn();
  window.honeyAnimSuccess = false;

  const cvs = document.getElementById('honeyCanvas');
  const ctx = cvs.getContext('2d');
  let fillLevel = 0;
  let waveOffset = 0;
  let particles = [];
  let isAnimating = true;

  for (let i = 0; i < 15; i++) particles.push({ x: 50 + Math.random() * 200, y: 380, s: 2 + Math.random() * 3, v: 1 + Math.random() });

  apiCallback(); // Trigger Server Call

  function draw() {
    if (!isAnimating) return;
    ctx.clearRect(0, 0, 300, 400);

    // 1. Draw Jar Shape (Better "Pot" Shape)
    ctx.beginPath();
    ctx.moveTo(100, 50); ctx.lineTo(200, 50); // Top Rim
    ctx.bezierCurveTo(210, 50, 220, 70, 220, 90); // R Neck
    ctx.bezierCurveTo(280, 120, 280, 300, 220, 350); // R Body
    ctx.bezierCurveTo(200, 380, 100, 380, 80, 350); // Bottom
    ctx.bezierCurveTo(20, 300, 20, 120, 80, 90); // L Body
    ctx.bezierCurveTo(80, 70, 90, 50, 100, 50); // L Neck
    ctx.closePath();

    ctx.strokeStyle = "#333"; ctx.lineWidth = 3; ctx.stroke();

    // Save for Clipping
    ctx.save();
    ctx.clip();

    // 2. Liquid Fill
    if (!window.honeyAnimSuccess && fillLevel < 85) fillLevel += 0.5;
    if (window.honeyAnimSuccess && fillLevel < 100) fillLevel += 2.0;

    if (fillLevel > 0) {
      ctx.fillStyle = "#FFD700"; // Honey Gold
      ctx.beginPath();
      let h = 380 - (fillLevel * 3.0); // Height Calc
      if (h < 90) h = 90; // Cap at neck

      ctx.moveTo(0, h);
      for (let x = 0; x <= 300; x += 5) {
        let y = h + Math.sin((x + waveOffset) * 0.05) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(300, 400); ctx.lineTo(0, 400);
      ctx.fill();
    }

    // 3. Bubbles
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    particles.forEach(p => {
      p.y -= p.v;
      if (p.y < 380 - (fillLevel * 3.0)) p.y = 380;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
    });

    ctx.restore(); // End Clip

    // 4. Draw Logo (Safe Draw)
    if (logoImageObj.complete && logoImageObj.naturalHeight !== 0) {
      ctx.globalAlpha = 0.9;
      // Draw centered on the fat part of jar
      ctx.drawImage(logoImageObj, 100, 180, 100, 80);
      ctx.globalAlpha = 1.0;
    }

    // 5. Pouring Stream
    if (fillLevel < 98) {
      ctx.fillStyle = "#D4AF37";
      ctx.fillRect(140, 0, 20, 380 - (fillLevel * 3.0));
    }

    // 6. Success Label
    if (fillLevel >= 99) {
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 10; ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.roundRect(60, 200, 180, 80, 10); ctx.fill(); ctx.shadowBlur = 0;

      ctx.fillStyle = "#000";
      ctx.font = "12px Arial"; ctx.textAlign = "center";
      ctx.fillText("Freshly Packed For:", 150, 230);
      ctx.font = "bold 18px Arial";
      ctx.fillText(userName.toUpperCase().split(' ')[0], 150, 255);

      $('.anim-text').text("ORDER SUCCESS!");
      isAnimating = false; // Stop Loop
      return;
    }

    waveOffset += 2;
    requestAnimationFrame(draw);
  }
  draw();
}

// ------------------------------------------------------------------------------
// 🔴 SERVER POST
// ------------------------------------------------------------------------------
function postOrder(data) {
  fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: data }) })
    .then(res => res.json())
    .then(res => {
      if (res.result === 'success') {
        successData = { ...data, orderid: res.orderid, timestamp: res.timestamp };
        if (res.custId) { data.custId = res.custId; myCustId = res.custId; localUsersMap[data.phone] = data; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap)); }

        window.honeyAnimSuccess = true; // Finish Animation

        setTimeout(() => {
          $('#honeyModal').fadeOut();
          $('#order-form').hide();
          $('#showsuccess').fadeIn();
          updateFooterButtons('none');
          setTimeout(sendToWhatsapp, 1500);
        }, 3500);
      }
    })
    .catch(() => { $('#honeyModal').fadeOut(); showAlert("Connection failed. Try again."); });
}

function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successData.orderid;
  const d = successData;
  const n = parseInt(d.quantity);
  const base = n * 650;
  const courier = courierRates.kerala[n] || 0;
  const amountText = `Amount(₹): ${base} + ${courier}`;
  const totalText = `Total(₹): ${base + courier}/-`;
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;

  const safe = (val) => String(val || '').trim().toUpperCase();
  const extra = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderid}\`\`\`\n⌚ _${successData.timestamp}_\n🔗 _${editLink}_`;
  const format = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${String(d.pincode || '').trim()}*\n*Ph: ${String(d.phone || '').trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;

  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}

// 🔴 ADMIN LOGIC (Must include for URL params to work)
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

function fetchOrder(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`).then(res => res.json()).then(res => {
    showLoader(false);
    if (res.result === 'success') {
      let d = res.data;
      if (d.custId) myCustId = d.custId;
      if (d.phone && localUsersMap[d.phone]) { const local = localUsersMap[d.phone]; d = { ...local, ...d }; }
      if (SafeStorage.getItem('kafakAdmin') === 'true') {
        let cachedOrders = JSON.parse(SafeStorage.getItem('allOrdersCache') || "[]");
        let cachedOrder = cachedOrders.find(o => o.orderid === oid);
        updateAdminUI(cachedOrder ? cachedOrder.Status : (d.Status || 'Pending'), oid);
      }
      loadOrderData(d);
    } else { $('#step-0').fadeIn(); updateFooterButtons('step-0'); }
  }).catch(() => { showLoader(false); $('#step-0').fadeIn(); updateFooterButtons('step-0'); });
}

// ------------------------------------------------------------------------------
// 🔴 HELPER UPDATES
// ------------------------------------------------------------------------------
function updateSummaryDisplay() {
  const house = $('#edit-house').val() || ''; const place = $('#edit-place').val() || ''; const po = $('#edit-postoffice').val() || ''; const pin = $('#edit-pincode').val() || ''; const dist = $('#edit-district').val() || ''; const wa = $('#edit-whatsapp').val() || ''; const alt = $('#edit-altphone').val(); const phone = $('#edit-phone').val() || '';
  let addr = `${house}, ${place}, ${po}, ${dist}, ${pin}`.toUpperCase().replace(/,\s*,/g, ',').replace(/\s\s+/g, ' ');
  $('#saved-address-text').text(addr); $('#saved-place-dist').text(''); $('#saved-phone-text').text(phone); $('#saved-wa-text span').text(wa);
  if (alt) { $('#saved-alt-text span').text(alt); $('#saved-alt-text').show(); } else { $('#saved-alt-text').hide(); }
  checkForChanges();
}

function checkForChanges() {
  const btn = $('#btn-quick-submit'); if (!isEditMode) { btn.prop('disabled', false).css('opacity', '1'); return; }
  const current = { phone: $('#edit-phone').val(), house: $('#edit-house').val(), place: $('#edit-place').val(), pincode: $('#edit-pincode').val(), postoffice: $('#edit-postoffice').val(), whatsapp: $('#edit-whatsapp').val(), altphone: $('#edit-altphone').val(), quantity: $('#quick-qty').val() };
  const isDiff = (key, val) => String(userData[key] || '').trim() !== String(val || '').trim();
  const hasChanges = isDiff('phone', current.phone) || isDiff('house', current.house) || isDiff('place', current.place) || isDiff('pincode', current.pincode) || isDiff('postoffice', current.postoffice) || isDiff('whatsapp', current.whatsapp) || isDiff('altphone', current.altphone) || isDiff('quantity', current.quantity);
  if (hasChanges) { btn.prop('disabled', false).css('opacity', '1'); } else { btn.prop('disabled', true).css('opacity', '0.5'); }
}

function toggleAddressEdit() { $('.address-box').slideToggle(); }
function selectEditPO(val) { $('#edit-postoffice').val(val); updateSummaryDisplay(); }

// 🟢 SUBMIT WITH HONEY ANIMATION
function submitQuickOrder() {
  if (!$('#quick-qty').val()) { showAlert(getAlert('err_qty')); return; }

  const newPhone = $('#edit-phone').val();
  if (!newPhone || newPhone.length !== 10 || isNaN(newPhone)) { showAlert(getAlert('err_phone')); return; }
  if (!$('#edit-house').val().trim()) { showAlert(getAlert('err_house')); return; }
  if (!$('#edit-place').val().trim()) { showAlert(getAlert('err_place')); return; }
  const pin = $('#edit-pincode').val();
  if (!pin || pin.length !== 6) { showAlert(getAlert('err_pincode')); return; }
  if (!$('#edit-postoffice').val()) { showAlert(getAlert('err_select_po')); return; }
  const wa = $('#edit-whatsapp').val();
  if (!wa || wa.length !== 10) { showAlert(getAlert('err_whatsapp')); return; }

  const finalData = { orderid: editingOrderId, name: $('#saved-name').text(), phone: newPhone, whatsapp: wa, altphone: $('#edit-altphone').val(), house: $('#edit-house').val(), place: $('#edit-place').val(), pincode: pin, postoffice: $('#edit-postoffice').val(), district: $('#edit-district').val(), state: $('#edit-state').val(), quantity: $('#quick-qty').val(), message: '', custId: myCustId };

  // Sync Local
  if (currentLoginPhone && currentLoginPhone !== newPhone) delete localUsersMap[currentLoginPhone];
  localUsersMap[newPhone] = finalData;
  SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));

  // 🔥 START ANIMATION & POST
  startHoneyAnimation(finalData.name, () => postOrder(finalData));
}

function postOrder(data) {
  fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: data }) })
    .then(res => res.json())
    .then(res => {
      if (res.result === 'success') {
        successData = { ...data, orderid: res.orderid, timestamp: res.timestamp };
        if (res.custId) { data.custId = res.custId; myCustId = res.custId; localUsersMap[data.phone] = data; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap)); }

        // 🎉 TRIGGER SUCCESS IN ANIMATION
        window.honeyAnimSuccess = true;

        setTimeout(() => {
          $('#honeyModal').fadeOut();
          $('#order-form').hide();
          $('#showsuccess').fadeIn();
          updateFooterButtons('none');
          setTimeout(sendToWhatsapp, 1500);
        }, 3500); // Wait for label animation
      }
    })
    .catch(() => {
      $('#honeyModal').fadeOut();
      showAlert("Connection failed. Try again.");
    });
}

function sendToWhatsapp() {
  const phone = '7788990313'; const orderid = successData.orderid; const d = successData; const editLink = `kafaklife.com/order.html?oid=${orderid}`; const n = parseInt(d.quantity); const base = n * 650; const courier = courierRates.kerala[n] || 0; const amountText = `Amount(₹): ${base} + ${courier}`; const totalText = `Total(₹): ${base + courier}/-`; const extra = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderid}\`\`\`\n⌚ _${successData.timestamp}_\n🔗 _${editLink}_`;
  const safe = (val) => String(val || '').trim().toUpperCase();
  const format = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${String(d.pincode || '').trim()}*\n*Ph: ${String(d.phone || '').trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;
  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}

// ------------------------------------------------------------------------------
// 🍯 HONEY FILLING ANIMATION (CANVAS + LOGO)
// ------------------------------------------------------------------------------

function injectAnimationCSS() {
  $('body').append(`
    <style>
        #honeyModal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:#fff; z-index:99999; flex-direction:column; align-items:center; justify-content:center; }
        #honeyCanvas { width: 300px; height: 400px; }
        .anim-text { margin-top:20px; font-weight:bold; color:#d4a017; font-family:sans-serif; letter-spacing:1px; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
    </style>
    <div id="honeyModal"><canvas id="honeyCanvas" width="300" height="400"></canvas><div class="anim-text">FILLING YOUR BOTTLE...</div></div>
    `);
}

function startHoneyAnimation(userName, apiCallback) {
  $('#honeyModal').css('display', 'flex').fadeIn();
  window.honeyAnimSuccess = false;

  const cvs = document.getElementById('honeyCanvas');
  const ctx = cvs.getContext('2d');
  let fillLevel = 0;
  let waveOffset = 0;
  let particles = [];

  // Preload Logo
  const logoImg = new Image();
  logoImg.src = 'images/kafak_logo.png'; // ⚠️ ENSURE THIS FILE EXISTS

  for (let i = 0; i < 15; i++) particles.push({ x: 50 + Math.random() * 200, y: 380, s: 2 + Math.random() * 3, v: 1 + Math.random() });

  // Start API Call
  apiCallback();

  function draw() {
    ctx.clearRect(0, 0, 300, 400);

    // 1. Draw Bottle Outline (Glass)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, 50); ctx.lineTo(110, 100);
    ctx.quadraticCurveTo(50, 120, 50, 180);
    ctx.lineTo(50, 380);
    ctx.quadraticCurveTo(150, 400, 250, 380);
    ctx.lineTo(250, 180);
    ctx.quadraticCurveTo(250, 120, 190, 100);
    ctx.lineTo(190, 50);
    ctx.stroke();

    // Clip to Bottle Shape for Liquid
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(110, 100); ctx.quadraticCurveTo(50, 120, 50, 180);
    ctx.lineTo(50, 380); ctx.quadraticCurveTo(150, 400, 250, 380);
    ctx.lineTo(250, 180); ctx.quadraticCurveTo(250, 120, 190, 100);
    ctx.closePath();
    ctx.clip();

    // 2. Liquid Fill
    if (!window.honeyAnimSuccess && fillLevel < 85) fillLevel += 0.5;
    if (window.honeyAnimSuccess && fillLevel < 100) fillLevel += 2.0;

    if (fillLevel > 0) {
      ctx.fillStyle = "#FFD700"; // Gold
      ctx.beginPath();
      let h = 380 - (fillLevel * 2.8);
      if (h < 100) h = 100;

      ctx.moveTo(0, h);
      for (let x = 0; x <= 300; x += 5) {
        let y = h + Math.sin((x + waveOffset) * 0.05) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(300, 400); ctx.lineTo(0, 400);
      ctx.fill();
    }

    // 3. Bubbles
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    particles.forEach(p => {
      p.y -= p.v;
      if (p.y < 380 - (fillLevel * 2.8)) p.y = 380;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
    });

    ctx.restore(); // Restore clipping

    // 4. Draw Logo (On Top of Liquid for Visibility)
    if (logoImg.complete) {
      // Draw logo centered
      ctx.globalAlpha = 0.9;
      ctx.drawImage(logoImg, 100, 180, 100, 80);
      ctx.globalAlpha = 1.0;
    }

    // 5. Draw Pouring Stream
    if (fillLevel < 98) {
      ctx.fillStyle = "#D4AF37";
      ctx.fillRect(140, 0, 20, 380 - (fillLevel * 2.8));
    }

    // 6. Label (Success)
    if (fillLevel >= 99) {
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 10; ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.roundRect(60, 200, 180, 80, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#000";
      ctx.font = "12px Arial"; ctx.textAlign = "center";
      ctx.fillText("Freshly Packed For:", 150, 230);
      ctx.font = "bold 18px Arial";
      ctx.fillText(userName.toUpperCase().split(' ')[0], 150, 255);

      // Lid
      ctx.fillStyle = "#000";
      ctx.fillRect(105, 40, 90, 15);

      $('.anim-text').text("ORDER SUCCESS!");
      return;
    }

    waveOffset += 2;
    requestAnimationFrame(draw);
  }
  draw();
}

if (CanvasRenderingContext2D.prototype.roundRect === undefined) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    this.beginPath(); this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
  };
}

// ------------------------------------------------------------------------------
// 🔴 WIZARD FUNCTIONS
// ------------------------------------------------------------------------------
function updateFooterButtons(view) {
  $('#btn-group-0').hide(); $('#btn-group-wizard').hide(); $('#btn-group-returning').hide();
  if (view === 'step-0') $('#btn-group-0').show(); if (view === 'wizard') $('#btn-group-wizard').css({ 'display': 'flex', 'gap': '1rem' }); if (view === 'returning') $('#btn-group-returning').show();
}

function startWizard() { $('#wizard-view').fadeIn(); updateFooterButtons('wizard'); currentStep = 1; showStep(1); }

function showStep(s) { $('.wiz-step').hide(); $(`.wiz-step[data-step="${s}"]`).fadeIn(); const pct = (s / 7) * 100; $('#wiz-progress').css('width', `${pct}%`); const btn = $('#btn-wiz-next'); const lang = $('.form-select').val(); if (s === 7) { btn.html(translations[lang].btn_order); btn.addClass('btn-brand-green'); updatePrice($('#quantity').val(), false); } else { btn.html(translations[lang].btn_next); btn.removeClass('btn-brand-green'); } if (s !== 6) setTimeout(() => { $(`.wiz-step[data-step="${s}"] input`).first().focus(); }, 300); }

async function nextStep() {
  if (currentStep === 1 && !$('#name').val()) return showAlert(getAlert('err_name')); if (currentStep === 2 && !/^[0-9]{10}$/.test($('#whatsapp').val())) return showAlert(getAlert('err_whatsapp'));
  if (currentStep === 3) { const pin = $('#pincode').val(); if (!/^[0-9]{6}$/.test(pin)) return showAlert(getAlert('err_pincode')); $('#btn-wiz-next').prop('disabled', true).text(getAlert('err_checking_pin')); try { const res = await fetch(`pincode_json_files/${pin}.json`); let data = await res.json(); data = data.map(item => ({ ...item, officename: item.officename.replace(/\s*(B\.?O\.?|S\.?O\.?)\s*$/i, ' PO') })); $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next); if (data && data.length > 0) { poList = data; userData.district = data[0].district; userData.state = data[0].statename; const dl = $('#place-list'); dl.empty(); data.forEach(p => dl.append(`<option value="${p.officename}">`)); if (data.length > 1) { $('#po-select').empty().append('<option value="">Select...</option>'); data.forEach(p => $('#po-select').append(`<option value="${p.officename}">${p.officename}</option>`)); currentStep = 3.5; showStep(3.5); return; } else { userData.postoffice = data[0].officename; currentStep = 4; showStep(4); return; } } else { showAlert(getAlert('err_pin_not_found')); } } catch (e) { $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next); showAlert(getAlert('err_pincode')); return; } }
  if (currentStep === 3.5) { if (!$('#po-select').val()) return showAlert(getAlert('err_select_po')); userData.postoffice = $('#po-select').val(); currentStep = 4; showStep(4); return; }
  if (currentStep === 4) { if (!$('#house').val()) { showAlert(getAlert('err_house')); $('#house').focus(); return; } currentStep = 5; showStep(5); return; }
  if (currentStep === 5) { if (!$('#place').val()) { showAlert(getAlert('err_place')); $('#place').focus(); return; } $('#display-po').text(userData.postoffice); $('#display-dist-state').text(`${$('#place').val()}, ${userData.district}`.toUpperCase()); }
  if (currentStep === 6) { const alt = $('#altphone').val(); if (alt && !/^[0-9]{10}$/.test(alt)) return showAlert(getAlert('err_phone')); }
  if (currentStep === 7) { if (!$('#quantity').val()) { showAlert(getAlert('err_qty')); return; } submitWizardOrder(); return; }
  currentStep++; showStep(currentStep);
}

function updateWizardLocDisplay() { $('#display-po').text((userData.postoffice || '').toUpperCase()); $('#display-dist-state').text(`${$('#place').val() || ''}, ${userData.district || ''}`.toUpperCase()); }

function prevStep() { if (currentStep === 1) return location.reload(); if (currentStep === 4 && poList.length > 1) { currentStep = 3.5; showStep(3.5); return; } if (currentStep === 4 && poList.length <= 1) { currentStep = 3; showStep(3); return; } if (currentStep === 3.5) { currentStep = 3; showStep(3); return; } currentStep--; showStep(currentStep); }

function submitWizardOrder() {
  const finalData = { orderid: editingOrderId, name: $('#name').val(), phone: $('#phone').val(), whatsapp: $('#whatsapp').val(), altphone: $('#altphone').val(), house: $('#house').val(), place: $('#place').val(), pincode: $('#pincode').val(), postoffice: userData.postoffice, district: userData.district, state: userData.state || 'Kerala', quantity: $('#quantity').val(), message: '', custId: myCustId };
  localUsersMap[finalData.phone] = finalData; SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));

  // 🔥 START ANIMATION FOR WIZARD TOO
  startHoneyAnimation(finalData.name, () => postOrder(finalData));
}

// ------------------------------------------------------------------------------
// 🔴 BEAUTIFUL DELIVER TO BOX (Moved to Global)
// ------------------------------------------------------------------------------
function updatePrice(qty, isQuick) {
  if (!qty) return;
  const n = parseInt(qty);
  const base = n * 650;
  const courier = courierRates.kerala[n] || 0;
  const total = base + courier;

  const container = isQuick ? $('#quick-price-box') : $('#wiz-price-box');
  container.find('.qty-count').text(n);
  container.find('.val-base').text(base);
  container.find('.val-courier').text(courier);
  container.find('.val-total').text(total);
  container.fadeIn();

  // WIZARD FINAL PAGE ADDRESS BOX
  if (!isQuick) {
    let altHtml = $('#altphone').val() ? `, ${$('#altphone').val()}` : '';
    let addrHtml = `
          <span class="dt-name">${$('#name').val()}</span>
          <span class="dt-addr">${$('#house').val()}, ${$('#place').val()}<br>
          ${(userData.postoffice || '').toUpperCase()}, ${(userData.district || '').toUpperCase()}<br>
          ${(userData.state || '').toUpperCase()} - ${$('#pincode').val()}</span>
          <div class="dt-phone"><i class="fas fa-phone-alt"></i> ${$('#phone').val()}${altHtml}</div>
          <div class="dt-wa"><i class="fab fa-whatsapp"></i> ${$('#whatsapp').val()}</div>
      `;
    $('#wiz-final-addr').html(addrHtml);
    $('#wiz-deliver-box').fadeIn();
  }

  if (isQuick) checkForChanges();
}