
const sc = `https://script.google.com/macros/s/AKfycbzRsrkXLcDErdii0vWDwSqrgUz7h4AKFXS2nQiIeQSsfkJ68NV_XgAAx9Me8sTCcsoefQ/exec`;

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

let currentStep = 0;
let editingOrderId = null;
let userData = {};
let successData = null;
let poList = [];
let myCustId = null;
let localUsersMap = {};
let currentLoginPhone = null;
let isEditMode = false;

// 🛡️ SAFE STORAGE WRAPPER
const SafeStorage = {
  getItem: function (key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: function (key, val) {
    try { localStorage.setItem(key, val); } catch (e) { }
  },
  removeItem: function (key) {
    try { localStorage.removeItem(key); } catch (e) { }
  }
};

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

  $('#phone, #edit-phone, #whatsapp, #altphone, #pincode').on('input', function () {
    this.value = this.value.replace(/\D/g, '');
  });

  $('#quantity, #quick-qty').change(function () {
    updatePrice($(this).val(), $(this).attr('id') === 'quick-qty');
  });

  const saved = SafeStorage.getItem('kafakUsers');
  if (saved) {
    try { localUsersMap = JSON.parse(saved); } catch (e) { localUsersMap = {}; }
  } else {
    const oldUser = SafeStorage.getItem('kafakUser');
    if (oldUser) {
      try {
        const u = JSON.parse(oldUser);
        if (u.phone) {
          localUsersMap[u.phone] = u;
          SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));
          SafeStorage.removeItem('kafakUser');
        }
      } catch (e) { }
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');
  const isAdmin = SafeStorage.getItem('kafakAdmin') === 'true';

  if (oid) {
    if (isAdmin) {
      // 🔴 ADMIN BAR INJECTION
      const adminUI = `
            <div id="admin-action-bar" style="display:none; position: fixed; bottom: 0; left: 0; width: 100%; background: white; padding: 15px; z-index: 12000; border-top: 1px solid #ddd; box-shadow: 0 -4px 20px rgba(0,0,0,0.15);">
                <div class="container p-0 d-flex justify-content-between align-items-center">
                    <div id="admin-btn-container" style="flex-grow:1; margin-right:15px;"></div>
                    <button onclick="window.location.href='admin.html'" class="btn btn-light rounded-circle shadow-sm" style="width:45px; height:45px; border:1px solid #eee; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-times text-danger" style="font-size:20px;"></i>
                    </button>
                </div>
            </div>`;

      $('body').append(adminUI);
      $('body').css('padding-bottom', '100px');

      $('.footer-action').after(`
            <div class="text-center py-4">
                <button onclick="clearAdminCache()" class="btn btn-sm btn-outline-secondary" style="font-size:10px; opacity:0.7;">
                    🛠️ Admin: Clear Cache
                </button>
            </div>
        `);

      let cachedOrders = JSON.parse(SafeStorage.getItem('allOrdersCache') || "[]");
      let cachedOrder = cachedOrders.find(o => o.orderid === oid);

      if (cachedOrder) {
        $('#full-loader').hide();
        showLoader(false);

        let initialStatus = cachedOrder.Status || 'Pending';
        updateAdminUI(initialStatus, oid);

        cachedOrder.house = cachedOrder.house || '';
        cachedOrder.place = cachedOrder.place || '';
        cachedOrder.postoffice = cachedOrder.postoffice || '';
        cachedOrder.district = cachedOrder.district || '';
        cachedOrder.state = cachedOrder.state || '';

        loadOrderData(cachedOrder);
      } else {
        fetchOrder(oid);
      }
    } else {
      fetchOrder(oid);
    }
  } else {
    showLoader(false);
    $('#step-0').fadeIn();
    updateFooterButtons('step-0');
    setTimeout(() => $('#phone').focus(), 500);
  }
});

// 🔴 ADMIN FUNCTIONS (Globally Accessible)
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

// 🔴 HELPER TO LOAD DATA
function loadOrderData(d) {
  $('#step-0').hide();
  userData = d;
  editingOrderId = d.orderid;
  currentLoginPhone = d.phone;

  if (d.phone) {
    localUsersMap[d.phone] = { ...localUsersMap[d.phone], ...d };
    SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));
  }

  if (d.Status === 'Dispatched' || d.Status === 'Completed') {
    editingOrderId = null;
    showReturningUserView(d, false);
  } else {
    showReturningUserView(d, true);
  }
}

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
  Swal.fire({ text: translations[lang].confirm_home, icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'No', confirmButtonColor: '#000', cancelButtonColor: '#f2f2f2', customClass: { popup: 'ios-popup', confirmButton: 'ios-btn', cancelButton: 'ios-btn-cancel' } }).then((result) => { if (result.isConfirmed) window.location.href = "index.html"; });
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

  currentLoginPhone = phone;
  showLoader(true);

  let localData = localUsersMap[phone] || null;
  myCustId = localData ? localData.custId : null;

  const idParam = myCustId ? `&custId=${myCustId}` : '';

  fetch(`${sc}?action=getCustomer&phone=${phone}${idParam}`)
    .then(res => res.json())
    .then(res => {
      showLoader(false);
      $('#step-0').hide();

      if (res.result === 'success' && res.data && res.data.name) {
        const d = res.data;
        if (d.custId) { myCustId = d.custId; }

        if (d.authorized === false) {
          editingOrderId = null;
          $('#whatsapp').val(phone);
          startWizard();
          return;
        }

        const finalUser = localData ? { ...d, ...localData } : d;
        loadOrderData(finalUser);
      } else {
        if (localData && localData.name) {
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
    .catch(e => {
      showLoader(false);
      if (localData && localData.name) {
        userData = localData;
        showReturningUserView(localData, false);
      } else {
        $('#whatsapp').val(phone);
        startWizard();
      }
    });
}

function fetchOrder(oid) {
  fetch(`${sc}?action=getOrder&oid=${oid}`)
    .then(res => res.json())
    .then(res => {
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
    })
    .catch(() => { showLoader(false); $('#step-0').fadeIn(); updateFooterButtons('step-0'); });
}

// 🔴 UPDATED: RESTRICT QUANTITY IF PAID
function showReturningUserView(d, isActiveOrder) {
  $('#returning-user-view').fadeIn();
  updateFooterButtons('returning');

  isEditMode = isActiveOrder;

  if (d.orderid) { $('#display-oid').text('#' + d.orderid).show(); }
  else { $('#display-oid').hide(); }

  $('#saved-name').text(d.name);
  $('#edit-phone').val(d.phone);
  $('#edit-house').val(d.house);
  $('#edit-place').val(d.place);
  $('#edit-pincode').val(d.pincode);
  $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district);
  $('#edit-state').val(d.state);
  $('#edit-whatsapp').val(d.whatsapp || d.phone);
  $('#edit-altphone').val(d.altphone || '');

  updateSummaryDisplay();

  // Reset options first
  $('#quick-qty option').prop('disabled', false);

  if (isActiveOrder) {
    $('#quick-qty').val(d.quantity).trigger('change');
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്യാം" : "UPDATE ORDER");

    // 🔴 3. DISABLE LOWER QTY IF PAID
    if (d.Status === 'Paid') {
      const currentQty = parseInt(d.quantity);
      $('#quick-qty option').each(function () {
        if (parseInt($(this).val()) < currentQty) {
          $(this).prop('disabled', true);
        }
      });
    }

  } else {
    $('#quick-qty').val('').trigger('change');
    $('#quick-price-box').hide();
    const lang = $('.form-select').val();
    $('#btn-quick-submit span').text(lang === 'ml' ? "ഓർഡർ ചെയ്യാം" : "PLACE ORDER");
  }

  checkForChanges();
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

  // 🔴 UPPERCASE ADDRESS
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

async function handleEditPincode(pin) {
  if (pin.length === 6) {
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`);
      let data = await res.json();
      data = data.map(item => ({
        ...item,
        officename: item.officename.replace(/\s*(B\.?O\.?|S\.?O\.?)\s*$/i, ' PO')
      }));

      if (data && data.length > 0) {
        $('#edit-district').val(data[0].district);
        $('#edit-state').val(data[0].statename);
        if (data.length > 1) {
          const dd = $('#edit-postoffice-select');
          dd.empty().append('<option value="">Select PO...</option>');
          data.forEach(p => dd.append(`<option value="${p.officename}">${p.officename}</option>`));
          $('#edit-po-wrapper').show();
          $('#edit-single-po').hide();
        } else {
          const poName = data[0].officename;
          $('#edit-postoffice').val(poName);
          $('#edit-po-wrapper').hide();
          $('#edit-single-po').html(`<i class="fas fa-map-marker-alt loc-icon"></i> <span class="fw-bold text-dark">${poName}</span>`).fadeIn();
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

  const newPhone = $('#edit-phone').val();
  if (!newPhone || newPhone.length !== 10 || isNaN(newPhone)) { showAlert(getAlert('err_phone')); $('#edit-phone').focus(); return; }

  if (!$('#edit-house').val().trim()) { showAlert(getAlert('err_house')); $('#edit-house').focus(); return; }
  if (!$('#edit-place').val().trim()) { showAlert(getAlert('err_place')); $('#edit-place').focus(); return; }

  const pin = $('#edit-pincode').val();
  if (!pin || pin.length !== 6 || isNaN(pin)) { showAlert(getAlert('err_pincode')); $('#edit-pincode').focus(); return; }

  if ($('#edit-po-wrapper').is(':visible') && !$('#edit-postoffice-select').val()) { showAlert(getAlert('err_select_po')); return; }
  if (!$('#edit-postoffice').val()) { showAlert(getAlert('err_select_po')); return; }

  const wa = $('#edit-whatsapp').val();
  if (!wa || wa.length !== 10 || isNaN(wa)) { showAlert(getAlert('err_whatsapp')); $('#edit-whatsapp').focus(); return; }

  const alt = $('#edit-altphone').val();
  if (alt && (alt.length !== 10 || isNaN(alt))) { showAlert(getAlert('err_phone')); $('#edit-altphone').focus(); return; }

  const finalData = {
    orderid: editingOrderId,
    name: $('#saved-name').text(),
    phone: newPhone,
    whatsapp: wa,
    altphone: alt,
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

  if (currentLoginPhone && currentLoginPhone !== newPhone) {
    delete localUsersMap[currentLoginPhone];
  }
  localUsersMap[newPhone] = finalData;
  SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));

  postOrder(finalData);
}

// --- WIZARD ---
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

async function nextStep() {
  if (currentStep === 1 && !$('#name').val()) return showAlert(getAlert('err_name'));
  if (currentStep === 2 && !/^[0-9]{10}$/.test($('#whatsapp').val())) return showAlert(getAlert('err_whatsapp'));

  if (currentStep === 3) {
    const pin = $('#pincode').val();
    if (!/^[0-9]{6}$/.test(pin)) return showAlert(getAlert('err_pincode'));
    $('#btn-wiz-next').prop('disabled', true).text(getAlert('err_checking_pin'));
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`);
      let data = await res.json();

      data = data.map(item => ({
        ...item,
        officename: item.officename.replace(/\s*(B\.?O\.?|S\.?O\.?)\s*$/i, ' PO')
      }));

      $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next);
      if (data && data.length > 0) {
        poList = data;
        userData.district = data[0].district;
        userData.state = data[0].statename;

        const dl = $('#place-list');
        dl.empty();
        data.forEach(p => dl.append(`<option value="${p.officename}">`));

        if (data.length > 1) {
          $('#po-select').empty().append('<option value="">Select...</option>');
          data.forEach(p => $('#po-select').append(`<option value="${p.officename}">${p.officename}</option>`));
          currentStep = 3.5; showStep(3.5); return;
        } else {
          userData.postoffice = data[0].officename;
          currentStep = 4; showStep(4); return;
        }
      } else { showAlert(getAlert('err_pin_not_found')); }
    } catch (e) { $('#btn-wiz-next').prop('disabled', false).text(translations[$('.form-select').val()].btn_next); showAlert(getAlert('err_pincode')); return; }
  }

  if (currentStep === 3.5) {
    if (!$('#po-select').val()) return showAlert(getAlert('err_select_po'));
    userData.postoffice = $('#po-select').val();
    currentStep = 4; showStep(4); return;
  }

  if (currentStep === 4) {
    if (!$('#house').val()) { showAlert(getAlert('err_house')); $('#house').focus(); return; }
    currentStep = 5; showStep(5); return;
  }

  if (currentStep === 5) {
    if (!$('#place').val()) { showAlert(getAlert('err_place')); $('#place').focus(); return; }
    $('#display-po').text(userData.postoffice);
    $('#display-dist-state').text(`${$('#place').val()}, ${userData.district}`.toUpperCase());
  }

  if (currentStep === 6) { const alt = $('#altphone').val(); if (alt && !/^[0-9]{10}$/.test(alt)) return showAlert(getAlert('err_phone')); }

  if (currentStep === 7) {
    if (!$('#quantity').val()) { showAlert(getAlert('err_qty')); return; }
    submitWizardOrder();
    return;
  }

  currentStep++; showStep(currentStep);
}

function updateWizardLocDisplay() {
  $('#display-po').text((userData.postoffice || '').toUpperCase());
  $('#display-dist-state').text(`${$('#place').val() || ''}, ${userData.district || ''}`.toUpperCase());
}

function prevStep() {
  if (currentStep === 1) return location.reload();
  if (currentStep === 4 && poList.length > 1) { currentStep = 3.5; showStep(3.5); return; }
  if (currentStep === 4 && poList.length <= 1) { currentStep = 3; showStep(3); return; }
  if (currentStep === 3.5) { currentStep = 3; showStep(3); return; }
  currentStep--; showStep(currentStep);
}

function submitWizardOrder() {
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

  localUsersMap[finalData.phone] = finalData;
  SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));

  postOrder(finalData);
}

// 🔴 BEAUTIFUL DELIVER TO BOX
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

function postOrder(data) {
  showLoader(true);
  fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: data }) })
    .then(res => res.json())
    .then(res => {
      showLoader(false);
      if (res.result === 'success') {
        successData = { ...data, orderid: res.orderid, timestamp: res.timestamp };

        if (res.custId) {
          data.custId = res.custId;
          myCustId = res.custId;
          localUsersMap[data.phone] = data;
          SafeStorage.setItem('kafakUsers', JSON.stringify(localUsersMap));
        }

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

  const safe = (val) => String(val || '').trim().toUpperCase();

  const format = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${String(d.pincode || '').trim()}*\n*Ph: ${String(d.phone || '').trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;

  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}