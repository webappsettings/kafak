// ------------------------------------------------------------------------------
// 🔴 CONFIGURATION & GLOBALS
// ------------------------------------------------------------------------------
const sc = `https://script.google.com/macros/s/AKfycbxAonOYSAaj8GVyp5EXrA9XPY8XfX9rfGKkPF4RHVSTBc1tkBae455dquqD7YL0b3Pg2A/exec`;

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
    btn_update: "UPDATE ORDER", btn_order: "PLACE ORDER", lbl_name: "Full Name",
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

const STORAGE_KEY = 'kafakCustomerData';

const SafeStorage = {
  getItem: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  setItem: function (key, val) { try { localStorage.setItem(key, val); } catch (e) { } },
  removeItem: function (key) { try { localStorage.removeItem(key); } catch (e) { } }
};

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

// 🔥 Pretty Date Format with Year (e.g., 10 Oct 2023, 04:30 PM)
function formatPrettyDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  // Added year: 'numeric'
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

$(document).ready(function () {
  injectVideoCSS();

  const qtyOpts = `<option value="1">1 Bottle (650g)</option><option value="2">2 Bottles (1.30 kg)</option><option value="3">3 Bottles (1.95 kg)</option><option value="4">4 Bottles (2.60 kg)</option><option value="5">5 Bottles (3.25 kg)</option><option value="6">6 Bottles (3.90 kg)</option><option value="8">8 Bottles (5.20 kg)</option><option value="10">10 Bottles (6.50 kg)</option>`;
  $('#quantity').append(qtyOpts);
  $('#quick-qty').append(qtyOpts);

  $('#phone, #edit-phone, #whatsapp, #altphone, #pincode').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#quantity, #quick-qty').change(function () { updatePrice($(this).val(), $(this).attr('id') === 'quick-qty'); });

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

  // INSTANT EDIT LOAD
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
          // 🔥 SHOW LOCAL UI, HIDE LOADER
          loadOrderData(localUsersMap[ph], false);
          foundLocally = true;
          // 🔥 FETCH SERVER DATA IN BACKGROUND
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
    btn.find('span').text("CHECKING...");
  } else {
    btn.prop('disabled', false).css('opacity', '1');
    btn.find('i').removeClass('fa-spin');
    btn.find('span').text("REFRESH STATUS");
  }
}

function syncUserDataBackground(phone) {
  let localData = localUsersMap[phone] || {};
  let custIdParam = localData.custId ? `&custId=${localData.custId}` : '';
  setRefreshLoading(true);

  return fetch(`${sc}?action=getCustomer&phone=${phone}${custIdParam}&t=${Date.now()}`)
    .then(res => res.json())
    .then(res => {
      if (res.result === 'success' && res.data) {
        let serverData = res.data;
        let mergedData = { ...localData, ...serverData };
        mergedData.Status = serverData.Status || serverData.status || "Pending";

        let s = mergedData.Status.toLowerCase();

        // 🔥 മാറ്റം 1: ഇവിടെ 'paid' ഒഴിവാക്കി. (Paid ആയാലും പഴയ ഓർഡർ തന്നെ എഡിറ്റ് ചെയ്യാം)
        if (['dispatched', 'completed', 'archive', 'delivered'].includes(s)) {
          editingOrderId = null;
          $('#display-oid').hide();
        }

        userData = mergedData;
        saveToLocal(phone, mergedData);

        // 🔥 മാറ്റം 2: Paid സ്റ്റാറ്റസ് 'Active' ആയി കണക്കാക്കുന്നു
        let isActive = !(['dispatched', 'completed', 'archive', 'delivered'].includes(s));
        showReturningUserView(mergedData, isActive, true);
      }
    })
    .catch(err => { console.log("Sync error"); })
    .finally(() => { setRefreshLoading(false); });
}

function backgroundUserCheck(phone) {
  fetch(`${sc}?action=getCustomer&phone=${phone}`).then(res => res.json()).then(res => { if (res.result === 'success' && res.data && res.data.custId) myCustId = res.data.custId; }).catch(e => console.log("Bg check fail"));
}

window.submitWizardOrder = function () {
  const finalData = {
    orderid: editingOrderId,
    name: $('#name').val(),
    phone: $('#phone').val(),
    whatsapp: $('#whatsapp').val(),
    altphone: $('#altphone').val(),
    house: $('#house').val(),
    place: $('#place').val(),
    pincode: $('#pincode').val(),
    postoffice: userData.postoffice,
    district: userData.district,
    state: userData.state || 'Kerala',
    quantity: $('#quantity').val(),
    message: '',
    custId: myCustId
  };
  saveToLocal(finalData.phone, finalData);
  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

window.handleEditPincode = function (el) { checkForChanges(); }

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

window.submitQuickOrder = function () {
  if (!$('#quick-qty').val()) { showAlert(getAlert('err_qty')); return; }
  const newPhone = $('#edit-phone').val(); if (!newPhone || newPhone.length !== 10) { showAlert(getAlert('err_phone')); return; }
  if (!$('#edit-house').val().trim()) { showAlert(getAlert('err_house')); return; } const pin = $('#edit-pincode').val(); if (!pin || pin.length !== 6) { showAlert(getAlert('err_pincode')); return; }

  const finalData = {
    orderid: editingOrderId,
    name: $('#saved-name').text(),
    phone: newPhone,
    whatsapp: $('#edit-whatsapp').val(),
    altphone: $('#edit-altphone').val(),
    house: $('#edit-house').val(),
    place: $('#edit-place').val(),
    pincode: pin,
    postoffice: $('#edit-postoffice').val(),
    district: $('#edit-district').val(),
    state: $('#edit-state').val(),
    quantity: $('#quick-qty').val(),
    message: '',
    custId: myCustId
  };
  saveToLocal(finalData.phone, finalData);
  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

function showReturningUserView(d, isActiveOrder, isServerData) {
  $('#returning-user-view').show();
  updateFooterButtons('returning'); isEditMode = isActiveOrder;
  if (d.orderid) $('#display-oid').text('#' + d.orderid).show(); else $('#display-oid').hide();

  // Date UI
  if (d.date) {
    if ($('#display-date').length === 0) {
      $('<div id="display-date" style="font-size:11px; color:#888; margin-top:-5px; margin-bottom:10px; font-weight:600;"></div>').insertAfter('#display-oid');
    }
    $('#display-date').text(formatPrettyDate(d.date)).show();
  } else {
    $('#display-date').hide();
  }

  $('#saved-name').text(d.name); $('#edit-phone').val(d.phone); $('#edit-house').val(d.house);
  $('#edit-place').val(d.place); $('#edit-pincode').val(d.pincode); $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district); $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone); $('#edit-altphone').val(d.altphone || '');

  if ($('.qty-action-group').length === 0) {
    $('#quick-qty').add('#btn-quick-submit').wrapAll('<div class="qty-action-group" style="display:flex; gap:10px; align-items:center; margin-bottom:10px;"></div>');
    $('#quick-qty').css('flex-grow', '1');
    $('#btn-quick-submit').css({ 'width': 'auto', 'padding': '0 25px', 'white-space': 'nowrap', 'height': '45px' });
    $('<div id="status-area" class="mt-2"></div>').insertAfter('#quick-price-box');
  }

  updateSummaryDisplay();
  $('#status-area').empty();

  // STATUS LOGIC
  if (isServerData) { updateStatusUI(d); }

  const status = String(d.Status || '').trim().toLowerCase();

  // 🔥 മാറ്റം 3: ഇവിടെയും 'paid' ഒഴിവാക്കി. (Paid വന്നാൽ ഫിനിഷ്ഡ് അല്ല)
  const isFinished = (status === 'dispatched' || status === 'completed' || status === 'archive' || status === 'delivered');
  const lang = $('.form-select').val() || 'en';

  if (isFinished && isServerData) {
    // FINISHED MODE: Show New Order Button
    $('.qty-label').hide();
    $('#quick-price-box').hide();
    $('#btn-quick-submit').hide();
    $('#btn-edit-address').hide();

    if ($('#btn-new-order-mode').length === 0) {
      const btnText = translations[lang].btn_new_order || "PLACE NEW ORDER";
      $(`
            <div id="btn-new-order-mode" class="mt-2 mb-3 text-center fade-in">
                <button onclick="enableNewOrderMode()" class="btn btn-dark shadow-sm rounded-pill px-4 py-2" style="font-weight:700; letter-spacing:1px; width:100%;">
                    <i class="fas fa-plus-circle me-1"></i> ${btnText}
                </button>
            </div>
          `).insertAfter('#status-area');
    }
    $('#btn-new-order-mode').show();
  } else {
    // NORMAL MODE (Pending / Paid)
    $('.qty-label').show();

    // Show Price Box? (Hide only if Dispatched/Completed)
    if (status === 'dispatched' || status === 'completed' || status === 'delivered') {
      $('#quick-qty').hide();
      $('#quick-price-box').hide();
    } else {
      $('#quick-price-box').show();
    }

    $('#btn-quick-submit').show();
    $('#btn-edit-address').show();
    $('#btn-new-order-mode').hide();

    $('#quick-qty option').prop('disabled', false);
    if (isActiveOrder) {
      $('#quick-qty').val(d.quantity).trigger('change');
      $('#btn-quick-submit span').text(translations[lang].btn_update);

      // 🔥 മാറ്റം 4: Paid ആണെങ്കിൽ കുറഞ്ഞ ക്വാണ്ടിറ്റി Disable ചെയ്യുന്നു
      if (status === 'paid') {
        const currentQty = parseInt(d.quantity);
        $('#quick-qty option').each(function () {
          if (parseInt($(this).val()) < currentQty) $(this).prop('disabled', true);
        });
      }
    } else {
      $('#quick-qty').val('').trigger('change');
      $('#quick-price-box').hide();
      $('#btn-quick-submit span').text(translations[lang].btn_order);
    }
  }

  if ($('#refresh-btn').length === 0) {
    $('#refresh-btn-container').remove();
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

window.enableNewOrderMode = function () {
  $('#btn-new-order-mode').hide();
  $('#status-area').hide();
  $('#quick-price-box').fadeIn();
  $('.qty-label').fadeIn();
  $('#quick-qty').val('').trigger('change').focus();
  $('#btn-quick-submit').fadeIn();
  $('#btn-edit-address').fadeIn();

  const lang = $('.form-select').val() || 'en';
  $('#btn-quick-submit span').text(translations[lang].btn_order);

  isEditMode = false;
  editingOrderId = null;
  $('#display-oid').hide();
  $('#display-date').hide();
}

window.markOrderDelivered = function (oid) {
  if (!confirm("Have you received the order?")) return;
  const btn = $('#btn-mark-delivered');
  btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Saving...');
  fetch(sc, {
    method: 'POST',
    body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: oid, status: "Delivered" }] })
  })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Thank You!' });
        manualRefresh();
      }
    });
}

function updateStatusUI(d) {
  $('#status-area').empty();
  let html = '';

  if (d.offer === true || String(d.offer).toLowerCase() === 'true') {
    html += `<div class="p-3 mb-2 rounded shadow-sm text-center" style="background: linear-gradient(135deg, #fff3cd 0%, #ffecb3 100%); border: 1px solid #ffeeba;"><h6 class="fw-bold text-warning mb-1"><i class="fas fa-crown"></i> Platinum Customer</h6><small class="text-dark">Special priority packing enabled!</small></div>`;
  }

  let status = String(d.Status || d.status || '').trim().toLowerCase();

  if (status === 'delivered') {
    html += `<div class="p-4 mb-2 rounded shadow-sm bg-white text-center border"><div class="mb-2"><i class="fas fa-check-circle text-success" style="font-size:30px;"></i></div><h6 class="fw-bold mb-1">Order Delivered!</h6><small class="text-muted">Enjoy your honey! 🍯</small></div>`;
  }
  else if (status === 'archive') {
    html += `<div class="p-3 mb-2 rounded shadow-sm bg-light text-center border"><h6 class="fw-bold mb-1">📦 Order Received</h6><small>We will contact you soon for payment.</small></div>`;
  }
  else if (status === 'paid') {
    html += `<div class="p-3 mb-2 rounded shadow-sm bg-success text-white text-center"><h6 class="fw-bold mb-1">✅ Payment Received!</h6><small>Order accepted. Packing in progress.</small></div>`;
  }
  else if (status === 'dispatched') {
    let trackingHtml = d.tracking ? `<div class="mt-2 bg-white text-primary p-2 rounded fw-bold shadow-sm" onclick="navigator.clipboard.writeText('${d.tracking}')" style="cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; gap:5px;">📦 Track: ${d.tracking} <i class="far fa-copy"></i></div>` : '';
    let courierName = (d.courier || d.provider) ? `<div style="font-size:12px; margin-top:2px; opacity:0.9;">Via ${d.courier || d.provider}</div>` : '';
    let markBtn = `<div class="mt-3"><button id="btn-mark-delivered" onclick="markOrderDelivered('${d.orderid}')" class="btn btn-light btn-sm fw-bold shadow-sm w-100" style="color:#0d6efd; border:1px solid #cce5ff;">✅ I RECEIVED THIS ORDER</button></div>`;
    html += `<div class="p-3 mb-2 rounded shadow-sm bg-primary text-white text-center"><h6 class="fw-bold mb-1">🚚 Order Dispatched!</h6>${courierName}<small>Your honey is on the way.</small>${trackingHtml}${markBtn}</div>`;
  }
  else if (status === 'completed') {
    html += `<div class="p-3 mb-2 rounded shadow-sm bg-success text-white text-center"><h6 class="fw-bold mb-1">✅ Completed!</h6><small>Order delivered successfully.</small></div>`;
  }
  else if (status === 'sent' || status === 'pending') {
    html += `<div class="p-3 mb-2 rounded shadow-sm bg-light text-center border"><h6 class="fw-bold mb-1">📦 Order Received</h6><small>We will contact you soon for payment.</small></div>`;
  }

  $('#status-area').html(html);
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

  let addr = `${house}, ${place}, ${po}, ${dist}, ${pin}`.toUpperCase().replace(/,\s*,/g, ',').replace(/\s\s+/g, ' ');

  // 🔥 CHANGE: പേര് ഇവിടെ നിന്ന് ഒഴിവാക്കി (മുകളിൽ Title ആയി വരുന്നത് കൊണ്ട്)
  $('#saved-address-text').text(addr).css({ 'margin-bottom': '2px', 'line-height': '1.3', 'font-size': '13px', 'color': '#555' });

  $('#saved-place-dist').text('');

  // Compact Phone UI
  let phoneHtml = `<i class="fas fa-phone-alt text-muted" style="font-size:11px;"></i> ${phone}`;
  if (alt) phoneHtml += ` <span class="text-muted">|</span> ${alt}`;
  if (wa) phoneHtml += ` <span class="text-muted">|</span> <span style="color:#25D366; font-weight:700;"><i class="fab fa-whatsapp"></i> ${wa}</span>`;

  $('#saved-phone-text').html(phoneHtml).css({ 'font-weight': '500', 'font-size': '12px', 'margin-top': '2px' });
  $('#saved-wa-text').hide(); $('#saved-alt-text').hide();
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

function setupAdminView(oid) {
  const adminUI = `<div id="admin-action-bar" style="display:none; position: fixed; bottom: 0; left: 0; width: 100%; background: white; padding: 15px; z-index: 12000; border-top: 1px solid #ddd; box-shadow: 0 -4px 20px rgba(0,0,0,0.15);"><div class="container p-0 d-flex justify-content-between align-items-center"><div id="admin-btn-container" style="flex-grow:1; margin-right:15px;"></div><button onclick="window.location.href='admin.html'" class="btn btn-light rounded-circle shadow-sm" style="width:45px; height:45px; border:1px solid #eee; display:flex; align-items:center; justify-content:center;"><i class="fas fa-times text-danger" style="font-size:20px;"></i></button></div></div>`;
  $('body').append(adminUI); $('body').css('padding-bottom', '100px');
  let cachedOrders = JSON.parse(SafeStorage.getItem('allOrdersCache') || "[]");
  let cachedOrder = cachedOrders.find(o => o.orderid === oid);
  if (cachedOrder) {
    showLoader(false);
    loadOrderData(cachedOrder, false);
    updateAdminUI(cachedOrder.Status || 'Pending', oid);
    syncUserDataBackground(cachedOrder.phone);
  } else {
    fetchOrder(oid);
  }
}

window.updateAdminUI = function (serverStatus, oid) {
  let status = String(serverStatus || '').trim();
  status = status.charAt(0).toUpperCase() + status.slice(1);
  let btnHTML = '';
  if (status === 'Archive') {
    btnHTML = `<button onclick="adminAction('${oid}', 'Paid')" class="btn btn-dark btn-sm fw-bold w-100 shadow-sm" style="background:#444; border:none;">📂 (Archived) CHANGE TO PAID</button>`;
  } else if (status === 'Pending') {
    btnHTML = `<div class="d-flex gap-2 w-100"><button onclick="adminAction('${oid}', 'Sent')" class="btn btn-primary btn-sm fw-bold w-100 shadow-sm">💬 MARK SENT</button><button onclick="adminAction('${oid}', 'Archive')" class="btn btn-outline-secondary btn-sm" style="width:40px;"><i class="fas fa-archive"></i></button></div>`;
  } else if (status === 'Sent') {
    btnHTML = `<div class="d-flex gap-2 w-100"><button onclick="adminAction('${oid}', 'Paid')" class="btn btn-warning btn-sm fw-bold w-100 shadow-sm text-dark">💰 MARK PAID</button><button onclick="adminAction('${oid}', 'Archive')" class="btn btn-outline-secondary btn-sm" style="width:40px;"><i class="fas fa-archive"></i></button></div>`;
  } else if (status === 'Delivered') {
    btnHTML = `<button class="btn btn-success btn-sm fw-bold w-100 shadow-sm" disabled>DELIVERED BY CUSTOMER ✅</button>`;
  } else {
    let displayTxt = status === 'Dispatched' ? 'DISPATCHED' : (status === 'Completed' ? 'COMPLETED' : status.toUpperCase());
    btnHTML = `<button class="btn btn-secondary btn-sm fw-bold w-100 shadow-sm" disabled>${displayTxt} ✅</button>`;
  }
  $('#admin-btn-container').html(btnHTML); $('#admin-action-bar').slideDown();
}

window.adminAction = function (oid, status) {
  if (status === 'Archive' && !confirm(`Move this order to Archive?`)) return;
  if (status !== 'Archive' && !confirm(`Change status to '${status}'?`)) return;
  const btnContainer = $('#admin-btn-container');
  const originalContent = btnContainer.html();
  btnContainer.html('<div class="text-center py-2"><i class="fas fa-spinner fa-spin text-primary"></i> Saving...</div>');
  fetch(sc, { method: 'POST', body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: oid, status: status }] }) })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        let updates = JSON.parse(SafeStorage.getItem('pendingUpdates') || "[]");
        updates = updates.filter(item => item.oid !== oid);
        updates.push({ oid: oid, status: status, time: new Date().getTime() });
        SafeStorage.setItem('pendingUpdates', JSON.stringify(updates));
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: `Saved: ${status}` });
        updateAdminUI(status, oid);
      } else { alert("Save Failed!"); btnContainer.html(originalContent); }
    })
    .catch(err => { alert("Network Error"); btnContainer.html(originalContent); });
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
      loadOrderData(d, true);
    } else { $('#step-0').fadeIn(); updateFooterButtons('step-0'); }
  }).catch(() => { showLoader(false); $('#step-0').fadeIn(); updateFooterButtons('step-0'); });
}

function injectVideoCSS() {
  $('head').append(`<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">`);
  $('body').append(`
    <style>
        #videoModal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background: #000; z-index:99999; flex-direction:column; align-items:center; justify-content:center; }
        .video-container { position: relative; width: 320px; height: 576px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid #333; }
        video { width: 100%; height: 100%; object-fit: cover; }
        .digital-label { position: absolute; top: 67%; left: 53%; transform: translate(-30%, -50%) scale(0.7); width: 128px; height: 128px; border-radius: 50%; background: radial-gradient(circle, #ffffff 40%, #ffe6a0 100%); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; z-index: 10; opacity: 0; transition: all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1); }
        .digital-label.visible { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        .content-group { display: flex; flex-direction: column; align-items: center; transition: transform 0.8s ease-in-out; }
        .digital-label img { width: 60px; opacity: 0.95; margin-bottom: 2px; }
        .packed-text { font-family: 'Montserrat', sans-serif; font-size: 10px; color: #5d4037; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }
        .digital-label.final-state .content-group { transform: translateY(-18px) scale(0.9); }
        .check-wrapper { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%) scale(0); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.27); }
        .check-wrapper.show { transform: translateX(-50%) scale(1); }
        .checkmark-svg { width: 28px; height: 28px; stroke: #28a745; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; fill: none; stroke-dasharray: 50; stroke-dashoffset: 50; transition: stroke-dashoffset 0.4s ease-in-out; }
        .check-wrapper.draw .checkmark-svg { stroke-dashoffset: 0; }
        .name-wrapper { position: absolute; top: 50%; left: 50%; z-index: 999; transform: translate(-100%, -250%) scale(1.2); opacity: 0; transition: all 1s cubic-bezier(0.25, 1, 0.5, 1); display: flex; justify-content: center; align-items: center; width: 100%; }
        .user-name { font-family: 'Courier New', monospace; font-size: 25px; font-weight: 900; color: #ffffff; text-transform: uppercase; padding-bottom: 2px; background-color: #000000; height: 32px; display: flex; align-items: center; justify-content: center; width: auto; min-width: 163px; padding-left: 15px; padding-right: 15px; padding-top: 2px; border-radius: 10px; box-shadow: 0px 4px 8px rgba(0,0,0,0.3); white-space: nowrap; }
        .name-wrapper.show-big { opacity: 1; transform: translate(-50%, -250%) scale(1.2); }
        .name-wrapper.docked { top: 67%; left: 53%; transform: translate(-50%, 2px) scale(0.5); opacity: 1; }
        .loading-txt { color: #d4a017; margin-top: 20px; font-family: sans-serif; font-size: 12px; letter-spacing: 2px; opacity: 0.8; }
    </style>
    <div id="videoModal">
        <div class="video-container">
            <video id="honeyVideo" muted playsinline preload="auto"><source src="honey_rotate.mp4" type="video/mp4"></video>
            <div class="digital-label" id="customLabel">
                <div class="content-group"><img src="images/kafak_logo.png" alt="Kafak"><div class="packed-text">RESERVED FOR</div></div>
                <div class="check-wrapper" id="finalCheck"><svg class="checkmark-svg" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"></path></svg></div>
            </div>
            <div class="name-wrapper" id="nameBadge"><div class="user-name" id="vid-username"></div></div>
        </div>
        <div class="loading-txt">PREPARING YOUR ORDER...</div>
    </div>`);
}

function preloadHoneyVideo() { const v = document.getElementById('honeyVideo'); if (v) v.load(); }

function playVideoAnimation(userName, apiCallback) {
  $('#videoModal').css('display', 'flex').fadeIn();
  const video = document.getElementById('honeyVideo');
  const label = $('#customLabel');
  const nameBadge = $('#nameBadge');
  const checkWrapper = $('#finalCheck');
  const nameBox = document.getElementById('vid-username');

  label.removeClass('visible final-state');
  nameBadge.removeClass('show-big docked');
  checkWrapper.removeClass('show draw');
  nameBox.innerText = "";

  let fontSize = 25;
  if (userName.length > 20) fontSize = 16; else if (userName.length > 12) fontSize = 20;
  $('#vid-username').css('font-size', fontSize + 'px');

  video.currentTime = 0;
  video.play().catch(e => console.log("Auto-play blocked", e));

  apiCallback();

  setTimeout(() => { label.addClass('visible'); }, 4700);
  setTimeout(() => { nameBadge.addClass('show-big'); }, 5500);
  setTimeout(() => {
    let i = 0; let text = userName.replace(/ /g, "\u00A0"); nameBox.innerText = "";
    let typeInterval = setInterval(() => { if (i < text.length) { nameBox.innerText += text.charAt(i); i++; } else { clearInterval(typeInterval); } }, 80);
  }, 5800);
  setTimeout(() => { nameBadge.removeClass('show-big').addClass('docked'); label.addClass('final-state'); }, 7800);
  setTimeout(() => { checkWrapper.addClass('show'); setTimeout(() => { checkWrapper.addClass('draw'); }, 100); }, 8300);
}

function postOrder(data) {
  const startTime = Date.now();
  window.orderSuccess = false;

  fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: data }) })
    .then(res => res.json())
    .then(res => {
      if (res.result === 'success') {
        successData = { ...data, orderid: res.orderid, timestamp: res.timestamp };
        if (res.custId) { data.custId = res.custId; myCustId = res.custId; localUsersMap[data.phone] = data; SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap)); }
        window.orderSuccess = true;

        const elapsed = Date.now() - startTime;
        const minAnimationTime = 8800;
        let waitTime = minAnimationTime - elapsed;
        if (waitTime < 0) waitTime = 0;

        setTimeout(() => {
          $('#videoModal').fadeOut(); $('#order-form').hide(); $('#showsuccess').fadeIn(); updateFooterButtons('none'); setTimeout(sendToWhatsapp, 1500);
        }, waitTime);
      }
    }).catch(() => { $('#videoModal').fadeOut(); showAlert("Connection failed. Try again."); });
}

function sendToWhatsapp() {
  const phone = '7788990313'; const orderid = successData.orderid; const d = successData;
  const n = parseInt(d.quantity); const base = n * 650; const courier = courierRates.kerala[n] || 0;
  const amountText = `Amount(₹): ${base} + ${courier}`; const totalText = `Total(₹): ${base + courier}/-`;
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;
  const safe = (val) => String(val || '').trim().toUpperCase();
  const extra = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderid}\`\`\`\n⌚ _${successData.timestamp}_\n🔗 _${editLink}_`;
  const format = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${String(d.pincode || '').trim()}*\n*Ph: ${String(d.phone || '').trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;
  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}