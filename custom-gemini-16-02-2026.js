// ------------------------------------------------------------------------------
// 🔴 CONFIGURATION & GLOBALS
// ------------------------------------------------------------------------------
const sc = `https://script.google.com/macros/s/AKfycbz4Rc6pe2KlS8qEuUfSPY4baa-5Yc_ch51HZJULUmdNq5GVGq48jIZnIoJwaNLyIFoGtQ/exec`;

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
let adminPhone = '7788990313'; // Default fallback

const STORAGE_KEY = 'kafakCustomerData';

const SafeStorage = {
    getItem: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    setItem: function (key, val) { try { localStorage.setItem(key, val); } catch (e) { } },
    removeItem: function (key) { try { localStorage.removeItem(key); } catch (e) { } }
};

// --- UPDATED LOADER LOGIC ---
window.showLoader = function (show) {
    const lang = $('#language-select').val() || 'en';
    const t = translations[lang] || translations['en'];
    const loadingTxt = t.loading || "LOADING...";

    if (show) {
        $('#loader-text').text(loadingTxt);
        $('#full-loader').css('display', 'flex').fadeIn(200);
    } else {
        setTimeout(() => { $('#full-loader').fadeOut(300); }, 200);
    }
}

window.changeLanguage = function (lang) {
    localStorage.setItem('activeLang', lang);
    const t = translations[lang] || translations['en'];
    if (!t) return;

    $('[data-i18n]').each(function () {
        const key = $(this).attr('data-i18n');
        if (key === 'lbl_qty' && typeof editingOrderId !== 'undefined' && editingOrderId) {
            $(this).text(t.lbl_qty_edit);
            return;
        }
        if (t[key]) $(this).text(t[key]);
    });

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

    renderQtyDropdowns();
    let qtyVal = $('#quantity').is(':visible') ? $('#quantity').val() : $('#quick-qty').val();
    if (qtyVal) updatePrice(qtyVal, $('#quick-qty').is(':visible'));

    const wizBtn = $('#btn-wiz-next');
    if (wizBtn.length > 0) {
        if (currentStep === 7) wizBtn.text(t.btn_order);
        else wizBtn.text(t.btn_next);
    }

    if (typeof checkForChanges === 'function') checkForChanges();

    if (typeof userData !== 'undefined' && userData.orderid && typeof updateStatusUI === 'function') {
        if ($('#status-area').html().trim() !== "") updateStatusUI(userData);
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
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'Asia/Kolkata' });
}

function getZoneKey(stateName) {
    if (!stateName) return 'REST OF INDIA';
    let s = stateName.toUpperCase().trim();
    if (courierRates && courierRates[s]) return s;
    return 'REST OF INDIA';
}

// 🔥 INJECT CSS FOR RADIO LOADER (Added here for safety)
$('head').append(`
<style>
    .radio-holder { position: relative; display: inline-block; width: 24px; height: 24px; }
    .spinner-ring { position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; border: 3px solid rgba(0,0,0,0.1); border-top: 3px solid #2563eb; border-radius: 50%; animation: radio-spin 0.8s linear infinite; pointer-events: none; }
    .success-tick { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #16a34a; font-size: 18px; font-weight: bold; animation: popIn 0.3s ease-out forwards; pointer-events: none; background: white; border-radius: 50%; }
    @keyframes radio-spin { 100% { transform: rotate(360deg); } }
    @keyframes popIn { 0% { transform: translate(-50%, -50%) scale(0); } 80% { transform: translate(-50%, -50%) scale(1.2); } 100% { transform: translate(-50%, -50%) scale(1); } }
</style>`);

$(document).ready(function () {
    const savedLang = localStorage.getItem('activeLang') || 'ml';
    if (savedLang) {
        if ($('#language-select').length > 0) $('#language-select').val(savedLang);
        changeLanguage(savedLang);
    } else {
        changeLanguage('en');
    }

    fetchCourierRates();
    injectVideoCSS();

    const urlParams = new URLSearchParams(window.location.search);
    const autoPhone = urlParams.get('phone');
    const oid = urlParams.get('oid');

    // 🔥 CRITICAL FIX: OID ഉണ്ടെങ്കിൽ Step-0 ഉം മറ്റുള്ളവയും ഹൈഡ് ചെയ്യുന്നു (To prevent Flicker)
    if (oid) {
        $('#step-0').hide();
        $('#wizard-view').hide();
        $('#returning-user-view').hide();
        showLoader(true);
    }

    if (autoPhone) {
        let cleanPhone = autoPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
        if (cleanPhone.length === 10) {
            $('#phone').val(cleanPhone);
            setTimeout(() => { handlePhoneNext(); }, 500);
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
                    delete u.Status; delete u.status; delete u.tracking; delete u.offer; delete u.courier; delete u.provider;
                    isDirty = true;
                }
            });
            if (isDirty) SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
        } catch (e) { localUsersMap = {}; }
    }

    const isAdmin = SafeStorage.getItem('kafakAdmin') === 'true';

    // INSTANT EDIT LOAD
    if (oid) {
        $('#step-0').hide(); // Double check hide
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
                    // 🔥 NEW SYNC Logic will be called here in Part 2
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
        // 🔥 OID ഇല്ലെങ്കിൽ മാത്രം Step 0 കാണിക്കുക
        showLoader(false);
        $('#step-0').show();
        updateFooterButtons('step-0');
        setTimeout(() => $('#phone').focus(), 500);
    }

    $('.form-select').on('change', function () { updateLiveAddressPreview(); });
});

window.handlePhoneNext = function () {
    const phone = $('#phone').val();
    if (!/^[0-9]{10}$/.test(phone)) { showAlert(getAlert('err_phone')); return; }

    currentLoginPhone = phone;
    preloadHoneyVideo();

    if (localUsersMap[phone]) {
        showLoader(true);
        syncUserDataBackground(phone).finally(() => { showLoader(false); });
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
                            title: 'Welcome Back!', text: 'Loading your active order...', icon: 'info',
                            timer: 2000, showConfirmButton: false, toast: true, position: 'top'
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
    delete cleanData.provider; delete cleanData.offer; delete cleanData.grandTotal;
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
        syncUserDataBackground(phone).finally(() => { setTimeout(() => { setRefreshLoading(false); }, 500); });
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

// 🔥 UPDATED: FORCE SERVER DATA PRIORITY (Fixes 'Paid' showing as 'Pending')
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

                // Merge: Server Data Overwrites Local Data (For Critical Fields)
                finalData = { ...localData, ...serverData };

                // 🔥 FORCE CRITICAL FIELDS FROM SERVER
                finalData.Status = serverData.Status || serverData.status || "Pending";
                finalData.adminMeta = serverData.adminMeta;
                finalData.paidNum = serverData.paidNum;
                finalData.language = serverData.language;
                finalData.tracking = serverData.tracking;
                finalData['Dispatched Date'] = serverData['Dispatched Date'];
                finalData.paidDate = serverData.paidDate;

                // Preserve unsaved address edits from local if status is editable (Pending)
                const s = String(finalData.Status).toLowerCase();
                if (!['paid', 'dispatched', 'delivered', 'completed', 'refunded'].includes(s)) {
                    if (localData.name) finalData.name = localData.name;
                    if (localData.house) finalData.house = localData.house;
                    if (localData.place) finalData.place = localData.place;
                    if (localData.postoffice) finalData.postoffice = localData.postoffice;
                    if (localData.pincode) finalData.pincode = localData.pincode;
                }

                if (finalData.orderid) {
                    editingOrderId = finalData.orderid;
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

// 🔥 CONTROL VISIBILITY (Admin can Edit, Customer Restrictions)
function handleEditControlsVisibility(d) {
    const status = String(d.Status || 'pending').toLowerCase();
    const isAdmin = localStorage.getItem('kafakAdmin') === 'true';

    const lang = $('#language-select').val() || 'en';
    let reqText = "Want to change details?";
    let subText = "Message Admin";
    if (lang === 'ml') {
        reqText = "എന്തെങ്കിലും മാറ്റങ്ങൾ വരുത്തണോ?";
        subText = "അഡ്മിന് മെസ്സേജ് അയക്കൂ";
    }

    // 1. ADMIN - Always Allow Edit
    if (isAdmin) {
        $('#quick-qty, .btn-update-sage, #quick-price-box').show();
        $('#btn-edit-addr').css('display', 'inline-block');
        $('label[data-i18n="lbl_qty"]').show();
        $('#quick-qty').prop('disabled', false);
        $('#quick-qty').css('border', '2px solid #dc3545');
        $('#btn-req-modify').remove();
        return;
    }

    // 2. LOCKED STATES (Paid, Dispatched, Refunded)
    if (['paid', 'dispatched', 'delivered', 'completed', 'refunded'].includes(status)) {
        $('#quick-qty').prop('disabled', true);
        $('.btn-update-sage, #quick-price-box').hide();
        $('#btn-edit-addr').hide();

        $('#btn-req-modify').remove();

        // Show Message Button ONLY if 'Paid'
        if (status === 'paid') {
            let waMsg = `Hello, I want to update my Order: ${d.orderid}. Please help!`;
            let targetPhone = typeof adminPhone !== 'undefined' ? adminPhone : '7788990313';
            $(`<div id="btn-req-modify" class="mt-3 text-center fade-in">
                  <div class="text-muted small mb-1 fw-bold">${reqText}</div>
                  <a href="https://wa.me/91${targetPhone}?text=${encodeURIComponent(waMsg)}" target="_blank" 
                     class="btn btn-outline-dark btn-sm shadow-sm rounded-pill px-3"><i class="fab fa-whatsapp"></i> ${subText}</a>
               </div>`).insertAfter('#status-area');
        }
        return;
    }

    // 3. EDITABLE STATES (Pending, Sent, Archive)
    $('label[data-i18n="lbl_qty"]').show();
    $('#quick-qty').prop('disabled', false).show();
    $('.btn-update-sage, #quick-price-box').show();
    $('#btn-edit-addr').css('display', 'inline-block');
    $('#btn-req-modify').remove();
}

function backgroundUserCheck(phone) {
    fetch(`${sc}?action=getCustomer&phone=${phone}`).then(res => res.json()).then(res => { if (res.result === 'success' && res.data && res.data.custId) myCustId = res.data.custId; }).catch(e => console.log("Bg check fail"));
}

window.submitWizardOrder = function () {
    const finalData = {
        orderid: editingOrderId, name: $('#name').val(), phone: $('#phone').val(), whatsapp: $('#whatsapp').val(),
        altphone: $('#altphone').val(), house: $('#house').val(), place: $('#place').val(), pincode: $('#pincode').val(),
        postoffice: userData.postoffice, district: userData.district, state: userData.state || 'Kerala',
        quantity: $('#quantity').val(), message: '', custId: myCustId, language: $('#language-select').val() || 'en'
    };
    saveToLocal(finalData.phone, finalData);
    playVideoAnimation(finalData.name, () => postOrder(finalData));
}

window.handleEditPincode = async function (val) {
    if (!/^[0-9]{6}$/.test(val)) { $('#edit-po-wrapper').slideUp(); $('#single-po-display').hide(); return; }
    checkForChanges();
    const lang = $('#language-select').val() || 'en';
    const t = translations[lang];

    try {
        const res = await fetch(`pincode_json_files/${val}.json`);
        if (!res.ok) throw new Error("Not Found");
        let data = await res.json();
        data = data.map(item => ({ ...item, officename: item.officename.replace(/\s+(BO|SO|HO|PO)\s*$/i, ' PO') }));

        if (data && data.length > 0) {
            $('#edit-district').val(data[0].district); $('#edit-state').val(data[0].statename);
            updatePrice($('#quick-qty').val(), true);

            if (data.length > 1) {
                $('#single-po-display').hide();
                const sel = $('#edit-postoffice-select');
                sel.empty().append(`<option value="">${t.lbl_select_po}...</option>`);
                data.forEach(p => { sel.append(`<option value="${p.officename}">${p.officename}</option>`); });
                $('#edit-po-wrapper').slideDown(); $('#edit-postoffice').val('');
            } else {
                $('#edit-po-wrapper').slideUp();
                const poName = data[0].officename;
                $('#edit-postoffice').val(poName);
                $('#single-po-display').html(`<i class="fas fa-check-circle"></i> ${poName}`).fadeIn();
            }
            updateSummaryDisplay(); checkForChanges();
        }
    } catch (e) {
        console.log("Pincode not found"); $('#edit-po-wrapper').slideUp(); $('#single-po-display').hide();
    }
}

function updateFooterButtons(view) {
    $('#btn-group-0').hide(); $('#btn-group-wizard').hide(); $('#btn-group-returning').hide();
    if (view === 'step-0') $('#btn-group-0').show();
    if (view === 'wizard') $('#btn-group-wizard').css({ 'display': 'flex', 'gap': '1rem' });
    if (view === 'returning') $('#btn-group-returning').show();
}

window.startWizard = function () {
    $('#wizard-view').show(); updateFooterButtons('wizard'); currentStep = 1; showStep(1);
}
window.showStep = function (s) {
    $('.wiz-step').hide();
    if (s === 1) $(`.wiz-step[data-step="${s}"]`).show(); else $(`.wiz-step[data-step="${s}"]`).fadeIn(200);
    const pct = (s / 7) * 100; $('#wiz-progress').css('width', `${pct}%`);
    const btn = $('#btn-wiz-next'); const lang = $('#language-select').val();
    if (s === 7) { btn.html(translations[lang].btn_order); btn.addClass('btn-brand-green'); updatePrice($('#quantity').val(), false); }
    else { btn.html(translations[lang].btn_next); btn.removeClass('btn-brand-green'); }
    if (s !== 6) setTimeout(() => { $(`.wiz-step[data-step="${s}"] input`).first().focus(); }, 300);
}

window.nextStep = async function () {
    const lang = $('#language-select').val() || 'en';
    const t = translations[lang];

    if (currentStep === 1 && !$('#name').val()) return showAlert(getAlert('err_name'));
    if (currentStep === 2 && !/^[0-9]{10}$/.test($('#whatsapp').val())) return showAlert(getAlert('err_whatsapp'));

    if (currentStep === 3) {
        const pin = $('#pincode').val(); if (!/^[0-9]{6}$/.test(pin)) return showAlert(getAlert('err_pincode'));
        $('#btn-wiz-next').prop('disabled', true).text(getAlert('err_checking_pin'));
        try {
            const res = await fetch(`pincode_json_files/${pin}.json`); if (!res.ok) throw new Error("404"); let data = await res.json();
            data = data.map(item => ({ ...item, officename: item.officename.replace(/\s+(BO|SO|HO|PO)\s*$/i, ' PO') }));
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
    if ($('.btn-update-sage').prop('disabled')) return;

    if (!$('#quick-qty').val()) { showAlert(getAlert('err_qty')); return; }

    // PO Check
    let finalPO = $('#edit-postoffice').val();
    if ($('#edit-postoffice-select').is(':visible')) finalPO = $('#edit-postoffice-select').val();
    if (!finalPO) {
        showAlert(getAlert('err_select_po') || "Please Select Post Office");
        if ($('.address-box').is(':hidden')) toggleAddressEdit();
        return;
    }
    $('#edit-postoffice').val(finalPO);

    if ($('#adm-phone').length) $('#edit-phone').val($('#adm-phone').val());
    if ($('#adm-paid').length) $('#edit-paid-by').val($('#adm-paid').val());

    const newName = $('#edit-name').val();
    if (!newName) { showAlert(getAlert('err_name')); return; }
    const newPhone = $('#edit-phone').val();
    if (!newPhone || newPhone.length !== 10) { showAlert(getAlert('err_phone')); return; }

    // META Logic (Preserve radio selection)
    let currentMeta = (savedOrderData.adminMeta || '').replace(/[MWAG]/g, '');
    let selectedRadio = $('input[name="target_wa"]:checked').val();
    let newFlag = 'M';
    if (selectedRadio === 'whatsapp') newFlag = 'W';
    else if (selectedRadio === 'alt') newFlag = 'A';
    else if (selectedRadio === 'paid') newFlag = 'G';
    let finalMeta = currentMeta + newFlag;

    // Customer Language check
    let custLang = (savedOrderData && savedOrderData.language) ? savedOrderData.language : ($('#language-select').val() || 'en');

    const finalData = {
        orderid: editingOrderId, name: newName, phone: newPhone,
        whatsapp: $('#edit-whatsapp').val(), altphone: $('#edit-altphone').val(),
        house: $('#edit-house').val(), place: $('#edit-place').val(),
        pincode: $('#edit-pincode').val(), postoffice: finalPO,
        district: $('#edit-district').val(), state: $('#edit-state').val(),
        quantity: $('#quick-qty').val(), paidNum: $('#edit-paid-by').val() || '',
        adminMeta: finalMeta, message: '', custId: myCustId, language: custLang
    };

    const isAdmin = localStorage.getItem('kafakAdmin') === 'true';

    if (isAdmin) {
        let targetPhone = getSelectedWAPhone(finalData);
        const oldStatus = String(savedOrderData.Status || 'Pending').toLowerCase();

        // CASE: Paid -> Qty Increased
        if (oldStatus === 'paid') {
            let oldQty = parseInt(savedOrderData.quantity) || 0;
            let newQty = parseInt(finalData.quantity) || 0;

            if (newQty > oldQty) {
                let stateKey = getZoneKey(finalData.state);
                let rates = courierRates[stateKey] || {};
                let balance = ((newQty * 650) + (rates[newQty] || 0)) - ((oldQty * 650) + (rates[oldQty] || 0));
                let newTotal = (newQty * 650) + (rates[newQty] || 0);

                showLoader(true);

                fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: finalData }) })
                    .then(res => res.json())
                    .then(res => {
                        fetch(sc, {
                            method: 'POST',
                            body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: finalData.orderid, status: "Sent" }] })
                        }).then(() => {
                            updateLocalCache(finalData, 'Sent');
                            savedOrderData.quantity = newQty;
                            savedOrderData.adminMeta = finalMeta;
                            updateAdminUI('Sent', finalData.orderid);
                            showLoader(false);

                            let msg = "";
                            if (custLang === 'ml') {
                                msg = `*ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്തു!* ✅\nഓർഡർ നമ്പർ: ${finalData.orderid}\n\nഎണ്ണം കൂട്ടിയിട്ടുണ്ട്: ${oldQty} ➡️ *${newQty}*\n\n💰 *അടയ്ക്കാനുള്ള ബാക്കി തുക: ₹${balance}*\n(ആകെ: ₹${newTotal})\n\nബാക്കി തുക GPay ചെയ്താൽ അയക്കുന്നതാണ്. 👍`;
                            } else {
                                msg = `*Order Updated!* ✅\nOrder ID: ${finalData.orderid}\n\nQty increased: ${oldQty} ➡️ *${newQty}*\n\n💰 *Balance to Pay: ₹${balance}*\n(Total: ₹${newTotal})\n\nPlease GPay the balance to confirm. 👍`;
                            }
                            window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                        });
                    });
                return;
            }
        }

        showLoader(true);
        fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: finalData }) })
            .then(() => {
                updateLocalCache(finalData, savedOrderData.Status);
                savedOrderData.quantity = finalData.quantity;
                savedOrderData.adminMeta = finalMeta;
                showLoader(false);
                Swal.fire({ icon: 'success', title: 'Updated!', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
            });
        return;
    }
    playVideoAnimation(finalData.name, () => postOrder(finalData));
}

function updateLocalCache(data, status) {
    userData = { ...userData, ...data, Status: status };
    savedOrderData = JSON.parse(JSON.stringify(userData));

    if (localUsersMap[data.phone]) {
        localUsersMap[data.phone] = { ...localUsersMap[data.phone], ...data, Status: status };
        SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
    }

    let allOrders = JSON.parse(localStorage.getItem('allOrdersCache') || "[]");
    let idx = allOrders.findIndex(o => o.orderid === data.orderid);
    if (idx > -1) {
        allOrders[idx] = { ...allOrders[idx], ...data, Status: status };
        localStorage.setItem('allOrdersCache', JSON.stringify(allOrders));
    }
}

function showReturningUserView(d, isActiveOrder, isServerData) {
    $('#step-0').hide(); $('#wizard-view').hide(); $('#top-progress-container').hide();
    $('#returning-user-view').show();
    updateFooterButtons('returning');
    isEditMode = isActiveOrder;
    savedOrderData = JSON.parse(JSON.stringify(d));

    // 🔥 SAFETY LOCK: Lock everything initially to prevent flicker
    $('#quick-qty').prop('disabled', true);
    $('#btn-edit-addr').hide();

    const lang = $('#language-select').val() || 'en';
    if (d.language) {
        $('#language-select').val(d.language);
        changeLanguage(d.language);
    }

    $('#saved-name').text(d.name); $('#edit-name').val(d.name);
    $('#edit-house').val(d.house); $('#edit-place').val(d.place);
    $('#edit-pincode').val(d.pincode); $('#edit-postoffice').val(d.postoffice);
    $('#edit-district').val(d.district); $('#edit-state').val(d.state);

    if (d.orderid) {
        $('#display-oid').html(`Order ID: <b>${d.orderid}</b>`).show();
        let dateStr = d.timestamp || d.date;
        if (dateStr) $('#display-date').text(formatPrettyDate(dateStr)).show();
    }

    $('#edit-phone').val(d.phone); $('#edit-whatsapp').val(d.whatsapp || d.phone);
    $('#edit-altphone').val(d.altphone || ''); $('#edit-paid-by').val(d.paidNum || '');

    updateSummaryDisplay();

    const isAdmin = localStorage.getItem('kafakAdmin') === 'true';
    $('#admin-comm-panel').remove(); $('#admin-diff-viewer').remove(); $('#admin-qty-actions').remove();

    if (isAdmin) {
        $('#quick-qty').prev('label').show();
        $('#edit-phone, #edit-whatsapp, #edit-altphone').closest('.mb-3').hide();

        let commHTML = `
      <div id="admin-comm-panel" class="mt-3 mb-3 p-3 bg-white border rounded shadow-sm fade-in">
          <div class="text-muted fw-bold small mb-2" style="font-size:11px; letter-spacing:1px;">SELECT TARGET NUMBER 🎯</div>
          <div class="d-flex align-items-center mb-2">
              <div class="flex-grow-1"><label class="small text-muted mb-0">Main Phone</label><input type="tel" id="adm-phone" class="form-control form-control-sm fw-bold bg-light" value="${d.phone}" readonly></div>
              <div class="ms-2 pt-3"><div class="radio-holder"><input class="form-check-input" type="radio" name="target_wa" value="phone" onchange="saveRadioSelection('${d.orderid}', this)" style="transform: scale(1.3);"></div></div>
          </div>
          <div class="d-flex align-items-center mb-2">
              <div class="flex-grow-1"><label class="small text-muted mb-0 text-success">WhatsApp</label><input type="tel" id="adm-whatsapp" class="form-control form-control-sm fw-bold border-success bg-light" value="${d.whatsapp || d.phone}" readonly></div>
              <div class="ms-2 pt-3"><div class="radio-holder"><input class="form-check-input" type="radio" name="target_wa" value="whatsapp" onchange="saveRadioSelection('${d.orderid}', this)" style="transform: scale(1.3); border-color:#25D366;"></div></div>
          </div>
          <div class="d-flex align-items-center mb-2">
              <div class="flex-grow-1"><label class="small text-muted mb-0">Alt Phone</label><input type="tel" id="adm-alt" class="form-control form-control-sm fw-bold bg-light" value="${d.altphone || ''}" placeholder="No Alt Phone" readonly></div>
              <div class="ms-2 pt-3"><div class="radio-holder"><input class="form-check-input" type="radio" name="target_wa" value="alt" onchange="saveRadioSelection('${d.orderid}', this)" style="transform: scale(1.3);"></div></div>
          </div>
          <div class="d-flex align-items-center">
              <div class="flex-grow-1">
                  <label class="small text-muted mb-0 text-primary">Paid By / Custom WA</label>
                  <div class="input-group input-group-sm">
                      <input type="tel" id="adm-paid" class="form-control fw-bold border-primary" placeholder="Paste Number Here..." onchange="$('#edit-paid-by').val(this.value)">
                      <button class="btn btn-outline-primary" type="button" onclick="savePaidNumOnly('${d.orderid}')" title="Save this number only"><i class="fas fa-save"></i></button>
                  </div>
              </div>
              <div class="ms-2 pt-3"><div class="radio-holder"><input class="form-check-input" type="radio" name="target_wa" value="paid" onchange="saveRadioSelection('${d.orderid}', this)" style="transform: scale(1.3);"></div></div>
          </div>
      </div>`;
        $(commHTML).insertBefore('#status-area');
        $('#adm-paid').val(d.paidNum || '');

        let metaStr = d.adminMeta || '';
        let targetVal = 'phone';
        if (metaStr.includes('W')) targetVal = 'whatsapp';
        else if (metaStr.includes('A')) targetVal = 'alt';
        else if (metaStr.includes('G')) targetVal = 'paid';
        $(`input[name="target_wa"][value="${targetVal}"]`).prop('checked', true);

        $(`<div id="admin-diff-viewer" class="mt-2 mb-2 p-3 rounded fade-in" style="display:none; background:#fff3cd; border:1px solid #ffeeba; color:#856404;"></div>`).insertBefore('.btn-update-sage');
        $(`<div id="admin-qty-actions" class="mt-3 fade-in" style="display:none;"></div>`).insertAfter('#admin-diff-viewer');
    }

    $('#status-area').hide().empty();

    if (isServerData) {
        updateStatusUI(d);
        if ($('#refresh-btn').length === 0) {
            $('#returning-user-view').append(`<div class="d-flex justify-content-center mt-4 mb-3 fade-in"><button id="refresh-btn" onclick="manualRefresh()" class="btn btn-sm bg-white shadow-sm rounded-pill text-muted border px-3 py-2"><i class="fas fa-sync-alt me-1"></i> <span>REFRESH STATUS</span></button></div>`);
        }
        handleEditControlsVisibility(d);
    } else {
        $('#status-area').html(`<div class="text-center py-5"><i class="fas fa-hourglass-half fa-spin text-muted"></i></div>`).show();
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
    $('#quick-price-box').hide().empty();

    // 🔥 CRITICAL: Unlock Address Edit & Qty for New Order
    $('#btn-edit-addr').fadeIn().css('display', 'inline-block');
    $('#quick-qty').prop('disabled', false);

    isEditMode = false;
    editingOrderId = null;
    $('#display-oid').hide();
    $('#display-date').hide();

    $('#quick-qty').val('').trigger('change');
    $('#quick-qty option').prop('disabled', false);
    $('#btn-req-modify').remove();

    checkForChanges();
}

window.markOrderDelivered = function (oid) {
    Swal.fire({
        title: 'Order Received?', text: "നിങ്ങൾക്ക് ഓർഡർ ലഭിച്ചോ?", icon: 'question',
        showCancelButton: true, confirmButtonColor: '#28a745', cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Received! ✅', cancelButtonText: 'Not Yet',
        customClass: { popup: 'rounded-4 shadow-lg' }
    }).then((result) => {
        if (result.isConfirmed) {
            $('#btn-mark-delivered').parent().html(`
          <div class="text-success fw-bold text-center py-3 fade-in" style="animation: popIn 0.5s ease;">
              <i class="fas fa-check-circle fa-3x mb-2"></i><br><span style="font-size:16px;">നന്ദി! Enjoy! 🍯</span>
          </div>`);

            Swal.fire({
                title: 'Thank You! ❤️', html: '<div style="font-size:14px;">ഞങ്ങളെ വിശ്വസിച്ച് ഓർഡർ ചെയ്തതിന് നന്ദി!<br>Enjoy the purest honey! 🐝</div>',
                icon: 'success', showConfirmButton: false, timer: 3000, backdrop: `rgba(0,0,0,0.4)`, padding: '2em', customClass: { popup: 'rounded-4' }
            });

            if (typeof userData !== 'undefined') {
                userData.Status = 'Delivered';
                delete userData.quantity;
                saveToLocal(userData.phone, userData);
                updateStatusUI(userData);
                setTimeout(() => { renderEditView(userData); }, 3000);
            }

            fetch(sc, {
                method: 'POST', body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: oid, status: "Delivered" }] })
            }).then(res => res.json()).then(data => console.log("Server Updated: Delivered ✅"))
                .catch(err => console.log("Background Sync Failed"));
        }
    });
}

function updateStatusUI(d) {
    $('#status-area').empty();
    const lang = $('#language-select').val() || 'en';
    const t = translations[lang] || translations['en'];
    let s = String(d.Status || d.status || 'pending').toLowerCase();

    const isPaid = ['paid', 'dispatched', 'delivered', 'refunded', 'completed'].includes(s);
    const isDispatched = ['dispatched', 'delivered', 'refunded', 'completed'].includes(s);
    const isDelivered = ['delivered', 'completed'].includes(s);
    const isRefunded = (s === 'refunded');

    let timelineHTML = `<div class="tracking-wrapper" style="opacity:0; transition: opacity 0.5s ease-in-out;">
        <h6 class="fw-bold mb-4 ps-1" style="font-size:13px; color:#374151; letter-spacing:0.5px;">${t.lbl_order_status}</h6>
        <div class="modern-timeline">`;

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
        let dateHtml = (item.date && item.active) ? `<div class="ms-auto text-muted small fw-bold" style="font-size:10px; background:#f3f4f6; padding:2px 8px; border-radius:10px;">${formatPrettyDate(item.date)}</div>` : '';

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
                    <div class="d-flex justify-content-between align-items-start"><div class="fw-bold text-dark" style="font-size:14px;">${item.title}</div>${dateHtml}</div>
                    <div class="text-muted small mt-1" style="font-size:12px; line-height:1.4;">${item.desc}</div>${extraContent}
                </div>
            </div>`;
    });
    timelineHTML += `</div></div>`;

    if (s === 'dispatched') {
        timelineHTML += `
            <div class="mt-4 px-2 text-center fade-in">
                <div class="text-muted fw-bold mb-3" style="font-size:11px; letter-spacing:0.5px; text-transform:uppercase;">${t.txt_received_helper}</div>
                <button id="btn-mark-delivered" onclick="markOrderDelivered('${d.orderid}')" class="btn w-100 py-3 shadow-lg" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; border-radius: 16px; border: none; position: relative; overflow: hidden; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">
                    <div class="d-flex align-items-center justify-content-center gap-2">
                        <div style="background:rgba(255,255,255,0.2); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center;"><i class="fas fa-check text-white" style="font-size:14px;"></i></div>
                        <div class="text-start"><div style="font-size:14px; font-weight:800; letter-spacing:0.5px; line-height:1.2;">YES, I RECEIVED IT</div><div style="font-size:10px; opacity:0.9; font-weight:500;">Click to mark as Delivered</div></div>
                    </div>
                </button>
            </div>`;
    }
    $('#status-area').html(timelineHTML);
    $('#status-area').fadeIn(500, function () { $('.tracking-wrapper').css('opacity', '1'); });
}

function updateSummaryDisplay() {
    const newName = $('#edit-name').val();
    if (newName) $('#saved-name').text(newName);
    const house = $('#edit-house').val() || '';
    const place = $('#edit-place').val() || '';

    let po = ($('#edit-postoffice-select').is(':visible') && $('#edit-postoffice-select').val()) ? $('#edit-postoffice-select').val() : ($('#edit-postoffice').val() || '');
    const pin = $('#edit-pincode').val() || '';
    const dist = $('#edit-district').val() || '';
    const state = $('#edit-state').val() || 'KERALA';
    const wa = $('#edit-whatsapp').val() || '';
    const alt = $('#edit-altphone').val();
    const phone = $('#edit-phone').val() || '';
    const safe = (val) => String(val || '').trim().toUpperCase();

    let poClean = safe(po).replace(/P\.?O\.?$/i, '').trim();
    if (poClean) poClean += ' PO';

    let addrHtml = `<span class="addr-house">${safe(house)}</span> ${safe(place)}${place && poClean ? ',' : ''} <b>${poClean}</b><br><span style="font-weight:600;">${safe(dist)}, ${safe(state)}</span> <span class="pin-box">${safe(pin)}</span>`;
    $('#saved-address-text').html(addrHtml);

    let phoneHtml = `<div class="phone-grey-box"><div class="ph-row"><i class="fas fa-phone-alt text-secondary" style="width:20px; text-align:center;"></i> <span style="color:#374151; font-weight:700; font-size:14px;">${phone}</span>${alt ? `<span style="color:#ccc; margin:0 5px;">|</span> <span style="color:#666;">${alt}</span>` : ''}</div>${wa ? `<div class="ph-row"><i class="fab fa-whatsapp" style="color:#25D366; font-size:18px; width:20px; text-align:center;"></i> <span style="color:#25D366; font-weight:700; font-size:14px;">${wa}</span></div>` : ''}</div>`;
    $('#saved-phone-text').html(phoneHtml);
    $('#saved-wa-text, #saved-alt-text').hide();

    if (typeof checkForChanges === 'function') checkForChanges();
}

function checkAndHideEditButton() {
    if (typeof userData !== 'undefined' && userData.Status) { applyHideLogic(userData.Status); return; }
    let hiddenStatus = $('#order-status-hidden').val();
    if (hiddenStatus) applyHideLogic(hiddenStatus);
}

function applyHideLogic(status) {
    let s = String(status).toLowerCase().trim();
    if (['paid', 'dispatched', 'refunded'].includes(s)) { $('#btn-edit-addr').hide(); }
    else { $('#btn-edit-addr').css('display', 'inline-flex'); }
}

window.updatePrice = function (qty, isQuick) {
    const container = isQuick ? $('#quick-price-box') : $('#wiz-price-box');
    if (!qty) { container.hide(); return; }

    const lang = $('#language-select').val() || 'ml';
    const t = translations[lang];
    const n = parseInt(qty);
    const base = n * 650;
    let currentState = isQuick ? $('#edit-state').val() : ((userData && userData.state) ? userData.state : ($('#state').val() || 'KERALA'));
    const zone = getZoneKey(currentState);
    const courier = (courierRates[zone] && courierRates[zone][n]) ? courierRates[zone][n] : 0;
    const total = base + courier;

    let htmlContent = `<div class="price-row"><span>${t.lbl_honey_price} (<span class="qty-count">${n}</span>)</span><span>₹<span class="val-base">${base}</span></span></div><div class="price-row"><span>${t.lbl_courier_charge}</span><span>₹<span class="val-courier">${courier}</span></span></div><div class="price-total"><span>${t.lbl_total_amount}</span><span class="text-success">₹<span class="val-total">${total}</span></span></div>`;
    container.html(htmlContent); container.fadeIn();

    if (!isQuick) {
        let name = $('#name').val(), house = $('#house').val(), place = $('#place').val();
        let po = (userData.postoffice || '').toUpperCase(), dist = (userData.district || '').toUpperCase();
        let state = (userData.state || 'KERALA').toUpperCase(), pin = $('#pincode').val(), phone = $('#phone').val(), wa = $('#whatsapp').val();
        let prettyHtml = `<div style="padding: 8px 0; border-bottom: 1px dashed #e0e0e0; margin-bottom: 10px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"><div style="font-size: 10px; font-weight: 800; color: #9ca3af; letter-spacing: 1px;">${t.lbl_deliver_to}</div><div style="font-size: 11px; font-weight: 700; color: #25D366;"><i class="fab fa-whatsapp"></i> ${wa}</div></div><div style="font-size: 14px; font-weight: 800; color: #1a1a1a; text-transform: uppercase;">${name}</div><div style="font-size: 12px; color: #4b5563; line-height: 1.6; text-transform: uppercase;"><span style="font-weight: 600;">${house}</span>, ${place}, ${po},<br/>${dist}, ${state} - <b>${pin}</b></div></div>`;
        $('#wiz-final-addr').html(prettyHtml); $('#wiz-deliver-box').fadeIn();
    }
    if (isQuick) checkForChanges();
}

$('#place').on('input keyup focus', function () {
    if ($('#display-po').length === 0) $('<div id="display-po" style="display:none;"></div>').insertAfter('#place');
    if ($('#display-dist-state').length === 0) $('<div id="display-dist-state" style="display:none;"></div>').insertAfter('#place');
    try { if (typeof updateWizardLocDisplay === 'function') updateWizardLocDisplay(); } catch (e) { }
    updateLiveAddressPreview();
});

function updateLiveAddressPreview() {
    let poRaw = $('#display-po').text() || '';
    let place = $('#place').val() || '';
    let po = poRaw.replace(/\s+PO\s*$/i, '').trim();
    if (po) po += ' PO';
    let dist = userData.district || '', state = userData.state || $('#state').val() || 'KERALA', pin = $('#pincode').val() || '';
    if (dist.toLowerCase() === place.toLowerCase()) dist = '';
    let lang = $('#language-select').val() || 'en';
    let t = translations[lang];
    let previewHtml = `<div class="text-danger fw-bold mb-2" style="margin-top: 5px; font-size:11px; letter-spacing:0.5px; border-bottom:1px dashed #e0e0e0; padding-bottom:8px;"><i class="fas fa-info-circle"></i> ${t.warn_place_only}</div><div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 15px; margin-top: 8px;"><div style="font-size: 13px; line-height: 1.6; color: #333;"><div style="font-weight: 700; text-transform: uppercase; color: #000;">${po}</div><div style="text-transform: uppercase;">${place ? place : ''}${place && dist ? ', ' : ''} <span style="text-transform: uppercase; font-weight:600;">${dist}</span></div><div style="text-transform: uppercase; font-size: 12px; color: #555; margin-top:2px;">${state} - <span style="font-weight: 800; color: #000;">${pin}</span></div></div></div>`;
    if ($('#live-addr-preview').length === 0) $('<div id="live-addr-preview"></div>').insertAfter('#place');
    $('#live-addr-preview').html(previewHtml);
}
setTimeout(updateLiveAddressPreview, 1000);

function checkForChanges() {
    var currQty = $('#quick-qty').val() || '', currName = $('#edit-name').val() || '', currPhone = $('#edit-phone').val() || '';
    var currWa = $('#edit-whatsapp').val() || '', currHouse = $('#edit-house').val() || '', currPlace = $('#edit-place').val() || '';
    var currPin = $('#edit-pincode').val() || '', currAlt = $('#edit-altphone').val() || '';

    var savedQty = (savedOrderData.quantity || '') + '', savedName = (savedOrderData.name || '') + '', savedPhone = (savedOrderData.phone || '') + '';
    var savedWa = (savedOrderData.whatsapp || savedOrderData.phone || '') + '', savedHouse = (savedOrderData.house || '') + '';
    var savedPlace = (savedOrderData.place || '') + '', savedPin = (savedOrderData.pincode || '') + '', savedAlt = (savedOrderData.altphone || '') + '';

    var isChanged = false, isQtyChanged = (String(currQty) !== String(savedQty));
    if (isQtyChanged) isChanged = true;
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

    // 🔥🔥🔥 ADMIN DYNAMIC BUTTON LOGIC 🔥🔥🔥
    const isAdmin = localStorage.getItem('kafakAdmin') === 'true';
    if (isAdmin && editingOrderId) {
        if (isQtyChanged) {
            let oldQty = parseInt(savedQty) || 0, newQty = parseInt(currQty) || 0;
            let stateKey = getZoneKey($('#edit-state').val()), rates = courierRates[stateKey] || {};
            let oldTotal = (oldQty * 650) + (rates[oldQty] || 0), newTotal = (newQty * 650) + (rates[newQty] || 0);
            let balance = newTotal - oldTotal;

            $('#admin-diff-viewer').html(`<div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold" style="font-size:13px;">Qty: ${oldQty} ➡ ${newQty}</div><div class="small text-muted">New Total: ₹${newTotal}</div></div><div class="text-end"><div class="fw-bold text-danger" style="font-size:16px;">Bal: ${balance > 0 ? '+' : ''}₹${balance}</div></div></div>`).slideDown();
            $('#admin-action-bar').hide();

            let actionHtml = `<div class="d-flex gap-2"><button onclick="handleQtyUpdateAction('Sent', ${balance}, ${newTotal}, ${oldQty}, ${newQty})" class="btn w-50 shadow-sm text-white fw-bold" style="background:#fd7e14; border-radius:10px; font-size:13px;"><i class="fab fa-whatsapp"></i> Update & Notify<br><span style="font-size:10px; opacity:0.8;">(Ask Balance)</span></button><button onclick="handleQtyUpdateAction('Paid', ${balance}, ${newTotal}, ${oldQty}, ${newQty})" class="btn w-50 shadow-sm text-white fw-bold" style="background:#198754; border-radius:10px; font-size:13px;"><i class="fas fa-check-circle"></i> Update & PAID<br><span style="font-size:10px; opacity:0.8;">(Payment Recd)</span></button></div>`;
            $('#admin-qty-actions').html(actionHtml).slideDown();
            btnUpdate.hide();
        } else {
            $('#admin-diff-viewer').slideUp(); $('#admin-qty-actions').slideUp(); $('#admin-action-bar').slideDown(); btnUpdate.show();
        }
    }

    if (!isAdmin || !isQtyChanged) {
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
    showLoader(true); fetchOrder(oid);
}

window.updateAdminUI = function (serverStatus, oid) {
    let status = String(serverStatus || '').trim();
    status = status.charAt(0).toUpperCase() + status.slice(1);
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let hasPending = updates.some(u => u.oid === oid);
    let syncColor = hasPending ? "btn-info text-white" : "btn-light text-muted border";
    let syncBtn = `<button onclick="syncSingleOrder('${oid}')" class="btn ${syncColor} btn-sm shadow-sm ms-1" style="width:45px;" title="Sync to Server"><i class="fas fa-cloud-upload-alt"></i></button>`;
    let btnHTML = '';

    if (status === 'Archive') {
        btnHTML = `<div class="d-flex w-100"><button onclick="adminAction('${oid}', 'Paid')" class="btn btn-dark btn-sm fw-bold flex-grow-1 shadow-sm" style="background:#444; border:none;">📂 (Archived) TO PAID</button>${syncBtn}</div>`;
    } else if (status === 'Pending') {
        btnHTML = `<div class="d-flex gap-2 w-100"><button onclick="adminAction('${oid}', 'Sent')" class="btn btn-primary btn-sm fw-bold flex-grow-1 shadow-sm">💬 MARK SENT</button>${syncBtn}<button onclick="adminAction('${oid}', 'Archive')" class="btn btn-outline-secondary btn-sm" style="width:40px;"><i class="fas fa-archive"></i></button></div>`;
    } else if (status === 'Sent') {
        btnHTML = `<div class="d-flex gap-2 w-100"><button onclick="adminAction('${oid}', 'Paid')" class="btn btn-warning btn-sm fw-bold flex-grow-1 shadow-sm text-dark">💰 MARK PAID</button>${syncBtn}<button onclick="adminAction('${oid}', 'Archive')" class="btn btn-outline-secondary btn-sm" style="width:40px;"><i class="fas fa-archive"></i></button></div>`;
    } else if (status === 'Delivered') {
        btnHTML = `<div class="d-flex w-100"><button class="btn btn-success btn-sm fw-bold flex-grow-1 shadow-sm" disabled>DELIVERED ✅</button>${syncBtn}</div>`;
    } else if (status === 'Paid') {
        if (!hasPending) {
            btnHTML = `<div class="d-flex gap-2 w-100"><button class="btn btn-success btn-sm fw-bold shadow-sm disabled" style="opacity:1;">PAID ✅</button><button onclick="sendPaymentWA('${oid}')" class="btn btn-success btn-sm fw-bold flex-grow-1 shadow-sm" style="background:#25D366; border-color:#25D366;"><i class="fab fa-whatsapp"></i> SEND RECEIPT</button></div>`;
        } else {
            btnHTML = `<div class="d-flex w-100"><button class="btn btn-success btn-sm fw-bold flex-grow-1 shadow-sm" disabled>PAID ✅</button>${syncBtn}</div>`;
        }
    } else {
        let displayTxt = status === 'Dispatched' ? 'DISPATCHED' : (status === 'Completed' ? 'COMPLETED' : status.toUpperCase());
        btnHTML = `<div class="d-flex w-100"><button class="btn btn-secondary btn-sm fw-bold flex-grow-1 shadow-sm" disabled>${displayTxt} ✅</button>${syncBtn}</div>`;
    }
    $('#admin-btn-container').html(btnHTML); $('#admin-action-bar').slideDown();
}

window.adminAction = async function (oid, status) {
    if (status === 'Archive') {
        if (!confirm(`Move to Archive?`)) return;
        fetch(sc, { method: 'POST', body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: oid, status: status }] }) })
            .then(res => res.json()).then(data => {
                let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
                updates = updates.filter(item => item.oid !== oid);
                localStorage.setItem('pendingUpdates', JSON.stringify(updates));
                Swal.fire({ icon: 'success', title: 'Archived!', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                updateAdminUI(status, oid);
            });
        return;
    }

    let selectedDate = null;
    if (status === 'Paid') {
        const { value: dateVal } = await Swal.fire({
            title: 'Mark as PAID',
            html: `<div style="text-align:center;"><label style="font-size:12px; color:#666; font-weight:700; margin-bottom:5px; display:block;">SELECT PAYMENT TIME</label><input type="text" id="flatpickr-paid" class="form-control text-center fw-bold" style="font-size:18px; padding:10px; border:2px solid #eee; border-radius:12px;" placeholder="Select Date..."></div>`,
            showCancelButton: true, confirmButtonText: 'Save Paid', confirmButtonColor: '#28a745', focusConfirm: false,
            didOpen: () => { flatpickr("#flatpickr-paid", { enableTime: true, dateFormat: "Y-m-d H:i", defaultDate: new Date(), theme: "material_blue", time_24hr: false, disableMobile: false }); },
            preConfirm: () => { return document.getElementById('flatpickr-paid').value; }
        });
        if (!dateVal) return;
        selectedDate = dateVal;
    } else {
        if (!confirm(`Mark as '${status}'? (Saved Locally)`)) return;
        if (status === 'Dispatched') {
            const now = new Date();
            selectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
    }

    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    updates = updates.filter(item => item.oid !== oid);
    let oldStatus = 'Pending';
    if (typeof userData !== 'undefined' && userData.orderid === oid) oldStatus = userData.Status || 'Pending';

    let needsRefundDelete = (String(oldStatus).trim().toLowerCase() === 'refunded' && status !== 'Refunded');

    updates.push({ oid: oid, status: status, oldStatus: oldStatus, actionDate: selectedDate, time: new Date().getTime(), deleteRefund: needsRefundDelete });
    localStorage.setItem('pendingUpdates', JSON.stringify(updates));

    if (typeof userData !== 'undefined') userData.Status = status;
    if (typeof savedOrderData !== 'undefined') savedOrderData.Status = status;

    Swal.fire({ icon: 'success', title: `Saved: ${status}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    updateAdminUI(status, oid);
}

window.syncSingleOrder = function (oid) {
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let myUpdate = updates.find(u => u.oid === oid);
    if (!myUpdate) { Swal.fire({ icon: 'info', title: 'Already Synced', toast: true, position: 'top', showConfirmButton: false, timer: 1500 }); return; }

    const btn = $('#admin-btn-container button').find('.fa-cloud-upload-alt').parent();
    let originalHtml = btn.html();
    btn.html('<i class="fas fa-spinner fa-spin"></i>').prop('disabled', true);

    let promises = [];
    if (myUpdate.deleteRefund) promises.push(fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'deleteRefund', oid: oid }) }));
    promises.push(fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'bulkUpdateStatus', updates: [myUpdate] }) }));

    Promise.all(promises).then(responses => Promise.all(responses.map(r => r.json()))).then(dataList => {
        if (dataList.some(d => d.result === 'success')) {
            let newUpdates = updates.filter(u => u.oid !== oid);
            localStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));
            Swal.fire({ icon: 'success', title: 'Synced Successfully!', toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
            updateAdminUI(myUpdate.status, oid);
        } else { alert("Sync Failed"); btn.html(originalHtml).prop('disabled', false); }
    }).catch(err => { alert("Network Error"); btn.html(originalHtml).prop('disabled', false); });
}

window.clearAdminCache = function () { if (confirm("Cache ക്ലിയർ ചെയ്ത് റീലോഡ് ചെയ്യണോ?")) { SafeStorage.removeItem('allOrdersCache'); location.reload(); } }

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
    $('body').append(`<style>#videoModal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;flex-direction:column;align-items:center;justify-content:center}.video-container{position:relative;width:320px;height:576px;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.5);border:2px solid #333}video{width:100%;height:100%;object-fit:cover}.digital-label{position:absolute;top:67%;left:53%;transform:translate(-30%,-50%) scale(.7);width:128px;height:128px;border-radius:50%;background:radial-gradient(circle,#fff 40%,#ffe6a0 100%);box-shadow:0 10px 30px rgba(0,0,0,.4);border:1px solid rgba(0,0,0,.1);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:10;opacity:0;transition:all .8s cubic-bezier(.25,.8,.25,1)}.digital-label.visible{opacity:1;transform:translate(-50%,-50%) scale(1)}.content-group{display:flex;flex-direction:column;align-items:center;transition:transform .8s ease-in-out}.digital-label img{width:60px;opacity:.95;margin-bottom:2px}.packed-text{font-family:Montserrat,sans-serif;font-size:10px;color:#5d4037;text-transform:uppercase;letter-spacing:1.5px;font-weight:800}.digital-label.final-state .content-group{transform:translateY(-18px) scale(.9)}.check-wrapper{position:absolute;bottom:4px;left:50%;transform:translateX(-50%) scale(0);transition:transform .4s cubic-bezier(.175,.885,.32,1.27)}.check-wrapper.show{transform:translateX(-50%) scale(1)}.checkmark-svg{width:28px;height:28px;stroke:#28a745;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;fill:none;stroke-dasharray:50;stroke-dashoffset:50;transition:stroke-dashoffset .4s ease-in-out}.check-wrapper.draw .checkmark-svg{stroke-dashoffset:0}.name-wrapper{position:absolute;top:50%;left:50%;z-index:999;transform:translate(-100%,-250%) scale(1.2);opacity:0;transition:all 1s cubic-bezier(.25,1,.5,1);display:flex;justify-content:center;align-items:center;width:100%}.user-name{font-family:'Courier New',monospace;font-size:25px;font-weight:900;color:#fff;text-transform:uppercase;padding-bottom:2px;background-color:#000;height:32px;display:flex;align-items:center;justify-content:center;width:auto;min-width:163px;padding-left:15px;padding-right:15px;padding-top:2px;border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,.3);white-space:nowrap}.name-wrapper.show-big{opacity:1;transform:translate(-50%,-250%) scale(1.2)}.name-wrapper.docked{top:67%;left:53%;transform:translate(-50%,2px) scale(.5);opacity:1}.loading-txt{color:#d4a017;margin-top:20px;font-family:sans-serif;font-size:12px;letter-spacing:2px;opacity:.8}</style><div id="videoModal"><div class="video-container"><video id="honeyVideo" muted playsinline preload="auto"><source src="honey_rotate.mp4" type="video/mp4"></video><div class="digital-label" id="customLabel"><div class="content-group"><img src="images/kafak_logo.png" alt="Kafak"><div class="packed-text" data-i18n="lbl_reserved_for">RESERVED FOR</div></div><div class="check-wrapper" id="finalCheck"><svg class="checkmark-svg" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"></path></svg></div></div><div class="name-wrapper" id="nameBadge"><div class="user-name" id="vid-username"></div></div></div><div class="loading-txt" data-i18n="lbl_preparing">PREPARING YOUR ORDER...</div></div>`);
}

function preloadHoneyVideo() { const v = document.getElementById('honeyVideo'); if (v) v.load(); }

function playVideoAnimation(userName, apiCallback) {
    $('#videoModal').css('display', 'flex').fadeIn();
    const video = document.getElementById('honeyVideo');
    const label = $('#customLabel');
    const nameBadge = $('#nameBadge');
    const checkWrapper = $('#finalCheck');
    const nameBox = document.getElementById('vid-username');

    label.removeClass('visible final-state'); nameBadge.removeClass('show-big docked'); checkWrapper.removeClass('show draw'); nameBox.innerText = "";
    let fontSize = userName.length > 20 ? 16 : (userName.length > 12 ? 20 : 25);
    $('#vid-username').css('font-size', fontSize + 'px');

    video.currentTime = 0; video.play().catch(e => console.log("Auto-play blocked", e));
    apiCallback();

    setTimeout(() => { label.addClass('visible'); }, 4700);
    setTimeout(() => { nameBadge.addClass('show-big'); }, 5500);
    setTimeout(() => {
        let i = 0, text = userName.replace(/ /g, "\u00A0"); nameBox.innerText = "";
        let typeInterval = setInterval(() => { if (i < text.length) { nameBox.innerText += text.charAt(i); i++; } else { clearInterval(typeInterval); } }, 80);
    }, 5800);
    setTimeout(() => { nameBadge.removeClass('show-big').addClass('docked'); label.addClass('final-state'); }, 7800);
    setTimeout(() => { checkWrapper.addClass('show'); setTimeout(() => { checkWrapper.addClass('draw'); }, 100); }, 8300);
}

function postOrder(data) {
    const startTime = Date.now(); window.orderSuccess = false;
    fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: data }) }).then(res => res.json()).then(res => {
        if (res.result === 'success') {
            successData = { ...data, orderid: res.orderid, timestamp: res.timestamp };
            if (res.custId) { data.custId = res.custId; myCustId = res.custId; localUsersMap[data.phone] = data; SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap)); }
            window.orderSuccess = true;
            const elapsed = Date.now() - startTime;
            const waitTime = Math.max(0, 8800 - elapsed);
            setTimeout(() => { $('#videoModal').fadeOut(); $('#order-form').hide(); $('#showsuccess').fadeIn(); updateFooterButtons('none'); setTimeout(sendToWhatsapp, 1500); }, waitTime);
        }
    }).catch(() => { $('#videoModal').fadeOut(); showAlert("Connection failed. Try again."); });
}

function fetchCourierRates() {
    const lang = $('#language-select').val() || 'en';
    const t = translations[lang] || translations['en'];
    const loadingTxt = t.loading || "Loading Options...";
    let currentSelection = $('#quick-qty').val();
    $('#quantity, #quick-qty').html(`<option value="">${loadingTxt}</option>`);

    let cachedRates = SafeStorage.getItem('cachedRates');
    let cacheValid = false;
    if (cachedRates) {
        try {
            let parsed = JSON.parse(cachedRates);
            if (parsed && parsed.KERALA) { courierRates = parsed; globalQtyList = Object.keys(parsed.KERALA).map(Number).sort((a, b) => a - b); renderQtyDropdowns(); cacheValid = true; }
        } catch (e) { }
    }

    const serverFetch = fetch(`${sc}?action=getRates`).then(res => res.json()).then(data => {
        if (data.result === 'success' && data.rates) {
            courierRates = data.rates;
            if (data.adminPhone) adminPhone = String(data.adminPhone);
            if (data.rates.KERALA) globalQtyList = Object.keys(data.rates.KERALA).map(Number).sort((a, b) => a - b);
            SafeStorage.setItem('cachedRates', JSON.stringify(data.rates));
            let restoreQty = currentSelection || (typeof savedOrderData !== 'undefined' ? savedOrderData.quantity : null);
            renderQtyDropdowns();
            if (restoreQty) { $('#quick-qty').val(restoreQty); updatePrice(restoreQty, true); }
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
        let weightText = (totalGrams >= 1000) ? (totalGrams / 1000).toFixed(2) + " " + (t.txt_kg || "kg") : totalGrams + (t.txt_g || "g");
        let bottleLabel = (qty === 1) ? (t.txt_bottle || "Bottle") : (t.txt_bottles || "Bottles");
        optionsHTML += `<option value="${qty}">${qty} ${bottleLabel} (${weightText})</option>`;
    });
    $('#quantity').html(optionsHTML); $('#quick-qty').html(optionsHTML);

    if (editingOrderId && typeof savedOrderData !== 'undefined' && savedOrderData.quantity) {
        $('#quick-qty').val(savedOrderData.quantity);
        if (!$('#quick-qty').val()) $('#quick-qty').append(`<option value="${savedOrderData.quantity}" selected>${savedOrderData.quantity} Bottles (Old Order)</option>`);
        updatePrice($('#quick-qty').val(), true);
    }
}

function renderSingleSyncItem(u) {
    // Sync modal item rendering... (Simplified for brevity as user uses this for Admin)
    const list = document.getElementById('single-sync-list');
    let fromStatus = u.oldStatus || "Pending";
    let html = `<div class="d-flex align-items-center justify-content-between"><div><div class="fw-bold text-dark mb-1" style="font-size:14px;">${u.oid}</div><div style="font-size:13px; color:#555;"><span class="badge bg-light text-secondary border">${fromStatus}</span> <i class="fas fa-long-arrow-alt-right mx-1 text-muted"></i> <span class="badge bg-secondary">${u.status}</span></div></div><button onclick="discardSingleChanges()" class="btn btn-sm btn-outline-danger border-0 bg-white shadow-sm" style="width:35px; height:35px; border-radius:50%;"><i class="fas fa-undo"></i></button></div>`;
    list.innerHTML = html;
}

window.performSingleSync = function () {
    if (!activeSyncOid) return;
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let myUpdate = updates.find(u => u.oid === activeSyncOid);
    if (!myUpdate) return;
    const btn = $('#singleSyncModal .btn-dark'); let originalHtml = btn.html(); btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> UPLOADING...');
    fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'bulkUpdateStatus', updates: [myUpdate] }) }).then(res => res.json()).then(data => {
        if (data.result === 'success') {
            let newUpdates = updates.filter(u => u.oid !== activeSyncOid);
            localStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));
            $('#singleSyncModal').modal('hide');
            Swal.fire({ icon: 'success', title: 'Synced!', toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
            updateAdminUI(myUpdate.status, activeSyncOid);
        } else { alert("Sync Failed!"); }
    }).catch(err => alert("Network Error")).finally(() => { btn.prop('disabled', false).html(originalHtml); });
}

window.discardSingleChanges = function () {
    if (!activeSyncOid) return;
    if (!confirm("Discard?")) return;
    let updates = JSON.parse(localStorage.getItem('pendingUpdates') || "[]");
    let myUpdate = updates.find(u => u.oid === activeSyncOid);
    let oldStatus = myUpdate ? (myUpdate.oldStatus || "Pending") : "Pending";
    let newUpdates = updates.filter(u => u.oid !== activeSyncOid);
    localStorage.setItem('pendingUpdates', JSON.stringify(newUpdates));
    $('#singleSyncModal').modal('hide');
    updateAdminUI(oldStatus, activeSyncOid);
    showToast('info', 'Discarded');
}

function showToast(icon, title) { Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: icon, title: title }); }

function sendToWhatsapp() {
    const d = successData; const safe = (val) => String(val || '').trim().toUpperCase();
    const lang = $('#language-select').val() || 'en'; const t = translations[lang] || translations['en'];
    let dateObj = new Date(); if (d.timestamp) { let s = new Date(d.timestamp); if (!isNaN(s.getTime())) dateObj = s; }
    const formattedTime = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}, ${dateObj.getHours() % 12 || 12}:${String(dateObj.getMinutes()).padStart(2, '0')} ${dateObj.getHours() >= 12 ? 'PM' : 'AM'}`;

    let isUpdate = (typeof savedOrderData !== 'undefined' && savedOrderData.orderid == d.orderid);
    let header = isUpdate ? `*${t.wa_header_update}*\n⌚ _${formattedTime}_\n\n${t.wa_check_status}\n🔗 _https://kafaklife.com/order.html?oid=${d.orderid}_\n` : `*${t.wa_header_new}*\n⌚ _${formattedTime}_\n\n${t.wa_check_status}\n🔗 _https://kafaklife.com/order.html?oid=${d.orderid}_\n`;

    const n = parseInt(d.quantity); const base = n * 650; const zone = getZoneKey(d.state); const courier = (courierRates[zone] && courierRates[zone][n]) ? courierRates[zone][n] : 0; const total = base + courier;
    const details = `\n____________________________________\n*${safe(d.name)}*\n*${safe(d.house)}*\n*${safe(d.place)}*\n*${safe(d.postoffice)}*\n*${safe(d.district)}*\n*${safe(d.state)}*\n*Pin: ${d.pincode}*\n*Ph: ${d.phone}*${d.altphone ? `\n*Alt Ph: ${d.altphone}*` : ''}\n\n*Qty: ${d.quantity}*\n*Amount: ₹${base} + ${courier}*\n*Total: ₹${total}/-*\n____________________________________`;

    let paymentNote = (lang === 'en') ? "\n\n👉 Please send the screenshot after GPay.. 📸\n_(Packing starts only after receiving the screenshot)_" : "\n\nGpay ചെയ്തശേഷം സ്ക്രീൻഷോട്ട് അയക്കൂ.. 📸\n_(സ്ക്രീൻഷോട്ട് ലഭിച്ച ശേഷമാണ് പാക്കിംഗ് നടപടികൾ ആരംഭിക്കുക)_";
    const footer = `\n\n*${t.txt_gpay}: ${adminPhone} (KAFAK LLP)*${paymentNote}`;
    window.location.href = `https://wa.me/91${adminPhone}?text=${encodeURIComponent(header + details + footer)}`;
}

function renderEditView(data) {
    const status = String(data.Status || 'pending').toLowerCase();
    if (['completed', 'delivered', 'refunded'].includes(status)) { showReturningUserView(data, false, true); enableNewOrderMode(); return; }
    const isActive = !(['dispatched'].includes(status));
    showReturningUserView(data, isActive, true);
    updateEditUIState(data);
}

function updateEditUIState(data) {
    updateStatusUI(data); handleEditControlsVisibility(data);
    if (data.quantity) { $('#quick-qty').val(data.quantity); updatePrice(data.quantity, true); }
}

// 🔥 SEND PAYMENT RECEIPT (Unified English + Malayalam)
window.sendPaymentWA = function (oid) {
    let order = (typeof userData !== 'undefined' && userData.orderid === oid) ? userData : (JSON.parse(localStorage.getItem('allOrdersCache') || "[]").find(o => o.orderid === oid));
    if (!order) { alert("Order Data Missing!"); return; }
    let trackLink = `https://kafaklife.com/order.html?oid=${oid}`;
    let msg = `✅ *Payment Received!* Thank you❤️\n*പേയ്‌മെന്റ് ലഭിച്ചു! നന്ദി*\n\n🚛 *Order will be delivered within 4-5 days.*\n*4-5 ദിവസത്തിനുള്ളിൽ ഓർഡർ നിങ്ങൾക്ക് ലഭിക്കുന്നതാണ്.*\n\n👇 *Order Status:*\n${trackLink}`;
    let phone = getSelectedWAPhone(order);
    if (!phone) { alert("Please enter/select a valid number!"); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.getSelectedWAPhone = function (order) {
    let selectedRaw = "";
    if ($('input[name="target_wa"]:checked').length > 0) {
        let selected = $('input[name="target_wa"]:checked').val();
        if (selected === 'phone') selectedRaw = $('#adm-phone').val() || order.phone;
        else if (selected === 'whatsapp') selectedRaw = $('#adm-whatsapp').val() || order.whatsapp || order.phone;
        else if (selected === 'alt') selectedRaw = $('#adm-alt').val();
        else if (selected === 'paid') selectedRaw = $('#adm-paid').val();
    } else { selectedRaw = order.whatsapp || order.phone; }
    if (!selectedRaw) return "";
    let cleanNum = String(selectedRaw).replace(/[^0-9]/g, '');
    if (cleanNum.length === 10) cleanNum = '91' + cleanNum;
    else if (cleanNum.length > 10 && cleanNum.startsWith('0')) cleanNum = '91' + cleanNum.substring(1);
    return cleanNum;
}

window.savePaidNumOnly = function (oid) {
    let rawNum = $('#adm-paid').val();
    let cleanNum = rawNum.replace(/[^0-9]/g, '');
    if (cleanNum.length < 10) { Swal.fire({ icon: 'warning', title: 'Invalid Number', timer: 1500, showConfirmButton: false }); return; }
    let btn = $('#adm-paid').next('button'); let originalIcon = btn.html(); btn.html('<i class="fas fa-spinner fa-spin"></i>').prop('disabled', true);
    fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'updatePaidNum', oid: oid, num: cleanNum }) }).then(res => res.json()).then(data => {
        if (data.result === 'success') {
            if (userData) userData.paidNum = cleanNum; if (savedOrderData) savedOrderData.paidNum = cleanNum;
            btn.html('<i class="fas fa-check"></i>').removeClass('btn-outline-primary').addClass('btn-success');
            setTimeout(() => { btn.html('<i class="fas fa-save"></i>').removeClass('btn-success').addClass('btn-outline-primary').prop('disabled', false); }, 2000);
            $('input[name="target_wa"][value="paid"]').prop('checked', true);
        } else { alert("Save Failed!"); btn.html(originalIcon).prop('disabled', false); }
    }).catch(err => { alert("Network Error"); btn.html(originalIcon).prop('disabled', false); });
}

window.handleQtyUpdateAction = function (targetStatus, balance, newTotal, oldQty, newQty) {
    if (!$('#quick-qty').val()) { showAlert(getAlert('err_qty')); return; }
    let finalPO = $('#edit-postoffice').val();
    if ($('#edit-postoffice-select').is(':visible')) finalPO = $('#edit-postoffice-select').val();
    if (!finalPO) { showAlert(getAlert('err_select_po') || "Please Select Post Office"); if ($('.address-box').is(':hidden')) toggleAddressEdit(); return; }
    $('#edit-postoffice').val(finalPO);
    if ($('#adm-phone').length) $('#edit-phone').val($('#adm-phone').val());
    if ($('#adm-paid').length) $('#edit-paid-by').val($('#adm-paid').val());

    let currentMeta = (savedOrderData.adminMeta || '').replace(/[MWAG]/g, '');
    let selectedRadio = $('input[name="target_wa"]:checked').val();
    let newFlag = selectedRadio === 'whatsapp' ? 'W' : (selectedRadio === 'alt' ? 'A' : (selectedRadio === 'paid' ? 'G' : 'M'));
    let finalMeta = currentMeta + newFlag;
    let custLang = (savedOrderData && savedOrderData.language) ? savedOrderData.language : ($('#language-select').val() || 'en');

    const finalData = {
        orderid: editingOrderId, name: $('#edit-name').val(), phone: $('#edit-phone').val(),
        whatsapp: $('#edit-whatsapp').val(), altphone: $('#edit-altphone').val(), house: $('#edit-house').val(),
        place: $('#edit-place').val(), pincode: $('#edit-pincode').val(), postoffice: finalPO, district: $('#edit-district').val(),
        state: $('#edit-state').val(), quantity: $('#quick-qty').val(), paidNum: $('#edit-paid-by').val() || '',
        adminMeta: finalMeta, message: '', custId: myCustId, language: custLang
    };

    showLoader(true);
    fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'submit', orderData: finalData }) }).then(res => res.json()).then(res => {
        fetch(sc, { method: 'POST', body: JSON.stringify({ action: "bulkUpdateStatus", updates: [{ oid: finalData.orderid, status: targetStatus }] }) }).then(() => {
            updateLocalCache(finalData, targetStatus); savedOrderData.quantity = newQty; savedOrderData.adminMeta = finalMeta;
            updateAdminUI(targetStatus, finalData.orderid); showLoader(false);
            let msg = ""; let targetPhone = getSelectedWAPhone(finalData);
            if (targetStatus === 'Sent') {
                if (custLang === 'ml') msg = `*ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്തു!* ✅\nഓർഡർ നമ്പർ: ${finalData.orderid}\n\nഎണ്ണം കൂട്ടിയിട്ടുണ്ട്: ${oldQty} ➡️ *${newQty}*\n\n💰 *അടയ്ക്കാനുള്ള ബാക്കി തുക: ₹${balance}*\n(ആകെ: ₹${newTotal})\n\nബാക്കി തുക GPay ചെയ്താൽ അയക്കുന്നതാണ്. 👍`;
                else msg = `*Order Updated!* ✅\nOrder ID: ${finalData.orderid}\n\nQty increased: ${oldQty} ➡️ *${newQty}*\n\n💰 *Balance to Pay: ₹${balance}*\n(Total: ₹${newTotal})\n\nPlease GPay the balance to confirm. 👍`;
            } else {
                if (custLang === 'ml') msg = `*ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്തു!* ✅\nഓർഡർ നമ്പർ: ${finalData.orderid}\n\nഎണ്ണം കൂട്ടിയിട്ടുണ്ട്: ${oldQty} ➡️ *${newQty}*\n\n✅ *പേയ്‌മെന്റ് ലഭിച്ചു!* നന്ദി❤️\n(ആകെ തുക: ₹${newTotal})\n\nഓർഡർ ഉടൻ അയക്കുന്നതാണ്.`;
                else msg = `*Order Updated!* ✅\nOrder ID: ${finalData.orderid}\n\nQty increased: ${oldQty} ➡️ *${newQty}*\n\n✅ *Payment Received!* Thank you❤️\n(Total: ₹${newTotal})\n\nWe will dispatch shortly.`;
            }
            window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
            $('#admin-qty-actions').slideUp(); $('#admin-diff-viewer').slideUp(); $('#admin-action-bar').slideDown();
        });
    });
}

// 🔥 SAVE RADIO SELECTION (With Beautiful Animation)
window.saveRadioSelection = function (oid, el) {
    let holder = $(el).parent();
    holder.find('.spinner-ring, .success-tick').remove();
    holder.append('<div class="spinner-ring"></div>');
    $('input[name="target_wa"]').prop('disabled', true);

    let selectedRadio = $(el).val();
    let newFlag = selectedRadio === 'whatsapp' ? 'W' : (selectedRadio === 'alt' ? 'A' : (selectedRadio === 'paid' ? 'G' : 'M'));
    let currentMeta = (savedOrderData.adminMeta || '').replace(/[MWAG]/g, '');
    let finalMeta = currentMeta + newFlag;

    savedOrderData.adminMeta = finalMeta;
    if (typeof userData !== 'undefined') userData.adminMeta = finalMeta;

    fetch(sc, { method: 'POST', body: JSON.stringify({ action: 'bulkUpdateStatus', updates: [{ oid: oid, action: 'meta', meta: finalMeta }] }) })
        .then(res => res.json()).then(data => {
            holder.find('.spinner-ring').remove();
            holder.append('<div class="success-tick"><i class="fas fa-check-circle"></i></div>');
            $('input[name="target_wa"]').prop('disabled', false);
            setTimeout(() => { holder.find('.success-tick').fadeOut(300, function () { $(this).remove(); }); }, 1500);
        }).catch(err => { holder.find('.spinner-ring').remove(); $('input[name="target_wa"]').prop('disabled', false); alert("Failed to save selection!"); });
}