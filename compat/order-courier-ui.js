(function() {
  "use strict";
  if (window.KAFAK_BACKEND !== "business") return;
  const api = new KafakBusinessApi(), storage = window.kafakStorage;
  let settings = null, loading = null, loadError = "", changeSerial = 0;
  const admin = () => storage.getItem("kafakAdmin") === "true";
  const saved = () => typeof savedOrderData === "object" ? savedOrderData : null;
  const provider = (quick) => {
    var _document$getElementB;
    return admin() ? ((_document$getElementB = document.getElementById(quick ? "admin-edit-courier" : "admin-wizard-courier")) === null || _document$getElementB === void 0 ? void 0 : _document$getElementB.value) || void 0 : void 0;
  };
  const changed = () => {
    const row = saved(), control = document.getElementById("admin-edit-courier");
    return !!(admin() && row !== null && row !== void 0 && row.orderid && control && String(control.value || "") !== String(row.courier || row.provider || row.Courier_Provider || ""));
  };
  async function load() {
    if (settings || !admin()) return;
    if (!loading) loading = api.courierSettings().then((result) => {
      if (result.status !== "success" || !Array.isArray(result.data)) throw Error("Courier options unavailable.");
      settings = result;
      loadError = "";
    }).catch((error) => {
      loadError = error.message;
    }).finally(() => loading = null);
    return loading;
  }
  function render() {
    if (!admin()) {
      document.querySelectorAll(".admin-order-courier").forEach((el) => el.remove());
      return;
    }
    for (const quick of [false, true]) {
      var _select, _qty$selectedOptions$, _window$kafakCheckout, _document$getElementB2, _settings;
      const qty = document.getElementById(quick ? "quick-qty" : "quantity");
      if (!qty) continue;
      const id = quick ? "admin-edit-courier" : "admin-wizard-courier", row = saved(), identity = quick ? (row === null || row === void 0 ? void 0 : row.orderid) || "edit-new" : "create";
      let box = document.getElementById(id + "-panel"), select = document.getElementById(id);
      const before = ((_select = select) === null || _select === void 0 ? void 0 : _select.dataset.orderId) === identity ? select.value : quick ? (row === null || row === void 0 ? void 0 : row.courier) || (row === null || row === void 0 ? void 0 : row.provider) || (row === null || row === void 0 ? void 0 : row.Courier_Provider) || "" : "";
      if (!box) {
        box = document.createElement("div");
        box.id = id + "-panel";
        box.className = "admin-order-courier mb-3";
        const label = document.createElement("label");
        label.htmlFor = id;
        label.className = "small text-muted fw-bold mb-1";
        label.style.fontSize = "11px";
        label.textContent = "COURIER";
        select = document.createElement("select");
        select.id = id;
        select.className = "form-select form-select-sm fw-bold";
        select.onchange = () => change(quick);
        box.append(label, select);
        qty.parentNode.insertBefore(box, document.getElementById(quick ? "quick-qty-label" : "wizard-qty-label") || qty);
      }
      select.dataset.orderId = identity;
      const sku = ((_qty$selectedOptions$ = qty.selectedOptions[0]) === null || _qty$selectedOptions$ === void 0 ? void 0 : _qty$selectedOptions$.dataset.sku) || (row === null || row === void 0 ? void 0 : row.sku), product = (_window$kafakCheckout = window.kafakCheckoutUI) === null || _window$kafakCheckout === void 0 ? void 0 : _window$kafakCheckout.checkout.products.find((p) => p.sku === sku), state = String(quick ? (_document$getElementB2 = document.getElementById("edit-state")) === null || _document$getElementB2 === void 0 ? void 0 : _document$getElementB2.value : typeof userData === "object" ? userData.state : "").trim().toUpperCase();
      let rows = (((_settings = settings) === null || _settings === void 0 ? void 0 : _settings.data) || []).filter((r) => !(product !== null && product !== void 0 && product.rateGroup) || r["Rate Group"] === product.rateGroup);
      const exact = rows.filter((r) => String(r.Parameter).toUpperCase() === state);
      rows = exact.length ? exact : rows.filter((r) => {
        var _settings2;
        return String(r.Parameter).toUpperCase() === String(((_settings2 = settings) === null || _settings2 === void 0 ? void 0 : _settings2.fallbackZone) || "REST OF INDIA").toUpperCase();
      });
      const quantity = Number(qty.value), providers = [...new Set(rows.filter((r) => !quantity || String(r["Base Rate String"]).split(",").some((part) => Number(part.split(":")[0]) === quantity)).map((r) => r.Provider).filter(Boolean))];
      select.replaceChildren();
      if (!quick || !before) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Automatic (default courier)";
        select.append(option);
      }
      if (before && !providers.includes(before)) providers.unshift(before);
      for (const name of providers) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.append(option);
      }
      select.value = before;
      let retry = box.querySelector("button");
      if (loadError && !retry) {
        retry = document.createElement("button");
        retry.type = "button";
        retry.className = "btn btn-link btn-sm px-0";
        retry.style.fontSize = "11px";
        retry.textContent = "Retry courier options";
        retry.onclick = async () => {
          await load();
          render();
        };
        box.append(retry);
      } else if (!loadError && retry) retry.remove();
    }
  }
  async function change(quick) {
    const serial = ++changeSerial;
    window.KafakOrderCourierUI.busy = true;
    window.kafakCheckoutUI.checkout.priced = null;
    window.kafakCheckoutUI.checkout.order.currentQuote = null;
    if (!quick) $("#btn-wiz-next").prop("disabled", true);
    checkForChanges();
    try {
      const qty = document.getElementById(quick ? "quick-qty" : "quantity");
      if (qty.value) await updatePrice(qty.value, quick);
    } finally {
      if (serial === changeSerial) {
        window.KafakOrderCourierUI.busy = false;
        if (!quick) $("#btn-wiz-next").prop("disabled", false);
        checkForChanges();
      }
    }
  }
  window.KafakOrderCourierUI = {
    load,
    render,
    provider,
    changed,
    busy: false
  };
})();
