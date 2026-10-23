function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive(t, e) {
  if ("object" != typeof t || !t) return t;
  var r;
  if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
    var i = r.call(t, e || "default");
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === e ? String : Number)(t);
}
let orderPageTransport;
async function orderServiceFetch(url, options) {
  if (window.KAFAK_BACKEND !== "business") return fetch(url, options);
  await KafakUI.adminTransport();
  if (!orderPageTransport) {
    const api = new KafakBusinessApi();
    orderPageTransport = new KafakBusinessAdminTransport(api, new KafakBusinessAdminCommands(api, window.kafakStorage), (...args) => fetch(...args));
  }
  return orderPageTransport.fetch(url, options);
}
const sc = `https://script.google.com/macros/s/AKfycbxVp0SErrllaT8E3E2dQyeNe0V2hFaIvA5Sz-RdjiMxb9HclcKqmNsRmcBwNNnPPPNBQw/exec`;
let isOutOfStock = false;
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
let adminPhone = "7788990313";
let bgFetchController = null;
const STORAGE_KEY = "kafakCustomerData";
const SafeStorage = {
  getItem: function(key) {
    try {
      if (key === STORAGE_KEY && window.KAFAK_BACKEND === "business" && window.kafakStorage.getItem("kafakAdmin") !== "true" && window.KafakCustomerStorage) return JSON.stringify(window.KafakCustomerStorage.customerMap(window.kafakStorage));
      return window.kafakStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: function(key, val) {
    try {
      if (key === STORAGE_KEY && window.KAFAK_BACKEND === "business" && window.kafakStorage.getItem("kafakAdmin") !== "true") {
        const map = JSON.parse(val);
        if (window.KafakCustomerStorage) {
          window.KafakCustomerStorage.saveDraftMap(window.kafakStorage, map);
          return;
        }
        val = JSON.stringify(Object.fromEntries(Object.entries(map).filter(([, d]) => !d.orderid)));
      }
      window.kafakStorage.setItem(key, val);
    } catch (e) {
    }
  },
  removeItem: function(key) {
    try {
      window.kafakStorage.removeItem(key);
    } catch (e) {
    }
  }
};
function checkStockStatus() {
  if (window.kafakCheckoutUI) return window.kafakCheckoutUI.load();
  fetch(`${sc}?action=checkStock`).then((response) => response.json()).then((data) => {
    if (data.status === "no") {
      isOutOfStock = true;
      if ($("#wizard-view").is(":visible") && currentStep === 1) {
        showPreBookingAlert();
      }
    }
  }).catch((error) => {
    console.error("Stock check failed:", error);
  });
}
function showPreBookingAlert(callback) {
  if (document.activeElement) {
    document.activeElement.blur();
  }
  const lang = $("#language-select").val() || "en";
  let alertHtml = "";
  if (lang === "ml") {
    alertHtml = `
            <div style="font-size: 16px; color: #333; text-align: left;">
                <p><b>⚠️ ക്ഷമിക്കണം, നിലവിൽ തേൻ സ്റ്റോക്ക് തീർന്നിരിക്കുകയാണ്!</b></p>
                <p>എന്നാൽ നിങ്ങൾക്ക് ഇപ്പോൾ തന്നെ <b>മുൻകൂട്ടി ബുക്ക് ചെയ്യാവുന്നതാണ്.</b></p>
                <p style="color: #d97706; font-weight: bold;">പുതിയ ഓർഡർ നൽകി നിങ്ങൾക്ക് പ്രീ-ബുക്ക് ചെയ്യാം. പുതിയ സ്റ്റോക്ക് വന്നാൽ ഉടൻ നിങ്ങളെ അറിയിക്കുന്നതാണ്.</p>
            </div>
        `;
  } else {
    alertHtml = `
            <div style="font-size: 16px; color: #333; text-align: left;">
                <p><b>⚠️ Sorry, currently out of stock!</b></p>
                <p>However, you can <b>pre-book your order</b> now.</p>
                <p style="color: #d97706; font-weight: bold;">Please proceed to place your order to pre-book. We will notify you as soon as the new stock arrives.</p>
            </div>
        `;
  }
  Swal.fire({
    title: lang === "ml" ? "🍯 പ്രീ-ബുക്കിംഗ് (Pre-Booking)" : "🍯 Pre-Booking Open!",
    html: alertHtml,
    icon: "info",
    confirmButtonText: lang === "ml" ? "ശരി, മുന്നോട്ട് പോകാം" : "OK, Proceed",
    confirmButtonColor: "#ff9800",
    allowOutsideClick: false
  }).then((result) => {
    if (result.isConfirmed && typeof callback === "function") {
      callback();
    }
  });
}
let loaderInterval;
let loaderHideTimer;
window.showLoader = function(show) {
  clearTimeout(loaderHideTimer);
  $("#full-loader").stop(true, true);
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  const loadingTxt = t.loading || "LOADING...";
  if (show) {
    $("#loader-text").text(loadingTxt);
    $("#full-loader").css("display", "flex").fadeIn(200);
  } else {
    loaderHideTimer = setTimeout(() => {
      $("#full-loader").fadeOut(300);
    }, 200);
  }
};
window.changeLanguage = function(lang) {
  window.kafakStorage.setItem("activeLang", lang);
  const t = translations[lang] || translations["en"];
  if (!t) return;
  $("[data-i18n]").each(function() {
    const key = $(this).attr("data-i18n");
    if (key === "lbl_qty" && typeof editingOrderId !== "undefined" && editingOrderId) {
      $(this).text(t.lbl_qty_edit);
      return;
    }
    if (t[key]) $(this).text(t[key]);
  });
  $("#phone").attr("placeholder", t.ph_phone);
  $("#name").attr("placeholder", t.ph_name);
  $("#house").attr("placeholder", t.ph_house);
  $("#place").attr("placeholder", t.ph_place);
  $("#pincode").attr("placeholder", t.ph_pincode);
  $("#whatsapp").attr("placeholder", t.ph_whatsapp);
  $("#altphone").attr("placeholder", t.ph_altphone);
  $("#edit-phone").attr("placeholder", t.ph_edit_phone);
  $("#edit-house").attr("placeholder", t.ph_edit_house);
  $("#edit-place").attr("placeholder", t.ph_edit_place);
  $("#edit-pincode").attr("placeholder", t.ph_edit_pin);
  $("#edit-whatsapp").attr("placeholder", t.ph_edit_wa);
  $("#edit-altphone").attr("placeholder", t.ph_edit_alt);
  let currentWizQty = $("#quantity").val();
  let currentQuickQty = $("#quick-qty").val();
  renderQtyDropdowns();
  if (currentWizQty) $("#quantity").val(currentWizQty);
  if (currentQuickQty) $("#quick-qty").val(currentQuickQty);
  let isQuickMode = $("#quick-qty").is(":visible");
  let activeQty = isQuickMode ? currentQuickQty : currentWizQty;
  if (activeQty) {
    updatePrice(activeQty, isQuickMode);
  }
  const wizBtn = $("#btn-wiz-next");
  if (wizBtn.length > 0) {
    if (currentStep === 7) wizBtn.text(t.btn_order);
    else wizBtn.text(t.btn_next);
  }
  checkForChanges();
  if (typeof userData !== "undefined" && userData.orderid && typeof updateStatusUI === "function") {
    if ($("#status-area").html().trim() !== "") {
      updateStatusUI(userData);
    }
    handleEditControlsVisibility(userData);
  }
  if ($("#quick-qty").is(":hidden")) {
    $('label[data-i18n="lbl_qty"]').hide();
    $("#quick-qty").prev("label").hide();
  }
};
window.showAlert = function(msg) {
  Swal.fire({
    text: msg,
    icon: "warning",
    confirmButtonText: "OK",
    confirmButtonColor: "#000",
    customClass: {
      popup: "ios-popup",
      confirmButton: "ios-btn"
    }
  });
};
window.getAlert = function(key) {
  const lang = $("#language-select").val() || "en";
  return translations[lang][key] || key;
};
window.updateWizardLocDisplay = function() {
  $("#display-po").text((userData.postoffice || "").toUpperCase());
  $("#display-dist-state").text(`${$("#place").val() || ""}, ${userData.district || ""}`.toUpperCase());
};
window.onProductChange = function() {
  if (window.kafakCheckoutUI) return window.kafakCheckoutUI.changeProduct();
  let activeQtySelector = $("#wizard-view").is(":visible") ? "#quantity" : "#quick-qty";
  let currentQty = $(activeQtySelector).val();
  renderQtyDropdowns();
  if (currentQty) {
    $(activeQtySelector).val(currentQty);
  } else {
    $(activeQtySelector).val("1");
  }
  updatePrice($(activeQtySelector).val(), activeQtySelector === "#quick-qty");
  if (typeof checkForChanges === "function") {
    checkForChanges();
  }
};
function formatPrettyDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "Asia/Kolkata"
  });
}
function getZoneKey(stateName, specificProvider = null) {
  if (!stateName) return "REST OF INDIA";
  let s = stateName.toUpperCase().trim();
  if (specificProvider && courierRates) {
    let specificKey = s + " " + specificProvider.toUpperCase().trim();
    if (courierRates[specificKey]) {
      return specificKey;
    }
  }
  if (courierRates && courierRates[s]) {
    return s;
  }
  return "REST OF INDIA";
}
window.parseDynamicRate = function(rateString, qty) {
  if (!rateString) return 0;
  if (!isNaN(rateString)) return parseFloat(rateString);
  let numQty = parseInt(qty) || 1;
  let rates = String(rateString).split(",");
  let matchedRate = 0;
  for (let i = 0; i < rates.length; i++) {
    let parts = rates[i].split(":");
    if (parts.length === 2) {
      let q = parseInt(parts[0].trim());
      let r = parseFloat(parts[1].trim());
      if (q === numQty) return r;
      if (q < numQty) matchedRate = r;
    }
  }
  return matchedRate;
};
window.getDeliveryCharge = function(state, qty, provider) {
  if (typeof courierRates === "undefined") return qty * 60 + 20;
  let zone = getZoneKey(state);
  let p = provider ? String(provider).toUpperCase().trim() : "";
  let zoneData = (p ? courierRates[`${zone} ${p}`] || courierRates[`${zone}_${p}`] : null) || courierRates[`${zone} DEFAULT`] || courierRates[`${zone}_DEFAULT`] || courierRates[zone] || courierRates["REST OF INDIA DEFAULT"] || courierRates["REST OF INDIA"];
  if (!zoneData) return qty * 60 + 20;
  let baseCharge = 0;
  let serviceCharge = 0;
  if (typeof zoneData === "object" && zoneData.baseRate !== void 0) {
    baseCharge = window.parseDynamicRate(zoneData.baseRate, qty);
    serviceCharge = window.parseDynamicRate(zoneData.serviceCharge, qty);
  } else if (zoneData[qty] !== void 0) {
    baseCharge = parseFloat(zoneData[qty]) || 0;
  } else {
    baseCharge = qty * 60;
  }
  return baseCharge + serviceCharge;
};
$(document).ready(function() {
  checkStockStatus();
  const savedLang = window.kafakStorage.getItem("activeLang") || "ml";
  if (savedLang) {
    if ($("#language-select").length > 0) {
      $("#language-select").val(savedLang);
    }
    changeLanguage(savedLang);
  } else {
    changeLanguage("en");
  }
  fetchCourierRates();
  injectVideoCSS();
  const urlParams = new URLSearchParams(window.location.search);
  const autoPhone = urlParams.get("phone");
  if (autoPhone) {
    let cleanPhone = autoPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (cleanPhone.length === 10) {
      $("#phone").val(cleanPhone);
      setTimeout(() => {
        handlePhoneNext();
      }, 500);
    }
  }
  $("#phone, #edit-phone, #whatsapp, #altphone, #pincode").on("input", function() {
    this.value = this.value.replace(/\D/g, "");
  });
  $("#phone, #edit-phone, #whatsapp, #altphone").on("paste", function(e) {
    e.preventDefault();
    let pastedText = (e.originalEvent || e).clipboardData.getData("text/plain");
    let cleanNum = pastedText.replace(/[^0-9]/g, "");
    if (["phone", "edit-phone"].includes(this.id) && cleanNum.length === 12 && cleanNum.startsWith("91")) {
      cleanNum = cleanNum.substring(2);
    }
    $(this).val(cleanNum);
    $(this).trigger("input");
  });
  $("#quantity, #quick-qty").change(function() {
    updatePrice($(this).val(), $(this).attr("id") === "quick-qty");
  });
  const saved = SafeStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      localUsersMap = JSON.parse(saved);
      let isDirty = false;
      Object.keys(localUsersMap).forEach((key) => {
        let u = localUsersMap[key];
        if (u.Status || u.status || u.tracking || u.offer || u.courier) {
          delete u.Status;
          delete u.status;
          delete u.tracking;
          delete u.offer;
          delete u.courier;
          delete u.provider;
          isDirty = true;
        }
      });
      if (isDirty) SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
    } catch (e) {
      localUsersMap = {};
    }
  }
  const oid = urlParams.get("oid");
  const isAdmin = SafeStorage.getItem("kafakAdmin") === "true";
  if (isAdmin) {
    $("#admin-home-label").remove();
    let labelHtml = `
            <div id="admin-home-label" class="d-flex justify-content-center align-items-center gap-2 mb-3 fade-in">
    <span class="badge bg-dark text-warning border border-warning shadow-sm px-3 py-2 rounded-pill" style="font-size:10px; letter-spacing:1px; font-weight:800;">
        <i class="fas fa-user-shield me-1"></i> ADMIN ORDERING
    </span>
    
    <a href="admin.html" id="btn-goto-admin" class="btn btn-sm btn-dark rounded-circle shadow-sm border border-warning align-items-center justify-content-center" style="width: 28px; height: 28px; text-decoration:none; display: flex;" title="Go to Admin Dashboard">
        <i class="fas fa-cog text-warning" style="font-size:12px;"></i>
    </a>
</div>
        `;
    $("#step-0").prepend(labelHtml);
  }
  if (oid) {
    showLoader(true);
    if (isAdmin) {
      setupAdminView(oid);
    } else if (window.kafakOrderEditorUI) {
      if (window.kafakOrderEditorUI.access(oid)) fetchOrder(oid);
      else {
        showLoader(false);
        $("#step-0").show();
        updateFooterButtons("step-0");
      }
    } else {
      let foundLocally = false;
      const phones = Object.keys(localUsersMap);
      for (let ph of phones) {
        if (String(localUsersMap[ph].orderid) === String(oid)) {
          showLoader(false);
          $("#step-0").hide();
          loadOrderData(localUsersMap[ph], false);
          foundLocally = true;
          fetchOrder(oid, true);
          break;
        }
      }
      if (!foundLocally) {
        console.log("Not found locally, asking for phone number...");
        showLoader(false);
        $("#step-0").show();
        updateFooterButtons("step-0");
        setTimeout(() => $("#phone").focus(), 500);
      }
    }
  } else {
    let lastPhone = SafeStorage.getItem("lastUsedPhone");
    if (lastPhone && localUsersMap[lastPhone] && !isAdmin && !window.kafakStorage.getItem("kafak-draft-v1:new")) {
      $("#phone").val(lastPhone);
      showLoader(true);
      setTimeout(() => {
        handlePhoneNext();
      }, 300);
    } else {
      showLoader(false);
      $("#step-0").show();
      updateFooterButtons("step-0");
      setTimeout(() => $("#phone").focus(), 500);
    }
  }
  $(".form-select").on("change", function() {
    updateLiveAddressPreview();
  });
});
window.handlePhoneNext = async function() {
  var _localUsersMap$phone, _localUsersMap$phone2;
  const phone = $("#phone").val();
  const previousPhone = currentLoginPhone;
  if (!/^[0-9]{10}$/.test(phone)) {
    showAlert(getAlert("err_phone"));
    return;
  }
  currentLoginPhone = phone;
  SafeStorage.setItem("lastUsedPhone", phone);
  preloadHoneyVideo();
  const linkedOrder = new URLSearchParams(location.search).get("oid") || ((_localUsersMap$phone = localUsersMap[phone]) === null || _localUsersMap$phone === void 0 ? void 0 : _localUsersMap$phone.orderid);
  if (linkedOrder && window.kafakOrderEditorUI && SafeStorage.getItem("kafakAdmin") !== "true") {
    if (window.orderRecoveryRequired || !window.kafakOrderEditorUI.access(linkedOrder)) {
      if (window.orderRecoveryBusy) return;
      window.orderRecoveryBusy = true;
      showLoader(true);
      $("#order-entry-error").remove();
      try {
        await window.kafakOrderEditorUI.recover(linkedOrder, phone);
        window.orderRecoveryRequired = false;
      } catch (error) {
        showLoader(false);
        $('<div id="order-entry-error" class="small mt-3" role="alert"></div>').text(error.status === 403 ? "ഈ ഓർഡറിന് നൽകിയ ഫോൺ നമ്പർ പരിശോധിക്കുക. / Check the phone number used for this order." : error.message).appendTo("#step-0");
        return;
      } finally {
        window.orderRecoveryBusy = false;
      }
    }
    fetchOrder(linkedOrder);
    return;
  }
  if (window.kafakOrderEditorUI && (_localUsersMap$phone2 = localUsersMap[phone]) !== null && _localUsersMap$phone2 !== void 0 && _localUsersMap$phone2.orderid) {
    fetchOrder(localUsersMap[phone].orderid);
    return;
  }
  if (localUsersMap[phone]) {
    let localData = localUsersMap[phone];
    let status = String(localData.Status || "").toLowerCase();
    if (["delivered", "completed", "refunded"].includes(status)) {
      editingOrderId = null;
      localData.quantity = null;
      loadOrderData(localData, true);
      syncUserDataBackground(phone);
      return;
    }
    loadOrderData(localData, false);
    showLoader(false);
    syncUserDataBackground(phone).finally(() => {
      showLoader(false);
    });
    return;
  }
  editingOrderId = null;
  if (!$("#whatsapp").val() || $("#whatsapp").val() === previousPhone) $("#whatsapp").val(phone);
  startWizard();
  $("#step-0").hide();
  checkUserOnServerBackground(phone);
  $("#top-progress-container").fadeIn();
  showLoader(false);
};
function syncUserDataBackground(phone) {
  let localData = localUsersMap[phone] || {};
  let custIdParam = localData.custId ? `&custId=${localData.custId}` : "";
  const userPromise = (window.kafakOrderEditorUI ? window.kafakOrderEditorUI.customer(phone) : fetch(`${sc}?action=getCustomer&phone=${phone}${custIdParam}&t=${Date.now()}`).then((res) => res.json())).catch((error) => window.kafakOrderEditorUI ? {
    loadError: error
  } : null);
  const ratePromise = fetchCourierRates();
  return Promise.all([userPromise, ratePromise]).then(([userRes]) => {
    var _userRes$data;
    if (userRes !== null && userRes !== void 0 && userRes.loadError) {
      showOrderLoadError(userRes.loadError);
      return;
    }
    let isAdmin = window.location.href.includes("admin") || SafeStorage.getItem("kafakAdmin") === "true";
    if (!userRes || userRes.result === "error" && !isAdmin) {
      if (localData && !localData.orderid && Object.keys(localData).length > 0) {
        console.log("Draft found locally.");
        userData = localData;
        savedOrderData = JSON.parse(JSON.stringify(localData));
        editingOrderId = null;
        renderEditView(localData);
        return;
      }
      if (!userRes && localData && localData.orderid) {
        userData = localData;
        savedOrderData = JSON.parse(JSON.stringify(localData));
        editingOrderId = localData.orderid;
        renderEditView(localData);
        return;
      }
      if (!isAdmin) clearUserLogin();
      return;
    }
    if (window.kafakOrderEditorUI && !((_userRes$data = userRes.data) !== null && _userRes$data !== void 0 && _userRes$data.authorized) && !isAdmin) {
      clearUserLogin();
      return;
    }
    if (userRes && userRes.result === "success" && userRes.data) {
      let serverData = userRes.data;
      let pendingUpdates = JSON.parse(window.kafakStorage.getItem("pendingUpdates") || "[]");
      let myPending = pendingUpdates.find((u) => String(u.oid) === String(serverData.orderid));
      if (myPending && myPending.status) {
        serverData.Status = myPending.status;
        serverData.status = myPending.status;
      }
      let finalData = _objectSpread(_objectSpread({}, localData), serverData);
      finalData.Status = serverData.Status || "Pending";
      if (finalData.orderid) {
        editingOrderId = finalData.orderid;
        if (["completed", "delivered", "refunded"].includes(String(finalData.Status).toLowerCase())) {
          editingOrderId = null;
          finalData.quantity = null;
          delete finalData.quantity;
        }
      } else {
        editingOrderId = null;
      }
      userData = finalData;
      savedOrderData = JSON.parse(JSON.stringify(finalData));
      saveToLocal(phone, finalData);
      renderEditView(finalData);
    }
  });
}
function checkUserOnServerBackground(phone) {
  (window.kafakOrderEditorUI ? window.kafakOrderEditorUI.customer(phone) : fetch(`${sc}?action=getCustomer&phone=${phone}`).then((res) => res.json())).then((data) => {
    if ($("#wizard-view").is(":visible")) {
      if (data.result === "success" && data.data && data.data.authorized) {
        if (data.data.custId) myCustId = data.data.custId;
        let status = String(data.data.Status || "").toLowerCase();
        if (status !== "completed" && status !== "delivered" && status !== "refunded") {
          const lang = $("#language-select").val() || "en";
          const t = typeof translations !== "undefined" && translations[lang] ? translations[lang] : {};
          Swal.fire({
            title: t.title_welcome_back || "Welcome Back!",
            text: t.msg_loading_order || "Loading your order...",
            icon: "info",
            timer: 2e3,
            showConfirmButton: false,
            toast: true,
            position: "top"
          });
          userData = data.data;
          saveToLocal(phone, userData);
          $("#wizard-view").hide();
          $("#top-progress-container").hide();
          loadOrderData(userData, true);
        }
      }
    }
  }).catch((err) => console.log("Background check silent fail: ", err));
}
function saveToLocal(phone, data) {
  if (window.kafakOrderEditorUI && data.orderid && SafeStorage.getItem("kafakAdmin") !== "true") {
    localUsersMap[phone] = _objectSpread({}, data);
    return;
  }
  let cleanData = _objectSpread({}, data);
  delete cleanData.Status;
  delete cleanData.status;
  delete cleanData.tracking;
  delete cleanData.courier;
  delete cleanData.provider;
  delete cleanData.offer;
  delete cleanData.grandTotal;
  if (cleanData.orderid) {
    Object.keys(localUsersMap).forEach((key) => {
      if (String(key).trim() !== String(phone).trim() && String(localUsersMap[key].orderid) === String(cleanData.orderid)) {
        delete localUsersMap[key];
      }
    });
  }
  localUsersMap[phone] = cleanData;
  SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
}
window.loadOrderData = function(d, isServerData = false) {
  if (!d) return;
  document.dispatchEvent(new Event("kafak-order-rendered"));
  let isAdmin = window.location.href.includes("admin") || SafeStorage.getItem("kafakAdmin") === "true";
  if (!isAdmin && d.phone) {
    window.activeCustomerData = d;
    currentLoginPhone = d.phone;
    SafeStorage.setItem("lastUsedPhone", d.phone);
  }
  if (isServerData && currentLoginPhone && !isAdmin) {
    localUsersMap[currentLoginPhone] = d;
    if (!window.kafakOrderEditorUI) SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
  }
  $("#step-0").hide();
  let s = String(d.Status || d.status || "").toLowerCase();
  let isDone = ["delivered", "completed", "refunded"].includes(s);
  if (isDone) {
    d.quantity = null;
    delete d.quantity;
  }
  userData = d;
  savedOrderData = JSON.parse(JSON.stringify(d));
  if (isDone) {
    editingOrderId = null;
  } else {
    editingOrderId = d.orderid;
  }
  if (d.phone) saveToLocal(d.phone, d);
  showReturningUserView(d, true, isServerData);
};
window.manualRefresh = function() {
  setRefreshLoading(true);
  if (editingOrderId) {
    let safeOid = encodeURIComponent(editingOrderId);
    (window.kafakOrderEditorUI ? window.kafakOrderEditorUI.read(editingOrderId) : fetch(`${sc}?action=getOrder&oid=${safeOid}&t=${Date.now()}`).then((res) => res.json())).then((res) => {
      if (res && res.result === "success" && res.data) {
        loadOrderData(res.data, true);
      }
    }).catch((err) => {
      console.error(err);
      if (window.kafakOrderEditorUI) showOrderLoadError(err);
    }).finally(() => {
      setTimeout(() => {
        setRefreshLoading(false);
      }, 500);
    });
  } else if (currentLoginPhone) {
    syncUserDataBackground(currentLoginPhone).finally(() => {
      setTimeout(() => {
        setRefreshLoading(false);
      }, 500);
    });
  } else {
    setRefreshLoading(false);
  }
};
function setRefreshLoading(isLoading) {
  const btn = $("#refresh-btn");
  if (btn.length === 0) return;
  if (isLoading) {
    btn.prop("disabled", true).css("opacity", "0.7");
    btn.find("i").addClass("fa-spin");
    btn.find("span").text("CHECKING...");
  } else {
    btn.prop("disabled", false).css("opacity", "1");
    btn.find("i").removeClass("fa-spin");
    btn.find("span").text("REFRESH STATUS");
  }
}
function handleEditControlsVisibility(d) {
  const status = String(d.Status || "pending").toLowerCase();
  const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  $("#read-only-notice").remove();
  if (d.readOnly && !isAdmin && !["completed", "delivered", "refunded"].includes(status)) {
    $("#quick-qty").prop("disabled", true);
    $("#btn-edit-addr,.btn-update-sage,#address-edit-box").hide();
    return;
  }
  if (isAdmin) {
    $("#quick-qty, .btn-update-sage").show();
    $("#btn-edit-addr").css("display", "inline-block");
    $('label[data-i18n="lbl_qty"]').show();
    $("#quick-qty").prop("disabled", false);
    $("#btn-req-modify").remove();
    if (["dispatched", "delivered", "completed", "refunded"].includes(status)) {
      $("#quick-qty").css("border", "2px solid #15803d");
      $(".btn-update-sage").prop("disabled", false).css({
        "opacity": "1",
        "cursor": "pointer",
        "background": "#15803d",
        "border-color": "#15803d"
      }).html(`<i class="fas fa-plus-circle me-1"></i> CREATE NEW ORDER`).attr("onclick", "processCleanReorder()");
    } else {
      $("#quick-qty").css("border", "2px solid #dc3545");
      $(".btn-update-sage").css({
        "background": "#2563eb",
        "border-color": "#2563eb"
      }).html(t.btn_update || "Update Order").attr("onclick", "submitQuickOrder()");
    }
    return;
  }
  if (!d.orderid) {
    $("#status-area").hide().empty();
    $("#display-oid").hide();
    $("#display-date").hide();
    $('label[data-i18n="lbl_qty"]').show().text(t.lbl_qty || "എത്ര ബോട്ടിൽ വേണം?");
    $("#quick-qty").show().prop("disabled", false);
    $(".btn-update-sage").show().prop("disabled", false).css({
      "opacity": "1",
      "cursor": "pointer",
      "background": "#16a34a",
      "border-color": "#15803d"
    }).html(`<i class="fas fa-shopping-cart me-1"></i> ${t.btn_order || "PLACE ORDER"}`);
    $(".btn-update-sage").attr("onclick", "submitQuickOrder()");
    $("#btn-req-modify").remove();
    $("#btn-edit-addr").css("display", "inline-block");
    return;
  }
  if (["delivered", "completed", "refunded"].includes(status)) {
    $("#status-area").hide().empty();
    $("#quick-price-box").hide().empty();
    $("#btn-edit-addr").css("display", "inline-block");
    $("#display-oid").hide();
    $("#display-date").hide();
    $('label[data-i18n="lbl_qty"]').show().text(t.lbl_qty || "എത്ര ബോട്ടിൽ വേണം?");
    $("#quick-qty").show().prop("disabled", false).val("").trigger("change");
    $(".btn-update-sage").show().prop("disabled", false).css({
      "opacity": "1",
      "cursor": "pointer",
      "background": "#15803d",
      "border-color": "#15803d"
    }).html(`<i class="fas fa-shopping-bag me-1"></i> ${t.btn_order_again || "വീണ്ടും ഓർഡർ ചെയ്യാം"}`);
    $(".btn-update-sage").attr("onclick", "processCleanReorder()");
    $("#btn-req-modify").remove();
    editingOrderId = null;
    return;
  }
  if (["paid", "dispatched"].includes(status)) {
    $('label[data-i18n="lbl_qty"]').show();
    $("#quick-qty").show().prop("disabled", true);
    $("#quick-qty").prev("label").show();
    $(".btn-update-sage").hide();
    $("#quick-price-box").show();
    $("#btn-edit-addr").hide();
    $("#btn-req-modify").remove();
    if (status === "paid") {
      let waMsg = `Hello, I want to update my Order: ${d.orderid}. Please help!`;
      let targetPhone = typeof adminPhone !== "undefined" ? adminPhone : "7788990313";
      let reqText = lang === "ml" ? "എന്തെങ്കിലും മാറ്റങ്ങൾ വരുത്തണോ?" : "Want to change details?";
      $(`<div id="btn-req-modify" class="mt-3 text-center fade-in">
              <div class="text-muted small mb-1 fw-bold">${reqText}</div>
              <a href="https://wa.me/91${targetPhone}?text=${encodeURIComponent(waMsg)}" target="_blank" 
                 class="btn btn-outline-dark btn-sm shadow-sm rounded-pill px-3">
                 <i class="fab fa-whatsapp"></i> ${t.btn_msg_admin || "Message Admin"}
              </a>
              </div>`).insertAfter("#status-area");
    }
    return;
  }
  $('label[data-i18n="lbl_qty"]').show();
  $("#quick-qty").prop("disabled", false).show();
  $(".btn-update-sage").show();
  $(".btn-update-sage").attr("onclick", "submitQuickOrder()");
  $(".btn-update-sage").css({
    "background": "#2563eb",
    "border-color": "#2563eb"
  }).html(t.btn_update);
  $("#btn-edit-addr").css("display", "inline-block");
  $("#btn-req-modify").remove();
}
window.submitWizardOrder = async function() {
  if (!/^[0-9]{8,15}$/.test($("#altphone").val()) || $("#altphone").val() === $("#phone").val()) {
    currentStep = 6;
    showStep(6);
    showAlert(getAlert($("#altphone").val() === $("#phone").val() ? "err_alt_same" : "err_alt_required"));
    return;
  }
  const phoneCheck = $("#phone").val();
  const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  if (!window.kafakOrderEditorUI && !editingOrderId && phoneCheck && !isAdmin) {
    showLoader(true);
    try {
      let data = window.kafakOrderEditorUI ? await window.kafakOrderEditorUI.customer(phoneCheck) : await fetch(`${sc}?action=getCustomer&phone=${phoneCheck}`).then((res) => res.json());
      if (data.result === "success" && data.data && data.data.orderid) {
        let s = String(data.data.Status || "pending").toLowerCase();
        if (!["delivered", "completed", "refunded"].includes(s)) {
          showLoader(false);
          const lang = $("#language-select").val() || "en";
          const t = translations[lang] || {};
          const msg = (t.msg_active_order || "You already have an active order: OID_HERE").replace("OID_HERE", data.data.orderid);
          Swal.fire({
            icon: "info",
            title: t.title_active_order || "Active Order Exists",
            text: msg,
            confirmButtonColor: "#2563eb",
            customClass: {
              popup: "ios-popup"
            }
          }).then(() => {
            window.location.href = `order.html?phone=${phoneCheck}`;
          });
          return;
        }
      }
    } catch (e) {
      console.log("Wizard server check failed, proceeding...");
    }
    showLoader(false);
  }
  const isApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const orderSource = isApp ? "App 📱" : "Web 🌐";
  let wizMeta = "";
  if (isAdmin && $("#wiz-target-wa").length) {
    wizMeta = $("#wiz-target-wa").val() || "M";
  }
  const finalData = {
    orderid: editingOrderId,
    name: $("#name").val(),
    phone: $("#phone").val(),
    oldPhone: currentLoginPhone,
    whatsapp: $("#whatsapp").val(),
    altphone: $("#altphone").val(),
    house: $("#house").val(),
    place: $("#place").val(),
    pincode: $("#pincode").val(),
    postoffice: userData.postoffice,
    district: userData.district,
    state: userData.state || "Kerala",
    quantity: $("#quantity").val(),
    product: window.kafakCheckoutUI ? window.kafakCheckoutUI.productName() : $("#admin-product-type").length ? $("#admin-product-type").val() : "Vanthen",
    // 🔥 NEW
    message: "",
    custId: myCustId,
    language: $("#language-select").val() || "en",
    source: orderSource,
    adminMeta: wizMeta
  };
  saveToLocal(finalData.phone, finalData);
  playVideoAnimation(finalData.name, () => postOrder(finalData));
};
let editPinState = {
  pin: "",
  pending: false,
  valid: false
};
let editPinGeneration = 0;
window.handleEditPincode = async function(val, savedPO = null) {
  const generation = ++editPinGeneration;
  $("#edit-pin-message").remove();
  if (savedPO) {
    editPinState = {
      pin: String(val),
      pending: false,
      valid: true
    };
    return;
  }
  editPinState = {
    pin: String(val),
    pending: /^\d{6}$/.test(val),
    valid: false
  };
  $("#edit-postoffice,#edit-district,#edit-state").val("");
  $("#edit-postoffice-select").empty();
  $("#edit-po-wrapper,#single-po-display").hide();
  checkForChanges();
  if (!editPinState.pending) return;
  const message = $('<div id="edit-pin-message" class="small text-muted mt-1" role="status">Checking pincode…</div>').insertAfter("#edit-pincode");
  try {
    const rows = await KafakUI.pin(val);
    if (generation !== editPinGeneration || $("#edit-pincode").val() !== val) return;
    const data = rows.map((p) => _objectSpread(_objectSpread({}, p), {}, {
      officename: p.officename.replace(/(?:^|[\s.]+)[BSHP][.\s]*O[.\s]*$/i, " PO").trim()
    }));
    $("#edit-district").val(data[0].district);
    $("#edit-state").val(data[0].statename);
    if (data.length === 1) {
      $("#edit-postoffice").val(data[0].officename);
      $("#single-po-display").text(data[0].officename).show();
    } else {
      const select = $("#edit-postoffice-select").empty().append(new Option("Select Post Office", ""));
      data.forEach((p) => select.append(new Option(p.officename, p.officename)));
      $("#edit-po-wrapper").show();
    }
    editPinState = {
      pin: val,
      pending: false,
      valid: true
    };
    message.remove();
    updateSummaryDisplay();
    if ($("#quick-qty").val()) updatePrice($("#quick-qty").val(), true);
  } catch (error) {
    if (generation !== editPinGeneration) return;
    editPinState.pending = false;
    message.empty().text(error.message + " ").append($('<button type="button" class="btn btn-sm btn-outline-secondary">Retry</button>').on("click", () => handleEditPincode($("#edit-pincode").val())));
  } finally {
    if (generation === editPinGeneration) checkForChanges();
  }
};
function updateFooterButtons(view) {
  $("#top-progress-container").toggle(view === "wizard");
  $("#btn-group-0").hide();
  $("#btn-group-wizard").hide();
  $("#btn-group-returning").hide();
  if (view === "step-0") $("#btn-group-0").show();
  if (view === "wizard") $("#btn-group-wizard").css({
    "display": "flex",
    "gap": "1rem"
  });
  if (view === "returning") $("#btn-group-returning").show();
}
window.startWizard = function() {
  preloadHoneyVideo();
  $("#wizard-view").show();
  updateFooterButtons("wizard");
  $("#admin-wiz-label").remove();
  $("#admin-product-panel").remove();
  if (window.kafakStorage.getItem("kafakAdmin") === "true") {
    let labelHtml = `
            <div id="admin-wiz-label" class="text-center mb-4 fade-in">
                <span class="badge bg-dark text-warning border border-warning shadow-sm px-3 py-2 rounded-pill" 
                      style="font-size:10px; letter-spacing:1px; font-weight:800;">
                    <i class="fas fa-user-shield me-1"></i> ADMIN ORDERING
                </span>
            </div>
         `;
    $("#wizard-view").prepend(labelHtml);
    let prodSelectHTML = `
        <div id="admin-product-panel" class="mb-3 p-3 bg-white border border-warning rounded shadow-sm fade-in w-100">
            <label class="small text-muted fw-bold mb-1" style="font-size:11px; letter-spacing:1px;">SELECT PRODUCT 🍯</label>
            <select id="admin-product-type" class="form-select form-select-sm fw-bold border-warning text-dark" onchange="onProductChange()">
                <option value="Vanthen" selected>Wild Honey</option>
                <option value="Cheruthen">Cheruthen (Stingless Honey)</option>
            </select>
        </div>
    `;
    $(prodSelectHTML).prependTo('.wiz-step[data-step="7"]');
    renderQtyDropdowns();
  }
  currentStep = 1;
  showStep(1);
  if (isOutOfStock) {
    showPreBookingAlert();
  }
};
window.showStep = function(s) {
  const target = $(`.wiz-step[data-step="${s}"]`);
  target.stop(true, true).show();
  const input = target.find("input").first()[0];
  if (input && !(s === 1 && isOutOfStock)) KafakUI.focusInput(input);
  else if (document.activeElement && document.activeElement.matches("input,textarea")) document.activeElement.blur();
  $(".wiz-step").not(target).hide();
  const pct = s / 7 * 100;
  $("#wiz-progress").css("width", `${pct}%`);
  const btn = $("#btn-wiz-next");
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || {};
  if (s === 7) {
    btn.html(t.btn_order || "PLACE ORDER");
    btn.addClass("btn-brand-green");
    updatePrice($("#quantity").val(), false);
  } else {
    btn.html(t.btn_next || "NEXT");
    btn.removeClass("btn-brand-green");
  }
  if (s === 5 && typeof updateLiveAddressPreview === "function") {
    setTimeout(updateLiveAddressPreview, 50);
  }
};
window.nextStep = async function() {
  const lang = $("#language-select").val() || "en";
  const t = translations[lang];
  const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  if (currentStep === 1 && !$("#name").val()) return showAlert(getAlert("err_name"));
  if (currentStep === 2 && !/^[0-9]{8,15}$/.test($("#whatsapp").val())) return showAlert(getAlert("err_whatsapp"));
  if (currentStep === 3) {
    const pin = $("#pincode").val();
    if (!/^[0-9]{6}$/.test(pin)) return showAlert(getAlert("err_pincode"));
    $("#btn-wiz-next").prop("disabled", true).text(getAlert("err_checking_pin"));
    try {
      let data = await KafakUI.pin(pin);
      if ($("#pincode").val() !== pin || currentStep !== 3) {
        $("#btn-wiz-next").prop("disabled", false).text(t.btn_next);
        return;
      }
      data = data.map((item) => _objectSpread(_objectSpread({}, item), {}, {
        officename: item.officename.replace(/(?:^|[\s\.]+)[BSHP][\.\s]*O[\.\s]*$/i, " PO").trim()
      }));
      $("#btn-wiz-next").prop("disabled", false).text(t.btn_next);
      if (data && data.length > 0) {
        poList = data;
        userData.district = data[0].district;
        userData.state = data[0].statename;
        const dl = $("#place-list");
        dl.empty();
        data.forEach((p) => dl.append(`<option value="${p.officename}">`));
        if (data.length > 1) {
          $("#po-select").empty().append(`<option value="">${t.lbl_select_po}...</option>`);
          data.forEach((p) => $("#po-select").append(`<option value="${p.officename}">${p.officename}</option>`));
          currentStep = 3.5;
          showStep(3.5);
          return;
        } else {
          userData.postoffice = data[0].officename;
          currentStep = 4;
          showStep(4);
          return;
        }
      } else {
        showAlert(getAlert("err_pin_not_found"));
      }
    } catch (e) {
      $("#btn-wiz-next").prop("disabled", false).text(t.btn_next);
      showAlert(e.message || getAlert("err_pincode"));
      return;
    }
  }
  if (currentStep === 3.5) {
    if (!$("#po-select").val()) return showAlert(getAlert("err_select_po"));
    userData.postoffice = $("#po-select").val();
    currentStep = 4;
    showStep(4);
    return;
  }
  if (currentStep === 4) {
    if (!$("#house").val()) {
      showAlert(getAlert("err_house"));
      $("#house").focus();
      return;
    }
    currentStep = 5;
    showStep(5);
    return;
  }
  if (currentStep === 5) {
    if (!$("#place").val()) {
      showAlert(getAlert("err_place"));
      $("#place").focus();
      return;
    }
    updateWizardLocDisplay();
    currentStep = 6;
    showStep(6);
    return;
  }
  if (currentStep === 6) {
    const mainPh = $("#phone").val();
    const altPh = $("#altphone").val();
    if (!/^[0-9]{8,15}$/.test(altPh)) {
      return showAlert(getAlert("err_alt_required"));
    }
    if (altPh && altPh === mainPh) {
      return showAlert(getAlert("err_alt_same"));
    }
  }
  if (currentStep === 7) {
    if (!$("#quantity").val()) {
      showAlert(getAlert("err_qty"));
      return;
    }
    submitWizardOrder();
    return;
  }
  currentStep++;
  showStep(currentStep);
};
window.prevStep = function() {
  if (currentStep === 1) {
    var _window$kafakRecovery;
    currentStep = 0;
    $("#step-0").show();
    KafakUI.focusInput(document.getElementById("phone"));
    $("#wizard-view").hide();
    updateFooterButtons("step-0");
    (_window$kafakRecovery = window.kafakRecovery) === null || _window$kafakRecovery === void 0 || _window$kafakRecovery.capture();
    return;
  }
  if (currentStep === 4 && poList.length > 1) {
    currentStep = 3.5;
    showStep(3.5);
    return;
  }
  if (currentStep === 4 && poList.length <= 1) {
    currentStep = 3;
    showStep(3);
    return;
  }
  if (currentStep === 3.5) {
    currentStep = 3;
    showStep(3);
    return;
  }
  currentStep--;
  showStep(currentStep);
};
window.processCleanReorder = function() {
  preloadHoneyVideo();
  let btn = $(".btn-update-sage");
  if (btn.data("is-processing")) return;
  let selectedQty = $("#quick-qty").val();
  if (!selectedQty) {
    showAlert(getAlert("err_qty") || "Please select quantity");
    return;
  }
  const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  let proceedToOrder = function() {
    btn.data("is-processing", true);
    btn.prop("disabled", true).html('<i class="fas fa-spinner fa-spin"></i> Processing...');
    if (currentLoginPhone && localUsersMap[currentLoginPhone]) {
      delete localUsersMap[currentLoginPhone].orderid;
      localUsersMap[currentLoginPhone].Status = "delivered";
      SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
    }
    editingOrderId = null;
    $(".btn-update-sage").attr("onclick", "submitQuickOrder()");
    submitQuickOrder();
  };
  if (typeof isOutOfStock !== "undefined" && isOutOfStock && !isAdmin) {
    showPreBookingAlert(proceedToOrder);
  } else {
    proceedToOrder();
  }
};
function updateLocalCache(data, status) {
  let oldPhone = userData.phone || currentLoginPhone;
  userData = _objectSpread(_objectSpread(_objectSpread({}, userData), data), {}, {
    Status: status
  });
  savedOrderData = JSON.parse(JSON.stringify(userData));
  if (oldPhone && oldPhone !== data.phone) {
    delete localUsersMap[oldPhone];
  }
  localUsersMap[data.phone] = _objectSpread(_objectSpread(_objectSpread({}, localUsersMap[data.phone]), data), {}, {
    Status: status
  });
  SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
  let allOrders = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
  let idx = allOrders.findIndex((o) => o.orderid === data.orderid);
  if (idx > -1) {
    allOrders[idx] = _objectSpread(_objectSpread(_objectSpread({}, allOrders[idx]), data), {}, {
      Status: status
    });
    window.kafakStorage.setItem("allOrdersCache", JSON.stringify(allOrders));
  }
}
function showReturningUserView(d, isActiveOrder, isServerData) {
  preloadHoneyVideo();
  $("#step-0").hide();
  $("#wizard-view").hide();
  $("#top-progress-container").hide();
  $("#quick-price-box").hide();
  $("#returning-user-view").show();
  updateFooterButtons("returning");
  isEditMode = isActiveOrder;
  savedOrderData = JSON.parse(JSON.stringify(d));
  let preferredLang = window.kafakStorage.getItem("activeLang") || d.language || "en";
  $("#language-select").val(preferredLang);
  changeLanguage(preferredLang);
  if (window.kafakStorage.getItem("kafakAdmin") !== "true") {
    $("#saved-name").text(d.name);
    $("#customer-logout").prop("hidden", false);
  } else {
    $("#saved-name").text(d.name);
    $("#customer-logout").prop("hidden", true);
  }
  $("#edit-name").val(d.name);
  $("#edit-house").val(d.house);
  $("#edit-place").val(d.place);
  $("#edit-pincode").val(d.pincode);
  $("#edit-postoffice").val(d.postoffice);
  if (d.pincode) {
    handleEditPincode(d.pincode, d.postoffice);
  }
  $("#edit-district").val(d.district);
  $("#edit-state").val(d.state);
  let sCheck = String(d.Status || d.status || "").toLowerCase();
  if (d.orderid && !["delivered", "completed", "refunded"].includes(sCheck)) {
    $("#display-oid").empty().append($("<b>").text(d.orderid)).show();
    let dateStr = d.timestamp || d.date;
    if (dateStr) $("#display-date").text(formatPrettyDate(dateStr)).show();
  } else {
    $("#display-oid").hide();
    $("#display-date").hide();
  }
  $("#edit-phone").val(d.phone);
  $("#edit-whatsapp").val(d.whatsapp || d.phone);
  $("#edit-altphone").val(d.altphone || "");
  $("#edit-paid-by").val(d.paidNum || "");
  updateSummaryDisplay();
  const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  $("#admin-product-panel").remove();
  $("#admin-comm-panel").remove();
  $("#admin-diff-viewer").remove();
  $("#admin-qty-actions").remove();
  if (isAdmin) {
    $("#quick-qty").prev("label").show();
    let savedProduct = d.product || "Vanthen";
    let prodSelectHTML = `
        <div id="admin-product-panel" class="mb-3 p-3 bg-white border border-warning rounded shadow-sm fade-in w-100">
            <label class="small text-muted fw-bold mb-1" style="font-size:11px; letter-spacing:1px;">SELECT PRODUCT 🍯</label>
            <select id="admin-product-type" class="form-select form-select-sm fw-bold border-warning text-dark" onchange="onProductChange()">
                <option value="Vanthen" ${savedProduct === "Vanthen" ? "selected" : ""}>Wild Honey</option>
                <option value="Cheruthen" ${savedProduct === "Cheruthen" ? "selected" : ""}>Cheruthen (Stingless Honey)</option>
            </select>
        </div>
    `;
    $("#admin-product-panel").remove();
    $(prodSelectHTML).insertBefore($("#quick-qty").prev("label"));
    let existingQty = d.quantity;
    renderQtyDropdowns();
    if (existingQty) {
      $("#quick-qty").val(existingQty);
    }
    let commHTML = `
        <div id="admin-comm-panel" class="mt-3 mb-3 p-3 bg-white border rounded shadow-sm fade-in">
          <div class="text-muted fw-bold small mb-2" style="font-size:11px; letter-spacing:1px;">SELECT TARGET NUMBER 🎯</div>
          <div class="d-flex align-items-center mb-2">
              <div class="flex-grow-1"><label class="small text-muted mb-0">Main Phone</label><input type="tel" id="adm-phone" class="form-control form-control-sm fw-bold bg-light" value="${KafakUI.escape(d.phone)}" readonly></div>
              <div class="ms-2 pt-3"><div class="radio-holder"><input class="form-check-input" type="radio" name="target_wa" value="phone" onchange="saveRadioSelection('${d.orderid}', this)" style="transform: scale(1.3);"></div></div>
          </div>
          <div class="d-flex align-items-center mb-2">
              <div class="flex-grow-1"><label class="small text-muted mb-0 text-success">WhatsApp</label><input type="tel" id="adm-whatsapp" class="form-control form-control-sm fw-bold border-success bg-light" value="${KafakUI.escape(d.whatsapp || d.phone)}" readonly></div>
              <div class="ms-2 pt-3"><div class="radio-holder"><input class="form-check-input" type="radio" name="target_wa" value="whatsapp" onchange="saveRadioSelection('${d.orderid}', this)" style="transform: scale(1.3); border-color:#25D366;"></div></div>
          </div>
          <div class="d-flex align-items-center mb-2">
              <div class="flex-grow-1"><label class="small text-muted mb-0">Alt Phone</label><input type="tel" id="adm-alt" class="form-control form-control-sm fw-bold bg-light" value="${KafakUI.escape(d.altphone || "")}" placeholder="No Alt Phone" readonly></div>
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
    $(commHTML).insertBefore("#status-area");
    $("#adm-paid").val(d.paidNum || "");
    const targetVal = KafakBusinessOrder.contact(d).type;
    $("#adm-paid").val(d.paidNum || "");
    $(`input[name="target_wa"][value="${targetVal}"]`).prop("checked", true);
    $(`<div id="admin-diff-viewer" class="mt-2 mb-2 p-3 rounded fade-in" style="display:none; background:#fff3cd; border:1px solid #ffeeba; color:#856404;"></div>`).insertBefore(".btn-update-sage");
    $(`<div id="admin-qty-actions" class="mt-3 fade-in" style="display:none;"></div>`).insertAfter("#admin-diff-viewer");
  }
  $("#status-area").hide().empty();
  if (isServerData) {
    let currentStatus = String(d.Status || d.status || "").toLowerCase();
    let isOrderDone = ["delivered", "completed"].includes(currentStatus);
    if (!isOrderDone) {
      updateStatusUI(d);
      if ($("#refresh-btn").length === 0) {
        $("#returning-user-view").append(`<div class="d-flex justify-content-center mt-4 mb-3 fade-in"><button id="refresh-btn" onclick="manualRefresh()" class="btn btn-sm bg-white shadow-sm rounded-pill text-muted border px-3 py-2"><i class="fas fa-sync-alt me-1"></i> <span>REFRESH STATUS</span></button></div>`);
      }
    } else {
      $("#status-area").hide().empty();
      $("#refresh-btn").parent().hide();
    }
    handleEditControlsVisibility(d);
    if (!isOrderDone && d.quantity) {
      $("#quick-qty").val(d.quantity);
      updatePrice(d.quantity, true);
    } else if (isOrderDone) {
      $("#quick-qty").val("");
      $("#quick-price-box").hide().empty();
    }
  } else {
    $("#status-area").html(`<div class="text-center py-5"><i class="fas fa-hourglass-half fa-spin text-muted"></i></div>`).show();
    $('label[data-i18n="lbl_qty"]').hide();
    $("#quick-qty").hide().prev("label").hide();
    $(".btn-update-sage").hide();
    $("#quick-price-box").stop(true, true).hide().empty();
    $("#btn-edit-addr").hide();
  }
  checkForChanges();
}
window.enableNewOrderMode = function() {
  preloadHoneyVideo();
  $("#btn-new-order-mode").hide();
  $("#status-area").empty();
  if (typeof savedOrderData !== "undefined") {
    savedOrderData.quantity = null;
  }
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  $('label[data-i18n="lbl_qty"]').text(t.lbl_qty || "How many bottles?");
  $('label[data-i18n="lbl_qty"]').fadeIn();
  $("#quick-qty").prev("label").fadeIn();
  $("#quick-qty").fadeIn();
  $(".btn-update-sage").fadeIn();
  $("#quick-price-box").hide().empty();
  $("#btn-edit-addr").fadeIn().css("display", "inline-block");
  $("#quick-qty").prop("disabled", false);
  isEditMode = false;
  editingOrderId = null;
  $("#display-oid").hide();
  $("#display-date").hide();
  $("#quick-qty").val("").trigger("change");
  $("#quick-qty option").prop("disabled", false);
  $("#btn-req-modify").remove();
  checkForChanges();
};
window.markOrderDelivered = function(oid) {
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  Swal.fire({
    title: t.title_order_received,
    text: t.text_order_received,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    cancelButtonColor: "#d33",
    confirmButtonText: t.btn_yes_received,
    cancelButtonText: t.btn_not_yet,
    customClass: {
      popup: "rounded-4 shadow-lg"
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      if (window.kafakOrderEditorUI) {
        try {
          await window.kafakOrderEditorUI.delivered(oid);
        } catch (error) {
          Swal.fire({
            icon: "error",
            title: "Update not saved",
            text: error.message
          });
          return;
        }
      }
      $("#btn-mark-delivered").parent().html(`
          <div class="text-success fw-bold text-center py-3 fade-in" style="animation: popIn 0.5s ease;">
              <i class="fas fa-check-circle fa-3x mb-2"></i><br>
              <span style="font-size:16px;">${t.thank_you}</span>
          </div>
      `);
      Swal.fire({
        title: t.thank_you_title,
        html: `<div style="font-size:14px;">${t.thank_you_msg}</div>`,
        icon: "success",
        showConfirmButton: false,
        timer: 3e3,
        backdrop: `rgba(0,0,0,0.4)`,
        padding: "2em",
        customClass: {
          popup: "rounded-4"
        }
      });
      let now = /* @__PURE__ */ new Date();
      let actionDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (typeof userData !== "undefined") {
        userData.Status = "Delivered";
        userData["Delivered Date"] = actionDate;
        delete userData.quantity;
        saveToLocal(userData.phone, userData);
        updateStatusUI(userData);
        setTimeout(() => {
          renderEditView(userData);
        }, 3e3);
      }
      if (!window.kafakOrderEditorUI) orderServiceFetch(sc, {
        method: "POST",
        body: JSON.stringify({
          action: "bulkUpdateStatus",
          updates: [{
            oid,
            status: "Delivered",
            actionDate
            // 🔥 Sends Date to Backend
          }]
        })
      }).then((res) => res.json()).then((data) => console.log("Server Updated: Delivered ✅")).catch((err) => console.log("Background Sync Failed"));
    }
  });
};
function updateStatusUI(d) {
  $("#status-area").empty();
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  let s = String(d.Status || d.status || "pending").toLowerCase();
  let msg = String(d.deliveryNews || "").trim();
  let isOutForDelivery = msg.includes("[🚚 Out for Delivery:");
  let isOrderDone = ["delivered", "completed", "refunded"].includes(s);
  let deliveryAlertHtml = "";
  if (isOutForDelivery && !isOrderDone) {
    let dateMatch = msg.match(/\[🚚 Out for Delivery:\s*([\d-]+)/);
    let dateStr = dateMatch ? dateMatch[1] : "";
    if (dateStr) {
      let parts = dateStr.split("-");
      if (parts.length === 3) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    deliveryAlertHtml = `
        <div class="out-for-delivery-alert mb-4 p-3 shadow-sm d-flex align-items-center gap-3 fade-in" 
             style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 16px; position: relative; overflow: hidden;">
            <div class="pulse-container"><div class="pulse-dot"></div></div>
            <div class="flex-grow-1">
                <div style="font-size: 13px; font-weight: 800; color: #166534; letter-spacing: 0.5px;">🚚 OUT FOR DELIVERY</div>
                <div style="font-size: 11px; color: #15803d; font-weight: 600;">നിങ്ങളുടെ ഓർഡർ ഇന്ന് ലഭിക്കുന്നതാണ്. (${dateStr})</div>
            </div>
            <div style="opacity: 0.2; position: absolute; right: -10px; bottom: -10px; font-size: 50px;">🚚</div>
        </div>`;
  }
  const isPaid = ["paid", "dispatched", "delivered", "refunded", "completed"].includes(s);
  const isDispatched = ["dispatched", "delivered", "refunded", "completed"].includes(s);
  const isDelivered = ["delivered", "completed"].includes(s);
  const isRefunded = s === "refunded";
  let timelineHTML = deliveryAlertHtml + `<div class="tracking-wrapper" style="opacity:0; transition: opacity 0.5s ease-in-out;">
        <h6 class="fw-bold mb-4 ps-1" style="font-size:13px; color:#374151; letter-spacing:0.5px;">${t.lbl_order_status}</h6>
        <div class="modern-timeline">`;
  const items = [{
    title: t.order_success,
    desc: t.desc_order_placed,
    date: d.timestamp || d.date,
    active: true
  }, {
    title: t.lbl_payment_received,
    desc: t.desc_pay_received,
    date: d.paidDate,
    active: isPaid
  }, {
    title: t.lbl_dispatched,
    desc: t.desc_dispatched,
    date: d["Dispatched Date"],
    active: isDispatched
  }];
  if (isRefunded) {
    items.push({
      title: t.lbl_refunded || "Refunded",
      desc: t.desc_refunded || "Amount Returned",
      date: null,
      active: true,
      isRefund: true
    });
  } else {
    items.push({
      title: t.lbl_delivered,
      desc: t.desc_delivered,
      date: null,
      active: isDelivered
    });
  }
  let trackNumToLoad = null;
  items.forEach((item, index) => {
    let isLast = index === items.length - 1;
    let iconClass = "timeline-icon" + (item.isRefund ? " refunded" : item.active ? " active" : "");
    let iconContent = item.isRefund ? `<i class="fas fa-undo-alt"></i>` : item.active ? `<i class="fas fa-check"></i>` : "";
    let iconHtml = `<div class="${iconClass}">${iconContent}</div>`;
    let nextItemActive = items[index + 1] && items[index + 1].active;
    let lineHtml = isLast ? "" : `<div class="timeline-line ${nextItemActive ? "active" : ""}"></div>`;
    let dateHtml = item.date && item.active ? `<div class="ms-auto text-muted small fw-bold" style="font-size:10px; background:#f3f4f6; padding:2px 8px; border-radius:10px;">${formatPrettyDate(item.date)}</div>` : "";
    let extraContent = "";
    if (index === 2 && item.active && d.tracking && !isRefunded) {
      let trackNum = String(d.tracking || "").trim();
      let rawProvider = String(d.courier || d.Courier_Provider || d.provider || "Courier").trim().toUpperCase();
      let isPost = rawProvider.includes("POST") || rawProvider.includes("INDIA");
      let trackLink = "";
      if (rawProvider.includes("DTDC")) {
        trackLink = trackNum.length > 9 ? `https://www.dtdc.in/tracking/tracking_results.asp?trno=${trackNum}` : `https://www.google.com/search?q=DTDC+tracking+${trackNum}`;
      } else if (rawProvider.includes("POST") || rawProvider.includes("INDIA")) {
        trackLink = `https://www.indiapost.gov.in/layouts/15/dop.portal.tracking/trackconsignment.aspx`;
        trackNumToLoad = trackNum;
      } else if (rawProvider.includes("SPEED") || rawProvider.includes("SAFE")) {
        trackLink = `https://www.gokulamspeedandsafe.com/speedandsafe-tracking/`;
      } else {
        trackLink = `https://www.google.com/search?q=${encodeURIComponent(rawProvider)}+tracking+${trackNum}`;
      }
      let trackBtnHtml = isPost ? "" : `
    <button onclick="trackParcel('${trackNum}', '${rawProvider}', '${trackLink}')" class="btn btn-warning shadow-sm rounded-pill px-3 py-1 fw-bold d-flex align-items-center" style="font-size:11px; letter-spacing:0.5px; border:none;">
        ${t.btn_track} <i class="fas fa-history ms-1" style="font-size:9px;"></i>
    </button>`;
      extraContent = `
    <div class="mt-3 p-2 rounded-3 shadow-sm d-flex flex-column" style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6;">
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex flex-column">
                <div style="font-size:9px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:2px; letter-spacing:0.5px;">
                    <i class="fas fa-truck text-primary me-1"></i> ${rawProvider}
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bolder text-dark" style="font-size:11px; font-family:monospace; letter-spacing:0.5px;">${trackNum}</span>
                    <button onclick="copyTrackingID('${trackNum}', this)" class="btn btn-sm btn-white p-0 d-flex align-items-center justify-content-center shadow-sm" style="width:24px; height:24px; border-radius:6px; border:1px solid #cbd5e1; background:#fff;" title="Copy ID">
                        <i class="far fa-copy text-secondary" style="font-size:12px;"></i>
                    </button>
                </div>
            </div>
            ${trackBtnHtml} 
        </div>
        <div id="inline-track-${trackNum}"></div>
    </div>`;
    }
    let rowClass = item.isRefund ? "timeline-row refunded-text" : item.active ? "timeline-row completed" : "timeline-row";
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
  if (s === "dispatched") {
    timelineHTML += `
            <div class="mt-4 px-2 text-center fade-in">
                <div class="text-muted fw-bold mb-3" style="font-size:11px; letter-spacing:0.5px; text-transform:uppercase;">
                    ${t.txt_received_helper}
                </div>
                <button id="btn-mark-delivered" onclick="markOrderDelivered('${d.orderid}')" 
                    class="btn w-100 py-3 shadow-lg" 
                    style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; border-radius: 16px; border: none; position: relative; overflow: hidden; transition: transform 0.2s;"
                    onmousedown="this.style.transform='scale(0.98)'" 
                    onmouseup="this.style.transform='scale(1)'">
                    <div class="d-flex align-items-center justify-content-center gap-2">
                        <div style="background:rgba(255,255,255,0.2); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-check text-white" style="font-size:14px;"></i>
                        </div>
                        <div class="text-start">
                            <div style="font-size:14px; font-weight:800; letter-spacing:0.5px; line-height:1.2;">${t.btn_yes_i_received}</div>
                            <div style="font-size:10px; opacity:0.9; font-weight:500;">${t.click_to_mark_delivered}</div>
                        </div>
                    </div>
                </button>
            </div>`;
  }
  $("#status-area").html(timelineHTML);
  $("#status-area").fadeIn(500, function() {
    $(".tracking-wrapper").css("opacity", "1");
  });
  if (trackNumToLoad && !isOrderDone) {
    setTimeout(() => {
      if (typeof window.loadLiveTrackingInline === "function") {
        window.loadLiveTrackingInline(trackNumToLoad, d.postoffice, lang);
      }
    }, 800);
  }
}
function updateSummaryDisplay() {
  const newName = $("#edit-name").val();
  if (newName) {
    if (window.kafakStorage.getItem("kafakAdmin") !== "true") {
      $("#saved-name").text(newName);
      $("#customer-logout").prop("hidden", false);
    } else {
      $("#saved-name").text(newName);
    }
  }
  const house = $("#edit-house").val() || "";
  const place = $("#edit-place").val() || "";
  let po = "";
  if ($("#edit-postoffice-select").is(":visible") && $("#edit-postoffice-select").val()) {
    po = $("#edit-postoffice-select").val();
  } else {
    po = $("#edit-postoffice").val() || "";
  }
  const pin = $("#edit-pincode").val() || "";
  const dist = $("#edit-district").val() || "";
  const state = $("#edit-state").val() || "KERALA";
  const wa = $("#edit-whatsapp").val() || "";
  const alt = $("#edit-altphone").val();
  const phone = $("#edit-phone").val() || "";
  const safe = (val) => KafakUI.escape(String(val || "").trim().toUpperCase());
  let poClean = safe(po).replace(/(?:^|[\s\.]+)[BSHP][\.\s]*O[\.\s]*$/i, "").trim();
  if (poClean) poClean += " PO";
  let addrHtml = `
      <span class="addr-house">${safe(house)}</span>
      ${safe(place)}${place && poClean ? "," : ""} <b>${poClean}</b>
      <br>
      <span style="font-weight:600;">${safe(dist)}, ${safe(state)}</span> 
      <span class="pin-box">${safe(pin)}</span>
  `;
  $("#saved-address-text").html(addrHtml);
  let phoneHtml = `
      <div class="phone-grey-box">
          <div class="ph-row">
              <i class="fas fa-phone-alt text-secondary" style="width:20px; text-align:center;"></i> 
              <span style="color:#374151; font-weight:700; font-size:14px;">${KafakUI.escape(phone)}</span>
              ${alt ? `<span style="color:#ccc; margin:0 5px;">|</span> <span style="color:#666;">${KafakUI.escape(alt)}</span>` : ""}
          </div>
          ${wa ? `
          <div class="ph-row">
              <i class="fab fa-whatsapp" style="color:#25D366; font-size:18px; width:20px; text-align:center;"></i> 
              <span style="color:#25D366; font-weight:700; font-size:14px;">${KafakUI.escape(wa)}</span>
          </div>` : ""}
      </div>
  `;
  $("#saved-phone-text").html(phoneHtml);
  $("#saved-wa-text, #saved-alt-text").hide();
  if (typeof userData !== "undefined" && userData.Status) {
    let s = String(userData.Status).toLowerCase().trim();
    let isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
    if (["paid", "dispatched"].includes(s) && !isAdmin) {
      $("#btn-edit-addr").hide();
    } else {
      $("#btn-edit-addr").css("display", "inline-block");
    }
  }
  if (typeof checkForChanges === "function") checkForChanges();
}
function checkAndHideEditButton() {
  if (typeof userData !== "undefined" && userData.Status) {
    applyHideLogic(userData.Status);
    return;
  }
  let hiddenStatus = $("#order-status-hidden").val();
  if (hiddenStatus) {
    applyHideLogic(hiddenStatus);
  }
}
function applyHideLogic(status) {
  let s = String(status).toLowerCase().trim();
  let isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  if (["paid", "dispatched"].includes(s) && !isAdmin) {
    $("#btn-edit-addr").hide();
  } else {
    $("#btn-edit-addr").css("display", "inline-flex");
  }
}
window.updatePrice = async function(qty, isQuick) {
  var _discountQuote;
  const container = isQuick ? $("#quick-price-box") : $("#wiz-price-box");
  if (!qty) {
    container.hide();
    return;
  }
  const lang = $("#language-select").val() || "ml";
  const t = translations[lang];
  const n = parseInt(qty);
  let productType = "Vanthen";
  if ($("#admin-product-type").length) {
    productType = $("#admin-product-type").val();
  } else if (typeof savedOrderData !== "undefined" && savedOrderData.product) {
    productType = savedOrderData.product;
  }
  let base = 0;
  let totalCourier = 0;
  let discountQuote = null;
  if (window.kafakCheckoutUI) {
    container.hide();
    const quote = await window.kafakCheckoutUI.price(qty, isQuick);
    if (!quote) return;
    base = quote.productAmount;
    totalCourier = quote.courierAmount;
    discountQuote = quote;
    $("#offer-badge").toggle(!!quote.discountAmount).text(quote.discountAmount ? `Offer applied · ₹${quote.discountAmount.toFixed(2)} saved` : "");
  } else {
    if (productType === "Cheruthen") {
      if (n === 1) {
        base = 900;
        totalCourier = 80;
      } else if (n === 2) {
        base = 1800;
        totalCourier = 100;
      } else {
        base = n * 900;
        totalCourier = n * 80;
      }
    } else {
      base = typeof courierRates !== "undefined" && courierRates.prices && courierRates.prices[n] ? Number(courierRates.prices[n]) : n * 650;
      let currentState = isQuick ? $("#edit-state").val() : userData && userData.state ? userData.state : $("#state").val() || "KERALA";
      let savedProvider = null;
      if (typeof savedOrderData !== "undefined" && savedOrderData.courier) savedProvider = savedOrderData.courier;
      const zone = getZoneKey(currentState, savedProvider);
      if (typeof courierRates !== "undefined") {
        let p = savedProvider ? String(savedProvider).toUpperCase().trim() : "";
        let zoneData = (p ? courierRates[`${zone} ${p}`] || courierRates[`${zone}_${p}`] : null) || courierRates[`${zone} DEFAULT`] || courierRates[`${zone}_DEFAULT`] || courierRates[zone] || courierRates["REST OF INDIA DEFAULT"] || courierRates["REST OF INDIA"];
        if (zoneData && typeof zoneData === "object" && zoneData.baseRate !== void 0) {
          let courierBaseRate = window.parseDynamicRate(zoneData.baseRate, n);
          let margin = window.parseDynamicRate(zoneData.serviceCharge, n);
          totalCourier = courierBaseRate + margin;
        } else if (zoneData && zoneData[n] !== void 0) {
          totalCourier = Number(zoneData[n]);
        }
      }
      if (totalCourier === 0) totalCourier = n * 60 + 20;
    }
  }
  const total = base + totalCourier;
  let htmlContent = `
      <div class="price-row"><span>${t.lbl_honey_price} (<span class="qty-count">${n}</span>)</span><span>₹<span class="val-base">${base}</span></span></div>
      <div class="price-row"><span>${t.lbl_courier_charge}</span><span>₹<span class="val-courier">${totalCourier}</span></span></div>
      <div class="price-total"><span>${t.lbl_total_amount}</span><span class="text-success">₹<span class="val-total">${total}</span></span></div>
  `;
  if ((_discountQuote = discountQuote) !== null && _discountQuote !== void 0 && _discountQuote.discountAmount) {
    htmlContent = `<div class="price-row"><span>Product price before offer</span><span>₹${Number(discountQuote.productListAmount).toFixed(2)}</span></div><div class="price-row text-success"><span>Offer discount</span><span>−₹${Number(discountQuote.discountAmount).toFixed(2)}</span></div>` + htmlContent;
  }
  container.html(htmlContent);
  if (isQuick) {
    let isLoaderVisible = $("#status-area").html().includes("fa-hourglass-half") || $("#status-area").html().includes("spinner");
    if (isLoaderVisible || !$("#quick-qty").is(":visible")) {
      container.stop(true, true).hide();
    } else {
      container.stop(true, true).fadeIn(200);
    }
  } else {
    container.stop(true, true).fadeIn(200);
  }
  if (!isQuick) {
    let name = $("#name").val() || "";
    let house = $("#house").val() || "";
    let place = $("#place").val() || "";
    let po = (userData.postoffice || "").toUpperCase();
    let dist = (userData.district || "").toUpperCase();
    let state = (userData.state || "KERALA").toUpperCase();
    let pin = $("#pincode").val();
    let phone = $("#phone").val();
    let wa = $("#whatsapp").val();
    let prettyHtml = `
        <div style="padding: 8px 0; border-bottom: 1px dashed #e0e0e0; margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                 <div style="font-size: 10px; font-weight: 800; color: #9ca3af; letter-spacing: 1px;">${t.lbl_deliver_to || "DELIVER TO"}</div>
                 <div style="font-size: 11px; font-weight: 700; color: #25D366;"><i class="fab fa-whatsapp"></i> ${KafakUI.escape(wa)}</div>
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #1a1a1a; text-transform: uppercase;">${KafakUI.escape(name)}</div>
            <div style="font-size: 12px; color: #4b5563; line-height: 1.6; text-transform: uppercase;">
                <span style="font-weight: 600;">${KafakUI.escape(house)}</span>, ${KafakUI.escape(place)}, ${KafakUI.escape(po)},<br/>
                ${KafakUI.escape(dist)}, ${KafakUI.escape(state)} - <b>${KafakUI.escape(pin)}</b>
            </div>
        </div>
    `;
    $("#wiz-final-addr").html(prettyHtml);
    const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
    if (isAdmin) {
      $("#wiz-admin-wa-selector").remove();
      let phoneOpts = `<option value="W">WhatsApp (${KafakUI.escape(wa)})</option>`;
      phoneOpts += `<option value="M">Main Phone (${KafakUI.escape(phone)})</option>`;
      let alt = $("#altphone").val();
      if (alt) phoneOpts += `<option value="A">Alt Phone (${KafakUI.escape(alt)})</option>`;
      let selectorHtml = `
        <div id="wiz-admin-wa-selector" class="mt-2 p-2 bg-light border border-warning border-opacity-50 rounded" style="font-size:12px;">
            <div class="fw-bold text-dark mb-1"><i class="fas fa-bullseye text-danger"></i> Send WhatsApp To:</div>
            <select id="wiz-target-wa" class="form-select form-select-sm border-secondary fw-bold text-primary">
                ${phoneOpts}
            </select>
        </div>`;
      $("#wiz-final-addr").append(selectorHtml);
    }
    $("#wiz-deliver-box").fadeIn();
  }
  if (isQuick) checkForChanges();
};
$("#place").on("input", function() {
  if ($("#display-po").length === 0) {
    $('<div id="display-po" style="display:none;"></div>').insertAfter("#place");
  }
  if ($("#display-dist-state").length === 0) {
    $('<div id="display-dist-state" style="display:none;"></div>').insertAfter("#place");
  }
  try {
    if (typeof updateWizardLocDisplay === "function") {
      updateWizardLocDisplay();
    }
  } catch (e) {
  }
  updateLiveAddressPreview();
});
function updateLiveAddressPreview() {
  let place = $("#place").val() || "";
  let poRaw = typeof userData !== "undefined" && userData.postoffice ? userData.postoffice : "";
  let po = poRaw.replace(/(?:^|[\s\.]+)[BSHP][\.\s]*O[\.\s]*$/i, "").trim();
  if (po) po += " PO";
  let dist = typeof userData !== "undefined" && userData.district ? userData.district : "";
  let state = typeof userData !== "undefined" && userData.state ? userData.state : $("#state").val() || "KERALA";
  let pin = $("#pincode").val() || "";
  if (dist.toLowerCase() === place.toLowerCase()) {
    dist = "";
  }
  let lang = $("#language-select").val() || "en";
  let t = translations[lang] || {};
  let warnText = t.warn_place_only || "Enter your Place/City ONLY";
  let previewHtml = `
  <div class="text-danger fw-bold mb-2" style="margin-top: 5px; font-size:11px; letter-spacing:0.5px; border-bottom:1px dashed #e0e0e0; padding-bottom:8px;">
        <i class="fas fa-info-circle"></i> ${warnText}
    </div>
    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 15px; margin-top: 8px;">
        <div style="font-size: 13px; line-height: 1.6; color: #333;">
            <div style="font-weight: 700; text-transform: uppercase; color: #000;">${KafakUI.escape(po)}</div>
            
            <div style="text-transform: uppercase;">
                ${KafakUI.escape(place)}${place && dist ? ", " : ""}
                <span style="text-transform: uppercase; font-weight:600;">${KafakUI.escape(dist)}</span>
            </div>

            <div style="text-transform: uppercase; font-size: 12px; color: #555; margin-top:2px;">
                ${KafakUI.escape(state)} - <span style="font-weight: 800; color: #000;">${KafakUI.escape(pin)}</span>
            </div>
        </div>
    </div>
    `;
  if ($("#live-addr-preview").length === 0) {
    $('<div id="live-addr-preview"></div>').insertAfter("#place");
  }
  $("#live-addr-preview").html(previewHtml);
}
setTimeout(updateLiveAddressPreview, 1e3);
window.checkForChanges = function() {
  var _savedOrderData;
  if ($(".btn-update-sage").data("is-processing") === "active") {
    $("#address-edit-box button").prop("disabled", true).css({
      opacity: "0.5",
      cursor: "not-allowed"
    });
    return;
  }
  if ((_savedOrderData = savedOrderData) !== null && _savedOrderData !== void 0 && _savedOrderData.readOnly && editingOrderId && window.kafakStorage.getItem("kafakAdmin") !== "true") {
    $("#address-edit-box button,.btn-update-sage").prop("disabled", true);
    $("#btn-edit-addr").hide();
    return;
  }
  var currQty = $("#quick-qty").val() || "";
  var currName = $("#edit-name").val() || "";
  var currPhone = $("#edit-phone").val() || "";
  var currWa = $("#edit-whatsapp").val() || "";
  var currHouse = $("#edit-house").val() || "";
  var currPlace = $("#edit-place").val() || "";
  var currPin = $("#edit-pincode").val() || "";
  var currAlt = $("#edit-altphone").val() || "";
  var currLang = $("#language-select").val() || "en";
  var currPO = "";
  if ($("#edit-postoffice-select").is(":visible") && $("#edit-postoffice-select").val()) {
    currPO = $("#edit-postoffice-select").val();
  } else {
    currPO = $("#edit-postoffice").val() || "";
  }
  var currDist = $("#edit-district").val() || "";
  var currState = $("#edit-state").val() || "";
  var currProduct = window.kafakCheckoutUI ? window.kafakCheckoutUI.productName() : $("#admin-product-type").length ? $("#admin-product-type").val() : savedOrderData.product || savedOrderData.Product || "Vanthen";
  var savedQty = (savedOrderData.quantity || "") + "";
  var savedName = (savedOrderData.name || "") + "";
  var savedPhone = (savedOrderData.phone || "") + "";
  var savedWa = (savedOrderData.whatsapp || savedOrderData.phone || "") + "";
  var savedHouse = (savedOrderData.house || "") + "";
  var savedPlace = (savedOrderData.place || "") + "";
  var savedPin = (savedOrderData.pincode || "") + "";
  var savedAlt = (savedOrderData.altphone || "") + "";
  var savedPO = (savedOrderData.postoffice || "") + "";
  var savedDist = (savedOrderData.district || "") + "";
  var savedState = (savedOrderData.state || "") + "";
  var savedProduct = (savedOrderData.product || savedOrderData.Product || "Vanthen") + "";
  var isChanged = false;
  var isQtyChanged = String(currQty) !== String(savedQty);
  if (isQtyChanged) isChanged = true;
  if (String(currName).trim() !== String(savedName).trim()) isChanged = true;
  if (String(currPhone) !== String(savedPhone)) isChanged = true;
  if (String(currWa) !== String(savedWa)) isChanged = true;
  if (String(currHouse).trim().toUpperCase() !== String(savedHouse).trim().toUpperCase()) isChanged = true;
  if (String(currPlace).trim().toUpperCase() !== String(savedPlace).trim().toUpperCase()) isChanged = true;
  if (String(currPin) !== String(savedPin)) isChanged = true;
  if (String(currAlt) !== String(savedAlt)) isChanged = true;
  if (String(currPO).trim().toUpperCase() !== String(savedPO).trim().toUpperCase()) isChanged = true;
  if (String(currDist).trim().toUpperCase() !== String(savedDist).trim().toUpperCase()) isChanged = true;
  if (String(currState).trim().toUpperCase() !== String(savedState).trim().toUpperCase()) isChanged = true;
  if (String(currProduct) !== String(savedProduct)) isChanged = true;
  var btnUpdate = $(".btn-update-sage");
  var btnSave = $("#address-edit-box button");
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || {
    txt_save_changes: "Save Changes",
    txt_no_changes: "No Changes",
    btn_update: "Update Order",
    btn_order: "PLACE ORDER"
  };
  const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  const status = String(savedOrderData.Status || "").toLowerCase();
  if (isAdmin && editingOrderId) {
    if (isQtyChanged && ["paid", "dispatched"].includes(status)) {
      let oldQty = parseInt(savedQty) || 0;
      let newQty = parseInt(currQty) || 0;
      let stateVal = $("#edit-state").val();
      let prov = typeof savedOrderData !== "undefined" ? savedOrderData.courier || savedOrderData.provider : "";
      let productType = currProduct;
      let oldBase = 0;
      let newBase = 0;
      if (productType === "Cheruthen") {
        oldBase = oldQty === 1 ? 900 : oldQty === 2 ? 1800 : oldQty * 900;
        newBase = newQty === 1 ? 900 : newQty === 2 ? 1800 : newQty * 900;
      } else {
        oldBase = typeof courierRates !== "undefined" && courierRates.prices && courierRates.prices[oldQty] ? Number(courierRates.prices[oldQty]) : oldQty * 650;
        newBase = typeof courierRates !== "undefined" && courierRates.prices && courierRates.prices[newQty] ? Number(courierRates.prices[newQty]) : newQty * 650;
      }
      let oldCourier = window.getDeliveryCharge(stateVal, oldQty, prov);
      let newCourier = window.getDeliveryCharge(stateVal, newQty, prov);
      if (productType === "Cheruthen") {
        oldCourier = oldQty === 1 ? 80 : oldQty === 2 ? 100 : oldQty * 80;
        newCourier = newQty === 1 ? 80 : newQty === 2 ? 100 : newQty * 80;
      }
      let oldTotal = oldBase + oldCourier;
      let newTotal = newBase + newCourier;
      let balance = newTotal - oldTotal;
      $("#admin-diff-viewer").html(`
              <div class="d-flex justify-content-between align-items-center">
                  <div><div class="fw-bold" style="font-size:13px;">Qty: ${oldQty} ➡ ${newQty}</div><div class="small text-muted">New Total: ₹${newTotal}</div></div>
                  <div class="text-end"><div class="fw-bold text-danger" style="font-size:16px;">Bal: ${balance > 0 ? "+" : ""}₹${balance}</div></div>
              </div>
          `).slideDown();
      $("#admin-action-bar").hide();
      let actionHtml = `
          <div class="d-flex gap-2">
              <button onclick="handleQtyUpdateAction('Sent', ${balance}, ${newTotal}, ${oldQty}, ${newQty})" class="btn w-50 shadow-sm text-white fw-bold" style="background:#fd7e14; border-radius:10px; font-size:13px;">
                  <i class="fab fa-whatsapp"></i> Update & Notify<br><span style="font-size:10px; opacity:0.8;">(Ask Balance)</span>
              </button>
              <button onclick="handleQtyUpdateAction('Paid', ${balance}, ${newTotal}, ${oldQty}, ${newQty})" class="btn w-50 shadow-sm text-white fw-bold" style="background:#198754; border-radius:10px; font-size:13px;">
                  <i class="fas fa-check-circle"></i> Update & PAID<br><span style="font-size:10px; opacity:0.8;">(Payment Recd)</span>
              </button>
          </div>`;
      $("#admin-qty-actions").html(actionHtml).slideDown();
      btnUpdate.hide();
    } else {
      $("#admin-diff-viewer").slideUp();
      $("#admin-qty-actions").slideUp();
      $("#admin-action-bar").show();
      if (isChanged) {
        btnUpdate.prop("disabled", false).css({
          "opacity": "1",
          "cursor": "pointer",
          "background": "#2563eb",
          "border-color": "#2563eb"
        }).html('<i class="fas fa-save me-1"></i> SAVE CHANGES').attr("onclick", "submitQuickOrder()");
        btnUpdate.show();
      } else {
        btnUpdate.prop("disabled", true).css({
          "opacity": "0.5",
          "cursor": "not-allowed",
          "background": "#6b7280",
          "border-color": "#6b7280"
        }).html('<i class="fas fa-save me-1"></i> NO CHANGES').attr("onclick", "");
        btnUpdate.show();
      }
    }
    if (isChanged) {
      btnSave.prop("disabled", false).css({
        "opacity": "1",
        "cursor": "pointer"
      }).text(t.txt_save_changes || "Save Changes");
    } else {
      btnSave.prop("disabled", true).css({
        "opacity": "0.5",
        "cursor": "not-allowed"
      }).text(t.txt_no_changes || "No Changes");
    }
    return;
  }
  if (!isAdmin && ["delivered", "completed", "refunded"].includes(status)) {
    btnUpdate.prop("disabled", false).css({
      "opacity": "1",
      "cursor": "pointer",
      "background": "#15803d",
      "border-color": "#15803d"
    }).html(`<i class="fas fa-shopping-bag me-1"></i> ${t.btn_order_again || "വീണ്ടും ഓർഡർ ചെയ്യാം"}`).attr("onclick", "processCleanReorder()");
    if (isChanged) btnSave.prop("disabled", false).css({
      "opacity": "1",
      "cursor": "pointer"
    }).text(t.txt_save_changes || "Save Changes");
    else btnSave.prop("disabled", true).css({
      "opacity": "0.5",
      "cursor": "not-allowed"
    }).text(t.txt_no_changes || "No Changes");
    return;
  }
  if (!isAdmin || !isQtyChanged) {
    if (!editingOrderId) {
      btnUpdate.prop("disabled", false).css({
        "opacity": "1",
        "cursor": "pointer",
        "background": "#16a34a",
        "border-color": "#15803d"
      });
      if (btnUpdate.html().indexOf("fa-shopping-cart") === -1 && btnUpdate.html().indexOf("fa-shopping-bag") === -1 && btnUpdate.html().indexOf("fa-plus-circle") === -1) {
        btnUpdate.html(`<i class="fas fa-shopping-cart me-1"></i> ${t.btn_order || "PLACE ORDER"}`);
      }
      if (isChanged) btnSave.prop("disabled", false).css({
        "opacity": "1",
        "cursor": "pointer"
      }).text(t.txt_save_changes || "Save Changes");
      else btnSave.prop("disabled", true).css({
        "opacity": "0.5",
        "cursor": "not-allowed"
      }).text(t.txt_no_changes || "No Changes");
    } else if (isChanged) {
      btnUpdate.prop("disabled", false).css({
        "opacity": "1",
        "cursor": "pointer",
        "background": "#2563eb",
        "border-color": "#2563eb"
      }).text(t.btn_update || "Update Order");
      btnSave.prop("disabled", false).css({
        "opacity": "1",
        "cursor": "pointer"
      }).text(t.txt_save_changes || "Save Changes");
    } else {
      btnUpdate.prop("disabled", true).css({
        "opacity": "0.5",
        "cursor": "not-allowed",
        "background": "#6b7280",
        "border-color": "#6b7280"
      }).text(t.txt_no_changes || "No Changes");
      btnSave.prop("disabled", true).css({
        "opacity": "0.5",
        "cursor": "not-allowed"
      }).text(t.txt_no_changes || "No Changes");
    }
  }
};
window.submitQuickOrder = async function() {
  let btn = $(".btn-update-sage");
  if (btn.data("is-processing") === "active") return;
  let originalHtml = btn.html();
  const restoreBtn = () => {
    btn.prop("disabled", false).html(originalHtml);
    btn.data("is-processing", "inactive");
    btn.data("is-processing", false);
    checkForChanges();
  };
  btn.prop("disabled", true).html('<i class="fas fa-spinner fa-spin"></i> Please wait...');
  btn.data("is-processing", "active");
  checkForChanges();
  if (!$("#quick-qty").val()) {
    showAlert(getAlert("err_qty"));
    restoreBtn();
    return;
  }
  const phoneCheck = $("#edit-phone").val() || (typeof userData !== "undefined" && userData ? userData.phone : null);
  const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  if (!editingOrderId && window.activeCustomerData && window.activeCustomerData.history) {
    let restrictedStatuses = ["pending", "sent", "archive"];
    let hasActiveOrder = window.activeCustomerData.history.some((o) => restrictedStatuses.includes(String(o.status).toLowerCase()));
    if (hasActiveOrder && !isAdmin) {
      restoreBtn();
      Swal.fire({
        icon: "warning",
        title: "Active Order Exists! ⚠️",
        html: "താങ്കൾക്ക് നിലവിൽ പ്രോസസ്സ് ചെയ്തുകൊണ്ടിരിക്കുന്ന ഒരു ഓർഡർ ഉണ്ട്.",
        confirmButtonText: "OK",
        confirmButtonColor: "#ffc107"
      });
      return;
    }
  }
  if (!editingOrderId && phoneCheck) {
    showLoader(true);
    try {
      if (!isAdmin || window.kafakOrderEditorUI) {
        let data = window.kafakOrderEditorUI ? await window.kafakOrderEditorUI.customer(phoneCheck) : await fetch(`${sc}?action=getCustomer&phone=${phoneCheck}`).then((res) => res.json());
        if (data.result === "success" && data.data && data.data.orderid) {
          let s = String(data.data.Status || "pending").toLowerCase();
          if (!["delivered", "completed", "refunded"].includes(s)) {
            showLoader(false);
            restoreBtn();
            const lang = $("#language-select").val() || "en";
            const t = translations[lang] || translations["en"];
            const msg = t.msg_active_order.replace("OID_HERE", data.data.orderid);
            Swal.fire({
              icon: "info",
              title: t.title_active_order,
              text: msg,
              confirmButtonColor: "#2563eb",
              customClass: {
                popup: "ios-popup"
              }
            }).then(() => {
              window.location.href = isAdmin ? `order.html?oid=${encodeURIComponent(data.data.orderid)}` : `order.html?phone=${phoneCheck}`;
            });
            return;
          }
        }
      } else {
        let cachedOrders = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
        let latestActive = cachedOrders.find((o) => String(o.phone) === String(phoneCheck) && !["delivered", "completed", "refunded"].includes(String(o.Status).toLowerCase()));
        if (latestActive) {
          showLoader(false);
          restoreBtn();
          Swal.fire({
            icon: "info",
            title: "Active Order Found!",
            text: `Switching to active order: ${latestActive.orderid}`
          }).then(() => {
            window.location.href = `order.html?oid=${latestActive.orderid}`;
          });
          return;
        }
      }
    } catch (e) {
      showLoader(false);
      restoreBtn();
      showAlert(e.message || "Cannot check existing orders. Please try again.");
      return;
    }
    showLoader(false);
  }
  let finalPO = $("#edit-postoffice").val();
  if ($("#edit-postoffice-select").is(":visible")) finalPO = $("#edit-postoffice-select").val();
  if (!finalPO) {
    showAlert(getAlert("err_select_po") || "Please Select Post Office");
    if ($(".address-box").is(":hidden")) toggleAddressEdit();
    restoreBtn();
    return;
  }
  $("#edit-postoffice").val(finalPO);
  if ($("#adm-paid").length) $("#edit-paid-by").val($("#adm-paid").val());
  const newName = $("#edit-name").val();
  if (!newName) {
    showAlert(getAlert("err_name"));
    restoreBtn();
    return;
  }
  const newPhone = $("#edit-phone").val();
  if (!newPhone || newPhone.length !== 10) {
    showAlert(getAlert("err_phone"));
    restoreBtn();
    return;
  }
  const newAlt = $("#edit-altphone").val();
  if (newAlt && (newAlt.length < 8 || newAlt.length > 15)) {
    showAlert(getAlert("err_alt_required"));
    restoreBtn();
    return;
  }
  if (newAlt && newAlt === newPhone) {
    showAlert(getAlert("err_alt_same"));
    restoreBtn();
    return;
  }
  let currentMeta = (typeof savedOrderData !== "undefined" ? savedOrderData.adminMeta || "" : "").replace(/[MWAG]/g, "");
  let selectedRadio = $('input[name="target_wa"]:checked').val();
  let newFlag = "M";
  if (selectedRadio === "whatsapp") newFlag = "W";
  else if (selectedRadio === "alt") newFlag = "A";
  else if (selectedRadio === "paid") newFlag = "G";
  let finalMeta = currentMeta + newFlag;
  let custLang = $("#language-select").val() || "en";
  const isApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const orderSource = isApp ? "App 📱" : "Web 🌐";
  const finalData = {
    orderid: editingOrderId,
    name: newName,
    phone: newPhone,
    oldPhone: typeof savedOrderData !== "undefined" && savedOrderData.phone ? savedOrderData.phone : currentLoginPhone,
    whatsapp: $("#edit-whatsapp").val(),
    altphone: $("#edit-altphone").val(),
    house: $("#edit-house").val(),
    place: $("#edit-place").val(),
    pincode: $("#edit-pincode").val(),
    postoffice: finalPO,
    district: $("#edit-district").val(),
    state: $("#edit-state").val(),
    quantity: $("#quick-qty").val(),
    paidNum: $("#edit-paid-by").val() || "",
    adminMeta: finalMeta,
    product: window.kafakCheckoutUI ? window.kafakCheckoutUI.productName() : $("#admin-product-type").length ? $("#admin-product-type").val() : typeof savedOrderData !== "undefined" && savedOrderData.product ? savedOrderData.product : "Vanthen",
    message: "",
    custId: typeof savedOrderData !== "undefined" && savedOrderData.custId ? savedOrderData.custId : myCustId,
    language: custLang,
    source: orderSource
  };
  if (isAdmin) {
    if (!editingOrderId) {
      showLoader(true);
      (window.kafakCheckoutUI ? window.kafakCheckoutUI.submit(finalData).then((result) => {
        Object.assign(finalData, result.data);
        return result.res;
      }) : orderServiceFetch(sc, {
        method: "POST",
        body: JSON.stringify({
          action: "submit",
          orderData: finalData
        })
      }).then((res) => res.json())).then((res) => {
        showLoader(false);
        restoreBtn();
        if (res.result === "success") {
          let newData = _objectSpread({}, finalData);
          newData.orderid = res.orderid;
          newData.Status = "Pending";
          newData.timestamp = res.timestamp;
          let allOrders = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
          allOrders.unshift(newData);
          window.kafakStorage.setItem("allOrdersCache", JSON.stringify(allOrders));
          Swal.fire({
            icon: "success",
            title: "Order Created! 🎉",
            html: `<b>Order ID:</b> <span class="text-primary">${res.orderid}</span>`,
            confirmButtonColor: "#15803d",
            confirmButtonText: "Go to Admin Dashboard",
            showCancelButton: true,
            cancelButtonText: "View Order Page",
            showDenyButton: true,
            denyButtonColor: "#25D366",
            denyButtonText: '<i class="fab fa-whatsapp"></i> Send WhatsApp'
          }).then((result) => {
            if (result.isDenied) {
              sendToWhatsapp(newData, getSelectedWAPhone(newData));
            } else if (result.isConfirmed) window.location.href = `admin.html?search=${res.orderid}`;
            else window.location.href = `order.html?oid=${res.orderid}`;
          });
        } else {
          Swal.fire("Error", "Failed to create new order", "error");
        }
      }).catch((err) => {
        showLoader(false);
        restoreBtn();
        Swal.fire("Error", "Network Error", "error");
      });
      return;
    }
    const oldStatus = String(savedOrderData.Status || "Pending").toLowerCase();
    let oldQty = parseInt(savedOrderData.quantity) || 0;
    let newQty = parseInt(finalData.quantity) || 0;
    let isQtyChanged = oldQty !== newQty;
    let oldProduct = savedOrderData.product || "Vanthen";
    let newProduct = finalData.product || "Vanthen";
    let isProductChanged = oldProduct !== newProduct;
    if (oldStatus === "paid" && isQtyChanged && newQty > oldQty) {
      if (window.kafakOrderEditorUI) {
        showLoader(true);
        window.kafakOrderEditorUI.save(finalData, {
          increasePaid: true
        }).then((result) => {
          Object.assign(finalData, result.data);
          savedOrderData = _objectSpread(_objectSpread({}, savedOrderData), result.data);
          updateLocalCache(finalData, finalData.Status);
          updateAdminUI(finalData.Status, finalData.orderid);
          showLoader(false);
          restoreBtn();
          const balance2 = finalData.Balance_Due, newTotal2 = finalData.Grand_Total;
          const msg = custLang === "ml" ? `*ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്തു!* ✅
ഓർഡർ നമ്പർ: ${finalData.orderid}

എണ്ണം കൂട്ടിയിട്ടുണ്ട്: ${oldQty} ➡️ *${finalData.quantity}*

💰 *അടയ്ക്കാനുള്ള ബാക്കി തുക: ₹${balance2}*
(ആകെ: ₹${newTotal2})

ബാക്കി തുക GPay ചെയ്താൽ അയക്കുന്നതാണ്. 👍` : `*Order Updated!* ✅
Order ID: ${finalData.orderid}

Qty increased: ${oldQty} ➡️ *${finalData.quantity}*

💰 *Balance to Pay: ₹${balance2}*
(Total: ₹${newTotal2})

Please GPay the balance to confirm. 👍`;
          window.open(`https://wa.me/${getSelectedWAPhone(finalData)}?text=${encodeURIComponent(msg)}`, "_blank");
        }).catch((error) => {
          showLoader(false);
          restoreBtn();
          showAlert(error.message);
        });
        return;
      }
      let prov = typeof savedOrderData !== "undefined" ? savedOrderData.courier || savedOrderData.provider : "";
      let stateVal = finalData.state || "KERALA";
      let productType = finalData.product || "Vanthen";
      let oldBase = 0;
      let newBase = 0;
      if (productType === "Cheruthen") {
        oldBase = oldQty === 1 ? 900 : oldQty === 2 ? 1800 : oldQty * 900;
        newBase = newQty === 1 ? 900 : newQty === 2 ? 1800 : newQty * 900;
      } else {
        oldBase = typeof courierRates !== "undefined" && courierRates.prices && courierRates.prices[oldQty] ? Number(courierRates.prices[oldQty]) : oldQty * 650;
        newBase = typeof courierRates !== "undefined" && courierRates.prices && courierRates.prices[newQty] ? Number(courierRates.prices[newQty]) : newQty * 650;
      }
      let oldCourier = window.getDeliveryCharge(stateVal, oldQty, prov);
      let newCourier = window.getDeliveryCharge(stateVal, newQty, prov);
      if (productType === "Cheruthen") {
        oldCourier = oldQty === 1 ? 80 : oldQty === 2 ? 100 : oldQty * 80;
        newCourier = newQty === 1 ? 80 : newQty === 2 ? 100 : newQty * 80;
      }
      let oldTotal = oldBase + oldCourier;
      let newTotal = newBase + newCourier;
      let balance = newTotal - oldTotal;
      showLoader(true);
      orderServiceFetch(sc, {
        method: "POST",
        body: JSON.stringify({
          action: "submit",
          orderData: finalData
        })
      }).then((res) => res.json()).then((res) => {
        orderServiceFetch(sc, {
          method: "POST",
          body: JSON.stringify({
            action: "bulkUpdateStatus",
            updates: [{
              oid: finalData.orderid,
              status: "Sent"
            }]
          })
        }).then(() => {
          updateLocalCache(finalData, "Sent");
          savedOrderData.quantity = newQty;
          savedOrderData.adminMeta = finalMeta;
          savedOrderData.product = finalData.product;
          updateAdminUI("Sent", finalData.orderid);
          showLoader(false);
          restoreBtn();
          let msg = "";
          let targetPhone = getSelectedWAPhone(finalData);
          if (custLang === "ml") {
            msg = `*ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്തു!* ✅
ഓർഡർ നമ്പർ: ${finalData.orderid}

എണ്ണം കൂട്ടിയിട്ടുണ്ട്: ${oldQty} ➡️ *${newQty}*

💰 *അടയ്ക്കാനുള്ള ബാക്കി തുക: ₹${balance}*
(ആകെ: ₹${newTotal})

ബാക്കി തുക GPay ചെയ്താൽ അയക്കുന്നതാണ്. 👍`;
          } else {
            msg = `*Order Updated!* ✅
Order ID: ${finalData.orderid}

Qty increased: ${oldQty} ➡️ *${newQty}*

💰 *Balance to Pay: ₹${balance}*
(Total: ₹${newTotal})

Please GPay the balance to confirm. 👍`;
          }
          window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, "_blank");
        });
      }).catch((err) => {
        showLoader(false);
        restoreBtn();
      });
      return;
    }
    let processCreateNew = function() {
      let newData = _objectSpread({}, finalData);
      newData.orderid = null;
      showLoader(true);
      (window.kafakCheckoutUI ? window.kafakCheckoutUI.submit(newData).then((result) => {
        Object.assign(newData, result.data);
        return result.res;
      }) : orderServiceFetch(sc, {
        method: "POST",
        body: JSON.stringify({
          action: "submit",
          orderData: newData
        })
      }).then((res) => res.json())).then((res) => {
        showLoader(false);
        restoreBtn();
        if (res.result === "success") {
          newData.orderid = res.orderid;
          newData.Status = "Pending";
          newData.timestamp = res.timestamp;
          let allOrders = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
          allOrders.unshift(newData);
          window.kafakStorage.setItem("allOrdersCache", JSON.stringify(allOrders));
          Swal.fire({
            icon: "success",
            title: "New Order Created! 🎉",
            html: `<b>Order ID:</b> <span class="text-primary">${res.orderid}</span>`,
            confirmButtonColor: "#25D366",
            confirmButtonText: '<i class="fab fa-whatsapp"></i> Send Invoice',
            showCancelButton: true,
            cancelButtonText: "View Dashboard"
          }).then((result) => {
            if (result.isConfirmed) {
              sendToWhatsapp(newData, getSelectedWAPhone(newData));
            } else {
              window.location.href = `admin.html?search=${res.orderid}`;
            }
          });
        } else {
          Swal.fire("Error", "Failed to create new order", "error");
        }
      }).catch((err) => {
        showLoader(false);
        restoreBtn();
        Swal.fire("Error", "Network Error", "error");
      });
    };
    let processUpdate = function(showInvoicePrompt = false) {
      showLoader(true);
      (window.kafakOrderEditorUI ? window.kafakOrderEditorUI.save(finalData).then((result) => {
        Object.assign(finalData, result.data);
        savedOrderData = _objectSpread(_objectSpread({}, savedOrderData), result.data);
        return result.res;
      }) : orderServiceFetch(sc, {
        method: "POST",
        body: JSON.stringify({
          action: "submit",
          orderData: finalData
        })
      }).then((res) => res.json())).then((result) => {
        if (result.result !== "success") throw Error("The order update was not confirmed");
        updateLocalCache(finalData, savedOrderData.Status);
        savedOrderData.quantity = finalData.quantity;
        savedOrderData.adminMeta = finalMeta;
        savedOrderData.product = finalData.product;
        let allOrders = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
        let orderIdx = allOrders.findIndex((o) => o.orderid === finalData.orderid);
        if (orderIdx > -1) {
          allOrders[orderIdx] = _objectSpread(_objectSpread(_objectSpread({}, allOrders[orderIdx]), finalData), {}, {
            product: finalData.product,
            Status: savedOrderData.Status
          });
          window.kafakStorage.setItem("allOrdersCache", JSON.stringify(allOrders));
        }
        showLoader(false);
        restoreBtn();
        if (showInvoicePrompt && orderIdx > -1) {
          Swal.fire({
            icon: "success",
            title: "Updated Successfully!",
            text: "Do you want to send the updated invoice via WhatsApp?",
            showCancelButton: true,
            confirmButtonText: '<i class="fab fa-whatsapp"></i> Send WA',
            cancelButtonText: "Close",
            confirmButtonColor: "#25D366"
          }).then((res) => {
            if (res.isConfirmed) sendToWhatsapp(allOrders[orderIdx], getSelectedWAPhone(allOrders[orderIdx]));
          });
        } else {
          Swal.fire({
            icon: "success",
            title: "Updated!",
            toast: true,
            position: "top",
            showConfirmButton: false,
            timer: 1500
          });
        }
      }).catch((err) => {
        showLoader(false);
        restoreBtn();
        showAlert(err.message);
      });
    };
    if (!isQtyChanged) {
      processUpdate(isProductChanged);
      return;
    }
    let canUpdateQty = ["pending", "sent", "archive"].includes(oldStatus);
    if (!canUpdateQty) {
      restoreBtn();
      Swal.fire({
        title: "Quantity Locked! 🔒",
        html: `This order is marked as <b>${oldStatus.toUpperCase()}</b>.<br>Quantity changes will be saved as a <b>New Order</b>.`,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Create as New Order",
        confirmButtonColor: "#2563eb"
      }).then((res) => {
        if (res.isConfirmed) processCreateNew();
      });
    } else {
      restoreBtn();
      Swal.fire({
        title: "Save Quantity Changes",
        text: "How do you want to save this new quantity?",
        icon: "question",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Update Same Order",
        denyButtonText: "Create as New Order",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#15803d",
        denyButtonColor: "#2563eb"
      }).then((res) => {
        if (res.isConfirmed) {
          processUpdate(true);
        } else if (res.isDenied) {
          processCreateNew();
        }
      });
    }
    return;
  }
  playVideoAnimation(finalData.name, () => postOrder(finalData));
};
$(document).on("change", "#edit-postoffice-select", function() {
  $("#edit-postoffice").val($(this).val());
  updateSummaryDisplay();
});
function toggleAddressEdit() {
  $(".address-box").slideToggle();
}
function selectEditPO(val) {
  $("#edit-postoffice").val(val);
  updateSummaryDisplay();
}
function setupAdminView(oid) {
  const adminUI = `
  <div id="admin-action-bar" style="position: fixed; bottom: 0; left: 0; width: 100%; background: white; padding: 15px; z-index: 999999; border-top: 1px solid #ddd; box-shadow: 0 -4px 20px rgba(0,0,0,0.15);">
      <div class="container p-0 d-flex justify-content-between align-items-center">
          <div id="admin-btn-container" style="flex-grow:1; margin-right:15px;">
              <div class="d-flex gap-2 w-100">
                  <button onclick="adminAction('${oid}', 'Sent')" class="btn btn-primary btn-sm fw-bold flex-grow-1 shadow-sm">💬 MARK SENT</button>
                  <button onclick="adminAction('${oid}', 'Paid')" class="btn btn-warning btn-sm fw-bold flex-grow-1 shadow-sm text-dark">💰 MARK PAID</button>
                  <button onclick="syncSingleOrder('${oid}')" class="btn btn-info text-white btn-sm shadow-sm" style="width:45px;" title="Sync to Server"><i class="fas fa-cloud-upload-alt"></i></button>
              </div>
          </div>
          <button onclick="window.location.href='admin.html?search=${oid}'" class="btn btn-light rounded-circle shadow-sm" style="width:45px; height:45px; border:1px solid #eee; display:flex; align-items:center; justify-content:center;"><i class="fas fa-times text-danger" style="font-size:20px;"></i></button>
      </div>
  </div>`;
  $("body").append(adminUI);
  $("body").css("padding-bottom", "100px");
  $("#step-0").hide();
  showLoader(false);
  let allOrders = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
  let localAdminOrder = allOrders.find((o) => String(o.orderid) === String(oid));
  if (localAdminOrder) {
    updateAdminUI(localAdminOrder.Status || "Pending", oid);
    loadOrderData(localAdminOrder, false);
    fetchOrder(oid, true);
  } else {
    $("#wizard-view").hide();
    $("#returning-user-view").show();
    $("#status-area").html(`
        <div class="text-center py-5 mt-5">
            <i class="fas fa-spinner fa-spin text-primary fs-3 mb-2"></i><br>
            <span class="fw-bold text-muted" style="font-size:12px;">Loading order details...</span><br>
            <span style="font-size:10px; color:#888;">(You can use the buttons below without waiting)</span>
        </div>
    `).show();
    fetchOrder(oid, true);
  }
}
window.updateAdminUI = function(serverStatus, oid) {
  if ($("#status-area").html().includes("fa-spinner") && serverStatus !== "Pending") {
    $("#status-area").empty();
    $("#returning-user-view").show();
  }
  let status = String(serverStatus || "").trim();
  status = status.charAt(0).toUpperCase() + status.slice(1);
  let updates = JSON.parse(window.kafakStorage.getItem("pendingUpdates") || "[]");
  let myPending = updates.find((u) => u.oid === oid);
  if (myPending && myPending.status) {
    status = String(myPending.status).trim();
    status = status.charAt(0).toUpperCase() + status.slice(1);
  }
  let hasPending = !!myPending;
  let syncColor = hasPending ? "btn-info text-white" : "btn-light text-muted border";
  let syncBtn = `<button onclick="syncSingleOrder('${oid}')" class="btn ${syncColor} btn-sm shadow-sm ms-1" style="width:45px;" title="Sync to Server"><i class="fas fa-cloud-upload-alt"></i></button>`;
  let btnHTML = "";
  if (status === "Archive") {
    btnHTML = `<div class="d-flex w-100"><button onclick="adminAction('${oid}', 'Paid')" class="btn btn-dark btn-sm fw-bold flex-grow-1 shadow-sm" style="background:#444; border:none;">📂 (Archived) TO PAID</button>${syncBtn}</div>`;
  } else if (status === "Pending") {
    btnHTML = `<div class="d-flex gap-2 w-100">
                 <button onclick="adminAction('${oid}', 'Sent')" class="btn btn-primary btn-sm fw-bold flex-grow-1 shadow-sm">💬 MARK SENT</button>
                 ${syncBtn}
                 <button onclick="adminAction('${oid}', 'Archive')" class="btn btn-outline-secondary btn-sm" style="width:40px;"><i class="fas fa-archive"></i></button>
               </div>`;
  } else if (status === "Sent") {
    btnHTML = `<div class="d-flex gap-2 w-100">
                 <button onclick="adminAction('${oid}', 'Paid')" class="btn btn-warning btn-sm fw-bold flex-grow-1 shadow-sm text-dark">💰 MARK PAID</button>
                 ${syncBtn}
                 <button onclick="adminAction('${oid}', 'Archive')" class="btn btn-outline-secondary btn-sm" style="width:40px;"><i class="fas fa-archive"></i></button>
               </div>`;
  } else if (status === "Delivered") {
    btnHTML = `<div class="d-flex w-100"><button class="btn btn-success btn-sm fw-bold flex-grow-1 shadow-sm" disabled>DELIVERED ✅</button>${syncBtn}</div>`;
  } else if (status === "Paid") {
    if (!hasPending) {
      btnHTML = `
        <div class="d-flex gap-2 w-100">
            <button class="btn btn-success btn-sm fw-bold shadow-sm disabled" style="opacity:1;">PAID ✅</button>
            <button onclick="sendPaymentWA('${oid}')" class="btn btn-success btn-sm fw-bold flex-grow-1 shadow-sm" style="background:#25D366; border-color:#25D366;">
                <i class="fab fa-whatsapp"></i> SEND RECEIPT
            </button>
        </div>`;
    } else {
      btnHTML = `<div class="d-flex w-100"><button class="btn btn-success btn-sm fw-bold flex-grow-1 shadow-sm" disabled>PAID ✅</button>${syncBtn}</div>`;
    }
  } else {
    let displayTxt = status === "Dispatched" ? "DISPATCHED" : status === "Completed" ? "COMPLETED" : status.toUpperCase();
    btnHTML = `<div class="d-flex w-100"><button class="btn btn-secondary btn-sm fw-bold flex-grow-1 shadow-sm" disabled>${displayTxt} ✅</button>${syncBtn}</div>`;
  }
  $("#admin-btn-container").html(btnHTML);
  $("#admin-action-bar").slideDown();
};
window.syncSingleOrder = function(oid) {
  if (typeof bgFetchController !== "undefined" && bgFetchController) bgFetchController.abort();
  let updates = JSON.parse(window.kafakStorage.getItem("pendingUpdates") || "[]");
  let myUpdate = updates.find((u) => u.oid === oid);
  if (!myUpdate) {
    Swal.fire({
      icon: "info",
      title: "Already Synced",
      text: "No pending local changes.",
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: "top"
    });
    if (typeof userData !== "undefined") updateAdminUI(userData.Status, oid);
    return;
  }
  const btn = $("#admin-btn-container button").find(".fa-cloud-upload-alt").parent();
  let originalHtml = btn.html();
  btn.html('<i class="fas fa-spinner fa-spin"></i>').prop("disabled", true);
  let promises = [];
  if (myUpdate.deleteRefund) {
    promises.push(orderServiceFetch(sc, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteRefund",
        oid
      })
    }));
  }
  promises.push(orderServiceFetch(sc, {
    method: "POST",
    body: JSON.stringify({
      action: "bulkUpdateStatus",
      updates: [myUpdate]
    })
  }));
  Promise.all(promises).then((responses) => Promise.all(responses.map((r) => r.json()))).then((dataList) => {
    let successResponse = dataList.every((d) => d.result === "success" || d.result === "not_found") ? dataList[dataList.length - 1] : null;
    if (successResponse) {
      let newUpdates = JSON.parse(window.kafakStorage.getItem("pendingUpdates") || "[]").filter((u) => JSON.stringify(u) !== JSON.stringify(myUpdate));
      window.kafakStorage.setItem("pendingUpdates", JSON.stringify(newUpdates));
      Swal.fire({
        icon: "success",
        title: "Synced Successfully! ☁️",
        toast: true,
        position: "top",
        showConfirmButton: false,
        timer: 2e3
      });
      if (successResponse.orderData) {
        let d = successResponse.orderData;
        d.Status = myUpdate.status;
        let allOrders = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
        let orderIdx = allOrders.findIndex((o) => String(o.orderid) === String(oid));
        if (orderIdx > -1) {
          allOrders[orderIdx] = _objectSpread(_objectSpread({}, allOrders[orderIdx]), d);
          window.kafakStorage.setItem("allOrdersCache", JSON.stringify(allOrders));
        }
        loadOrderData(d, true);
      }
      updateAdminUI(myUpdate.status, oid);
    } else {
      alert("Sync Failed: Server Error");
      btn.html(originalHtml).prop("disabled", false);
    }
  }).catch(async (err) => {
    btn.html(originalHtml).prop("disabled", false);
    if (err.status === 409 && /Order status changed/.test(err.message) && window.KAFAK_BACKEND === "business") {
      try {
        const latest = await new KafakBusinessApi().order(oid);
        const currentStatus = latest.data.Status;
        const decision = await Swal.fire({
          icon: "warning",
          title: "Review status change",
          text: `Server status: ${currentStatus}. Your pending change: ${myUpdate.status}. Apply your change to this latest status?`,
          showCancelButton: true,
          confirmButtonText: "Apply my change",
          cancelButtonText: "Keep pending"
        });
        if (decision.isConfirmed) {
          const pending = JSON.parse(window.kafakStorage.getItem("pendingUpdates") || "[]");
          const index = pending.findIndex((item) => JSON.stringify(item) === JSON.stringify(myUpdate));
          if (index < 0) {
            alert("Pending changes changed. Review them before syncing.");
            return;
          }
          pending[index] = _objectSpread(_objectSpread({}, myUpdate), {}, {
            oldStatus: currentStatus
          });
          window.kafakStorage.setItem("pendingUpdates", JSON.stringify(pending));
          return window.syncSingleOrder(oid);
        }
        return;
      } catch (reviewError) {
        alert(reviewError.message || "Could not load the latest status. Your change is still pending.");
        return;
      }
    }
    alert(err.status === 401 ? "Your admin session expired. Sign in again from the Admin page, then retry Sync. Your pending changes are saved." : err.message || "Unable to sync. Please retry.");
    btn.html(originalHtml).prop("disabled", false);
  });
};
window.adminAction = async function(...args) {
  try {
    await KafakUI.adminActions();
    return window.adminAction(...args);
  } catch (error) {
    showAlert(error.message);
  }
};
window.clearAdminCache = function() {
  if (confirm("Cache ക്ലിയർ ചെയ്ത് റീലോഡ് ചെയ്യണോ?")) {
    SafeStorage.removeItem("allOrdersCache");
    location.reload();
  }
};
function showOrderLoadError(error) {
  showLoader(false);
  if (!$("#returning-user-view").is(":visible")) {
    $("#step-0").show();
    $("#wizard-view").hide();
    updateFooterButtons("step-0");
    const needsLink = error.status === 401 || error.status === 404;
    $("#order-entry-error").remove();
    if (needsLink) {
      window.orderRecoveryRequired = true;
      return;
    }
    const box = $('<div id="order-entry-error" class="alert alert-warning mt-3 small" role="alert"></div>');
    box.text(needsLink ? "ഈ ഓർഡർ തുറക്കാൻ WhatsApp confirmation-ലെ മുഴുവൻ order link തുറക്കുക. Phone number മാത്രം ഉപയോഗിച്ച് തുറക്കാനാവില്ല. / Open the complete order link from your confirmation message." : "ഓർഡർ ലോഡ് ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കുക. / Unable to load your order. Please retry.");
    if (!needsLink) $('<button type="button" class="btn btn-outline-dark btn-sm ms-2">Retry</button>').on("click", () => fetchOrder(new URLSearchParams(location.search).get("oid"))).appendTo(box);
    $("#step-0").append(box);
    return;
  }
  $("#refresh-btn").prop("disabled", false).text("RETRY");
  $(".btn-update-sage").prop("disabled", true);
  $("#admin-action-bar").hide();
  if (error.status === 401 || error.status === 404) {
    $("#status-area").html('<div class="text-center py-3">Please open the complete order link from your confirmation message. Your saved details are still available above.</div>').show();
  } else {
    $("#status-area").html('<div class="text-center py-3">Unable to load the latest order. <button type="button" class="btn btn-outline-dark btn-sm" onclick="manualRefresh()">Retry</button></div>').show();
  }
}
function fetchOrder(orderId, isSilent = false) {
  $("#order-entry-error").remove();
  if (bgFetchController) bgFetchController.abort();
  bgFetchController = new AbortController();
  if (!isSilent) {
    $("#step-0").hide();
    $("#wizard-view").hide();
    showLoader(true);
  }
  let safeOid = encodeURIComponent(orderId);
  let fetchUrl = `${sc}?action=getOrder&oid=${safeOid}&t=${Date.now()}`;
  (window.kafakOrderEditorUI ? window.kafakOrderEditorUI.read(orderId) : fetch(fetchUrl, {
    signal: bgFetchController.signal
  }).then((res) => res.json())).then((res) => {
    if (!isSilent) showLoader(false);
    if (res && res.result === "success" && res.data) {
      $("#step-0").hide();
      let d = res.data;
      let pendingUpdates = JSON.parse(window.kafakStorage.getItem("pendingUpdates") || "[]");
      let myPending = pendingUpdates.find((u) => String(u.oid) === String(orderId));
      if (myPending && myPending.status) {
        d.Status = myPending.status;
        d.status = myPending.status;
      }
      if (SafeStorage.getItem("kafakAdmin") === "true") {
        updateAdminUI(d.Status || "Pending", orderId);
        let allOrders = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
        let orderIdx = allOrders.findIndex((o) => String(o.orderid) === String(orderId));
        if (orderIdx > -1) {
          allOrders[orderIdx] = _objectSpread(_objectSpread({}, allOrders[orderIdx]), d);
          window.kafakStorage.setItem("allOrdersCache", JSON.stringify(allOrders));
        }
      }
      loadOrderData(d, true);
    } else {
      if (!isSilent) {
        $("#step-0").fadeIn();
        updateFooterButtons("step-0");
        Swal.fire({
          toast: true,
          position: "top",
          icon: "error",
          title: "Order not found!",
          showConfirmButton: false,
          timer: 3e3
        });
      }
    }
  }).catch((err) => {
    if (err.name === "AbortError") {
      console.log("Background load cancelled for priority sync.");
      return;
    }
    console.error("Fetch/Load Error: ", err);
    if (window.kafakOrderEditorUI) {
      showOrderLoadError(err);
      return;
    }
    if (!isSilent) showLoader(false);
    if (!isSilent && err.message && err.message.includes("fetch")) {
      Swal.fire({
        title: "Network Error",
        text: "ഓർഡർ വിവരങ്ങൾ എടുക്കാൻ സാധിച്ചില്ല. ഒന്നുകൂടി ശ്രമിച്ച് നോക്കൂ.",
        icon: "error",
        confirmButtonColor: "#000"
      });
    }
  });
}
function postOrder(data) {
  window.orderSuccess = false;
  const request = window.kafakCheckoutUI ? (data.orderid ? window.kafakOrderEditorUI.save(data) : window.kafakCheckoutUI.submit(data)).then((result) => {
    data = _objectSpread(_objectSpread({}, data), result.data);
    return result.res;
  }) : fetch(sc, {
    method: "POST",
    body: JSON.stringify({
      action: "submit",
      orderData: data
    })
  }).then((res) => {
    if (!res.ok) throw new Error("Order request failed");
    return res.json();
  });
  return request.then((res) => {
    if (!res || res.result !== "success" || !res.orderid) throw new Error("Order was not confirmed");
    if (res.result === "success") {
      var _window$kafakRecovery2;
      successData = _objectSpread(_objectSpread({}, data), {}, {
        orderid: res.orderid,
        timestamp: res.timestamp
      });
      if (res.custId) {
        successData.custId = res.custId;
        myCustId = res.custId;
      }
      if (currentLoginPhone && currentLoginPhone !== data.phone) {
        delete localUsersMap[currentLoginPhone];
      }
      currentLoginPhone = data.phone;
      SafeStorage.setItem("lastUsedPhone", data.phone);
      let existingData = localUsersMap[data.phone] || {};
      localUsersMap[data.phone] = _objectSpread(_objectSpread(_objectSpread({}, existingData), successData), {}, {
        Status: window.kafakCheckoutUI ? successData.Status : "Pending"
      });
      SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
      (_window$kafakRecovery2 = window.kafakRecovery) === null || _window$kafakRecovery2 === void 0 || _window$kafakRecovery2.confirmed(successData);
      window.orderSuccess = true;
      renderPendingRecovery();
      finishOrderPresentation();
    }
  }).catch((error) => {
    window.orderSuccess = false;
    stopOrderAnimation();
    renderPendingRecovery();
    showLoader(false);
    $("#videoModal").fadeOut();
    $(".btn-update-sage").data("is-processing", false).prop("disabled", false);
    checkForChanges();
    showAlert(window.kafakCheckoutUI ? error.message : "Order could not be confirmed. Refresh and check your order before trying again.");
  });
}
let courierRatesRequest = null;
function fetchCourierRates() {
  if (window.kafakCheckoutUI) return window.kafakCheckoutUI.load();
  if (courierRatesRequest) return courierRatesRequest;
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  const loadingTxt = t.loading || "Loading Options...";
  let currentSelection = $("#quick-qty").val();
  $("#quantity, #quick-qty").html(`<option value="">${loadingTxt}</option>`);
  let cachedRates = SafeStorage.getItem("cachedRates");
  let cacheValid = false;
  if (cachedRates) {
    try {
      let parsed = JSON.parse(cachedRates);
      if (parsed && parsed.KERALA) {
        courierRates = parsed;
        globalQtyList = Object.keys(parsed.prices || parsed.KERALA).map(Number).filter((qty) => Number.isInteger(qty) && qty > 0).sort((a, b) => a - b);
        renderQtyDropdowns();
        cacheValid = true;
      }
    } catch (e) {
    }
  }
  const serverFetch = fetch(`${sc}?action=getRates`).then((res) => res.json()).then((data) => {
    if (data.result === "success" && data.rates) {
      courierRates = data.rates;
      if (data.adminPhone) adminPhone = String(data.adminPhone);
      if (data.rates && data.rates.prices) {
        globalQtyList = Object.keys(data.rates.prices).map(Number).sort((a, b) => a - b);
      }
      SafeStorage.setItem("cachedRates", JSON.stringify(data.rates));
      let restoreQty = currentSelection;
      if (!restoreQty && typeof savedOrderData !== "undefined" && savedOrderData.quantity) {
        restoreQty = savedOrderData.quantity;
      }
      renderQtyDropdowns();
      if (restoreQty) {
        $("#quick-qty").val(restoreQty);
        updatePrice(restoreQty, true);
      }
      return true;
    }
    return false;
  }).catch((err) => false).finally(() => {
    courierRatesRequest = null;
  });
  courierRatesRequest = serverFetch;
  if (cacheValid) {
    serverFetch;
    return Promise.resolve(true);
  } else {
    return serverFetch;
  }
}
function renderQtyDropdowns() {
  if (window.kafakCheckoutUI) return window.kafakCheckoutUI.render();
  if (!globalQtyList || globalQtyList.length === 0) return;
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  let optionsHTML = `<option value="" disabled selected>${t.dd_select || "Select Quantity"}</option>`;
  let productType = "Vanthen";
  if ($("#admin-product-type").length) {
    productType = $("#admin-product-type").val();
  } else if (typeof savedOrderData !== "undefined" && savedOrderData.product) {
    productType = savedOrderData.product;
  }
  let isCheruthen = productType === "Cheruthen";
  let multiplier = isCheruthen ? 300 : 650;
  globalQtyList.forEach((qty) => {
    const totalGrams = qty * multiplier;
    let weightText;
    if (totalGrams >= 1e3) {
      weightText = (totalGrams / 1e3).toFixed(2) + " " + (t.txt_kg || "kg");
    } else {
      weightText = totalGrams + (t.txt_g || "g");
    }
    let bottleLabel = qty === 1 ? t.txt_bottle || "Bottle" : t.txt_bottles || "Bottles";
    let label = `${qty} ${bottleLabel} (${weightText})`;
    if (isCheruthen) label = `${qty} Bottle (${weightText}) - Cheruthen`;
    optionsHTML += `<option value="${qty}">${label}</option>`;
  });
  $("#quantity").html(optionsHTML);
  $("#quick-qty").html(optionsHTML);
  if (editingOrderId && typeof savedOrderData !== "undefined" && savedOrderData.quantity) {
    let currentStatus = String(savedOrderData.Status || "").toLowerCase();
    let isOrderDone = ["delivered", "completed", "refunded"].includes(currentStatus);
    if (!isOrderDone) {
      $("#quick-qty").val(savedOrderData.quantity);
      if (!$("#quick-qty").val()) {
        let oldQty = savedOrderData.quantity;
        $("#quick-qty").append(`<option value="${oldQty}" selected>${oldQty} Bottles (Old Order)</option>`);
      }
      updatePrice($("#quick-qty").val(), true);
    } else {
      $("#quick-qty").val("");
    }
  }
  if (typeof savedOrderData !== "undefined" && savedOrderData.Status) {
    let s = String(savedOrderData.Status).trim().toLowerCase();
    if (s === "paid") {
      let currentQty = parseInt(savedOrderData.quantity) || 0;
      $("#quick-qty option").each(function() {
        if (parseInt($(this).val()) < currentQty) $(this).prop("disabled", true);
      });
    }
  }
}
function showToast(icon, title) {
  Swal.fire({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500,
    icon,
    title
  });
}
async function sendToWhatsapp(orderData = successData, recipient = null) {
  const d = orderData;
  const safe = (val) => String(val || "").trim().toUpperCase();
  const targetAdminPhone = typeof adminPhone !== "undefined" ? adminPhone : "7788990313";
  const isAdmin = window.kafakStorage.getItem("kafakAdmin") === "true";
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  const editText = t.wa_check_status;
  let dateObj = /* @__PURE__ */ new Date();
  if (d.timestamp) {
    let serverDate = new Date(d.timestamp);
    if (!isNaN(serverDate.getTime())) {
      dateObj = serverDate;
    }
  }
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  let hours = dateObj.getHours();
  let minutes = String(dateObj.getMinutes()).padStart(2, "0");
  let ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;
  const formattedTime = `${day}/${month}/${year}, ${timeStr}`;
  let isUpdate = false;
  let changes = [];
  if (typeof savedOrderData !== "undefined" && savedOrderData.orderid == d.orderid) {
    isUpdate = true;
    if (safe(savedOrderData.name) !== safe(d.name)) changes.push(`👤 NAME: ${savedOrderData.name} ➡️ *${d.name}*`);
    if (String(savedOrderData.quantity) !== String(d.quantity)) changes.push(`📦 QTY: ${savedOrderData.quantity} ➡️ *${d.quantity}*`);
    if (String(savedOrderData.phone) !== String(d.phone)) changes.push(`📞 PHONE: ${savedOrderData.phone} ➡️ *${d.phone}*`);
    const oldAlt = String(savedOrderData.altphone || "").trim();
    const newAlt = String(d.altphone || "").trim();
    if (oldAlt !== newAlt) changes.push(`📞 ALT PH: ${oldAlt || "None"} ➡️ *${newAlt}*`);
    const oldWa = String(savedOrderData.whatsapp || "").trim();
    const newWa = String(d.whatsapp || "").trim();
    if (oldWa !== newWa) changes.push(`💬 WA: ${oldWa} ➡️ *${newWa}*`);
    if (safe(savedOrderData.house) !== safe(d.house)) changes.push(`🏠 HOUSE: *${safe(d.house)}*`);
    if (safe(savedOrderData.place) !== safe(d.place)) changes.push(`📍 PLACE: *${safe(d.place)}*`);
    if (safe(savedOrderData.postoffice) !== safe(d.postoffice)) changes.push(`📮 PO: *${safe(d.postoffice)}*`);
    if (String(savedOrderData.pincode) !== String(d.pincode)) changes.push(`🔢 PIN: *${d.pincode}*`);
    if (safe(savedOrderData.state) !== safe(d.state)) changes.push(`🌍 STATE: *${safe(d.state)}*`);
  }
  const n = parseInt(d.quantity);
  let productType = d.product || (typeof savedOrderData !== "undefined" && savedOrderData.product ? savedOrderData.product : "Vanthen");
  let base = 0;
  let courier = 0;
  if (window.kafakCheckoutUI) {
    var _d$quote$productAmoun, _d$quote, _d$quote$courierAmoun, _d$quote2;
    const amount = (_d$quote$productAmoun = (_d$quote = d.quote) === null || _d$quote === void 0 ? void 0 : _d$quote.productAmount) !== null && _d$quote$productAmoun !== void 0 ? _d$quote$productAmoun : d.Product_Amount, delivery = (_d$quote$courierAmoun = (_d$quote2 = d.quote) === null || _d$quote2 === void 0 ? void 0 : _d$quote2.courierAmount) !== null && _d$quote$courierAmoun !== void 0 ? _d$quote$courierAmoun : d.Courier_Charge;
    if (amount == null || delivery == null || !Number.isFinite(Number(amount)) || !Number.isFinite(Number(delivery))) {
      showAlert("Reload the confirmed order before sending its invoice.");
      return;
    }
    base = Number(amount);
    courier = Number(delivery);
  } else {
    if (productType === "Cheruthen") {
      if (n === 1) {
        base = 900;
        courier = 80;
      } else if (n === 2) {
        base = 1800;
        courier = 100;
      } else {
        base = n * 900;
        courier = n * 80;
      }
    } else {
      base = typeof courierRates !== "undefined" && courierRates.prices && courierRates.prices[n] ? Number(courierRates.prices[n]) : n * 650;
      let savedProvider = typeof savedOrderData !== "undefined" && savedOrderData.courier ? savedOrderData.courier : null;
      const zone = getZoneKey(d.state, savedProvider);
      let courierBase = 0;
      let serviceMargin = 0;
      if (typeof courierRates !== "undefined") {
        let p = savedProvider ? String(savedProvider).toUpperCase().trim() : "";
        let zoneData = (p ? courierRates[`${zone} ${p}`] || courierRates[`${zone}_${p}`] : null) || courierRates[`${zone} DEFAULT`] || courierRates[`${zone}_DEFAULT`] || courierRates[zone] || courierRates["REST OF INDIA DEFAULT"] || courierRates["REST OF INDIA"];
        if (zoneData && typeof zoneData === "object" && zoneData.baseRate !== void 0) {
          courierBase = window.parseDynamicRate(zoneData.baseRate, n);
          serviceMargin = window.parseDynamicRate(zoneData.serviceCharge, n);
        } else if (zoneData && zoneData[n] !== void 0) {
          courierBase = Number(zoneData[n]);
        }
      }
      courier = courierBase + serviceMargin;
    }
  }
  const total = base + courier;
  let editLink;
  try {
    editLink = d.shortCode || d.accessToken ? await KafakBusinessOrder.shareLink("https://kafaklife.com/order.html", d) : `https://kafaklife.com/order.html?oid=${d.orderid}`;
  } catch (e) {
    alert(e.message);
    return;
  }
  let header = "";
  let productDisplay = productType === "Cheruthen" ? "*🍯 Product: Cheruthen (Stingless Honey)*" : "*🍯 Product: Wild Honey*";
  if (window.kafakCheckoutUI) productDisplay = "*Product: " + [window.kafakCheckoutUI.displayName(d.product), d.variant].filter(Boolean).join(" · ") + "*";
  if (isAdmin) {
    header = `*🧾 ORDER INVOICE* - KAFAK HONEY
⌚ _${formattedTime}_

Here is your order details 👇
നിങ്ങളുടെ ഓർഡറിന്റെ സ്റ്റാറ്റസ് അറിയാനും മാറ്റങ്ങൾ വരുത്തുവാനും: 👇
🔗 _${editLink}_
`;
  } else {
    if (isUpdate) {
      header = `*${t.wa_header_update}*
⌚ _${formattedTime}_

${editText}
🔗 _${editLink}_
`;
      if (changes.length > 0) {
        header += `
*🔥 WHAT CHANGED:* 
${changes.join("\n")}
`;
      } else {
        header += `
(Updated details confirmed)
`;
      }
      header += `
*👇 CURRENT DETAILS:*`;
    } else {
      header = `*${t.wa_header_new}*
⌚ _${formattedTime}_

${editText}
🔗 _${editLink}_
`;
    }
  }
  let altPhoneDisplay = d.altphone ? `
*Alt Ph: ${d.altphone}*` : "";
  const details = `
____________________________________
${productDisplay}

*${safe(d.name)}*
*${safe(d.house)}*
*${safe(d.place)}*
*${safe(d.postoffice)}*
*${safe(d.district)}*
*${safe(d.state)}*
*Pin: ${d.pincode}*
*Ph: ${d.phone}*${altPhoneDisplay}

*Qty: ${d.quantity}*
*Amount: ₹${base} + ${courier}*
*Total: ₹${total}/-*
____________________________________`;
  let paymentNote = "";
  if (isOutOfStock) {
    if (lang === "en") {
      paymentNote = "\n\n⏳ *Status: Waiting / Pre-booked*\n_We will notify you with the payment details as soon as the stock arrives._";
    } else {
      paymentNote = "\n\n⏳ *Status: Waiting / Pre-booked*\n_സ്റ്റോക്ക് വരുന്നതനുസരിച്ച് നിങ്ങളെ പേയ്‌മെന്റ് വിവരങ്ങൾ അറിയിക്കുന്നതാണ്._";
    }
  } else {
    if (lang === "en") {
      paymentNote = "\n\n👉 Please send the screenshot after GPay.. 📸\n_(Packing starts only after receiving the screenshot)_";
    } else {
      paymentNote = "\n\nGpay ചെയ്തശേഷം സ്ക്രീൻഷോട്ട് അയക്കൂ.. 📸\n_(സ്ക്രീൻഷോട്ട് ലഭിച്ച ശേഷമാണ് പാക്കിംഗ് നടപടികൾ ആരംഭിക്കുക)_";
    }
  }
  const footer = `

*${t.txt_gpay}: ${targetAdminPhone} (KAFAK LLP)*${paymentNote}`;
  let targetPhone = "";
  if (isAdmin) {
    targetPhone = KafakBusinessOrder.contact(d).number;
  } else {
    targetPhone = targetAdminPhone;
  }
  if (recipient !== null) targetPhone = recipient;
  targetPhone = String(targetPhone).replace(/[^0-9]/g, "");
  if (!targetPhone) {
    showAlert("Please select a valid WhatsApp number.");
    return;
  }
  if (targetPhone.length === 10) targetPhone = "91" + targetPhone;
  window.location.href = `https://wa.me/${targetPhone}?text=${encodeURIComponent(header + details + footer)}`;
}
function renderEditView(data) {
  const status = String(data.Status || "pending").toLowerCase();
  if (["completed", "delivered", "refunded"].includes(status)) {
    showReturningUserView(data, false, true);
    return;
  }
  const isActive = !["dispatched"].includes(status);
  showReturningUserView(data, isActive, true);
  updateEditUIState(data);
}
function updateEditUIState(data) {
  updateStatusUI(data);
  handleEditControlsVisibility(data);
  if (data.quantity) {
    $("#quick-qty").val(data.quantity);
    updatePrice(data.quantity, true);
  }
}
window.sendPaymentWA = async function(oid) {
  let order = typeof userData !== "undefined" && userData.orderid === oid ? userData : null;
  if (!order) {
    let cached = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
    order = cached.find((o) => o.orderid === oid);
  }
  if (!order) {
    alert("Order Data Missing!");
    return;
  }
  let trackLink;
  try {
    trackLink = order.shortCode || order.accessToken ? await KafakBusinessOrder.shareLink("https://kafaklife.com/order.html", order) : `https://kafaklife.com/order.html?oid=${oid}`;
  } catch (e) {
    alert(e.message);
    return;
  }
  let msg = `✅ *Payment Received!* Thank you❤️
*പേയ്‌മെന്റ് ലഭിച്ചു! നന്ദി*

🚛 *Order will be delivered within 4-7 working days.*
*4-7 ദിവസങ്ങൾക്കുള്ളിൽ ഓർഡർ നിങ്ങൾക്ക് ലഭിക്കുന്നതാണ് (അവധി ദിവസങ്ങൾ ഒഴികെ).*

👇 *Order Status:*
${trackLink}`;
  let phone = getSelectedWAPhone(order);
  if (!phone) {
    alert("Please enter/select a valid number!");
    return;
  }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
};
window.getSelectedWAPhone = function(order) {
  let selectedRaw = "";
  if ($('input[name="target_wa"]:checked').length > 0) {
    let selected = $('input[name="target_wa"]:checked').val();
    if (selected === "phone") selectedRaw = $("#adm-phone").val() || order.phone;
    else if (selected === "whatsapp") selectedRaw = $("#adm-whatsapp").val() || order.whatsapp || order.phone;
    else if (selected === "alt") selectedRaw = $("#adm-alt").val();
    else if (selected === "paid") selectedRaw = $("#adm-paid").val();
  } else {
    selectedRaw = order.whatsapp || order.phone;
  }
  if (!selectedRaw) return "";
  let cleanNum = String(selectedRaw).replace(/[^0-9]/g, "");
  if (cleanNum.length === 10) {
    cleanNum = "91" + cleanNum;
  } else if (cleanNum.length > 10 && cleanNum.startsWith("91")) {
  } else if (cleanNum.length > 10 && cleanNum.startsWith("0")) {
    cleanNum = "91" + cleanNum.substring(1);
  }
  return cleanNum;
};
window.savePaidNumOnly = function(oid) {
  let rawNum = $("#adm-paid").val();
  let cleanNum = rawNum.replace(/[^0-9]/g, "");
  if (cleanNum.length < 10) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Number",
      timer: 1500,
      showConfirmButton: false
    });
    return;
  }
  let btn = $("#adm-paid").next("button");
  let originalIcon = btn.html();
  btn.html('<i class="fas fa-spinner fa-spin"></i>').prop("disabled", true);
  orderServiceFetch(sc, {
    method: "POST",
    body: JSON.stringify({
      action: "updatePaidNum",
      oid,
      num: cleanNum
    })
  }).then((res) => res.json()).then((data) => {
    if (data.result === "success") {
      if (userData) userData.paidNum = cleanNum;
      if (savedOrderData) savedOrderData.paidNum = cleanNum;
      $('input[name="target_wa"][value="paid"]').prop("checked", true);
      let currentMeta = (savedOrderData.adminMeta || "").replace(/[MWAG]/g, "");
      let finalMeta = currentMeta + "G";
      savedOrderData.adminMeta = finalMeta;
      if (typeof userData !== "undefined") userData.adminMeta = finalMeta;
      orderServiceFetch(sc, {
        method: "POST",
        body: JSON.stringify({
          action: "bulkUpdateStatus",
          updates: [{
            oid,
            action: "meta",
            meta: finalMeta
          }]
        })
      }).then(() => console.log("Meta updated to G"));
      btn.html('<i class="fas fa-check"></i>').removeClass("btn-outline-primary").addClass("btn-success");
      setTimeout(() => {
        btn.html('<i class="fas fa-save"></i>').removeClass("btn-success").addClass("btn-outline-primary").prop("disabled", false);
      }, 2e3);
    } else {
      alert("Save Failed!");
      btn.html(originalIcon).prop("disabled", false);
    }
  }).catch((err) => {
    alert("Network Error");
    btn.html(originalIcon).prop("disabled", false);
  });
};
window.handleQtyUpdateAction = function(targetStatus, balance, newTotal, oldQty, newQty) {
  var _window$kafakOrderEdi;
  if (!$("#quick-qty").val()) {
    showAlert(getAlert("err_qty"));
    return;
  }
  let finalPO = $("#edit-postoffice").val();
  if ($("#edit-postoffice-select").is(":visible")) finalPO = $("#edit-postoffice-select").val();
  if (!finalPO) {
    showAlert(getAlert("err_select_po") || "Please Select Post Office");
    if ($(".address-box").is(":hidden")) toggleAddressEdit();
    return;
  }
  $("#edit-postoffice").val(finalPO);
  if ($("#adm-paid").length) $("#edit-paid-by").val($("#adm-paid").val());
  const newName = $("#edit-name").val();
  const newPhone = $("#edit-phone").val();
  let currentMeta = (savedOrderData.adminMeta || "").replace(/[MWAG]/g, "");
  let selectedRadio = $('input[name="target_wa"]:checked').val();
  let newFlag = "M";
  if (selectedRadio === "whatsapp") newFlag = "W";
  else if (selectedRadio === "alt") newFlag = "A";
  else if (selectedRadio === "paid") newFlag = "G";
  let finalMeta = currentMeta + newFlag;
  let custLang = $("#language-select").val() || "en";
  const isApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const orderSource = isApp ? "App 📱" : "Web 🌐";
  const finalData = {
    orderid: editingOrderId,
    name: newName,
    phone: newPhone,
    oldPhone: currentLoginPhone,
    whatsapp: $("#edit-whatsapp").val(),
    altphone: $("#edit-altphone").val(),
    house: $("#edit-house").val(),
    place: $("#edit-place").val(),
    pincode: $("#edit-pincode").val(),
    postoffice: finalPO,
    district: $("#edit-district").val(),
    state: $("#edit-state").val(),
    quantity: $("#quick-qty").val(),
    paidNum: $("#edit-paid-by").val() || "",
    adminMeta: finalMeta,
    product: window.kafakCheckoutUI ? window.kafakCheckoutUI.productName() : $("#admin-product-type").val() || (typeof savedOrderData !== "undefined" && savedOrderData.product ? savedOrderData.product : "Vanthen"),
    message: "",
    custId: myCustId,
    language: custLang,
    source: orderSource
  };
  showLoader(true);
  (window.kafakOrderEditorUI ? window.kafakOrderEditorUI.save(finalData, {
    increasePaid: ((_window$kafakOrderEdi = window.kafakOrderEditorUI.editor.current) === null || _window$kafakOrderEdi === void 0 ? void 0 : _window$kafakOrderEdi.Status) === "Paid"
  }).then((result) => {
    var _result$data$Balance_;
    Object.assign(finalData, result.data);
    balance = (_result$data$Balance_ = result.data.Balance_Due) !== null && _result$data$Balance_ !== void 0 ? _result$data$Balance_ : balance;
    newTotal = result.data.Grand_Total;
    savedOrderData = _objectSpread(_objectSpread({}, savedOrderData), result.data);
    return result.res;
  }) : orderServiceFetch(sc, {
    method: "POST",
    body: JSON.stringify({
      action: "submit",
      orderData: finalData
    })
  }).then((res) => res.json())).then((res) => {
    orderServiceFetch(sc, {
      method: "POST",
      body: JSON.stringify({
        action: "bulkUpdateStatus",
        updates: [{
          oid: finalData.orderid,
          status: targetStatus
        }]
      })
    }).then(() => {
      updateLocalCache(finalData, targetStatus);
      savedOrderData.quantity = newQty;
      savedOrderData.adminMeta = finalMeta;
      updateAdminUI(targetStatus, finalData.orderid);
      showLoader(false);
      let msg = "";
      let targetPhone = getSelectedWAPhone(finalData);
      if (targetStatus === "Sent") {
        if (custLang === "ml") {
          msg = `*ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്തു!* ✅
ഓർഡർ നമ്പർ: ${finalData.orderid}

എണ്ണം കൂട്ടിയിട്ടുണ്ട്: ${oldQty} ➡️ *${newQty}*

💰 *അടയ്ക്കാനുള്ള ബാക്കി തുക: ₹${balance}*
(ആകെ: ₹${newTotal})

ബാക്കി തുക GPay ചെയ്താൽ അയക്കുന്നതാണ്. 👍`;
        } else {
          msg = `*Order Updated!* ✅
Order ID: ${finalData.orderid}

Qty increased: ${oldQty} ➡️ *${newQty}*

💰 *Balance to Pay: ₹${balance}*
(Total: ₹${newTotal})

Please GPay the balance to confirm. 👍`;
        }
      } else {
        if (custLang === "ml") {
          msg = `*ഓർഡർ അപ്‌ഡേറ്റ് ചെയ്തു!* ✅
ഓർഡർ നമ്പർ: ${finalData.orderid}

എണ്ണം കൂട്ടിയിട്ടുണ്ട്: ${oldQty} ➡️ *${newQty}*

✅ *പേയ്‌മെന്റ് ലഭിച്ചു!* നന്ദി❤️
(ആകെ തുക: ₹${newTotal})

ഓർഡർ ഉടൻ അയക്കുന്നതാണ്.`;
        } else {
          msg = `*Order Updated!* ✅
Order ID: ${finalData.orderid}

Qty increased: ${oldQty} ➡️ *${newQty}*

✅ *Payment Received!* Thank you❤️
(Total: ₹${newTotal})

We will dispatch shortly.`;
        }
      }
      let isMobile = /iPhone|Android|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = `whatsapp://send?phone=${targetPhone}&text=${encodeURIComponent(msg)}`;
      } else {
        window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(msg)}`, "_blank");
      }
      $("#admin-qty-actions").slideUp();
      $("#admin-diff-viewer").slideUp();
      $("#admin-action-bar").slideDown();
    });
  });
};
window.saveRadioSelection = function(oid, el) {
  let holder = $(el).parent();
  holder.find(".spinner-ring, .success-tick").remove();
  holder.append('<div class="spinner-ring"></div>');
  $('input[name="target_wa"]').prop("disabled", true);
  let selectedRadio = $(el).val();
  let newFlag = "M";
  if (selectedRadio === "whatsapp") newFlag = "W";
  else if (selectedRadio === "alt") newFlag = "A";
  else if (selectedRadio === "paid") newFlag = "G";
  let currentMeta = (savedOrderData.adminMeta || "").replace(/[MWAG]/g, "");
  let finalMeta = currentMeta + newFlag;
  savedOrderData.adminMeta = finalMeta;
  if (typeof userData !== "undefined") userData.adminMeta = finalMeta;
  orderServiceFetch(sc, {
    method: "POST",
    body: JSON.stringify({
      action: "bulkUpdateStatus",
      updates: [{
        oid,
        action: "meta",
        meta: finalMeta
      }]
    })
  }).then((res) => res.json()).then((data) => {
    holder.find(".spinner-ring").remove();
    holder.append('<div class="success-tick"><i class="fas fa-check-circle"></i></div>');
    $('input[name="target_wa"]').prop("disabled", false);
    setTimeout(() => {
      holder.find(".success-tick").fadeOut(300, function() {
        $(this).remove();
      });
    }, 1500);
    console.log("Meta Saved:", finalMeta);
  }).catch((err) => {
    holder.find(".spinner-ring").remove();
    $('input[name="target_wa"]').prop("disabled", false);
    alert("Failed to save selection!");
  });
};
window.clearUserLogin = function() {
  const lang = $("#language-select").val() || "en";
  const t = translations[lang] || translations["en"];
  Swal.fire({
    title: t.logout_title,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: t.logout_confirm,
    cancelButtonText: t.logout_cancel,
    customClass: {
      popup: "ios-popup"
    }
  }).then((result) => {
    if (result.isConfirmed) {
      let phone = $("#phone").val() || currentLoginPhone;
      if (phone && localUsersMap[phone]) {
        delete localUsersMap[phone];
        SafeStorage.setItem(STORAGE_KEY, JSON.stringify(localUsersMap));
      }
      SafeStorage.removeItem("lastUsedPhone");
      currentLoginPhone = null;
      userData = {};
      savedOrderData = {};
      window.location.href = "order.html";
    }
  });
};
window.copyTrackingID = function(id, btnElement) {
  navigator.clipboard.writeText(id).then(() => {
    let icon = btnElement.querySelector("i");
    icon.classList.remove("far", "fa-copy", "text-secondary");
    icon.classList.add("fas", "fa-check", "text-success");
    if (typeof Swal !== "undefined") {
      Swal.fire({
        toast: true,
        position: "top",
        showConfirmButton: false,
        timer: 1500,
        icon: "success",
        title: "Tracking ID Copied!"
      });
    }
    setTimeout(() => {
      icon.classList.remove("fas", "fa-check", "text-success");
      icon.classList.add("far", "fa-copy", "text-secondary");
    }, 2e3);
  });
};
window.trackParcel = function(trackingId, provider, defaultLink) {
  if (!trackingId || trackingId === "null") {
    Swal.fire("Info", "Tracking number is not available yet.", "info");
    return;
  }
  let p = String(provider).toUpperCase();
  if (p.includes("INDIA POST") || p.includes("SPEED POST") || p.includes("POST")) {
    Swal.fire({
      title: "Tracking Parcel...",
      html: `<div class="mt-2 text-primary fw-bold fs-5">${trackingId}</div>
               <div class="small text-muted mt-2">Fetching live status from India Post...</div>`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    window.kafakOrderEditorUI.track(trackingId).then((res) => {
      let ipData = res.trackingData || res;
      if (ipData && ipData.status_code === 200 && ipData.data && ipData.data.length > 0) {
        let events = ipData.data[0].tracking_details || [];
        if (events.length === 0) {
          Swal.fire({
            icon: "error",
            title: "No Data Found",
            text: "Tracking details are currently unavailable for this ID.",
            confirmButtonColor: "#333"
          });
          return;
        }
        let sortedEvents = [...events].sort((a, b) => {
          let dateA = /* @__PURE__ */ new Date(`${a.date || ""} ${a.time || ""}`);
          let dateB = /* @__PURE__ */ new Date(`${b.date || ""} ${b.time || ""}`);
          return dateB - dateA;
        });
        let timelineHtml = `<div style="text-align:left; max-height: 350px; overflow-y: auto; padding: 10px 15px; border-left: 3px solid #3b82f6; margin-left: 15px; margin-top: 10px;">`;
        sortedEvents.forEach((ev, index) => {
          let isLatest = index === 0;
          let dotColor = isLatest ? "#10b981" : "#cbd5e1";
          let textColor = isLatest ? "#0f172a" : "#475569";
          let dateStr = ev.date ? ev.date.split("T")[0] : "";
          timelineHtml += `
              <div style="position: relative; margin-bottom: 18px; padding-left: 20px;">
                  <span style="position: absolute; left: -26.5px; top: 2px; background: ${dotColor}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px ${dotColor};"></span>
                  <div style="font-size:10px; color:#64748b; font-weight:800; letter-spacing:0.5px;">${dateStr} • ${ev.time || ""}</div>
                  <div style="font-size:13px; font-weight:800; color:${textColor}; margin-top:2px;">${ev.event || "Status Updated"}</div>
                  <div style="font-size:11px; color:#64748b; font-weight:600; margin-top:2px;"><i class="fas fa-map-marker-alt text-danger me-1"></i> ${ev.office || "Post Office"}</div>
              </div>`;
        });
        timelineHtml += `</div>`;
        Swal.fire({
          title: `<div style="font-size:16px; font-weight:800;"><i class="fas fa-shipping-fast text-primary me-2"></i>Live Tracking Status</div>`,
          html: timelineHtml,
          showCloseButton: true,
          confirmButtonText: "Close",
          confirmButtonColor: "#333",
          customClass: {
            popup: "rounded-4 ios-popup"
          }
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "No Data Found",
          text: "Tracking details are currently unavailable for this ID.",
          confirmButtonColor: "#333"
        });
      }
    }).catch((err) => {
      if (defaultLink && defaultLink !== "null") window.open(defaultLink, "_blank");
      else Swal.fire("Error", "Network connection failed.", "error");
    });
  } else {
    if (defaultLink && defaultLink !== "null") window.open(defaultLink, "_blank");
    else Swal.fire("Info", "No tracking link available for this courier.", "info");
  }
};
window.loadLiveTrackingInline = function(trackId, expectedPO, lang, silent = false) {
  let cleanTrackId = String(trackId).trim();
  let widget = $(`#inline-track-${cleanTrackId}`);
  if (widget.length === 0) return;
  let truckLoaderCss = `<style>
          @keyframes truckMove { 0% { left: -30px; } 100% { left: 100%; } }
          .truck-load-container { width: 100%; margin-top: 15px; padding: 15px 0 10px 0; text-align: center; overflow: hidden; }
          .truck-road { width: 80%; height: 2px; background: #cbd5e1; border-radius: 2px; margin: 0 auto; position: relative; }
          .truck-icon-mover { position: absolute; top: -14px; color: #3b82f6; font-size: 16px; animation: truckMove 2s linear infinite; }
      </style>`;
  let truckLoaderHtml = truckLoaderCss + `
          <div class="truck-load-container">
              <div class="truck-road"><i class="fas fa-truck truck-icon-mover"></i></div>
              <div class="text-muted fw-bold mt-3" style="font-size:11px;">Fetching Live Location...</div>
          </div>`;
  if (!silent) widget.html(truckLoaderHtml);
  window.kafakOrderEditorUI.track(cleanTrackId).then((res) => {
    let eventsArray = null;
    let ipData = res.trackingData || res;
    if (ipData && ipData.status_code === 200 && ipData.data && ipData.data.length > 0) {
      eventsArray = ipData.data[0].tracking_details;
    }
    if (eventsArray && Array.isArray(eventsArray) && eventsArray.length > 0) {
      let sortedEvents = [...eventsArray].sort((a, b) => {
        let dateA = /* @__PURE__ */ new Date(`${a.date || ""} ${a.time || ""}`);
        let dateB = /* @__PURE__ */ new Date(`${b.date || ""} ${b.time || ""}`);
        return dateB - dateA;
      });
      let latest = sortedEvents[0];
      let eventsJson = encodeURIComponent(JSON.stringify(sortedEvents));
      let officeName = latest.office || "In Transit";
      let eventMsg = latest.event || "Status Updated";
      let eventDate = latest.date ? latest.date.split("T")[0] : "";
      let eventTime = latest.time || "";
      let isAtDestination = false;
      let isOutForDelivery = false;
      let evntLow = eventMsg.toLowerCase();
      let cleanExpected = expectedPO ? expectedPO.replace(/\b(PO|SO|BO|HO|GPO|P O|S O|B O|H O|H\.O|S\.O|B\.O|P\.O|G\.P\.O)\b/gi, "").replace(/[^a-zA-Z0-9 ]/g, "").trim().toLowerCase() : "";
      let cleanOffice = officeName.replace(/\b(PO|SO|BO|HO|GPO|P O|S O|B O|H O|H\.O|S\.O|B\.O|P\.O|G\.P\.O)\b/gi, "").replace(/[^a-zA-Z0-9 ]/g, "").trim().toLowerCase();
      let isSameOffice = false;
      if (cleanExpected && cleanOffice && (cleanOffice.includes(cleanExpected) || cleanExpected.includes(cleanOffice))) {
        isSameOffice = true;
      }
      if (evntLow.includes("out for delivery")) {
        isOutForDelivery = true;
      } else if (evntLow.includes("destination") || evntLow.includes("delivered") || isSameOffice) {
        isAtDestination = true;
      }
      let destAlert = "";
      if (isOutForDelivery) {
        let msg = lang === "ml" ? `🚚 പാഴ്സൽ ഇന്ന് ഡെലിവറി ചെയ്യുന്നതാണ്!` : `🚚 Parcel will be delivered today!`;
        destAlert = `<div class="mt-2 p-2 rounded-2 fw-bold text-center shadow-sm" style="background:#22c55e; color:#fff; font-size: 11px; letter-spacing: 0.5px;"><i class="fas fa-motorcycle me-1"></i> ${msg}</div>`;
      } else if (isAtDestination && !evntLow.includes("delivered")) {
        let msg = lang === "ml" ? `🎉 പാഴ്സൽ നിങ്ങളുടെ പോസ്റ്റ് ഓഫീസിൽ (${officeName}) എത്തിയിട്ടുണ്ട്!` : `🎉 Parcel has reached your local Post Office (${officeName})!`;
        destAlert = `<div class="mt-2 p-2 rounded-2 fw-bold text-center shadow-sm" style="background:#10b981; color:#fff; font-size: 11px; letter-spacing: 0.5px;"><i class="fas fa-check-circle me-1"></i> ${msg}</div>`;
      }
      let pulseCss = `<style>
                      .live-pulse { width:10px; height:10px; background:#3b82f6; border-radius:50%; position:relative; }
                      .live-pulse::after { content:''; position:absolute; width:100%; height:100%; background:#3b82f6; border-radius:50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
                      @keyframes ping { 75%, 100% { transform: scale(2.5); opacity: 0; } }
                  </style>`;
      let html = `${pulseCss}
                  <div class="p-3 mt-3 rounded-3 shadow-sm" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; position:relative;">
                      <div class="d-flex align-items-center justify-content-between mb-2">
                           <div class="d-flex align-items-center gap-2">
                              <div class="live-pulse"></div>
                              <span class="fw-bold" style="font-size: 10px; color:#0284c7; letter-spacing: 1px;">LIVE LOCATION</span>
                           </div>
                           <button onclick="showFullTrackingPopup('${cleanTrackId}', '${eventsJson}')" class="btn btn-sm p-0 px-2 rounded-pill shadow-sm" style="background:#fff; border:1px solid #bae6fd; font-size:9px; font-weight:800; color:#0369a1;">
                              <i class="fas fa-history me-1"></i> HISTORY
                           </button>
                      </div>
                      <div class="fw-bolder text-dark mb-1" style="font-size: 14px;">
                           <i class="fas fa-map-marker-alt text-danger me-1"></i> ${officeName}
                      </div>
                      <div style="font-size: 12px; font-weight: 700; color: #334155;">
                           ${eventMsg}
                      </div>
                      <div class="text-muted mt-1" style="font-size: 10px; font-weight: 600;">
                           <i class="far fa-clock me-1"></i> ${eventDate} • ${eventTime}
                      </div>
                      ${destAlert}
                  </div>`;
      widget.html(html);
    } else {
      if (!silent) widget.html(`<div class="text-danger small mt-2 fw-bold text-center" style="background: #fee2e2; padding: 8px; border-radius: 8px;"><i class="fas fa-exclamation-circle"></i> Tracking details currently unavailable</div>`);
    }
  }).catch((err) => {
    if (!silent) widget.html(`<div class="text-danger small mt-2 fw-bold text-center" style="background: #fee2e2; padding: 8px; border-radius: 8px;"><i class="fas fa-wifi"></i> Connection failed</div>`);
  });
};
window.showFullTrackingPopup = function(trackId, eventsJson) {
  let events = JSON.parse(decodeURIComponent(eventsJson));
  let timelineCss = `<style>
        .kafak-timeline-wrapper {
            text-align: left; max-height: 400px; overflow-y: auto; 
            padding: 20px 15px 20px 25px; /* 🔥 ഇടതുവശത്തെ പാഡിംഗ് കൃത്യമാക്കി */
        }
        .kafak-timeline-item {
            position: relative; margin-bottom: 20px; padding-left: 35px; z-index: 2;
        }
        /* 🔥 ഒരൊറ്റ നീളൻ ലൈനിന് പകരം ഓരോ ഐറ്റത്തിനും അതിന്റേതായ ലൈൻ (സ്ക്രോൾ ബഗ് ഫിക്സ്) */
        .kafak-timeline-item:not(:last-child)::after {
            content: ''; position: absolute; 
            left: 9px; top: 22px; height: calc(100% + 20px); 
            width: 2px; background: #cbd5e1; z-index: 1;
        }
        .kafak-timeline-dot {
            position: absolute; left: 3px; top: 12px; 
            width: 14px; height: 14px; border-radius: 50%;
            border: 3px solid #fff; box-shadow: 0 0 0 2px #cbd5e1;
            z-index: 3; background: #fff;
        }
        .kafak-timeline-item.latest .kafak-timeline-dot {
            background: #16a34a; box-shadow: 0 0 0 2px #16a34a;
        }
        .kafak-timeline-item.old .kafak-timeline-dot {
            background: #94a3b8;
        }
        .kafak-timeline-content {
            padding: 10px 15px; border-radius: 12px; background: #f8fafc;
        }
        .kafak-timeline-item.latest .kafak-timeline-content {
            background: #f0fdf4; border: 1px solid #b91c1c20;
        }
    </style>`;
  let timelineHtml = timelineCss + `<div class="kafak-timeline-wrapper">`;
  events.forEach((ev, idx) => {
    let isLatest = idx === 0;
    let itemClass = isLatest ? "kafak-timeline-item latest" : "kafak-timeline-item old";
    let statusColor = isLatest ? "#16a34a" : "#1e293b";
    let datePart = ev.date ? ev.date.split("T")[0] : "";
    let timePart = ev.time || "";
    timelineHtml += `
            <div class="${itemClass}">
                <span class="kafak-timeline-dot"></span>
                <div class="kafak-timeline-content shadow-sm">
                    <div style="font-size:10px; font-weight:700; color:#94a3b8;">${datePart} • ${timePart}</div>
                    <div style="font-size:13px; font-weight:800; color:${statusColor};">${ev.event || ev.status || "Updated"}</div>
                    <div style="font-size:11px; color:#64748b;"><i class="fas fa-map-marker-alt me-1"></i>${ev.office || "Post Office"}</div>
                </div>
            </div>`;
  });
  timelineHtml += `</div>`;
  Swal.fire({
    title: `<div style="font-size:16px; font-weight:800;">Tracking Journey: ${trackId}</div>`,
    html: timelineHtml,
    showCloseButton: true,
    confirmButtonText: "Close",
    confirmButtonColor: "#333",
    customClass: {
      popup: "rounded-4",
      htmlContainer: "p-0"
    }
  });
};
function renderPendingRecovery() {
  $("#pending-order-recovery").remove();
  if (!window.kafakCheckoutUI) return;
  const order = window.kafakCheckoutUI.checkout.order;
  if (order.pendingError) {
    $('<div id="pending-order-recovery" class="order-notice" role="alert"></div>').text(order.pendingError).prependTo(".scroll-content > .container");
    return;
  }
  const oid = new URLSearchParams(location.search).get("oid");
  const edit = oid && window.kafakStorage.getItem("kafak-business-edit:" + oid);
  if (!order.pending && !edit) return;
  const box = $('<div id="pending-order-recovery" class="order-notice" role="status">A previous save needs confirmation. Retry the saved request before making another change. </div>').prependTo(".scroll-content > .container");
  $('<button type="button" class="btn btn-sm btn-dark">Retry saved request</button>').on("click", function() {
    var _order$pending, _savedOrderData2;
    const button = $(this).prop("disabled", true);
    const name = ((_order$pending = order.pending) === null || _order$pending === void 0 ? void 0 : _order$pending.data.name) || ((_savedOrderData2 = savedOrderData) === null || _savedOrderData2 === void 0 ? void 0 : _savedOrderData2.name) || "Customer";
    playVideoAnimation(name, async () => {
      try {
        var _window$kafakRecovery3;
        if (edit) {
          successData = await window.kafakOrderEditorUI.retrySaved(oid);
        } else {
          const result = await order.retry(), d = result.customer, q = result.quote;
          successData = _objectSpread(_objectSpread(_objectSpread({}, d), result), {}, {
            Status: "Pending",
            quantity: q.quantity,
            product: q.product,
            variant: q.variant,
            Grand_Total: q.total,
            Product_Amount: q.productAmount,
            Courier_Charge: q.courierAmount
          });
        }
        (_window$kafakRecovery3 = window.kafakRecovery) === null || _window$kafakRecovery3 === void 0 || _window$kafakRecovery3.confirmed(successData);
        window.orderSuccess = true;
        renderPendingRecovery();
        finishOrderPresentation();
      } catch (error) {
        stopOrderAnimation();
        showLoader(false);
        $("#videoModal").hide();
        button.prop("disabled", false);
        showAlert(error.message);
      }
    });
  }).appendTo(box);
}
$(document).ready(() => {
  renderPendingRecovery();
  if (!window.kafakStorage.persistent) $('<div class="order-notice" role="status">Site storage is blocked. You can view your order; enable site storage before saving changes.</div>').prependTo(".scroll-content > .container");
});
