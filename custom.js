// ------------------------------------------------------------------------------
// 🔴 CONFIGURATION & GLOBALS
// ------------------------------------------------------------------------------
const sc = `https://script.google.com/macros/s/AKfycbwdAMjRsCAGpaBn8I75V1Oo0kRTs7avUU4Q6WNuySM3eSKnN1K78BMWGPkJeUM2xEfXGw/exec`;
// ------------------------------------------------------------------------------


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
    btn_update: "ഓർഡർ അപ്‌ഡേറ്റ്", btn_order: "ഓർഡർ ചെയ്യാം", lbl_name: "നിങ്ങളുടെ പേര്",
    ph_name: "പേര്", lbl_whatsapp: "വാട്സാപ്പ് നമ്പർ", lbl_select_po: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കുക",
    lbl_altphone: "മറ്റൊരു നമ്പർ (Optional)", lbl_summary: "ഓർഡർ വിവരങ്ങൾ", lbl_address: "വിലാസം",
    order_success: "ഓർഡർ ലഭിച്ചു!", redirect_wa: "വാട്സാപ്പിലേക്ക് പോകുന്നു...", open_wa: "വാട്സാപ്പ് ഓപ്പൺ ചെയ്യാം",
    loading: "വിവരങ്ങൾ എടുക്കുന്നു...", err_phone: "10 അക്ക മൊബൈൽ നമ്പർ നൽകുക!", err_name: "പേര് നൽകുക",
    err_whatsapp: "ശരിയായ 10 അക്ക വാട്സാപ്പ് നമ്പർ നൽകുക", err_pincode: "ശരിയായ 6 അക്ക പിൻകോഡ് നൽകുക",
    err_checking_pin: "പിൻകോഡ് പരിശോധിക്കുന്നു...", err_pin_not_found: "പിൻകോഡ് കണ്ടെത്തിയില്ല.",
    err_select_po: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കുക", err_house: "വീട്ടുപേര് നൽകുക", err_place: "സ്ഥലം നൽകുക",
    err_qty: "എത്ര ബോട്ടിൽ എന്ന് തിരഞ്ഞെടുക്കുക",
    confirm_home: "ഹോമിലേക്ക് പോകണോ? വിവരങ്ങൾ നഷ്ടപ്പെടും.", alert_title: "ശ്രദ്ധിക്കുക",
    btn_new_order: "പുതിയ ഓർഡർ ചെയ്യാം"
  },
  en: {
    lbl_phone: "Phone Number", ph_phone: "Enter Mobile Number", btn_next: "CONTINUE", welcome_back: "Welcome Back!",
    btn_edit: "EDIT ADDRESS", lbl_house: "House Name / No", ph_house: "House Name",
    lbl_place: "Place / Area", lbl_pincode: "Pincode", lbl_qty: "Select Quantity",
    lbl_msg: "Message (Optional)", courier_included: "(Courier Charge Included)",
    btn_update: "UPDATE", btn_order: "PLACE ORDER", lbl_name: "Full Name",
    ph_name: "Your Name", lbl_whatsapp: "WhatsApp Number", lbl_select_po: "Select Post Office",
    lbl_altphone: "Alternate Phone (Optional)", lbl_summary: "Order Summary", lbl_address: "Address",
    order_success: "Order Placed!", redirect_wa: "Redirecting to WhatsApp...", open_wa: "Open WhatsApp",
    loading: "Fetching details...", err_phone: "Please enter valid 10 digit number!", err_name: "Please enter your name",
    err_whatsapp: "Please enter valid 10 digit WhatsApp number", err_pincode: "Please enter valid 6 digit Pincode",
    err_checking_pin: "Checking Pincode...", err_pin_not_found: "Pincode not found.",
    err_select_po: "Please select Post Office", err_house: "Please enter House Name", err_place: "Please enter Place",
    err_qty: "Please select quantity",
    confirm_home: "Go home? Data will be lost.", alert_title: "Alert",
    btn_new_order: "PLACE NEW ORDER"
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

// 🔥 KEY CHANGE: New Key for Customer Data
const STORAGE_KEY = 'kafakCustomerData';

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
  if (show) $('#full-loader').show(); else $('#full-loader').hide();
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

  // LOAD & CLEAN LOCAL DATA
  const saved = SafeStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      localUsersMap = JSON.parse(saved);
      let isDirty = false;
      Object.keys(localUsersMap).forEach(key => {
        let u = localUsersMap[key];
        if (u.Status || u.status || u.tracking || u.offer || u.courier) {
          delete u.Status; delete u.status;
          delete u.tracking; delete u.offer; delete u.courier; delete u.provider;
          isDirty = true;
        }
      });
      if (isDirty) SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
    } catch (e) { localUsersMap = {}; }
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

  // INSTANT EDIT LOAD LOGIC
  if (oid) {
    if (isAdmin) {
      setupAdminView(oid);
    } else {
      let foundLocally = false;
      const phones = Object.keys(localUsersMap);
      for (let ph of phones) {
        if (String(localUsersMap[ph].orderid) === String(oid)) {
          showLoader(false);
          $('#step-0').hide();
          loadOrderData(localUsersMap[ph], false);
          foundLocally = true;
          syncUserDataBackground(ph);
          break;
        }
      }
      if (!foundLocally) fetchOrder(oid);
    }
  } else {
    showLoader(false);
    $('#step-0').show();
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
    loadOrderData(localUsersMap[phone], false);
    syncUserDataBackground(phone);
    return;
  }

  editingOrderId = null;
  $('#step-0').hide();
  $('#whatsapp').val(phone);
  startWizard();
  backgroundUserCheck(phone);
}

function saveToLocal(phone, data) {
  let cleanData = { ...data };
  delete cleanData.Status; delete cleanData.status;
  delete cleanData.tracking; delete cleanData.courier;
  delete cleanData.provider; delete cleanData.offer;
  delete cleanData.grandTotal;
  localUsersMap[phone] = cleanData;
  SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
}

function loadOrderData(d, isServerData = false) {
  $('#step-0').hide(); userData = d; editingOrderId = d.orderid; currentLoginPhone = d.phone;
  if (d.phone) saveToLocal(d.phone, d);
  showReturningUserView(d, true, isServerData);
}

// 🔥 REFRESH BUTTON LOGIC (This is now the LOADER)
window.manualRefresh = function () {
  setRefreshLoading(true);
  const phone = currentLoginPhone;
  if (phone) {
    syncUserDataBackground(phone).finally(() => {
      setTimeout(() => { setRefreshLoading(false); }, 500);
    });
  }
}

function setRefreshLoading(isLoading) {
  const btn = $('#refresh-btn');
  if (btn.length === 0) return;

  if (isLoading) {
    btn.prop('disabled', true).css('opacity', '0.7');
    btn.find('i').addClass('fa-spin');
    btn.find('span').text("CHECKING..."); // Change text while loading
  } else {
    btn.prop('disabled', false).css('opacity', '1');
    btn.find('i').removeClass('fa-spin');
    btn.find('span').text("REFRESH STATUS");
  }
}

function syncUserDataBackground(phone) {
  let localData = localUsersMap[phone] || {};
  let custIdParam = localData.custId ? `&custId=${localData.custId}` : '';

  // 🔥 Trigger Button Loader
  setRefreshLoading(true);

  return fetch(`${sc}?action=getCustomer&phone=${phone}${custIdParam}&t=${Date.now()}`)
    .then(res => res.json())
    .then(res => {
      if (res.result === 'success' && res.data) {
        let serverData = res.data;
        let mergedData = { ...localData, ...serverData };
        mergedData.Status = serverData.Status || serverData.status || "Pending";

        // Save cleaned data
        userData = mergedData;
        saveToLocal(phone, mergedData);

        let isActive = !(mergedData.Status === 'Dispatched' || mergedData.Status === 'Completed' || mergedData.Status === 'Paid');
        showReturningUserView(mergedData, isActive, true); // Server Data = True
      }
    })
    .catch(err => { console.log("Sync error"); })
    .finally(() => {
      setRefreshLoading(false); // Stop Button Loader
    });
}

function backgroundUserCheck(phone) {
  fetch(`${sc}?action=getCustomer&phone=${phone}`).then(res => res.json()).then(res => { if (res.result === 'success' && res.data && res.data.custId) myCustId = res.data.custId; }).catch(e => console.log("Bg check fail"));
}

// ------------------------------------------------------------------------------
// 🔴 WIZARD FUNCTIONS
// ------------------------------------------------------------------------------
function updateFooterButtons(view) {
  $('#btn-group-0').hide(); $('#btn-group-wizard').hide(); $('#btn-group-returning').hide();
  if (view === 'step-0') $('#btn-group-0').show();
  if (view === 'wizard') $('#btn-group-wizard').css({ 'display': 'flex', 'gap': '1rem' });
  if (view === 'returning') $('#btn-group-returning').show();
}

window.startWizard = function () {
  $('#wizard-view').show();
  updateFooterButtons('wizard');
  currentStep = 1;
  showStep(1);
}

window.showStep = function (s) {
  $('.wiz-step').hide();
  if (s === 1) $(`.wiz-step[data-step="${s}"]`).show();
  else $(`.wiz-step[data-step="${s}"]`).fadeIn(200);
  const pct = (s / 7) * 100; $('#wiz-progress').css('width', `${pct}%`);
  const btn = $('#btn-wiz-next'); const lang = $('.form-select').val();
  if (s === 7) { btn.html(translations[lang].btn_order); btn.addClass('btn-brand-green'); updatePrice($('#quantity').val(), false); }
  else { btn.html(translations[lang].btn_next); btn.removeClass('btn-brand-green'); }
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
  if (currentStep === 5) { if (!$('#place').val()) { showAlert(getAlert('err_place')); $('#place').focus(); return; } updateWizardLocDisplay(); currentStep = 6; showStep(6); return; }
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
  const finalData = { orderid: editingOrderId, name: $('#name').val(), phone: $('#phone').val(), whatsapp: $('#whatsapp').val(), altphone: $('#altphone').val(), house: $('#house').val(), place: $('#place').val(), pincode: $('#pincode').val(), postoffice: userData.postoffice, district: userData.district, state: userData.state || 'Kerala', quantity: $('#quantity').val(), message: '', custId: myCustId };
  saveToLocal(finalData.phone, finalData);
  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

// ------------------------------------------------------------------------------
// 🔴 RETURNING USER (COMPACT UI & LOGIC)
// ------------------------------------------------------------------------------
function showReturningUserView(d, isActiveOrder, isServerData) {
  $('#returning-user-view').show();
  updateFooterButtons('returning'); isEditMode = isActiveOrder;
  if (d.orderid) $('#display-oid').text('#' + d.orderid).show(); else $('#display-oid').hide();

  $('#saved-name').text(d.name); $('#edit-phone').val(d.phone); $('#edit-house').val(d.house);
  $('#edit-place').val(d.place); $('#edit-pincode').val(d.pincode); $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district); $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone); $('#edit-altphone').val(d.altphone || '');

  updateSummaryDisplay(); // Update compact address UI

  // 🔥 CLEAR OLD STATUS AREA
  $('#status-area').empty();

  // 🔥 1. STATUS LOGIC (Server Priority)
  // Ensure status only shows if data came from Server
  if (isServerData) {
    updateStatusUI(d);
  } else {
    // Do nothing (wait for button click/auto-load)
  }

  // 🔥 2. PLACEHOLDER FOR STATUS
  if ($('#status-area').length === 0) {
    $('<div id="status-area" class="mt-2"></div>').insertAfter('#quick-price-box');
  }

  // 🔥 3. "NEW ORDER" LOGIC
  const status = String(d.Status || '').trim().toLowerCase();
  const isFinished = (status === 'paid' || status === 'dispatched' || status === 'completed');
  const lang = $('.form-select').val() || 'en';

  if (isFinished && isServerData) {
    // HIDE Qty & Update Button
    $('#quick-price-box').hide();
    $('#btn-quick-submit').hide();
    $('#btn-edit-address').hide(); // Disable address edit initially

    // SHOW "Place New Order" Button (if not already there)
    if ($('#btn-new-order-mode').length === 0) {
      const btnText = translations[lang].btn_new_order || "PLACE NEW ORDER";
      $(`
            <div id="btn-new-order-mode" class="mt-3 text-center fade-in">
                <button onclick="enableNewOrderMode()" class="btn btn-dark shadow-sm rounded-pill px-4 py-2" style="font-weight:700; letter-spacing:1px;">
                    <i class="fas fa-plus-circle me-1"></i> ${btnText}
                </button>
            </div>
          `).insertAfter('#status-area');
    }
  } else {
    // NORMAL MODE (Pending/Sent or New Order Mode)
    $('#quick-price-box').show();
    $('#btn-quick-submit').show();
    $('#btn-edit-address').show();
    $('#btn-new-order-mode').remove(); // Remove New Order button if present

    if ($('.qty-action-group').length === 0) {
      $('#quick-qty').add('#btn-quick-submit').wrapAll('<div class="qty-action-group" style="display:flex; gap:10px; align-items:center; margin-bottom:10px;"></div>');
      $('#quick-qty').css('flex-grow', '1');
      $('#btn-quick-submit').css({ 'width': 'auto', 'padding': '0 25px', 'white-space': 'nowrap', 'height': '45px' });
    }

    $('#quick-qty option').prop('disabled', false);
    if (isActiveOrder) {
      $('#quick-qty').val(d.quantity).trigger('change');
      $('#btn-quick-submit span').text(translations[lang].btn_update);
    } else {
      // Reset for New Order
      $('#quick-qty').val('').trigger('change');
      $('#quick-price-box').hide();
      $('#btn-quick-submit span').text(translations[lang].btn_order);
    }
  }

  // 🔥 4. REFRESH BUTTON (Bottom)
  if ($('#refresh-btn').length === 0) {
    // Remove old container if any
    $('#refresh-btn-container').remove();
    // Append to the VERY BOTTOM of returning view
    $('#returning-user-view').append(`
          <div class="d-flex justify-content-center mt-4 mb-3 fade-in">
              <button id="refresh-btn" onclick="manualRefresh()" class="btn btn-sm bg-white shadow-sm rounded-pill text-muted border px-3 py-2" style="font-weight: 600; font-size: 11px;">
                  <i class="fas fa-sync-alt me-1"></i> <span>REFRESH STATUS</span>
              </button>
          </div>
      `);
  }

  checkForChanges();
}

// 🔥 Function to Enable New Order Mode
window.enableNewOrderMode = function () {
  $('#btn-new-order-mode').hide(); // Hide the "New Order" button
  $('#quick-price-box').fadeIn(); // Show Price Box (Qty will be visible inside)
  $('#quick-qty').val('').trigger('change').focus(); // Reset Qty
  $('#btn-quick-submit').fadeIn(); // Show Order Button
  $('#btn-edit-address').fadeIn(); // Allow Address Edit

  const lang = $('.form-select').val() || 'en';
  $('#btn-quick-submit span').text(translations[lang].btn_order);

  isEditMode = false; // Treat as new order
  editingOrderId = null; // Clear ID
  $('#display-oid').hide();
}

function updateStatusUI(d) {
  $('#status-area').empty();
  let html = '';

  if (d.offer === true || String(d.offer).toLowerCase() === 'true') {
    html += `<div class="p-3 mb-2 rounded shadow-sm text-center" style="background: linear-gradient(135deg, #fff3cd 0%, #ffecb3 100%); border: 1px solid #ffeeba;"><h6 class="fw-bold text-warning mb-1"><i class="fas fa-crown"></i> Platinum Customer</h6><small class="text-dark">Special priority packing enabled!</small></div>`;
  }

  let status = String(d.Status || d.status || '').trim().toLowerCase();

  if (status === 'paid') {
    html += `<div class="p-3 mb-2 rounded shadow-sm bg-success text-white text-center"><h6 class="fw-bold mb-1">✅ Payment Received!</h6><small>Order accepted. Packing in progress.</small></div>`;
  }
  else if (status === 'dispatched' || status === 'completed') {
    let trackingHtml = d.tracking ? `<div class="mt-2 bg-white text-primary p-2 rounded fw-bold shadow-sm" onclick="navigator.clipboard.writeText('${d.tracking}')" style="cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; gap:5px;">📦 Track: ${d.tracking} <i class="far fa-copy"></i></div>` : '';
    let courierName = (d.courier || d.provider) ? `<div style="font-size:12px; margin-top:2px; opacity:0.9;">Via ${d.courier || d.provider}</div>` : '';
    html += `<div class="p-3 mb-2 rounded shadow-sm bg-primary text-white text-center"><h6 class="fw-bold mb-1">🚚 Order Dispatched!</h6>${courierName}<small>Your honey is on the way.</small>${trackingHtml}</div>`;
  } else if (status === 'sent' || status === 'pending') {
    html += `<div class="p-3 mb-2 rounded shadow-sm bg-light text-center border"><h6 class="fw-bold mb-1">📦 Order Received</h6><small>We will contact you soon for payment.</small></div>`;
  }

  $('#status-area').html(html);
}

function updateSummaryDisplay() {
  const house = $('#edit-house').val() || ''; const place = $('#edit-place').val() || ''; const po = $('#edit-postoffice').val() || ''; const pin = $('#edit-pincode').val() || ''; const dist = $('#edit-district').val() || ''; const wa = $('#edit-whatsapp').val() || ''; const alt = $('#edit-altphone').val(); const phone = $('#edit-phone').val() || '';

  // 🔥 COMPACT ADDRESS UI
  // Address Line
  let addr = `${house}, ${place}, ${po}, ${dist}, ${pin}`.toUpperCase().replace(/,\s*,/g, ',').replace(/\s\s+/g, ' ');
  $('#saved-address-text').text(addr).css('margin-bottom', '5px'); // Reduced Gap
  $('#saved-place-dist').text('');

  // Phone Line (Compact with Icons)
  let phoneHtml = `<i class="fas fa-phone-alt text-muted" style="font-size:12px;"></i> ${phone}`;
  if (alt) phoneHtml += `, ${alt}`;
  if (wa) phoneHtml += ` &nbsp;<span class="text-success"><i class="fab fa-whatsapp"></i> ${wa}</span>`;

  $('#saved-phone-text').html(phoneHtml).css('font-weight', '500');

  // Hide old separate elements
  $('#saved-wa-text').hide();
  $('#saved-alt-text').hide();

  checkForChanges();
}

window.updatePrice = function (qty, isQuick) {
  if (!qty) return; const n = parseInt(qty); const base = n * 650; const courier = courierRates.kerala[n] || 0; const total = base + courier;
  const container = isQuick ? $('#quick-price-box') : $('#wiz-price-box');
  container.find('.qty-count').text(n); container.find('.val-base').text(base); container.find('.val-courier').text(courier); container.find('.val-total').text(total); container.fadeIn();
  if (!isQuick) {
    let altHtml = $('#altphone').val() ? `, ${$('#altphone').val()}` : '';
    let addrHtml = `<span class="dt-name">${$('#name').val()}</span><span class="dt-addr">${$('#house').val()}, ${$('#place').val()}<br>${(userData.postoffice || '').toUpperCase()}, ${(userData.district || '').toUpperCase()}<br>${(userData.state || '').toUpperCase()} - ${$('#pincode').val()}</span><div class="dt-phone"><i class="fas fa-phone-alt"></i> ${$('#phone').val()}${altHtml}</div><div class="dt-wa"><i class="fab fa-whatsapp"></i> ${$('#whatsapp').val()}</div>`;
    $('#wiz-final-addr').html(addrHtml); $('#wiz-deliver-box').fadeIn();
  }
  if (isQuick) checkForChanges();
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

// ------------------------------------------------------------------------------
// 🔴 ADMIN LOGIC & HELPERS (Keep existing)
// ------------------------------------------------------------------------------
function setupAdminView(oid) {
  const adminUI = `<div id="admin-action-bar" style="display:none; position: fixed; bottom: 0; left: 0; width: 100%; background: white; padding: 15px; z-index: 12000; border-top: 1px solid #ddd; box-shadow: 0 -4px 20px rgba(0,0,0,0.15);"><div class="container p-0 d-flex justify-content-between align-items-center"><div id="admin-btn-container" style="flex-grow:1; margin-right:15px;"></div><button onclick="window.location.href='admin.html'" class="btn btn-light rounded-circle shadow-sm" style="width:45px; height:45px; border:1px solid #eee; display:flex; align-items:center; justify-content:center;"><i class="fas fa-times text-danger" style="font-size:20px;"></i></button></div></div>`;
  $('body').append(adminUI); $('body').css('padding-bottom', '100px');
  let cachedOrders = JSON.parse(SafeStorage.getItem('allOrdersCache') || "[]");
  let cachedOrder = cachedOrders.find(o => o.orderid === oid);

  if (cachedOrder) {
    loadOrderData(cachedOrder, false); // Load Local
    updateAdminUI(cachedOrder.Status || 'Pending', oid);
    // 🔥 Trigger Background Sync for Fresh Status
    syncUserDataBackground(cachedOrder.phone);
  } else {
    fetchOrder(oid);
  }
}

window.updateAdminUI = function (serverStatus, oid) {
  let pendingUpdates = JSON.parse(SafeStorage.getItem('pendingUpdates') || "[]");
  let localUpdate = pendingUpdates.find(item => item.oid === oid);
  let currentStatus = localUpdate ? localUpdate.status : (serverStatus || 'Pending');
  let btnHTML = '';
  if (currentStatus === 'Pending') btnHTML = `<button onclick="adminAction('${oid}', 'Sent')" class="btn btn-primary btn-sm fw-bold w-100 shadow-sm">💬 MARK SENT (BLUE)</button>`;
  else if (currentStatus === 'Sent') btnHTML = `<button onclick="adminAction('${oid}', 'Paid')" class="btn btn-warning btn-sm fw-bold w-100 shadow-sm text-dark">💰 MARK PAID (YELLOW)</button>`;
  else { let statusText = currentStatus === 'Dispatched' ? 'DISPATCHED' : (currentStatus === 'Completed' ? 'COMPLETED' : 'PAID'); btnHTML = `<button class="btn btn-secondary btn-sm fw-bold w-100 shadow-sm" disabled>${statusText} ✅</button>`; }
  $('#admin-btn-container').html(btnHTML); $('#admin-action-bar').slideDown();
}

window.adminAction = function (oid, status) {
  if (!confirm(`ഈ ഓർഡർ '${status}' ആയി മാർക്ക് ചെയ്യട്ടെ?`)) return;
  let updates = JSON.parse(SafeStorage.getItem('pendingUpdates') || "[]");
  updates = updates.filter(item => item.oid !== oid);
  updates.push({ oid: oid, status: status, time: new Date().getTime() });
  SafeStorage.setItem('pendingUpdates', JSON.stringify(updates));
  updateAdminUI(status, oid);
}

window.clearAdminCache = function () {
  if (confirm("Cache ക്ലിയർ ചെയ്ത് റീലോഡ് ചെയ്യണോ?")) { SafeStorage.removeItem('allOrdersCache'); location.reload(); }
}

function fetchOrder(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`).then(res => res.json()).then(res => {
    showLoader(false);
    if (res.result === 'success') {
      let d = res.data;
      if (SafeStorage.getItem('kafakAdmin') === 'true') { updateAdminUI(d.Status || 'Pending', oid); }
      loadOrderData(d, true); // Server Data = True
    } else { $('#step-0').fadeIn(); updateFooterButtons('step-0'); }
  }).catch(() => { showLoader(false); $('#step-0').fadeIn(); updateFooterButtons('step-0'); });
}

function updateSummaryDisplay() {
  const house = $('#edit-house').val() || ''; const place = $('#edit-place').val() || ''; const po = $('#edit-postoffice').val() || ''; const pin = $('#edit-pincode').val() || ''; const dist = $('#edit-district').val() || ''; const wa = $('#edit-whatsapp').val() || ''; const alt = $('#edit-altphone').val(); const phone = $('#edit-phone').val() || '';
  let addr = `${house}, ${place}, ${po}, ${dist}, ${pin}`.toUpperCase().replace(/,\s*,/g, ',').replace(/\s\s+/g, ' ');
  $('#saved-address-text').text(addr).css('margin-bottom', '5px');
  $('#saved-place-dist').text('');
  let phoneHtml = `<i class="fas fa-phone-alt text-muted" style="font-size:12px;"></i> ${phone}`;
  if (alt) phoneHtml += `, ${alt}`;
  if (wa) phoneHtml += ` &nbsp;<span class="text-success"><i class="fab fa-whatsapp"></i> ${wa}</span>`;
  $('#saved-phone-text').html(phoneHtml).css('font-weight', '500');
  $('#saved-wa-text').hide(); $('#saved-alt-text').hide();
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