// ------------------------------------------------------------------------------
// 🔴 CONFIGURATION & GLOBALS
// ------------------------------------------------------------------------------
const sc = `https://script.google.com/macros/s/AKfycbyisVK5FFBKS3Hawyy3I7dZD6X--1vLTJAJfvAMjbh__fuMTIcia4gQ78JBkIvQ7r-ARA/exec`;

let currentStep = 0;
let editingOrderId = null;
let userData = {};
let successData = null;
let poList = [];
let myCustId = null;
let localUsersMap = {};
let currentLoginPhone = null;
let isEditMode = false;
var savedOrderData = {};
let globalQtyList = [];
let adminPhone = '7788990313';

const STORAGE_KEY = 'kafakCustomerData';

const SafeStorage = {
  getItem: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  setItem: function (key, val) { try { localStorage.setItem(key, val); } catch (e) { } },
  removeItem: function (key) { try { localStorage.removeItem(key); } catch (e) { } }
};

// --- UPDATED LOADER LOGIC ---
let loaderInterval;

// --- 🔥 SIMPLE GIF LOADER LOGIC ---
window.showLoader = function (show) {
  // 1. Language Setup
  const lang = $('#language-select').val() || 'en';
  const t = translations[lang] || translations['en'];
  const loadingTxt = t.loading || "LOADING...";

  if (show) {
    // Show UI
    $('#loader-text').text(loadingTxt);
    $('#full-loader').css('display', 'flex').fadeIn(200); // 'flex' to center align

  } else {
    setTimeout(() => {
      $('#full-loader').fadeOut(300);
    }, 200);
  }
}

window.changeLanguage = function (lang) {
  localStorage.setItem('activeLang', lang);
  const t = translations[lang] || translations['en']; // Fallback
  if (!t) return;

  // 1. Update Standard Text Content
  $('[data-i18n]').each(function () {
    const key = $(this).attr('data-i18n');
    if (key === 'lbl_qty' && typeof editingOrderId !== 'undefined' && editingOrderId) {
      $(this).text(t.lbl_qty_edit);
      return;
    }

    if (t[key]) $(this).text(t[key]);
  });

  // 2. Update Placeholders & Other UI Elements
  $('#phone').attr('placeholder', t.ph_phone);
  $('#name').attr('placeholder', t.ph_name);
  $('#house').attr('placeholder', t.ph_house);
  $('#place').attr('placeholder', t.ph_place);
  $('#pincode').attr('placeholder', t.ph_pincode);
  $('#whatsapp').attr('placeholder', t.ph_whatsapp);
  $('#altphone').attr('placeholder', t.ph_altphone);

  $('#edit-phone').attr('placeholder', t.ph_edit_phone);
  $('#edit-house').attr('placeholder', t.ph_edit_house);
  $('#edit-place').attr('placeholder', t.ph_edit_place);
  $('#edit-pincode').attr('placeholder', t.ph_edit_pin);
  $('#edit-whatsapp').attr('placeholder', t.ph_edit_wa);
  $('#edit-altphone').attr('placeholder', t.ph_edit_alt);

  // 3. Update Dropdowns
  renderQtyDropdowns();
  let qtyVal = $('#quantity').is(':visible') ? $('#quantity').val() : $('#quick-qty').val();
  if (qtyVal) {
    updatePrice(qtyVal, $('#quick-qty').is(':visible'));
  }

  // 4. Update Wizard Button Text
  const wizBtn = $('#btn-wiz-next');
  if (wizBtn.length > 0) {
    if (currentStep === 7) wizBtn.text(t.btn_order);
    else wizBtn.text(t.btn_next);
  }

  checkForChanges();

  // 5. Status UI Refresh
  if (typeof userData !== 'undefined' && userData.orderid && typeof updateStatusUI === 'function') {
    if ($('#status-area').html().trim() !== "") {
      updateStatusUI(userData);
    }
  }

  if ($('#quick-qty').is(':hidden')) {
    $('label[data-i18n="lbl_qty"]').hide();
    $('#quick-qty').prev('label').hide();
  }
}

window.showAlert = function (msg) {
  Swal.fire({ text: msg, icon: 'warning', confirmButtonText: 'OK', confirmButtonColor: '#000', customClass: { popup: 'ios-popup', confirmButton: 'ios-btn' } });
}

window.getAlert = function (key) {
  const lang = $('#language-select').val() || 'en';
  return translations[lang][key] || key;
}

window.updateWizardLocDisplay = function () {
  $('#display-po').text((userData.postoffice || '').toUpperCase());
  $('#display-dist-state').text(`${$('#place').val() || ''}, ${userData.district || ''}`.toUpperCase());
}


function formatPrettyDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

function getZoneKey(stateName) {
  if (!stateName) return 'REST OF INDIA';
  let s = stateName.toUpperCase().trim();

  // 🔥 DYNAMIC CHECK: സ്റ്റേറ്റ് ലിസ്റ്റിൽ ഈ പേരുണ്ടോ എന്ന് നോക്കുന്നു
  // ഉണ്ടെങ്കിൽ ആ പേര് തന്നെ തിരിച്ചയക്കുന്നു (ഉദാ: "KARNATAKA")
  if (courierRates && courierRates[s]) {
    return s;
  }

  // ലിസ്റ്റിൽ ഇല്ലെങ്കിൽ മാത്രം "REST OF INDIA" എടുക്കുന്നു
  return 'REST OF INDIA';
}

$(document).ready(function () {

  const savedLang = localStorage.getItem('activeLang') || 'ml';
  if (savedLang) {
    if ($('#language-select').length > 0) {
      $('#language-select').val(savedLang);
    }
    changeLanguage(savedLang);
  } else {
    // Default English
    changeLanguage('en');
  }

  fetchCourierRates();
  injectVideoCSS();

  const urlParams = new URLSearchParams(window.location.search);
  const autoPhone = urlParams.get('phone');

  if (autoPhone) {
    // 1. Clean the number (remove +91, spaces)
    let cleanPhone = autoPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10); // Last 10 digits

    // 2. Set Value & Auto Click Next
    if (cleanPhone.length === 10) {
      $('#phone').val(cleanPhone);
      setTimeout(() => {
        handlePhoneNext(); // Auto-Trigger Next Button
      }, 500); // Small delay for smooth UX
    }
  }

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
  const oid = urlParams.get('oid');
  const isAdmin = SafeStorage.getItem('kafakAdmin') === 'true';

  // INSTANT EDIT LOAD
  if (oid) {
    showLoader(true);

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
      if (!foundLocally) {
        console.log("Not found locally, fetching from server...");
        fetchOrder(oid);
      }
    }
  } else {
    showLoader(false);
    $('#step-0').show();
    updateFooterButtons('step-0');
    setTimeout(() => $('#phone').focus(), 500);
  }

  $('.form-select').on('change', function () {
    updateLiveAddressPreview();
  });

});

window.handlePhoneNext = function () {
  const phone = $('#phone').val();
  if (!/^[0-9]{10}$/.test(phone)) { showAlert(getAlert('err_phone')); return; }

  currentLoginPhone = phone;
  preloadHoneyVideo();

  if (localUsersMap[phone]) {

    // 🔥 DO NOT RENDER LOCAL IMMEDIATELY
    showLoader(true);

    syncUserDataBackground(phone).finally(() => {
      showLoader(false);
    });

    return;
  }

  editingOrderId = null;
  $('#step-0').hide();
  $('#whatsapp').val(phone);
  startWizard();
  backgroundUserCheck(phone);
  $('#top-progress-container').fadeIn();
}


function checkUserOnServerBackground(phone) {
  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(data => {
      if ($('#wizard-view').is(':visible')) {

        if (data.result === 'success' && data.data && data.data.authorized) {
          let status = String(data.data.Status || '').toLowerCase();
          if (status !== 'completed' && status !== 'delivered') {

            Swal.fire({
              title: 'Welcome Back!',
              text: 'Loading your active order...',
              icon: 'info',
              timer: 2000,
              showConfirmButton: false,
              toast: true,
              position: 'top'
            });

            userData = data.data;
            saveToLocal(phone, userData);

            $('#wizard-view').hide();
            $('#top-progress-container').hide();
            loadOrderData(userData, true);
          }
        }
      }
    })
    .catch(err => console.log("Background check silent fail"));
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
  $('#step-0').hide();
  userData = d;
  editingOrderId = d.orderid;
  currentLoginPhone = d.phone;

  if (d.phone) saveToLocal(d.phone, d);

  showReturningUserView(d, true, isServerData);

  if (d.quantity) {
    $('#quick-qty').val(d.quantity);
    updatePrice(d.quantity, true);
  }
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

// 🔥 UPDATED: PERFECT SYNC LOGIC
// 1. DATA CLEANING
function syncUserDataBackground(phone) {
  let localData = localUsersMap[phone] || {};
  let custIdParam = localData.custId ? `&custId=${localData.custId}` : '';

  const userPromise = fetch(`${sc}?action=getCustomer&phone=${phone}${custIdParam}&t=${Date.now()}`)
    .then(res => res.json())
    .catch(() => null);

  const ratePromise = fetchCourierRates();

  return Promise.all([userPromise, ratePromise])
    .then(([userRes]) => {
      let finalData = localData;

      if (userRes && userRes.result === 'success' && userRes.data) {
        let serverData = userRes.data;
        finalData = { ...localData, ...serverData };
        finalData.Status = serverData.Status || serverData.status || "Pending";

        if (finalData.orderid) {
          editingOrderId = finalData.orderid;
          let s = String(finalData.Status).toLowerCase();

          // Finished Orders -> New Order Mode
          if (['completed', 'delivered', 'refunded'].includes(s)) {
            editingOrderId = null;
            finalData.quantity = null;
            delete finalData.quantity;
          }
        }
        userData = finalData;
        savedOrderData = JSON.parse(JSON.stringify(finalData));
        saveToLocal(phone, finalData);
      }
      renderEditView(finalData);
    });
}


// 🔥 Helper Function to Show/Hide Controls based on Status
function handleEditControlsVisibility(d) {

  const status = String(d.Status || 'pending').toLowerCase();

  if (['dispatched', 'delivered', 'completed', 'refunded'].includes(status)) {

    $('#quick-qty, .btn-update-sage, #quick-price-box').hide();
    $('#btn-edit-addr').hide();
    $('label[data-i18n="lbl_qty"]').hide();

    return;
  }

  // 🔥 Retry only once if quantity missing
  if (!d.quantity && !d._retried) {

    d._retried = true;

    $('#quick-qty, .btn-update-sage, #quick-price-box').hide();
    $('label[data-i18n="lbl_qty"]').hide();

    setTimeout(() => syncUserDataBackground(d.phone), 1000);

    return;
  }

  // ✅ Show Controls
  $('label[data-i18n="lbl_qty"]').show();
  $('#quick-qty, .btn-update-sage, #quick-price-box').show();
  $('#btn-edit-addr').css('display', 'inline-block');
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
    custId: myCustId,
    language: $('#language-select').val() || 'en'
  };
  saveToLocal(finalData.phone, finalData);
  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

window.handleEditPincode = async function (val) {
  if (!/^[0-9]{6}$/.test(val)) {
    $('#edit-po-wrapper').slideUp();
    $('#single-po-display').hide();
    return;
  }

  checkForChanges();

  // 🔥 Language Setup
  const lang = $('#language-select').val() || 'en';
  const t = translations[lang];

  try {
    const res = await fetch(`pincode_json_files/${val}.json`);
    if (!res.ok) throw new Error("Not Found");

    let data = await res.json();
    data = data.map(item => ({
      ...item,
      officename: item.officename.replace(/\s+(BO|SO|HO|PO)\s*$/i, ' PO')
    }));

    if (data && data.length > 0) {
      $('#edit-district').val(data[0].district);
      $('#edit-state').val(data[0].statename);
      updatePrice($('#quick-qty').val(), true);

      if (data.length > 1) {
        // === MULTIPLE POST OFFICES ===
        $('#single-po-display').hide();

        const sel = $('#edit-postoffice-select');

        sel.empty().append(`<option value="">${t.lbl_select_po}...</option>`);

        data.forEach(p => {
          sel.append(`<option value="${p.officename}">${p.officename}</option>`);
        });

        $('#edit-po-wrapper').slideDown();
        $('#edit-postoffice').val('');

      } else {
        // === SINGLE POST OFFICE ===
        $('#edit-po-wrapper').slideUp();
        const poName = data[0].officename;
        $('#edit-postoffice').val(poName);
        $('#single-po-display').html(`<i class="fas fa-check-circle"></i> ${poName}`).fadeIn();
      }

      updateSummaryDisplay();
      checkForChanges();
    }
  } catch (e) {
    console.log("Pincode not found");
    $('#edit-po-wrapper').slideUp();
    $('#single-po-display').hide();
  }
}

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
  const btn = $('#btn-wiz-next'); const lang = $('#language-select').val();
  if (s === 7) { btn.html(translations[lang].btn_order); btn.addClass('btn-brand-green'); updatePrice($('#quantity').val(), false); }
  else { btn.html(translations[lang].btn_next); btn.removeClass('btn-brand-green'); }
  if (s !== 6) setTimeout(() => { $(`.wiz-step[data-step="${s}"] input`).first().focus(); }, 300);
}

window.nextStep = async function () {
  // 🔥 Language Setup
  const lang = $('#language-select').val() || 'en';
  const t = translations[lang];

  if (currentStep === 1 && !$('#name').val()) return showAlert(getAlert('err_name'));
  if (currentStep === 2 && !/^[0-9]{10}$/.test($('#whatsapp').val())) return showAlert(getAlert('err_whatsapp'));

  if (currentStep === 3) {
    const pin = $('#pincode').val(); if (!/^[0-9]{6}$/.test(pin)) return showAlert(getAlert('err_pincode'));
    $('#btn-wiz-next').prop('disabled', true).text(getAlert('err_checking_pin'));
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`); if (!res.ok) throw new Error("404"); let data = await res.json();
      data = data.map(item => ({
        ...item,
        officename: item.officename.replace(/\s+(BO|SO|HO|PO)\s*$/i, ' PO')
      }));
      $('#btn-wiz-next').prop('disabled', false).text(t.btn_next);

      if (data && data.length > 0) {
        poList = data; userData.district = data[0].district; userData.state = data[0].statename;
        const dl = $('#place-list'); dl.empty(); data.forEach(p => dl.append(`<option value="${p.officename}">`));

        if (data.length > 1) {
          $('#po-select').empty().append(`<option value="">${t.lbl_select_po}...</option>`);

          data.forEach(p => $('#po-select').append(`<option value="${p.officename}">${p.officename}</option>`));
          currentStep = 3.5; showStep(3.5); return;
        }
        else { userData.postoffice = data[0].officename; currentStep = 4; showStep(4); return; }
      } else { showAlert(getAlert('err_pin_not_found')); }
    } catch (e) { $('#btn-wiz-next').prop('disabled', false).text(t.btn_next); showAlert(getAlert('err_pincode')); return; }
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
  // 1. Check if button is disabled
  if ($('.btn-update-sage').prop('disabled')) return;

  // 2. Basic Validation (Qty, Phone, Pin)
  if (!$('#quick-qty').val()) { showAlert(getAlert('err_qty')); return; }

  const newName = $('#edit-name').val();
  if (!newName) { showAlert(getAlert('err_name') || "Name Required"); return; }

  const newPhone = $('#edit-phone').val();
  if (!newPhone || newPhone.length !== 10) { showAlert(getAlert('err_phone')); return; }

  const pin = $('#edit-pincode').val();
  if (!pin || pin.length !== 6) { showAlert(getAlert('err_pincode')); return; }

  // 🔥 3. Post Office Validation
  let finalPO = $('#edit-postoffice').val();

  if ($('#edit-postoffice-select').is(':visible')) {
    finalPO = $('#edit-postoffice-select').val();
  }
  if (!finalPO) {
    showAlert(getAlert('err_select_po') || "Please Select Post Office");
    if ($('#address-edit-box').is(':hidden')) toggleAddressEdit();
    return;
  }

  $('#edit-postoffice').val(finalPO); // Hidden input update

  // 4. Prepare Data Object
  const finalData = {
    orderid: editingOrderId,
    name: newName,
    phone: newPhone,
    whatsapp: $('#edit-whatsapp').val(),
    altphone: $('#edit-altphone').val(),
    house: $('#edit-house').val(),
    place: $('#edit-place').val(),
    pincode: pin,
    postoffice: finalPO,
    district: $('#edit-district').val(),
    state: $('#edit-state').val(),
    quantity: $('#quick-qty').val(),
    message: '',
    custId: myCustId,
    language: $('#language-select').val() || 'en'
  };
  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

function showReturningUserView(d, isActiveOrder, isServerData) {
  $('#step-0').hide();
  $('#returning-user-view').show();
  updateFooterButtons('returning'); isEditMode = isActiveOrder;

  const lang = $('#language-select').val() || 'en';
  const t = translations[lang] || translations['en'];

  if (d.language) {
    $('#language-select').val(d.language);
    changeLanguage(d.language);
  }

  const qtyLabel = $('label[data-i18n="lbl_qty"]');
  qtyLabel.text(t.lbl_qty_edit);

  // OID & Date Display
  if (d.orderid) $('#display-oid').text('#' + d.orderid).show(); else $('#display-oid').hide();
  if (d.date) {
    if ($('#display-date').length === 0) {
      $('<div id="display-date" class="text-muted fw-bold small mt-1" style="font-size:10px;"></div>').insertAfter('#display-oid');
    }
    $('#display-date').text(formatPrettyDate(d.date)).show();
  } else { $('#display-date').hide(); }

  // Populate Data
  $('#saved-name').text(d.name);
  $('#edit-name').val(d.name);
  $('#edit-phone').val(d.phone); $('#edit-house').val(d.house);
  $('#edit-place').val(d.place); $('#edit-pincode').val(d.pincode); $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district); $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone); $('#edit-altphone').val(d.altphone || '');

  savedOrderData = JSON.parse(JSON.stringify(d));
  updateSummaryDisplay();

  $('#status-area').hide().empty();

  const checkText = t.status_check || "CHECKING LIVE STATUS...";

  if (isServerData) {
    updateStatusUI(d);

    // Refresh Button logic...
    if ($('#refresh-btn').length === 0) {
      const refreshText = t.txt_refresh || "REFRESH STATUS";
      $('#returning-user-view').append(`
              <div class="d-flex justify-content-center mt-4 mb-3 fade-in">
                  <button id="refresh-btn" onclick="manualRefresh()" class="btn btn-sm bg-white shadow-sm rounded-pill text-muted border px-3 py-2" style="font-weight: 600; font-size: 11px;">
                      <i class="fas fa-sync-alt me-1"></i> <span data-i18n="txt_refresh">${refreshText}</span>
                  </button>
              </div>`);
    }

    // New Order Button Logic...
    const status = String(d.Status || '').trim().toLowerCase();
    $('#quick-qty option').prop('disabled', false);
    if (status === 'paid') {
      let currentQty = parseInt(d.quantity) || 0;
      $('#quick-qty option').each(function () {
        if (parseInt($(this).val()) < currentQty) $(this).prop('disabled', true);
      });
    }

    if (['delivered', 'completed', 'refunded'].includes(status)) {
      const btnText = t.btn_place_new_order || "PLACE NEW ORDER";
      if ($('#btn-new-order-mode').length === 0) {
        $(`<div id="btn-new-order-mode" class="mt-2 mb-3 text-center fade-in"><button onclick="enableNewOrderMode()" class="btn btn-dark shadow-sm rounded-pill px-4 py-2" style="font-weight:700; width:100%;"><i class="fas fa-plus-circle me-1"></i> ${btnText}</button></div>`).insertAfter('#status-area');
      } else {
        $('#btn-new-order-mode button').html(`<i class="fas fa-plus-circle me-1"></i> ${btnText}`);
      }
      $('#btn-new-order-mode').show();
    }

    handleEditControlsVisibility(d);

  } else {
    $('#quick-qty, .btn-update-sage, #quick-price-box').hide();
    $('#btn-edit-addr').hide();
    $('#btn-new-order-mode').hide();
    $('label[data-i18n="lbl_qty"]').hide();
    $('#quick-qty').prev('label').hide();

    // Hourglass Animation
    $('#status-area').html(`
        <div class="d-flex flex-column align-items-center justify-content-center py-5 fade-in">
            <div class="hourglass-container">
                <div class="hourglass-glass"></div>
            </div>
            <div class="mt-3 text-muted fw-bold small" style="font-size:11px; letter-spacing:1px; text-transform:uppercase;">
                ${checkText}
            </div>
        </div>
    `).show();
  }

  checkForChanges();
}

// 2. UI RESET
window.enableNewOrderMode = function () {
  $('#btn-new-order-mode').hide();
  $('#status-area').empty();

  if (typeof savedOrderData !== 'undefined') {
    savedOrderData.quantity = null;
  }

  const lang = $('#language-select').val() || 'en';
  const t = translations[lang] || translations['en'];
  $('label[data-i18n="lbl_qty"]').text(t.lbl_qty || "How many bottles?");

  $('label[data-i18n="lbl_qty"]').fadeIn();
  $('#quick-qty').prev('label').fadeIn();
  $('#quick-qty').fadeIn();
  $('.btn-update-sage').fadeIn();

  // 🔥🔥🔥 MAIN FIX:
  $('#quick-price-box').hide().empty();

  $('#btn-edit-addr').fadeIn().css('display', 'inline-block');

  isEditMode = false;
  editingOrderId = null;
  $('#display-oid').hide();
  $('#display-date').hide();

  $('#quick-qty').val('').trigger('change');
  $('#quick-qty option').prop('disabled', false);

  checkForChanges();
}

window.markOrderDelivered = function (oid) {
  Swal.fire({
    title: 'Order Received?',
    text: "നിങ്ങൾക്ക് ഓർഡർ ലഭിച്ചോ?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, Received! ✅',
    cancelButtonText: 'Not Yet',
    customClass: { popup: 'rounded-4 shadow-lg' }
  }).then((result) => {
    if (result.isConfirmed) {

      $('#btn-mark-delivered').parent().html(`
          <div class="text-success fw-bold text-center py-3 fade-in" style="animation: popIn 0.5s ease;">
              <i class="fas fa-check-circle fa-3x mb-2"></i><br>
              <span style="font-size:16px;">നന്ദി! Enjoy! 🍯</span>
          </div>
      `);

      // B. Beautiful Success Popup (Celebration 🎉)
      Swal.fire({
        title: 'Thank You! ❤️',
        html: '<div style="font-size:14px;">ഞങ്ങളെ വിശ്വസിച്ച് ഓർഡർ ചെയ്തതിന് നന്ദി!<br>Enjoy the purest honey! 🐝</div>',
        icon: 'success',
        showConfirmButton: false,
        timer: 3000,
        backdrop: `rgba(0,0,0,0.4)`,
        padding: '2em',
        customClass: { popup: 'rounded-4' }
      });

      if (typeof userData !== 'undefined') {
        userData.Status = 'Delivered';

        delete userData.quantity;

        saveToLocal(userData.phone, userData);

        updateStatusUI(userData);

        setTimeout(() => {
          renderEditView(userData);
        }, 3000);
      }

      fetch(sc, {
        method: 'POST',
        body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: oid, status: "Delivered" }] })
      })
        .then(res => res.json())
        .then(data => console.log("Server Updated: Delivered ✅"))
        .catch(err => console.log("Background Sync Failed (Saved Locally)"));
    }
  });
}

function updateStatusUI(d) {
  $('#status-area').empty();

  const lang = $('#language-select').val() || 'en';
  const t = translations[lang] || translations['en'];

  let s = String(d.Status || d.status || 'pending').toLowerCase();

  // Status Logic
  const isPaid = ['paid', 'dispatched', 'delivered', 'refunded', 'completed'].includes(s);
  const isDispatched = ['dispatched', 'delivered', 'refunded', 'completed'].includes(s);
  const isDelivered = ['delivered', 'completed'].includes(s);
  const isRefunded = (s === 'refunded');

  let timelineHTML = `<div class="tracking-wrapper" style="opacity:0; transition: opacity 0.5s ease-in-out;">
        <h6 class="fw-bold mb-4 ps-1" style="font-size:13px; color:#374151; letter-spacing:0.5px;">${t.lbl_order_status}</h6>
        <div class="modern-timeline">`;

  // Timeline Items
  const items = [
    { title: t.order_success, desc: t.desc_order_placed, date: d.timestamp || d.date, active: true },
    { title: t.lbl_payment_received, desc: t.desc_pay_received, date: d.paidDate, active: isPaid },
    { title: t.lbl_dispatched, desc: t.desc_dispatched, date: d['Dispatched Date'], active: isDispatched },
  ];

  if (isRefunded) {
    items.push({ title: t.lbl_refunded || "Refunded", desc: t.desc_refunded || "Amount Returned", date: null, active: true, isRefund: true });
  } else {
    items.push({ title: t.lbl_delivered, desc: t.desc_delivered, date: null, active: isDelivered });
  }

  items.forEach((item, index) => {
    let isLast = index === items.length - 1;
    let iconClass = "timeline-icon" + (item.isRefund ? " refunded" : (item.active ? " active" : ""));
    let iconContent = item.isRefund ? `<i class="fas fa-undo-alt"></i>` : (item.active ? `<i class="fas fa-check"></i>` : "");
    let iconHtml = `<div class="${iconClass}">${iconContent}</div>`;
    let nextItemActive = items[index + 1] && items[index + 1].active;
    let lineHtml = isLast ? '' : `<div class="timeline-line ${nextItemActive ? 'active' : ''}"></div>`;
    let dateHtml = '';
    if (item.date && item.active) {
      dateHtml = `<div class="ms-auto text-muted small fw-bold" style="font-size:10px; background:#f3f4f6; padding:2px 8px; border-radius:10px;">${formatPrettyDate(item.date)}</div>`;
    }
    let extraContent = '';
    if (index === 2 && item.active && d.tracking && !isRefunded) {
      let courierName = d.courier || d.provider || "Courier";
      let trackLink = `https://www.google.com/search?q=${courierName}+tracking+${d.tracking}`;
      extraContent = `<div class="mt-2"><a href="${trackLink}" target="_blank" class="btn btn-sm btn-outline-primary py-1 px-3 shadow-sm" style="font-size:11px; border-radius:50px;">${t.lbl_track_item} <i class="fas fa-external-link-alt ms-1"></i></a></div>`;
    }
    let rowClass = (item.isRefund) ? "timeline-row refunded-text" : (item.active ? "timeline-row completed" : "timeline-row");
    timelineHTML += `
            <div class="${rowClass}">
                <div class="timeline-left">${iconHtml}${lineHtml}</div>
                <div class="timeline-right pb-4">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="fw-bold text-dark" style="font-size:14px;">${item.title}</div>
                        ${dateHtml}
                    </div>
                    <div class="text-muted small mt-1" style="font-size:12px; line-height:1.4;">${item.desc}</div>
                    ${extraContent}
                </div>
            </div>`;
  });

  timelineHTML += `</div></div>`;

  // 🔥 BEAUTIFUL RECEIVED BUTTON
  if (s === 'dispatched') {
    timelineHTML += `
            <div class="mt-4 px-2 text-center fade-in">
                <div class="text-muted fw-bold mb-3" style="font-size:11px; letter-spacing:0.5px; text-transform:uppercase;">
                    ${t.txt_received_helper}
                </div>
                
                <button id="btn-mark-delivered" onclick="markOrderDelivered('${d.orderid}')" 
                    class="btn w-100 py-3 shadow-lg" 
                    style="
                        background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); 
                        color: white; 
                        border-radius: 16px; 
                        border: none; 
                        position: relative; 
                        overflow: hidden;
                        transition: transform 0.2s;
                    "
                    onmousedown="this.style.transform='scale(0.98)'" 
                    onmouseup="this.style.transform='scale(1)'">
                    
                    <div class="d-flex align-items-center justify-content-center gap-2">
                        <div style="background:rgba(255,255,255,0.2); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-check text-white" style="font-size:14px;"></i>
                        </div>
                        <div class="text-start">
                            <div style="font-size:14px; font-weight:800; letter-spacing:0.5px; line-height:1.2;">YES, I RECEIVED IT</div>
                            <div style="font-size:10px; opacity:0.9; font-weight:500;">Click to mark as Delivered</div>
                        </div>
                    </div>

                </button>
            </div>`;
  }

  $('#status-area').html(timelineHTML);
  $('#status-area').fadeIn(500, function () { $('.tracking-wrapper').css('opacity', '1'); });
}

function updateSummaryDisplay() {
  // 1. Get Values
  const newName = $('#edit-name').val();
  if (newName) $('#saved-name').text(newName);
  const house = $('#edit-house').val() || '';
  const place = $('#edit-place').val() || '';

  // 🔥 FIX: Check Dropdown first, then Hidden Input
  let po = '';
  if ($('#edit-postoffice-select').is(':visible') && $('#edit-postoffice-select').val()) {
    po = $('#edit-postoffice-select').val(); // Dropdown Value
  } else {
    po = $('#edit-postoffice').val() || ''; // Hidden Input Value
  }

  const pin = $('#edit-pincode').val() || '';
  const dist = $('#edit-district').val() || '';
  const state = $('#edit-state').val() || 'KERALA';

  const wa = $('#edit-whatsapp').val() || '';
  const alt = $('#edit-altphone').val();
  const phone = $('#edit-phone').val() || '';

  const safe = (val) => String(val || '').trim().toUpperCase();

  // 2. Clean PO Logic
  let poClean = safe(po).replace(/P\.?O\.?$/i, '').trim();
  if (poClean) poClean += ' PO';

  // 3. Generate Address HTML
  let addrHtml = `
      <span class="addr-house">${safe(house)}</span>
      ${safe(place)}${place && poClean ? ',' : ''} <b>${poClean}</b>
      <br>
      <span style="font-weight:600;">${safe(dist)}, ${safe(state)}</span> 
      <span class="pin-box">${safe(pin)}</span>
  `;
  $('#saved-address-text').html(addrHtml);

  // 4. Phone Box
  let phoneHtml = `
      <div class="phone-grey-box">
          <div class="ph-row">
              <i class="fas fa-phone-alt text-secondary" style="width:20px; text-align:center;"></i> 
              <span style="color:#374151; font-weight:700; font-size:14px;">${phone}</span>
              ${alt ? `<span style="color:#ccc; margin:0 5px;">|</span> <span style="color:#666;">${alt}</span>` : ''}
          </div>
          ${wa ? `
          <div class="ph-row">
              <i class="fab fa-whatsapp" style="color:#25D366; font-size:18px; width:20px; text-align:center;"></i> 
              <span style="color:#25D366; font-weight:700; font-size:14px;">${wa}</span>
          </div>` : ''}
      </div>
  `;
  $('#saved-phone-text').html(phoneHtml);
  $('#saved-wa-text, #saved-alt-text').hide();

  // Hide Edit Button Logic
  if (typeof userData !== 'undefined' && userData.Status) {
    let s = String(userData.Status).toLowerCase().trim();
    if (['dispatched', 'completed', 'delivered', 'refunded'].includes(s)) {
      $('#btn-edit-addr').hide();
    } else {
      $('#btn-edit-addr').css('display', 'inline-block');
    }
  }

  if (typeof checkForChanges === 'function') checkForChanges();
}

function checkAndHideEditButton() {
  // 1. Check Global userData (If available)
  if (typeof userData !== 'undefined' && userData.Status) {
    applyHideLogic(userData.Status);
    return;
  }

  let hiddenStatus = $('#order-status-hidden').val();
  if (hiddenStatus) {
    applyHideLogic(hiddenStatus);
  }
}

function applyHideLogic(status) {
  let s = String(status).toLowerCase().trim();
  if (['paid', 'dispatched', 'refunded'].includes(s)) {
    $('#btn-edit-addr').hide();
    console.log("Edit Button Hidden for Status:", s);
  } else {
    $('#btn-edit-addr').css('display', 'inline-flex');
  }
}

window.updatePrice = function (qty, isQuick) {
  const container = isQuick ? $('#quick-price-box') : $('#wiz-price-box');

  if (!qty) {
    container.hide();
    return;
  }

  const lang = $('#language-select').val() || 'ml';
  const t = translations[lang];
  const n = parseInt(qty);
  const base = n * 650;

  let currentState = isQuick ? $('#edit-state').val() : ((userData && userData.state) ? userData.state : ($('#state').val() || 'KERALA'));
  const zone = getZoneKey(currentState);
  const courier = (courierRates[zone] && courierRates[zone][n]) ? courierRates[zone][n] : 0;
  const total = base + courier;

  let htmlContent = `
      <div class="price-row"><span>${t.lbl_honey_price} (<span class="qty-count">${n}</span>)</span><span>₹<span class="val-base">${base}</span></span></div>
      <div class="price-row"><span>${t.lbl_courier_charge}</span><span>₹<span class="val-courier">${courier}</span></span></div>
      <div class="price-total"><span>${t.lbl_total_amount}</span><span class="text-success">₹<span class="val-total">${total}</span></span></div>
  `;
  container.html(htmlContent);
  container.fadeIn();

  // 4. Update "Deliver To" Section (For Wizard View)
  if (!isQuick) {
    let name = $('#name').val() || '';
    let house = $('#house').val() || '';
    let place = $('#place').val() || '';
    let po = (userData.postoffice || '').toUpperCase();
    let dist = (userData.district || '').toUpperCase();
    let state = (userData.state || 'KERALA').toUpperCase();
    let pin = $('#pincode').val();
    let phone = $('#phone').val();
    let wa = $('#whatsapp').val();

    let prettyHtml = `
        <div style="padding: 8px 0; border-bottom: 1px dashed #e0e0e0; margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                 <div style="font-size: 10px; font-weight: 800; color: #9ca3af; letter-spacing: 1px;">${t.lbl_deliver_to}</div>
                 <div style="font-size: 11px; font-weight: 700; color: #25D366;"><i class="fab fa-whatsapp"></i> ${wa}</div>
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #1a1a1a; text-transform: uppercase;">${name}</div>
            <div style="font-size: 12px; color: #4b5563; line-height: 1.6; text-transform: uppercase;">
                <span style="font-weight: 600;">${house}</span>, ${place}, ${po},<br/>
                ${dist}, ${state} - <b>${pin}</b>
            </div>
        </div>
    `;
    $('#wiz-final-addr').html(prettyHtml);
    $('#wiz-deliver-box').fadeIn();
  }

  if (isQuick) checkForChanges();
}
// 🔥 Live Address Preview (Fix: Correctly splits Place & District)
$('#place').on('input keyup focus', function () {

  // 1. Create hidden divs if missing
  if ($('#display-po').length === 0) {
    $('<div id="display-po" style="display:none;"></div>').insertAfter('#place');
  }
  if ($('#display-dist-state').length === 0) {
    $('<div id="display-dist-state" style="display:none;"></div>').insertAfter('#place');
  }

  // 2. Fetch Data using old function
  try {
    if (typeof updateWizardLocDisplay === 'function') {
      updateWizardLocDisplay();
    }
  } catch (e) { }

  // 3. Update Preview
  updateLiveAddressPreview();
});

function updateLiveAddressPreview() {
  let poRaw = $('#display-po').text() || '';

  // 2. Data Cleaning
  let place = $('#place').val() || '';

  let po = poRaw.replace(/\s+PO\s*$/i, '').trim();
  if (po) po += ' PO';

  let dist = userData.district || '';
  let state = userData.state || $('#state').val() || 'KERALA';
  let pin = $('#pincode').val() || '';

  if (dist.toLowerCase() === place.toLowerCase()) {
    dist = '';
  }

  // 3. Language Check
  let lang = $('#language-select').val() || 'en';
  let t = translations[lang];

  // 🔥 Use Translation Key
  let warnText = t.warn_place_only;

  // 4. HTML Content
  let previewHtml = `
  <div class="text-danger fw-bold mb-2" style="margin-top: 5px; font-size:11px; letter-spacing:0.5px; border-bottom:1px dashed #e0e0e0; padding-bottom:8px;">
        <i class="fas fa-info-circle"></i> ${warnText}
    </div>
    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 15px; margin-top: 8px;">
        <div style="font-size: 13px; line-height: 1.6; color: #333;">
            <div style="font-weight: 700; text-transform: uppercase; color: #000;">${po}</div>
            
            <div style="text-transform: uppercase;">
                ${place ? place : ''}${place && dist ? ', ' : ''}
                <span style="text-transform: uppercase; font-weight:600;">${dist}</span>
            </div>

            <div style="text-transform: uppercase; font-size: 12px; color: #555; margin-top:2px;">
                ${state} - <span style="font-weight: 800; color: #000;">${pin}</span>
            </div>
        </div>
    </div>
    `;

  // 5. Update UI
  if ($('#live-addr-preview').length === 0) {
    $('<div id="live-addr-preview"></div>').insertAfter('#place');
  }
  $('#live-addr-preview').html(previewHtml);
}

setTimeout(updateLiveAddressPreview, 1000);

function checkForChanges() {
  // 1. Current Values
  var currQty = $('#quick-qty').val() || '';
  var currName = $('#edit-name').val() || '';
  var currPhone = $('#edit-phone').val() || '';
  var currWa = $('#edit-whatsapp').val() || '';
  var currHouse = $('#edit-house').val() || '';
  var currPlace = $('#edit-place').val() || '';
  var currPin = $('#edit-pincode').val() || '';
  var currAlt = $('#edit-altphone').val() || '';

  // 2. Saved Values
  var savedQty = (savedOrderData.quantity || '') + '';
  var savedName = (savedOrderData.name || '') + '';
  var savedPhone = (savedOrderData.phone || '') + '';
  var savedWa = (savedOrderData.whatsapp || savedOrderData.phone || '') + '';
  var savedHouse = (savedOrderData.house || '') + '';
  var savedPlace = (savedOrderData.place || '') + '';
  var savedPin = (savedOrderData.pincode || '') + '';
  var savedAlt = (savedOrderData.altphone || '') + '';

  // 3. Compare
  var isChanged = false;
  if (String(currQty) !== String(savedQty)) isChanged = true;
  if (String(currName).trim() !== String(savedName).trim()) isChanged = true;
  if (String(currPhone) !== String(savedPhone)) isChanged = true;
  if (String(currWa) !== String(savedWa)) isChanged = true;
  if (String(currHouse).trim().toUpperCase() !== String(savedHouse).trim().toUpperCase()) isChanged = true;
  if (String(currPlace).trim().toUpperCase() !== String(savedPlace).trim().toUpperCase()) isChanged = true;
  if (String(currPin) !== String(savedPin)) isChanged = true;
  if (String(currAlt) !== String(savedAlt)) isChanged = true;

  var btnUpdate = $('.btn-update-sage');
  var btnSave = $('#address-edit-box button');
  const lang = $('#language-select').val() || 'en';
  const t = translations[lang];

  btnUpdate.css({
    'white-space': 'normal',
    'line-height': '1.2',
    'padding': '8px',
    'height': 'auto',
    'min-height': '50px'
  });

  // 🔥 MODE CHECK
  const isNewOrderMode = (editingOrderId === null);

  if (isNewOrderMode) {
    // === NEW ORDER MODE (Always Enabled) ===
    btnUpdate.prop('disabled', false).css({
      'opacity': '1',
      'cursor': 'pointer',
      'background': '#15803d', // Dark Green
      'color': 'white',
      'box-shadow': '0 4px 6px rgba(0,0,0,0.1)'
    });

    btnSave.prop('disabled', false).text(t.txt_save_changes);

    if (currQty && currQty !== "0") {
      btnUpdate.html(`<span style="font-size:17px; font-weight:800; letter-spacing:0.5px;">${t.btn_order_now}</span>`);
    } else {
      let subText = t.lbl_select_qty_subtext || "(Select Quantity)";
      btnUpdate.html(`
              <span style="font-size:16px; font-weight:800; letter-spacing:0.5px;">${t.btn_order_now}</span>
              <span style="font-size:10px; opacity:0.85; font-weight:600; margin-top:2px;">${subText}</span>
          `);
    }

  } else {
    // === EDIT MODE (Old Logic) ===
    if (isChanged) {
      btnUpdate.prop('disabled', false).css({ 'opacity': '1', 'cursor': 'pointer', 'background': '#2563eb' }).text(t.btn_update);
      btnSave.prop('disabled', false).css({ 'opacity': '1', 'cursor': 'pointer' }).text(t.txt_save_changes);
    } else {
      btnUpdate.prop('disabled', true).css({ 'opacity': '0.5', 'cursor': 'not-allowed', 'background': '#6b7280' }).text(t.txt_no_changes);
      btnSave.prop('disabled', true).css({ 'opacity': '0.5', 'cursor': 'not-allowed' }).text(t.txt_no_changes);
    }
  }
}

function toggleAddressEdit() { $('.address-box').slideToggle(); }
function selectEditPO(val) { $('#edit-postoffice').val(val); updateSummaryDisplay(); }

function setupAdminView(oid) {
  const adminUI = `<div id="admin-action-bar" style="display:none; position: fixed; bottom: 0; left: 0; width: 100%; background: white; padding: 15px; z-index: 12000; border-top: 1px solid #ddd; box-shadow: 0 -4px 20px rgba(0,0,0,0.15);"><div class="container p-0 d-flex justify-content-between align-items-center"><div id="admin-btn-container" style="flex-grow:1; margin-right:15px;"></div><button onclick="window.location.href='admin.html?search=${oid}'" class="btn btn-light rounded-circle shadow-sm" style="width:45px; height:45px; border:1px solid #eee; display:flex; align-items:center; justify-content:center;"><i class="fas fa-times text-danger" style="font-size:20px;"></i></button></div></div>`;
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

  let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
  let hasPending = updates.some(u => u.oid === oid);

  // Sync Button HTML (Blue Cloud Icon)
  let syncColor = hasPending ? "btn-info text-white" : "btn-light text-muted border";
  let syncBtn = `<button onclick="syncSingleOrder('${oid}')" class="btn ${syncColor} btn-sm shadow-sm ms-1" style="width:45px;" title="Sync to Server"><i class="fas fa-cloud-upload-alt"></i></button>`;

  let btnHTML = '';

  if (status === 'Archive') {
    btnHTML = `<div class="d-flex w-100"><button onclick="adminAction('${oid}', 'Paid')" class="btn btn-dark btn-sm fw-bold flex-grow-1 shadow-sm" style="background:#444; border:none;">📂 (Archived) TO PAID</button>${syncBtn}</div>`;
  } else if (status === 'Pending') {
    btnHTML = `<div class="d-flex gap-2 w-100">
                 <button onclick="adminAction('${oid}', 'Sent')" class="btn btn-primary btn-sm fw-bold flex-grow-1 shadow-sm">💬 MARK SENT</button>
                 ${syncBtn}
                 <button onclick="adminAction('${oid}', 'Archive')" class="btn btn-outline-secondary btn-sm" style="width:40px;"><i class="fas fa-archive"></i></button>
               </div>`;
  } else if (status === 'Sent') {
    btnHTML = `<div class="d-flex gap-2 w-100">
                 <button onclick="adminAction('${oid}', 'Paid')" class="btn btn-warning btn-sm fw-bold flex-grow-1 shadow-sm text-dark">💰 MARK PAID</button>
                 ${syncBtn}
                 <button onclick="adminAction('${oid}', 'Archive')" class="btn btn-outline-secondary btn-sm" style="width:40px;"><i class="fas fa-archive"></i></button>
               </div>`;
  } else if (status === 'Delivered') {
    btnHTML = `<div class="d-flex w-100"><button class="btn btn-success btn-sm fw-bold flex-grow-1 shadow-sm" disabled>DELIVERED ✅</button>${syncBtn}</div>`;
  } else {
    let displayTxt = status === 'Dispatched' ? 'DISPATCHED' : (status === 'Completed' ? 'COMPLETED' : status.toUpperCase());
    btnHTML = `<div class="d-flex w-100"><button class="btn btn-secondary btn-sm fw-bold flex-grow-1 shadow-sm" disabled>${displayTxt} ✅</button>${syncBtn}</div>`;
  }

  $('#admin-btn-container').html(btnHTML);
  $('#admin-action-bar').slideDown();
}

window.adminAction = async function (oid, status) {
  // 1. ARCHIVE: Direct Server Call (No Change)
  if (status === 'Archive') {
    if (!confirm(`Move this order to Archive? (Updates Server Directly)`)) return;

    const btnContainer = $('#admin-btn-container');
    const originalContent = btnContainer.html();
    btnContainer.html('<div class="text-center py-2"><i class="fas fa-spinner fa-spin text-primary"></i> Archiving...</div>');

    fetch(sc, {
      method: 'POST',
      body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: oid, status: status }] })
    })
      .then(res => res.json())
      .then(data => {
        if (data.result === 'success') {
          let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
          updates = updates.filter(item => item.oid !== oid);
          localStorage.setItem('pendingUpdates', JSON.stringify(updates));

          Swal.fire({ icon: 'success', title: 'Archived!', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
          updateAdminUI(status, oid);
        } else {
          alert("Failed to Archive!");
          btnContainer.html(originalContent);
        }
      })
      .catch(err => {
        alert("Network Error");
        btnContainer.html(originalContent);
      });
    return;
  }

  let selectedDate = null;

  // 2. 🔥 PAID: Show Beautiful Flatpickr Date & Time Picker
  if (status === 'Paid') {
    const { value: dateVal } = await Swal.fire({
      title: 'Mark as PAID',
      html: `
            <div style="text-align:center;">
                <label style="font-size:12px; color:#666; font-weight:700; margin-bottom:5px; display:block;">SELECT PAYMENT TIME</label>
                <input type="text" id="flatpickr-paid" class="form-control text-center fw-bold" 
                       style="font-size:18px; padding:10px; border:2px solid #eee; border-radius:12px;" 
                       placeholder="Select Date...">
            </div>
          `,
      showCancelButton: true,
      confirmButtonText: 'Save Paid',
      confirmButtonColor: '#28a745',
      focusConfirm: false,
      didOpen: () => {
        // 🔥 Initialize Flatpickr (Material Style)
        flatpickr("#flatpickr-paid", {
          enableTime: true,
          dateFormat: "Y-m-d H:i",
          defaultDate: new Date(),
          theme: "material_blue",
          time_24hr: false,
          disableMobile: false
        });
      },
      preConfirm: () => {
        return document.getElementById('flatpickr-paid').value;
      }
    });

    if (!dateVal) return;
    selectedDate = dateVal;
  }
  else {
    // 3. OTHERS (Sent, Dispatched, etc.)
    if (!confirm(`Mark as '${status}'? (Saved Locally)`)) return;

    if (status === 'Dispatched') {
      const now = new Date();
      // YYYY-MM-DD HH:MM format logic
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      selectedDate = `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }
  // 🔥🔥🔥 CHANGE STARTS HERE (REFUND LOGIC) 🔥🔥🔥

  let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
  updates = updates.filter(item => item.oid !== oid);

  let oldStatus = 'Pending';
  if (typeof userData !== 'undefined' && userData.orderid === oid) {
    oldStatus = userData.Status || 'Pending';
  } else {
    let cached = JSON.parse(localStorage.getItem('allOrdersCache') || "[]");
    let found = cached.find(o => o.orderid === oid);
    if (found) oldStatus = found.Status;
  }

  let needsRefundDelete = false;
  if (String(oldStatus).trim().toLowerCase() === 'refunded' && status !== 'Refunded') {
    needsRefundDelete = true;
    console.log("Refund deletion queued for sync...");
  }

  // 3. Save to Local Storage with Flag
  updates.push({
    oid: oid,
    status: status,
    oldStatus: oldStatus,
    actionDate: selectedDate,
    time: new Date().getTime(),
    deleteRefund: needsRefundDelete
  });

  localStorage.setItem('pendingUpdates', JSON.stringify(updates));

  Swal.fire({ icon: 'success', title: `Saved: ${status}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
  updateAdminUI(status, oid);
}

window.syncSingleOrder = function (oid) {
  // 1. Check for Pending Updates Locally
  let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
  let myUpdate = updates.find(u => u.oid === oid);

  if (!myUpdate) {
    Swal.fire({ icon: 'info', title: 'Already Synced', text: 'No pending local changes.', timer: 1500, showConfirmButton: false, toast: true, position: 'top' });
    if (typeof userData !== 'undefined') updateAdminUI(userData.Status, oid);
    return;
  }

  // 2. Show Loading
  const btn = $('#admin-btn-container button').find('.fa-cloud-upload-alt').parent();
  let originalHtml = btn.html();
  btn.html('<i class="fas fa-spinner fa-spin"></i>').prop('disabled', true);

  let promises = [];

  if (myUpdate.deleteRefund) {
    promises.push(fetch(sc, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteRefund', oid: oid })
    }));
  }

  promises.push(fetch(sc, {
    method: 'POST',
    body: JSON.stringify({ action: 'bulkUpdateStatus', updates: [myUpdate] })
  }));

  // 🔥 4. EXECUTE BOTH
  Promise.all(promises)
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(dataList => {

      if (dataList.some(d => d.result === 'success')) {

        // Remove from Local
        let newUpdates = updates.filter(u => u.oid !== oid);
        localStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));

        // Show Success
        Swal.fire({ icon: 'success', title: 'Synced Successfully! ☁️', toast: true, position: 'top', showConfirmButton: false, timer: 2000 });

        // Update UI Button (Blue -> Grey)
        updateAdminUI(myUpdate.status, oid);
      } else {
        alert("Sync Failed: Server Error");
        btn.html(originalHtml).prop('disabled', false);
      }
    })
    .catch(err => {
      alert("Network Error. Try again.");
      btn.html(originalHtml).prop('disabled', false);
    });
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
                <div class="content-group"><img src="images/kafak_logo.png" alt="Kafak"><div class="packed-text" data-i18n="lbl_reserved_for">RESERVED FOR</div></div>
                <div class="check-wrapper" id="finalCheck"><svg class="checkmark-svg" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"></path></svg></div>
            </div>
            <div class="name-wrapper" id="nameBadge"><div class="user-name" id="vid-username"></div></div>
        </div>
        <div class="loading-txt" data-i18n="lbl_preparing">PREPARING YOUR ORDER...</div>
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


// 2. Updated fetchCourierRates Function
// 🔥 UPDATED: FETCH RATES (Fixes Disappearing Price Table)

function fetchCourierRates() {
  const lang = $('#language-select').val() || 'en';
  const t = translations[lang] || translations['en'];
  const loadingTxt = t.loading || "Loading Options...";
  let currentSelection = $('#quick-qty').val();
  $('#quantity, #quick-qty').html(`<option value="">${loadingTxt}</option>`);

  // 1. CACHE CHECK
  let cachedRates = SafeStorage.getItem('cachedRates');
  let cacheValid = false;
  if (cachedRates) {
    try {
      let parsed = JSON.parse(cachedRates);
      // 🔥 FIX: 'KERALA' (UpperCase) ആണ് ഇപ്പോൾ കീ
      if (parsed && parsed.KERALA) {
        courierRates = parsed;
        globalQtyList = Object.keys(parsed.KERALA).map(Number).sort((a, b) => a - b);
        renderQtyDropdowns();
        cacheValid = true;
      }
    } catch (e) { }
  }

  // 2. SERVER FETCH
  const serverFetch = fetch(`${sc}?action=getRates`)
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success' && data.rates) {
        courierRates = data.rates;
        if (data.adminPhone) adminPhone = String(data.adminPhone);

        // 🔥 FIX: 'KERALA' കീ ഉപയോഗിക്കുന്നു
        if (data.rates.KERALA) {
          globalQtyList = Object.keys(data.rates.KERALA).map(Number).sort((a, b) => a - b);
        }

        SafeStorage.setItem('cachedRates', JSON.stringify(data.rates));

        let restoreQty = currentSelection;
        if (!restoreQty && typeof savedOrderData !== 'undefined' && savedOrderData.quantity) {
          restoreQty = savedOrderData.quantity;
        }
        renderQtyDropdowns();
        if (restoreQty) {
          $('#quick-qty').val(restoreQty);
          updatePrice(restoreQty, true);
        }
        return true;
      }
      return false;
    }).catch(err => false);

  if (cacheValid) { serverFetch; return Promise.resolve(true); } else { return serverFetch; }
}

function renderQtyDropdowns() {
  if (!globalQtyList || globalQtyList.length === 0) return;
  const lang = $('#language-select').val() || 'en';
  const t = translations[lang] || translations['en'];
  let optionsHTML = `<option value="" disabled selected>${t.dd_select || "Select Quantity"}</option>`;

  globalQtyList.forEach(qty => {
    const totalGrams = qty * 650;
    let weightText;
    if (totalGrams >= 1000) { weightText = (totalGrams / 1000).toFixed(2) + " " + (t.txt_kg || "kg"); } else { weightText = totalGrams + (t.txt_g || "g"); }
    let bottleLabel = (qty === 1) ? (t.txt_bottle || "Bottle") : (t.txt_bottles || "Bottles");
    let label = `${qty} ${bottleLabel} (${weightText})`;
    optionsHTML += `<option value="${qty}">${label}</option>`;
  });

  $('#quantity').html(optionsHTML);
  $('#quick-qty').html(optionsHTML);

  // 🔥 FIX: Pre-fill only for Edit Mode (Pending/Sent/Paid/Archive)
  if (editingOrderId && typeof savedOrderData !== 'undefined' && savedOrderData.quantity) {
    $('#quick-qty').val(savedOrderData.quantity);

    if (!$('#quick-qty').val()) {
      let oldQty = savedOrderData.quantity;
      $('#quick-qty').append(`<option value="${oldQty}" selected>${oldQty} Bottles (Old Order)</option>`);
    }
    updatePrice($('#quick-qty').val(), true);
  }

  if (typeof savedOrderData !== 'undefined' && savedOrderData.Status) {
    let s = String(savedOrderData.Status).trim().toLowerCase();
    if (s === 'paid') {
      let currentQty = parseInt(savedOrderData.quantity) || 0;
      $('#quick-qty option').each(function () { if (parseInt($(this).val()) < currentQty) $(this).prop('disabled', true); });
    }
  }
}


// ==========================================
// 🔥 NEW SYNC WINDOW LOGIC (FOR EDIT VIEW)
// ==========================================

let activeSyncOid = null; // To store current OID

// 1. OPEN SYNC MODAL (Replaces old syncSingleOrder)


// 2. RENDER ITEM IN MODAL
function renderSingleSyncItem(u) {
  const list = document.getElementById('single-sync-list');
  list.innerHTML = '';

  // Determine Values
  let fromStatus = u.oldStatus || "Pending";
  let toStatus = u.status;
  let extraInfo = "";

  // Badge Colors
  let getBadgeColor = (s) => {
    if (s === 'Paid') return 'success';
    if (s === 'Dispatched') return 'primary';
    if (s === 'Sent') return 'info text-dark';
    if (s === 'Archive') return 'dark';
    return 'secondary';
  };

  // Special Display for Dispatched Date
  if (toStatus === 'Dispatched' && u.actionDate) {
    let d = new Date(u.actionDate);
    // Format: 06/02/2026 12:00 PM
    let dateStr = d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    extraInfo = `<div class="mt-2 small text-success fw-bold p-2 bg-white rounded border border-success border-opacity-25"><i class="far fa-calendar-alt me-1"></i> Dispatched Date: ${dateStr}</div>`;
  }

  // HTML Structure
  let html = `
    <div class="d-flex align-items-center justify-content-between">
        <div>
            <div class="fw-bold text-dark mb-1" style="font-size:14px;">${u.oid}</div>
            
            <div style="font-size:13px; color:#555;">
                <span class="badge bg-light text-secondary border">${fromStatus}</span> 
                <i class="fas fa-long-arrow-alt-right mx-1 text-muted"></i> 
                <span class="badge bg-${getBadgeColor(toStatus)}">${toStatus}</span>
            </div>
            
            ${extraInfo}
        </div>
        
        <button onclick="discardSingleChanges()" class="btn btn-sm btn-outline-danger border-0 bg-white shadow-sm" style="width:35px; height:35px; border-radius:50%;" title="Undo">
            <i class="fas fa-undo"></i>
        </button>
    </div>`;

  list.innerHTML = html;
}

// 3. UPLOAD NOW (Perform Sync)
window.performSingleSync = function () {
  if (!activeSyncOid) return;

  let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
  let myUpdate = updates.find(u => u.oid === activeSyncOid);

  if (!myUpdate) return;

  // UI Loading
  const btn = $('#singleSyncModal .btn-dark');
  let originalHtml = btn.html();
  btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> UPLOADING...');

  fetch(sc, {
    method: 'POST',
    body: JSON.stringify({ action: 'bulkUpdateStatus', updates: [myUpdate] })
  })
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success') {
        // Remove from Local
        let newUpdates = updates.filter(u => u.oid !== activeSyncOid);
        localStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));

        // Close Modal & Show Success
        $('#singleSyncModal').modal('hide');
        Swal.fire({ icon: 'success', title: 'Synced Successfully!', toast: true, position: 'top', showConfirmButton: false, timer: 2000 });

        // Update UI Button (Blue -> Grey)
        updateAdminUI(myUpdate.status, activeSyncOid);
      } else {
        alert("Sync Failed!");
      }
    })
    .catch(err => alert("Network Error"))
    .finally(() => {
      btn.prop('disabled', false).html(originalHtml);
    });
}

// 4. DISCARD / UNDO
window.discardSingleChanges = function () {
  if (!activeSyncOid) return;

  if (!confirm("Discard these changes?")) return;

  let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
  let myUpdate = updates.find(u => u.oid === activeSyncOid);
  let oldStatus = myUpdate ? (myUpdate.oldStatus || "Pending") : "Pending";

  // Remove from Local
  let newUpdates = updates.filter(u => u.oid !== activeSyncOid);
  localStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));

  // Close Modal
  $('#singleSyncModal').modal('hide');

  // 🔥 Revert UI immediately to Old Status
  // We update the UI to reflect the state BEFORE the change
  updateAdminUI(oldStatus, activeSyncOid);

  // Optional: Reload data from cache to be safe
  let cachedOrders = JSON.parse(localStorage.getItem('allOrdersCache') || "[]");
  let cachedOrder = cachedOrders.find(o => o.orderid === activeSyncOid);
  if (cachedOrder) {
    // Revert cache object status if needed, or just rely on server data next refresh
    // For visual feedback, updateAdminUI is enough
  }

  showToast('info', 'Changes Discarded');
}

// Helper Toast (if not already exists)
function showToast(icon, title) {
  Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: icon, title: title });
}

function sendToWhatsapp() {
  const d = successData;
  const safe = (val) => String(val || '').trim().toUpperCase();
  const adminPhone = '7788990313'; // Admin Phone Number

  // 1. Language & Translations
  const lang = $('#language-select').val() || 'en';
  const t = translations[lang] || translations['en'];

  const editText = t.wa_check_status;

  // 🔥 FIX: Date Logic
  let dateObj = new Date();
  if (d.timestamp) {
    let serverDate = new Date(d.timestamp);
    if (!isNaN(serverDate.getTime())) {
      dateObj = serverDate;
    }
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  let hours = dateObj.getHours();
  let minutes = String(dateObj.getMinutes()).padStart(2, '0');
  let ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;

  const formattedTime = `${day}/${month}/${year}, ${timeStr}`;

  // 3. Check Updates
  let isUpdate = false;
  let changes = [];

  if (typeof savedOrderData !== 'undefined' && savedOrderData.orderid == d.orderid) {
    isUpdate = true;

    if (safe(savedOrderData.name) !== safe(d.name))
      changes.push(`👤 NAME: ${savedOrderData.name} ➡️ *${d.name}*`);
    if (String(savedOrderData.quantity) !== String(d.quantity))
      changes.push(`📦 QTY: ${savedOrderData.quantity} ➡️ *${d.quantity}*`);
    if (String(savedOrderData.phone) !== String(d.phone))
      changes.push(`📞 PHONE: ${savedOrderData.phone} ➡️ *${d.phone}*`);

    const oldAlt = String(savedOrderData.altphone || '').trim();
    const newAlt = String(d.altphone || '').trim();
    if (oldAlt !== newAlt) changes.push(`📞 ALT PH: ${oldAlt || 'None'} ➡️ *${newAlt}*`);

    const oldWa = String(savedOrderData.whatsapp || '').trim();
    const newWa = String(d.whatsapp || '').trim();
    if (oldWa !== newWa) changes.push(`💬 WA: ${oldWa} ➡️ *${newWa}*`);

    if (safe(savedOrderData.house) !== safe(d.house)) changes.push(`🏠 HOUSE: *${safe(d.house)}*`);
    if (safe(savedOrderData.place) !== safe(d.place)) changes.push(`📍 PLACE: *${safe(d.place)}*`);
    if (safe(savedOrderData.postoffice) !== safe(d.postoffice)) changes.push(`📮 PO: *${safe(d.postoffice)}*`);
    if (String(savedOrderData.pincode) !== String(d.pincode)) changes.push(`🔢 PIN: *${d.pincode}*`);
    if (safe(savedOrderData.state) !== safe(d.state)) changes.push(`🌍 STATE: *${safe(d.state)}*`);
  }

  // 4. Calculate Total
  const n = parseInt(d.quantity);
  const base = n * 650;
  const zone = getZoneKey(d.state);
  const courier = (courierRates[zone] && courierRates[zone][n]) ? courierRates[zone][n] : 0;
  const total = base + courier;

  // 5. Generate Message Header
  const editLink = `https://kafaklife.com/order.html?oid=${d.orderid}`;
  let header = "";

  if (isUpdate) {
    header = `*${t.wa_header_update}*\n⌚ _${formattedTime}_\n\n${editText}\n🔗 _${editLink}_\n`;

    if (changes.length > 0) {
      header += `\n*🔥 WHAT CHANGED:* \n${changes.join('\n')}\n`;
    } else {
      header += `\n(Updated details confirmed)\n`;
    }
    header += `\n*👇 CURRENT DETAILS:*`;
  } else {
    header = `*${t.wa_header_new}*\n⌚ _${formattedTime}_\n\n${editText}\n🔗 _${editLink}_\n`;
  }

  let altPhoneDisplay = d.altphone ? `\n*Alt Ph: ${d.altphone}*` : '';

  const details = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${d.pincode}*\n*Ph: ${d.phone}*${altPhoneDisplay}\n\n*Qty: ${d.quantity}*\n*Amount: ₹${base} + ${courier}*\n*Total: ₹${total}/-*\n____________________________________`;

  // 🔥 NEW: Payment Screenshot Request (Language based)
  let paymentNote = "";
  if (lang === 'en') {
    paymentNote = "\n\n👉 Please send the screenshot after GPay.. 📸\n_(Packing starts only after receiving the screenshot)_";
  } else {
    paymentNote = "\n\nGpay ചെയ്തശേഷം സ്ക്രീൻഷോട്ട് അയക്കൂ.. 📸\n_(സ്ക്രീൻഷോട്ട് ലഭിച്ച ശേഷമാണ് പാക്കിംഗ് നടപടികൾ ആരംഭിക്കുക)_";
  }

  const footer = `\n\n*${t.txt_gpay}: ${adminPhone} (KAFAK LLP)*${paymentNote}`;

  // WhatsApp Link Opening
  window.location.href = `https://wa.me/91${adminPhone}?text=${encodeURIComponent(header + details + footer)}`;
}


function renderEditView(data) {
  const status = String(data.Status || 'pending').toLowerCase();

  // 🔥 CASE 1:
  // (Completed, Delivered, Refunded)
  if (['completed', 'delivered', 'refunded'].includes(status)) {
    showReturningUserView(data, false, true);
    enableNewOrderMode();
    return;
  }

  // 🔥 CASE 2: (Pending, Paid, Dispatched, Sent)
  // Dispatched
  const isActive = !(['dispatched'].includes(status));

  showReturningUserView(data, isActive, true);
  updateEditUIState(data);
}


function updateEditUIState(data) {

  updateStatusUI(data);

  handleEditControlsVisibility(data);

  if (data.quantity) {
    $('#quick-qty').val(data.quantity);
    updatePrice(data.quantity, true);
  }
}
