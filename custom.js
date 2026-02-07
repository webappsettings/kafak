// ------------------------------------------------------------------------------
// 🔴 CONFIGURATION & GLOBALS
// ------------------------------------------------------------------------------
const sc = `https://script.google.com/macros/s/AKfycbzILxz8-v4S0D1kVSr6hryIKxmzKBAOU0-d4QytfV2CW9dn3Hw7wGhJCDH46wY2krucNA/exec`;

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

const STORAGE_KEY = 'kafakCustomerData';

const SafeStorage = {
  getItem: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  setItem: function (key, val) { try { localStorage.setItem(key, val); } catch (e) { } },
  removeItem: function (key) { try { localStorage.removeItem(key); } catch (e) { } }
};

// --- NEW LOADER LOGIC WITH COUNTER ---
let loaderInterval;

window.showLoader = function (show) {
  const lang = $('.form-select').val() || 'en';
  if (translations && translations[lang]) {
    $('#loader-text').text(translations[lang].loading || "LOADING...");
  }

  if (show) {
    $('#full-loader').fadeIn(200);

    // Reset & Start Counter
    let percent = 0;
    $('#loader-percent').text('0%');
    clearInterval(loaderInterval);

    // Count up to 95% naturally
    loaderInterval = setInterval(() => {
      if (percent < 95) {
        percent++;
        $('#loader-percent').text(percent + '%');
      }
    }, 30); // Speed of counting

  } else {
    // Finish to 100% and hide
    clearInterval(loaderInterval);
    $('#loader-percent').text('100%');
    setTimeout(() => {
      $('#full-loader').fadeOut(300);
    }, 200); // Small delay to see 100%
  }
}

// LANGUAGE CHANGER FUNCTION
window.changeLanguage = function (lang) {
  const t = translations[lang];
  if (!t) return;

  // Update Text Content
  $('[data-i18n]').each(function () {
    const key = $(this).attr('data-i18n');
    if (t[key]) {
      $(this).text(t[key]);
    }
  });

  // Update Placeholders (Inputs)
  $('#phone').attr('placeholder', t.ph_phone);
  $('#name').attr('placeholder', t.ph_name);
  $('#house').attr('placeholder', t.ph_house);
  $('#whatsapp').attr('placeholder', t.lbl_whatsapp); // or specific placeholder key
  $('#altphone').attr('placeholder', t.lbl_altphone);
  checkForChanges();
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

function getZoneKey(stateName) {
  if (!stateName) return 'north'; // Default
  let s = stateName.toUpperCase().trim();

  if (s === 'KERALA') return 'kerala';
  if (s === 'TAMIL NADU') return 'tn';
  if (s === 'KARNATAKA') return 'ka';
  if (s === 'ANDHRA PRADESH') return 'ap';
  if (s === 'TELANGANA') return 'ts';
  if (s === 'LAKSHADWEEP') return 'lakshadweep';

  return 'north'; // All other states
}

$(document).ready(function () {

  const savedLang = localStorage.getItem('activeLang');
  if (savedLang) {
    // ഡ്രോപ്പ്ഡൗണിൽ വാല്യൂ സെറ്റ് ചെയ്യുന്നു
    $('.form-select').val(savedLang);
    // ഭാഷ മാറ്റുന്നു
    changeLanguage(savedLang);
  } else {
    // Default English
    changeLanguage('en');
  }

  fetchCourierRates();
  injectVideoCSS();

  const urlParams = new URLSearchParams(window.location.search);
  const autoPhone = urlParams.get('phone'); // Link-ൽ phone= ഉണ്ടോ എന്ന് നോക്കുന്നു

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

  // const qtyOpts = `<option value="1">1 Bottle (650g)</option><option value="2">2 Bottles (1.30 kg)</option><option value="3">3 Bottles (1.95 kg)</option><option value="4">4 Bottles (2.60 kg)</option><option value="5">5 Bottles (3.25 kg)</option><option value="6">6 Bottles (3.90 kg)</option><option value="8">8 Bottles (5.20 kg)</option><option value="10">10 Bottles (6.50 kg)</option>`;
  // $('#quantity').append(qtyOpts);
  // $('#quick-qty').append(qtyOpts);

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
    loadOrderData(localUsersMap[phone], false);
    syncUserDataBackground(phone);
    return;
  }

  editingOrderId = null;
  $('#step-0').hide();
  $('#whatsapp').val(phone);
  startWizard();
  backgroundUserCheck(phone);
  $('#top-progress-container').fadeIn();
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
        if (['dispatched', 'completed', 'delivered'].includes(s)) {
          editingOrderId = null;
          $('#display-oid').hide();
        }

        userData = mergedData;
        savedOrderData = JSON.parse(JSON.stringify(mergedData));

        saveToLocal(phone, mergedData);

        // 🔥 മാറ്റം 2: Paid സ്റ്റാറ്റസ് 'Active' ആയി കണക്കാക്കുന്നു
        let isActive = !(['dispatched', 'completed', 'delivered'].includes(s));
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
    custId: myCustId,
    language: $('#language-select').val() || 'en'
  };
  saveToLocal(finalData.phone, finalData);
  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

window.handleEditPincode = async function (val) {
  // 6 അക്കം തികഞ്ഞില്ലെങ്കിൽ എല്ലാം ഹൈഡ് ചെയ്യുക
  if (!/^[0-9]{6}$/.test(val)) {
    $('#edit-po-wrapper').slideUp();
    $('#single-po-display').hide();
    return;
  }

  checkForChanges(); // ബട്ടൺ ചെക്ക് ചെയ്യുന്നു

  try {
    const res = await fetch(`pincode_json_files/${val}.json`);
    if (!res.ok) throw new Error("Not Found");

    let data = await res.json();

    // പേര് ഫോർമാറ്റ് ചെയ്യുന്നു
    data = data.map(item => ({ ...item, officename: item.officename.replace(/\s*[\(\-\s]?(P|B|S|H)[\.\s]?O\.?[\)]?\s*$/i, ' PO') }));

    if (data && data.length > 0) {
      // District & State Auto-fill
      $('#edit-district').val(data[0].district);
      $('#edit-state').val(data[0].statename);
      updatePrice($('#quick-qty').val(), true);

      if (data.length > 1) {
        // === MULTIPLE POST OFFICES ===
        $('#single-po-display').hide(); // ടെക്സ്റ്റ് ഹൈഡ് ചെയ്യുന്നു

        const sel = $('#edit-postoffice-select');
        sel.empty().append('<option value="">Select Post Office...</option>');

        data.forEach(p => {
          sel.append(`<option value="${p.officename}">${p.officename}</option>`);
        });

        $('#edit-po-wrapper').slideDown(); // ഡ്രോപ്പ്ഡൗൺ കാണിക്കുന്നു
        $('#edit-postoffice').val(''); // വാല്യൂ ക്ലിയർ ചെയ്യുന്നു (സെലക്ട് ചെയ്യാൻ)

      } else {
        // === SINGLE POST OFFICE ===
        $('#edit-po-wrapper').slideUp(); // ഡ്രോപ്പ്ഡൗൺ ഹൈഡ് ചെയ്യുന്നു

        const poName = data[0].officename;
        $('#edit-postoffice').val(poName); // നേരിട്ട് സെറ്റ് ചെയ്യുന്നു

        // താഴെ ചെറിയ ടെക്സ്റ്റ് ആയി കാണിക്കുന്നു
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
      data = data.map(item => ({ ...item, officename: item.officename.replace(/\s*[\(\-\s]?(P|B|S|H)[\.\s]?O\.?[\)]?\s*$/i, ' PO') }));
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
  // 1. Check if button is disabled
  if ($('.btn-update-sage').prop('disabled')) return;

  // 2. Basic Validation (Qty, Phone, Pin)
  if (!$('#quick-qty').val()) { showAlert(getAlert('err_qty')); return; }

  const newPhone = $('#edit-phone').val();
  if (!newPhone || newPhone.length !== 10) { showAlert(getAlert('err_phone')); return; }

  const pin = $('#edit-pincode').val();
  if (!pin || pin.length !== 6) { showAlert(getAlert('err_pincode')); return; }

  // 🔥 3. Post Office Validation
  let finalPO = $('#edit-postoffice').val();

  // ഡ്രോപ്പ്ഡൗൺ ബോക്സ് കാണുന്നുണ്ടെങ്കിൽ, അതിലെ വാല്യൂ ആണ് എടുക്കുന്നത്
  if ($('#edit-postoffice-select').is(':visible')) {
    finalPO = $('#edit-postoffice-select').val();
  }

  // വാല്യൂ ഇല്ലെങ്കിൽ Alert കാണിക്കും, എഡിറ്റ് ബോക്സ് തുറക്കും
  if (!finalPO) {
    showAlert(getAlert('err_select_po') || "Please Select Post Office");
    if ($('#address-edit-box').is(':hidden')) toggleAddressEdit();
    return; // ഇവിടെ വെച്ച് തടയുന്നു
  }

  $('#edit-postoffice').val(finalPO); // Hidden input update

  // 4. Prepare Data Object
  const finalData = {
    orderid: editingOrderId,
    name: $('#saved-name').text(),
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

  // 5. Play Video & Then Submit
  // വീഡിയോ കാണിച്ച ശേഷം postOrder ഫംഗ്‌ഷൻ വിളിക്കുന്നു
  playVideoAnimation(finalData.name, () => postOrder(finalData));
}

function showReturningUserView(d, isActiveOrder, isServerData) {
  $('#returning-user-view').show();
  updateFooterButtons('returning'); isEditMode = isActiveOrder;

  if (d.language) {
    // 1. ഡ്രോപ്പ്ഡൗണിൽ വാല്യൂ സെറ്റ് ചെയ്യുന്നു
    $('#language-select').val(d.language);

    // 2. ഭാഷ മാറ്റുന്ന ഫംഗ്‌ഷൻ വിളിക്കുന്നു (UI ടെക്സ്റ്റ് മാറാൻ)
    changeLanguage(d.language);
  }
  // 1. Order ID & Date
  if (d.orderid) $('#display-oid').text('#' + d.orderid).show(); else $('#display-oid').hide();
  if (d.date) {
    if ($('#display-date').length === 0) {
      $('<div id="display-date" class="text-muted fw-bold small mt-1" style="font-size:10px;"></div>').insertAfter('#display-oid');
    }
    $('#display-date').text(formatPrettyDate(d.date)).show();
  } else { $('#display-date').hide(); }

  // 2. Populate User Data
  $('#saved-name').text(d.name); $('#edit-phone').val(d.phone); $('#edit-house').val(d.house);
  $('#edit-place').val(d.place); $('#edit-pincode').val(d.pincode); $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district); $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone); $('#edit-altphone').val(d.altphone || '');

  savedOrderData = JSON.parse(JSON.stringify(d));
  updateSummaryDisplay();
  $('#status-area').empty();

  // 3. Check Status
  const status = String(d.Status || '').trim().toLowerCase();
  const isPaid = status === 'paid';

  // 'paid' സ്റ്റാറ്റസിനെ ഇവിടെ നിന്ന് ഒഴിവാക്കി (അപ്പോൾ താഴെ Show Mode-ൽ വരും)
  const hideControls = ['dispatched', 'completed', 'delivered'].includes(status);

  if (hideControls) {
    // === HIDE MODE (Dispatched, Delivered...) ===
    $('label[data-i18n="lbl_qty"]').hide();
    $('.qty-action-row').hide();
    $('#quick-price-box').hide();
    $('#btn-edit-addr').hide();

    if (['completed', 'delivered'].includes(status)) {
      if ($('#btn-new-order-mode').length === 0) {
        const btnText = "PLACE NEW ORDER";
        $(`<div id="btn-new-order-mode" class="mt-2 mb-3 text-center fade-in"><button onclick="enableNewOrderMode()" class="btn btn-dark shadow-sm rounded-pill px-4 py-2" style="font-weight:700; width:100%;"><i class="fas fa-plus-circle me-1"></i> ${btnText}</button></div>`).insertAfter('#status-area');
      }
      $('#btn-new-order-mode').show();
    } else {
      $('#btn-new-order-mode').hide();
    }

  } else {
    // === SHOW MODE (Pending, Sent, Paid) ===
    $('label[data-i18n="lbl_qty"]').show();
    $('.qty-action-row').css('display', 'flex');
    $('#quick-price-box').show();
    $('#btn-new-order-mode').hide();

    // Unlock Quantity Dropdown
    $('#quick-qty').prop('disabled', false);
    $('#quick-qty option').prop('disabled', false); // Reset options first

    if (isPaid) {
      // 🔥 PAID MODE LOGIC:
      // 1. Address Edit ബട്ടൺ ഹൈഡ് ചെയ്യുന്നു (Optional - അഡ്രസ്സ് മാറ്റാതിരിക്കാൻ)
      $('#btn-edit-addr').hide();

      // 2. നിലവിലുള്ള ക്വാണ്ടിറ്റിയേക്കാൾ കുറഞ്ഞത് ഡിസേബിൾ ചെയ്യുന്നു
      let currentQty = parseInt(d.quantity) || 0;
      $('#quick-qty option').each(function () {
        if (parseInt($(this).val()) < currentQty) {
          $(this).prop('disabled', true);
        }
      });
    } else {
      // Pending/Sent: അഡ്രസ്സ് മാറ്റാൻ അനുവദിക്കുന്നു
      $('#btn-edit-addr').css('display', 'inline-block');
    }

    // Set Quantity Value
    if (isActiveOrder || isPaid) {
      $('#quick-qty').val(d.quantity).trigger('change');
    } else {
      $('#quick-qty').val('').trigger('change');
    }
  }

  // 4. Status Loading or Timeline
  if (isServerData) {
    updateStatusUI(d);
    // Refresh Button only after sync
    if ($('#refresh-btn').length === 0) {
      $('#returning-user-view').append(`
              <div class="d-flex justify-content-center mt-4 mb-3 fade-in">
                  <button id="refresh-btn" onclick="manualRefresh()" class="btn btn-sm bg-white shadow-sm rounded-pill text-muted border px-3 py-2" style="font-weight: 600; font-size: 11px;">
                      <i class="fas fa-sync-alt me-1"></i> <span>REFRESH STATUS</span>
                  </button>
              </div>
          `);
    }
  } else {
    // 🔥 ലോക്കൽ ഡാറ്റ കാണിക്കുമ്പോൾ താഴെ ലോഡിംഗ് കാണിക്കുന്നു
    $('#status-area').html(`
          <div class="d-flex flex-column align-items-center justify-content-center py-5">
              <div class="spinner-border text-secondary" role="status" style="width: 2rem; height: 2rem; opacity: 0.5;"></div>
              <div class="mt-3 text-muted fw-bold small" style="font-size:11px; letter-spacing:1px;">CHECKING LIVE STATUS...</div>
          </div>
      `);
  }

  checkForChanges();

  // ലോഡിംഗ് സമയത്ത് ബട്ടൺ ഡിസേബിൾ ചെയ്യുന്നു (സുരക്ഷയ്ക്ക്)
  if (!isServerData && !hideControls) {
    $('#quick-qty').prop('disabled', true);
    $('.btn-update-sage').prop('disabled', true).text('CHECKING STATUS...');
    $('#btn-edit-addr').hide();
  }
}

window.enableNewOrderMode = function () {
  // 1. Hide "New Order" button & Timeline
  $('#btn-new-order-mode').hide();
  $('#status-area').empty();

  // 2. Show Controls
  $('label[data-i18n="lbl_qty"]').fadeIn();
  $('.qty-action-row').css('display', 'flex').hide().fadeIn();
  $('#quick-price-box').fadeIn();
  $('#btn-edit-addr').fadeIn().css('display', 'inline-block');

  // 3. Reset State (Important!)
  isEditMode = false;
  editingOrderId = null; // 🔥 This makes it a NEW ORDER
  $('#display-oid').hide();
  $('#display-date').hide();

  // 4. Reset Inputs
  // ക്വാണ്ടിറ്റി ക്ലിയർ ചെയ്യുന്നു (അപ്പോൾ കസ്റ്റമർ പുതിയത് സെലക്ട് ചെയ്യണം)
  $('#quick-qty').val('').trigger('change');
  $('#quick-qty option').prop('disabled', false);

  // 5. Update Button immediately
  checkForChanges(); // This will set the text to "Select Quantity" or "Order Now"
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
  const lang = $('.form-select').val() || 'en';
  const t = translations[lang]; // Get translations

  const steps = ['pending', 'sent', 'paid', 'dispatched', 'delivered'];
  let currentStatus = String(d.Status || d.status || 'pending').toLowerCase();
  if (currentStatus === 'archive') currentStatus = 'pending';
  if (currentStatus === 'completed') currentStatus = 'delivered';

  let currentIndex = steps.indexOf(currentStatus);
  if (currentIndex === -1) currentIndex = 0;

  let timelineHTML = `<div class="tracking-wrapper"><h6 class="fw-bold mb-3" style="font-size:13px; color:#555;">${t.lbl_order_status}</h6><ul class="track-tl">`;

  // 1. Order Placed
  timelineHTML += `
      <li class="track-tl-item active">
          <div class="track-tl-dot"></div>
          <div class="track-date">${formatPrettyDate(d.timestamp) || ''}</div>
          <div class="track-title">${t.order_success || "Order Placed"}</div>
      </li>`;

  // 2. Payment
  let isPaid = currentIndex >= 2;
  timelineHTML += `
      <li class="track-tl-item ${isPaid ? 'active' : ''}">
          <div class="track-tl-dot"></div>
          <div class="track-title">${isPaid ? t.lbl_payment_received : t.lbl_payment_pending}</div>
      </li>`;

  // 3. Dispatched
  let isDispatched = currentIndex >= 3;
  let trackBtn = '';
  if (d.tracking) {
    let courierName = d.courier || d.provider || "Courier";
    let trackLink = `https://www.google.com/search?q=${courierName}+tracking+${d.tracking}`;
    trackBtn = `<div class="mt-2"><a href="${trackLink}" target="_blank" class="btn btn-sm btn-outline-primary py-1 px-3" style="font-size:11px; border-radius:50px;">${t.lbl_track_item} <i class="fas fa-external-link-alt"></i></a></div>`;
  }

  timelineHTML += `
      <li class="track-tl-item ${isDispatched ? 'active' : ''}">
          <div class="track-tl-dot"></div>
          <div class="track-title">${isDispatched ? t.lbl_dispatched : t.lbl_packing}</div>
          <div class="track-desc">
            ${isDispatched ? `ID: ${d.tracking || ''}` : ''}
            ${isDispatched && d.tracking ? trackBtn : ''}
          </div>
      </li>`;

  // 4. Delivered
  let isDelivered = currentIndex >= 4;
  timelineHTML += `
      <li class="track-tl-item ${isDelivered ? 'active' : ''}">
          <div class="track-tl-dot"></div>
          <div class="track-title">${isDelivered ? t.lbl_delivered : t.lbl_on_the_way}</div>
      </li>`;

  timelineHTML += `</ul></div>`;

  if (currentStatus === 'dispatched') {
    timelineHTML += `<div class="mt-3"><button id="btn-mark-delivered" onclick="markOrderDelivered('${d.orderid}')" class="btn btn-success btn-sm fw-bold shadow-sm w-100 py-2">${t.btn_received}</button></div>`;
  }

  $('#status-area').append(timelineHTML);
}

function updateSummaryDisplay() {
  // 1. Get Values
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
    if (['paid', 'dispatched', 'completed', 'delivered'].includes(s)) {
      $('#btn-edit-addr').hide();
    } else {
      $('#btn-edit-addr').css('display', 'inline-block');
    }
  }

  if (typeof checkForChanges === 'function') checkForChanges();
}

// 🔥 പുതിയ ഫംഗ്‌ഷൻ: സ്റ്റാറ്റസ് കൃത്യമായി ചെക്ക് ചെയ്യാൻ
function checkAndHideEditButton() {
  // 1. Check Global userData (If available)
  if (typeof userData !== 'undefined' && userData.Status) {
    applyHideLogic(userData.Status);
    return;
  }

  // 2. Fallback: Check Hidden Input (HTML-ൽ സ്റ്റാറ്റസ് സേവ് ചെയ്തിട്ടുണ്ടെങ്കിൽ)
  let hiddenStatus = $('#order-status-hidden').val();
  if (hiddenStatus) {
    applyHideLogic(hiddenStatus);
  }
}

function applyHideLogic(status) {
  let s = String(status).toLowerCase().trim();
  // ഈ സ്റ്റാറ്റസുകൾ ആണെങ്കിൽ ബട്ടൺ കാണിക്കില്ല
  if (['paid', 'dispatched'].includes(s)) {
    $('#btn-edit-addr').hide();
    console.log("Edit Button Hidden for Status:", s);
  } else {
    $('#btn-edit-addr').css('display', 'inline-flex');
  }
}

window.updatePrice = function (qty, isQuick) {
  if (!qty) return;
  const n = parseInt(qty);
  const base = n * 650; // Honey Price

  // 1. Get State
  let currentState = "";
  if (isQuick) {
    currentState = $('#edit-state').val(); // Edit Mode
  } else {
    // Wizard Mode (From global variable or input)
    currentState = (userData && userData.state) ? userData.state : ($('#state').val() || 'KERALA');
  }

  // 2. Identify Zone
  const zone = getZoneKey(currentState);

  // 3. Get Courier Rate
  // courierRates object now has keys: kerala, tn, ka, ap, ts, lakshadweep, north
  const courier = (courierRates[zone] && courierRates[zone][n]) ? courierRates[zone][n] : 0;

  const total = base + courier;

  // 4. Update UI
  const container = isQuick ? $('#quick-price-box') : $('#wiz-price-box');
  container.find('.qty-count').text(n);
  container.find('.val-base').text(base);
  container.find('.val-courier').text(courier);
  container.find('.val-total').text(total);
  container.fadeIn();

  // 🔥 WIZARD SUMMARY - HORIZONTAL COMPACT STYLE
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
    let alt = $('#altphone').val();

    let altHtml = alt ? `<span class="text-muted">|</span> ${alt}` : '';

    // കീബോർഡ് വരുമ്പോൾ സ്ഥലം പോകാതിരിക്കാൻ വശങ്ങളിലേക്ക് ഒതുക്കിയ ഡിസൈൻ
    let prettyHtml = `
        <div style="padding: 8px 0; border-bottom: 1px dashed #e0e0e0; margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                 <div style="font-size: 10px; font-weight: 800; color: #9ca3af; letter-spacing: 1px;">DELIVER TO</div>
                 <div style="font-size: 11px; font-weight: 700; color: #25D366;"><i class="fab fa-whatsapp"></i> ${wa}</div>
            </div>
            
            <div style="font-size: 14px; font-weight: 800; color: #1a1a1a; text-transform: uppercase; margin-bottom: 2px;">${name}</div>
            
            <div style="font-size: 12px; color: #4b5563; line-height: 1.6;text-transform: uppercase;">
                <span style="font-weight: 600; color: #222;">${house}</span>, ${place}, ${po},<br/>
                ${dist}, ${state} - <b>${pin}</b>
            </div>
            
            <div style="margin-top: 5px; font-size: 12px; font-weight: 600; color: #555;">
                <i class="fas fa-phone-alt" style="font-size:10px; color:#888; margin-right:4px;"></i> ${phone} ${altHtml}
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
  // 1. Get raw text for PO (Hidden Div-ൽ നിന്ന്)
  let poRaw = $('#display-po').text() || '';

  // 2. Data Cleaning
  let place = $('#place').val() || '';
  let po = poRaw.replace('PO', '').trim();
  if (po) po += ' PO';

  // 🔥 FIX: Split Logic ഒഴിവാക്കി, നേരിട്ട് Global Data-യിൽ നിന്ന് എടുക്കുന്നു
  // പഴയ split(',') കോഡ് പ്രശ്നക്കാരായത് കൊണ്ട് ഇത് ഉപയോഗിക്കുക:
  let dist = userData.district || '';
  let state = userData.state || $('#state').val() || 'KERALA';
  let pin = $('#pincode').val() || '';

  // Safety: ജില്ലയുടെ പേരും സ്ഥലത്തിന്റെ പേരും ഒന്നാണെങ്കിൽ ജില്ല കാണിക്കേണ്ട
  if (dist.toLowerCase() === place.toLowerCase()) {
    dist = '';
  }

  // 3. Language Check
  let lang = $('.form-select').val() || 'en';
  let warnText = "Enter Place only (Don't add District/PO)";
  if (lang === 'ml') warnText = "സ്ഥലം മാത്രം നൽകുക (ജില്ല/PO ചേർക്കരുത്)";

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

// പേജ് ലോഡ് ആകുമ്പോൾ തന്നെ ഒന്ന് കാണിക്കാൻ
setTimeout(updateLiveAddressPreview, 1000);

function checkForChanges() {
  // 1. Current Values
  var currQty = $('#quick-qty').val() || '';
  var currPhone = $('#edit-phone').val() || '';
  var currWa = $('#edit-whatsapp').val() || '';
  var currHouse = $('#edit-house').val() || '';
  var currPlace = $('#edit-place').val() || '';
  var currPin = $('#edit-pincode').val() || '';
  var currAlt = $('#edit-altphone').val() || '';

  // 2. Saved Values
  var savedQty = (savedOrderData.quantity || '') + '';
  var savedPhone = (savedOrderData.phone || '') + '';
  var savedWa = (savedOrderData.whatsapp || savedOrderData.phone || '') + '';
  var savedHouse = (savedOrderData.house || '') + '';
  var savedPlace = (savedOrderData.place || '') + '';
  var savedPin = (savedOrderData.pincode || '') + '';
  var savedAlt = (savedOrderData.altphone || '') + '';

  // 3. Compare
  var isChanged = false;
  if (String(currQty) !== String(savedQty)) isChanged = true;
  if (String(currPhone) !== String(savedPhone)) isChanged = true;
  if (String(currWa) !== String(savedWa)) isChanged = true;
  if (String(currHouse).trim().toUpperCase() !== String(savedHouse).trim().toUpperCase()) isChanged = true;
  if (String(currPlace).trim().toUpperCase() !== String(savedPlace).trim().toUpperCase()) isChanged = true;
  if (String(currPin) !== String(savedPin)) isChanged = true;
  if (String(currAlt) !== String(savedAlt)) isChanged = true;

  // 4. Button Logic & Text Setup
  var btnUpdate = $('.btn-update-sage');
  var btnSave = $('#address-edit-box button');

  // Language Setup
  const lang = $('.form-select').val() || 'en';
  const t = translations[lang];

  // ബട്ടൺ 2 വരിയിൽ വരാനുള്ള സ്റ്റൈൽ
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

    // 1. ബട്ടൺ എപ്പോഴും Enabled ആക്കുന്നു
    btnUpdate.prop('disabled', false).css({ 'opacity': '1', 'cursor': 'pointer' });

    // Save Button Logic (Always enabled for new orders)
    btnSave.prop('disabled', false).text(t.txt_save_changes);

    // 2. ടെക്സ്റ്റ് സെറ്റിംഗ് (2 Lines)
    if (currQty && currQty !== "0") {
      // ക്വാണ്ടിറ്റി ഉണ്ടെങ്കിൽ: വെറും "ORDER NOW"
      btnUpdate.html(`<span style="font-size:16px; font-weight:800;">${t.btn_order_now}</span>`);
    } else {
      // ക്വാണ്ടിറ്റി ഇല്ലെങ്കിൽ: "ORDER NOW" + Subtext
      let subText = (lang === 'ml') ? "(എത്ര ബോട്ടിൽ എന്ന് തിരഞ്ഞെടുക്കൂ)" : "(Select Quantity First)";

      btnUpdate.html(`
          <span style="font-size:16px; font-weight:800;">${t.btn_order_now}</span><br>
          <span style="font-size:10px; opacity:0.9; font-weight:600;">${subText}</span>
      `);
    }

  } else {
    // === UPDATE / EDIT MODE (Normal Logic) ===
    if (isChanged) {
      btnUpdate.prop('disabled', false).css({ 'opacity': '1', 'cursor': 'pointer' }).text(t.btn_update);
      btnSave.prop('disabled', false).css({ 'opacity': '1', 'cursor': 'pointer' }).text(t.txt_save_changes);
    } else {
      btnUpdate.prop('disabled', true).css({ 'opacity': '0.5', 'cursor': 'not-allowed' }).text(t.txt_no_changes);
      btnSave.prop('disabled', true).css({ 'opacity': '0.5', 'cursor': 'not-allowed' }).text(t.txt_no_changes);
    }
  }
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
  // 1. CONFIRMATION
  if (status === 'Archive' && !confirm(`Move this order to Archive? (Updates Server Directly)`)) return;
  if (status !== 'Archive' && !confirm(`Mark as '${status}'? (Saved Locally)`)) return;

  const btnContainer = $('#admin-btn-container');

  // 🔥 CASE 1: ARCHIVE -> DIRECT SERVER UPDATE
  // ആർക്കൈവ് ആണെങ്കിൽ നേരിട്ട് സെർവറിലേക്ക് അയക്കുന്നു
  if (status === 'Archive') {
    const originalContent = btnContainer.html();
    btnContainer.html('<div class="text-center py-2"><i class="fas fa-spinner fa-spin text-primary"></i> Archiving...</div>');

    fetch(sc, {
      method: 'POST',
      body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: oid, status: status }] })
    })
      .then(res => res.json())
      .then(data => {
        if (data.result === 'success') {
          // Local Cache Update (Optional but good for immediate UI sync)
          let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
          updates = updates.filter(item => item.oid !== oid); // Remove if any local pending exists
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

  let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");

  // Remove any existing update for this Order ID to avoid duplicates
  updates = updates.filter(item => item.oid !== oid);

  // Add new update
  updates.push({ oid: oid, status: status, time: new Date().getTime() });
  localStorage.setItem('pendingUpdates', JSON.stringify(updates));

  // Show success message
  Swal.fire({
    icon: 'success',
    title: `Saved: ${status}`,
    text: 'Saved locally. Please Sync from Admin Dashboard.',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000
  });

  // Update the UI immediately to reflect the change
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

function fetchCourierRates() {
  // 1. ലോഡിംഗ് ആണെന്ന് കാണിക്കുന്നു (യൂസർ പെട്ടെന്ന് എത്തിയാൽ മനസ്സിലാകാൻ)
  $('#quantity, #quick-qty').html('<option value="">Loading Options...</option>');

  // 2. സെർവറിലേക്ക് റിക്വസ്റ്റ് അയക്കുന്നു
  fetch(`${sc}?action=getRates`)
    .then(res => res.json())
    .then(data => {
      if (data.result === 'success' && data.rates) {

        // A. ഗ്ലോബൽ വേരിയബിൾ അപ്ഡേറ്റ് ചെയ്യുന്നു (വില കാൽക്കുലേറ്റ് ചെയ്യാൻ)
        courierRates = data.rates;

        // B. ഷീറ്റിലുള്ള അളവുകൾ (Quantities) മാത്രം എടുക്കുന്നു (Eg: 1, 2, 4, 6...)
        // (Object.keys വഴി 1, 2, 5 ഒക്കെ എടുക്കും, എന്നിട്ട് Sort ചെയ്യും)
        const quantities = Object.keys(data.rates.kerala)
          .map(Number)
          .sort((a, b) => a - b);

        // C. HTML ഓപ്ഷനുകൾ നിർമ്മിക്കുന്നു
        let optionsHTML = '<option value="">Select Quantity</option>'; // Default Option

        quantities.forEach(qty => {
          // വെയിറ്റ് കണക്കാക്കുന്നു (1 Bottle = 650g)
          const totalGrams = qty * 650;
          let weightText;

          // 1000g ന് മുകളിൽ ആണെങ്കിൽ kg, അല്ലെങ്കിൽ g
          if (totalGrams >= 1000) {
            weightText = (totalGrams / 1000).toFixed(2) + " kg";
          } else {
            weightText = totalGrams + "g";
          }

          // Plural Logic (Bottle vs Bottles)
          let label = `${qty} Bottle${qty > 1 ? 's' : ''} (${weightText})`;

          optionsHTML += `<option value="${qty}">${label}</option>`;
        });

        // D. രണ്ട് ഡ്രോപ്പ്ഡൗണിലും (New Order & Edit) അപ്ഡേറ്റ് ചെയ്യുന്നു
        $('#quantity').html(optionsHTML);   // Wizard Form
        $('#quick-qty').html(optionsHTML);  // Edit Form

        console.log("✅ Rates & Dropdown Updated from Server");

        // നിലവിൽ ഏതെങ്കിലും വാല്യൂ (ഉദാ: എഡിറ്റ് ചെയ്യുമ്പോൾ) ഉണ്ടെങ്കിൽ പ്രൈസ് അപ്ഡേറ്റ് ചെയ്യുന്നു
        if ($('#quantity').val()) updatePrice($('#quantity').val(), false);
      }
    })
    .catch(err => {
      console.log("❌ Rate fetch failed, using default.");
      // എറർ വന്നാൽ സ്റ്റാറ്റിക് ഓപ്ഷൻ കാണിക്കാം (Optional)
    });
}

function sendToWhatsapp() {
  const d = successData;
  const adminPhone = '7788990313';
  const safe = (val) => String(val || '').trim().toUpperCase();

  // 1. ഭാഷ തിരിച്ചറിയുന്നു & പുതിയ ടെക്സ്റ്റ്
  const lang = $('.form-select').val() || 'en';

  // 🔥 ഇവിടെയാണ് മാറ്റം വരുത്തിയത്:
  const editText = (lang === 'ml')
    ? "നിങ്ങളുടെ ഓർഡറിന്റെ സ്റ്റാറ്റസ് അറിയാനും മാറ്റങ്ങൾ വരുത്തുവാനും: 👇"
    : "To Check Status or Edit Order: 👇";

  // 2. Date Formatting
  const dateObj = d.timestamp ? new Date(d.timestamp) : new Date();
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour12: true });
  const formattedTime = `${day}/${month}/${year}, ${timeStr}`;

  // 3. Check Updates
  let isUpdate = false;
  let changes = [];
  if (typeof savedOrderData !== 'undefined' && savedOrderData.orderid == d.orderid) {
    isUpdate = true;
    if (String(savedOrderData.quantity) !== String(d.quantity)) changes.push(`📦 QTY: ${savedOrderData.quantity} ➡️ *${d.quantity}*`);
    if (String(savedOrderData.phone) !== String(d.phone)) changes.push(`📞 PHONE: ${savedOrderData.phone} ➡️ *${d.phone}*`);
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

  // 5. Generate Message
  const editLink = `https://kafaklife.com/order.html?oid=${d.orderid}`;
  let header = "";

  if (isUpdate) {
    header = `*⚠️ ORDER UPDATED* 📝\n⌚ _${formattedTime}_\n\n${editText}\n🔗 _${editLink}_\n`;
    if (changes.length > 0) header += `\n*🔥 WHAT CHANGED:* \n${changes.join('\n')}\n`;
    else header += `\n(No major details changed)\n`;
    header += `\n*👇 CURRENT DETAILS:*`;
  } else {
    header = `*✅ Honey order confirmed!* 🍯\n⌚ _${formattedTime}_\n\n${editText}\n🔗 _${editLink}_\n`;
  }

  const details = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${d.pincode}*\n*Ph: ${d.phone}*\n\n*Qty: ${d.quantity}*\n*Amount: ₹${base} + ${courier}*\n*Total: ₹${total}/-*\n____________________________________`;
  const footer = `\n\n*GPay to: ${adminPhone} (KAFAK LLP)*`;

  window.location.href = `https://wa.me/91${adminPhone}?text=${encodeURIComponent(header + details + footer)}`;
}

