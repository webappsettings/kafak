// 🔴 GOOGLE SCRIPT URL
const sc = `https://script.google.com/macros/s/AKfycby_Ju8fR6emPAF9MMOULRZfnQDmODOju38I4Mjfo-yt1FZjgtud6Q42-YALC0KUCo-fwg/exec`;


const courierRates = {
  kerala: { 1: 80, 2: 140, 3: 190, 4: 240, 5: 290, 6: 340, 8: 480, 10: 500 },
  outside: { 1: 110, 2: 200, 3: 280, 4: 350, 5: 430, 6: 510, 8: 640, 10: 840 }
};

// Global Vars
let currentStep = 0; // 0=Phone, 1-7=Wizard
let editingOrderId = null;
let userData = {};
let successData = null;
let poList = [];

$(document).ready(function () {
  // Fill Quantity Options
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

  // Initial Load - Loader Hide
  showLoader(false);

  // Listeners
  $('#phone').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#pincode').on('input', function () { this.value = this.value.replace(/\D/g, ''); });
  $('#quantity, #quick-qty').change(function () { updatePrice($(this).val(), $(this).attr('id') === 'quick-qty'); });

  // Check URL for Edit Link
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('oid')) {
    showLoader(true);
    fetchOrder(urlParams.get('oid'));
  }
});

// --- TRANSLATIONS & PLACEHOLDERS ---
const translations = {
  ml: {
    lbl_phone: "ഫോൺ നമ്പർ",
    ph_phone: "മൊബൈൽ നമ്പർ",
    btn_next: "തുടരുക",
    welcome_back: "സ്വാഗതം!",
    btn_edit: "വിലാസം മാറ്റാം",
    lbl_house: "വീട്ടുപേര് / നമ്പർ",
    ph_house: "വീട്ടുപേര്",
    lbl_place: "സ്ഥലം",
    lbl_pincode: "പിൻകോഡ്",
    lbl_qty: "എത്ര ബോട്ടിൽ വേണം?",
    lbl_msg: "മെസ്സേജ് (ആവശ്യമെങ്കിൽ)",
    courier_included: "(കൂരിയർ ചാർജ് ഉൾപ്പെടെ)",
    btn_update: "ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്യാം",
    btn_order: "ഓർഡർ ചെയ്യാം",
    lbl_name: "നിങ്ങളുടെ പേര്",
    ph_name: "പേര്",
    lbl_whatsapp: "വാട്സാപ്പ് നമ്പർ",
    lbl_select_po: "പോസ്റ്റ് ഓഫീസ് തിരഞ്ഞെടുക്കുക",
    lbl_altphone: "വിളിച്ചാൽ കിട്ടുന്ന മറ്റൊരു നമ്പർ (Optional)",
    lbl_summary: "ഓർഡർ വിവരങ്ങൾ",
    lbl_address: "വിലാസം",
    order_success: "ഓർഡർ ലഭിച്ചു!",
    redirect_wa: "വാട്സാപ്പിലേക്ക് പോകുന്നു...",
    open_wa: "വാട്സാപ്പ് ഓപ്പൺ ചെയ്യാം",
    loading: "വിവരങ്ങൾ എടുക്കുന്നു..."
  },
  en: {
    lbl_phone: "Phone Number",
    ph_phone: "Enter Mobile Number",
    btn_next: "CONTINUE",
    welcome_back: "Welcome Back!",
    btn_edit: "EDIT ADDRESS",
    lbl_house: "House Name / No",
    ph_house: "House Name",
    lbl_place: "Place / Area",
    lbl_pincode: "Pincode",
    lbl_qty: "Select Quantity",
    lbl_msg: "Message (Optional)",
    courier_included: "(Courier Charge Included)",
    btn_update: "UPDATE ORDER",
    btn_order: "PLACE ORDER",
    lbl_name: "Full Name",
    ph_name: "Your Name",
    lbl_whatsapp: "WhatsApp Number",
    lbl_select_po: "Select Post Office",
    lbl_altphone: "Alternate Phone (Optional)",
    lbl_summary: "Order Summary",
    lbl_address: "Address",
    order_success: "Order Placed!",
    redirect_wa: "Redirecting to WhatsApp...",
    open_wa: "Open WhatsApp",
    loading: "Fetching details..."
  }
};

function changeLanguage(lang) {
  // 1. Text Content
  $('[data-i18n]').each(function () {
    const key = $(this).data('i18n');
    if (translations[lang][key]) $(this).text(translations[lang][key]);
  });

  // 2. Placeholders (Fix for Point 4)
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

// --- LOADER ---
function showLoader(show) {
  const lang = $('.form-select').val();
  const txt = translations[lang] ? translations[lang].loading : "Loading...";
  $('#loader-text').text(txt);
  if (show) $('#full-loader').fadeIn(); else $('#full-loader').fadeOut();
}

// --- FLOW LOGIC ---

function handlePhoneNext() {
  const phone = $('#phone').val();
  if (phone.length !== 10) { alert("Please enter 10 digit number"); return; }

  showLoader(true);
  fetch(`${sc}?action=getCustomer&phone=${phone}`)
    .then(res => res.json())
    .then(res => {
      showLoader(false);
      $('#step-0').hide();

      if (res.result === 'success') {
        const d = res.data;
        userData = d;

        // Check Active Order
        if (d.orderid && d.Status && d.Status !== 'Dispatched') {
          // RETURNING USER (Active)
          editingOrderId = d.orderid;
          showReturningUserView(d);
        } else {
          // NEW USER (Or Completed Order)
          editingOrderId = null;
          // Pre-fill Name if available
          if (d.name) {
            $('#name').val(d.name);
            $('#whatsapp').val(d.whatsapp);
            $('#pincode').val(d.pincode);
            $('#house').val(d.house);
            $('#altphone').val(d.altphone);
          } else {
            $('#whatsapp').val(phone); // Auto fill WA
          }
          startWizard();
        }
      } else {
        // BRAND NEW USER
        editingOrderId = null;
        $('#whatsapp').val(phone);
        startWizard();
      }
    })
    .catch(e => { showLoader(false); alert("Error connecting server"); });
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
          editingOrderId = null;
          startWizard(); // Treat as new order
        } else {
          editingOrderId = d.orderid;
          showReturningUserView(d);
        }
      }
    });
}

// --- RETURNING USER VIEW ---
function showReturningUserView(d) {
  $('#returning-user-view').fadeIn();

  $('#saved-name').text(d.name);
  let addr = `${d.house}, ${d.place}`;
  if (d.postoffice) addr += `, ${d.postoffice}`;
  addr += ` - ${d.pincode}`;
  $('#saved-address-text').text(addr);

  $('#quick-qty').val(d.quantity).trigger('change');
  $('#quick-msg').val(d.message);

  // Fill hidden edit fields
  $('#edit-house').val(d.house);
  $('#edit-place').val(d.place);
  $('#edit-pincode').val(d.pincode);
  $('#edit-postoffice').val(d.postoffice);
  $('#edit-district').val(d.district);
  $('#edit-state').val(d.state);
}

function toggleAddressEdit() {
  $('.address-box').slideToggle();
}

function submitQuickOrder() {
  if (!$('#quick-qty').val()) { alert("Select Quantity"); return; }

  const isEdit = $('.address-box').is(':visible');

  const finalData = {
    orderid: editingOrderId,
    name: userData.name,
    phone: userData.phone,
    whatsapp: userData.whatsapp,
    altphone: userData.altphone,

    house: isEdit ? $('#edit-house').val() : userData.house,
    place: isEdit ? $('#edit-place').val() : userData.place,
    pincode: isEdit ? $('#edit-pincode').val() : userData.pincode,
    postoffice: isEdit ? $('#edit-postoffice').val() : userData.postoffice,
    district: isEdit ? $('#edit-district').val() : userData.district,
    state: isEdit ? $('#edit-state').val() : userData.state,

    quantity: $('#quick-qty').val(),
    message: $('#quick-msg').val()
  };

  postOrder(finalData);
}

// --- WIZARD LOGIC ---
function startWizard() {
  $('#wizard-view').fadeIn();
  currentStep = 1;
  showStep(1);
}

function showStep(s) {
  $('.wiz-step').hide();
  $(`.wiz-step[data-step="${s}"]`).fadeIn();

  // Update Progress Bar
  const pct = (s / 7) * 100;
  $('#wiz-progress').css('width', `${pct}%`);

  // Button Text
  const btn = $('#btn-wiz-next');
  const lang = $('.form-select').val();

  if (s === 7) {
    btn.html(translations[lang].btn_order);
  } else {
    btn.html(translations[lang].btn_next);
  }

  // Auto Focus
  setTimeout(() => { $(`.wiz-step[data-step="${s}"] input`).first().focus(); }, 300);
}

async function nextStep() {
  // Validation
  if (currentStep === 1 && !$('#name').val()) return alert("Enter Name");
  if (currentStep === 2 && $('#whatsapp').val().length < 10) return alert("Enter WhatsApp");

  if (currentStep === 3) {
    const pin = $('#pincode').val();
    if (pin.length !== 6) return alert("Enter 6 digit Pincode");

    // PINCODE CHECK LOGIC
    $('#btn-wiz-next').prop('disabled', true).text('Checking...');
    try {
      const res = await fetch(`pincode_json_files/${pin}.json`);
      const data = await res.json();
      $('#btn-wiz-next').prop('disabled', false).text('NEXT');

      if (data && data.length > 0) {
        poList = data;
        $('#edit-district').val(data[0].district);
        $('#edit-state').val(data[0].statename);

        // MULTIPLE POST OFFICE CHECK (Point 6)
        if (data.length > 1) {
          $('#po-select').empty().append('<option value="">Select...</option>');
          data.forEach(p => $('#po-select').append(`<option value="${p.officename}">${p.officename}</option>`));
          currentStep = 3.5;
          showStep(3.5);
          return;
        } else {
          // Only 1 PO
          $('#display-place').text(data[0].officename);
          $('#display-dist').text(data[0].district);

          userData.postoffice = data[0].officename;
          userData.district = data[0].district;
          userData.state = data[0].statename;
        }
      } else {
        alert("Pincode not found. Please enter manually.");
      }
    } catch (e) {
      $('#btn-wiz-next').prop('disabled', false).text('NEXT');
      alert("Check Pincode"); return;
    }
  }

  if (currentStep === 3.5) {
    if (!$('#po-select').val()) return alert("Select Post Office");
    userData.postoffice = $('#po-select').val();
    userData.district = poList[0].district;
    userData.state = poList[0].statename;

    $('#display-place').text(userData.postoffice);
    $('#display-dist').text(userData.district);

    currentStep = 4; // Skip to 4
    showStep(4);
    return;
  }

  if (currentStep === 4 && !$('#house').val()) return alert("Enter House Name");
  if (currentStep === 6 && !$('#quantity').val()) return alert("Select Quantity");

  if (currentStep === 6) {
    // Go to Review
    renderReview();
    currentStep = 7;
    showStep(7);
    return;
  }

  if (currentStep === 7) {
    // Final Submit
    submitWizardOrder();
    return;
  }

  currentStep++;
  showStep(currentStep);
}

function prevStep() {
  if (currentStep === 1) return location.reload();

  if (currentStep === 4 && poList.length > 1) { currentStep = 3.5; showStep(3.5); return; }
  if (currentStep === 4 && poList.length <= 1) { currentStep = 3; showStep(3); return; }
  if (currentStep === 3.5) { currentStep = 3; showStep(3); return; }

  currentStep--;
  showStep(currentStep);
}

function renderReview() {
  $('#rev-name').text($('#name').val());
  $('#rev-phone').text($('#phone').val());

  let addr = `${$('#house').val()}, ${userData.postoffice}\n${userData.district} - ${$('#pincode').val()}`;
  $('#rev-address').text(addr);

  const qty = $('#quantity').val();
  $('#rev-qty').text(`${qty} Bottle(s)`);
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

// --- UTILS ---
function updatePrice(qty, isQuick) {
  if (!qty) return;
  const n = parseInt(qty);
  const base = n * 650;
  const rate = courierRates.kerala[n] || 0;
  const total = base + rate;

  if (isQuick) {
    $('#quick-price').text(`Total: ₹${total}/-`);
  } else {
    $('#wiz-price').text(`Total: ₹${total}/-`);
  }
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
        setTimeout(sendToWhatsapp, 1500);
      }
    })
    .catch(() => { showLoader(false); alert("Failed. Try again."); });
}

// 🔴 RESTORED WHATSAPP LOGIC (Point 6)
function sendToWhatsapp() {
  const phone = '7788990313';
  const orderid = successData.orderid;
  const d = successData;
  const editLink = `kafaklife.com/order.html?oid=${orderid}`;

  // Recalculate amounts for text
  const n = parseInt(d.quantity);
  const base = n * 650;
  const courier = courierRates.kerala[n] || 0;
  const amountText = `Amount(₹): ${base} + ${courier}`;
  const totalText = `Total(₹): ${base + courier}/-`;

  const extra = `*✅ Honey order confirmed!* 🍯\n🔖 ID: \`\`\`${orderid}\`\`\`\n⌚ _${successData.timestamp}_\n🔗 _${editLink}_`;

  const format = `\n____________________________________\n*${d.name.trim().toUpperCase()}*\n*${d.house.trim().toUpperCase()}*\n*${d.place.trim().toUpperCase()}*\n*${(d.postoffice || '').trim().toUpperCase()}*\n*${d.district.trim().toUpperCase()}*\n*${d.state.trim().toUpperCase()}*\n*Pin: ${d.pincode.trim()}*\n*Ph: ${d.phone.trim()}*\n\n*Qty: ${d.quantity}*\n*${amountText}*\n*${totalText}*\n____________________________________\n\n*GPay to: ${phone} (KAFAK LLP)*`;

  window.location.href = `https://wa.me/91${phone}?text=${encodeURIComponent(extra + format)}`;
}