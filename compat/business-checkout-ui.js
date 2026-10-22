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
(function() {
  "use strict";
  if (window.KAFAK_BACKEND !== "business") return;
  const storage = window.kafakStorage || localStorage;
  const api = new KafakBusinessApi(), publicSubmit = api.submitOrder.bind(api);
  api.submitOrder = (data, id) => storage.getItem("kafakAdmin") === "true" ? api.createAdminOrder(data, id) : publicSubmit(data, id);
  const publicCatalog = api.catalog.bind(api), publicQuote = api.quote.bind(api);
  let adminCatalog = false;
  api.catalog = async () => {
    if (storage.getItem("kafakAdmin") === "true") {
      try {
        const products = await api.request("/catalog");
        adminCatalog = true;
        return products;
      } catch (e) {
        if (e.status !== 401) throw e;
      }
    }
    adminCatalog = false;
    return publicCatalog();
  };
  api.quote = (sku, state, provider) => {
    var _document$querySelect, _document$querySelect2, _document$querySelect3, _window$kafakOrderEdi;
    const oid = typeof editingOrderId !== "undefined" ? editingOrderId : null;
    const quick = ((_document$querySelect = document.querySelector("#quick-qty")) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.offsetParent) !== null;
    const phone = (quick ? (_document$querySelect2 = document.querySelector("#edit-phone")) === null || _document$querySelect2 === void 0 ? void 0 : _document$querySelect2.value : (_document$querySelect3 = document.querySelector("#phone")) === null || _document$querySelect3 === void 0 ? void 0 : _document$querySelect3.value) || (typeof userData === "object" ? userData.phone : "");
    const params = new URLSearchParams(_objectSpread(_objectSpread({
      sku,
      state
    }, provider ? {
      provider
    } : {}), oid ? {
      oid
    } : {
      phone: phone || ""
    }));
    return api.request((adminCatalog ? "/quote?" : "/public/quote?") + params, oid && !adminCatalog ? {
      accessToken: (_window$kafakOrderEdi = window.kafakOrderEditorUI) === null || _window$kafakOrderEdi === void 0 ? void 0 : _window$kafakOrderEdi.access(oid)
    } : {});
  };
  const checkout = new KafakBusinessCheckout(api, KafakBusinessOrder, storage);
  const catalog = new KafakBusinessCatalog({
    catalog: async () => checkout.products
  });
  let ready = null;
  const selected = (quick) => {
    var _document$querySelect4;
    return (_document$querySelect4 = document.querySelector(quick ? "#quick-qty" : "#quantity")) === null || _document$querySelect4 === void 0 || (_document$querySelect4 = _document$querySelect4.selectedOptions[0]) === null || _document$querySelect4 === void 0 ? void 0 : _document$querySelect4.dataset.sku;
  };
  function historicalQuote(qty) {
    var _savedOrderData$Produ;
    const total = Number(savedOrderData.Grand_Total), courier = Number(savedOrderData.Courier_Charge);
    const amount = savedOrderData.Product_Amount == null || savedOrderData.Product_Amount === "" ? Math.round((total - courier) * 100) / 100 : Number(savedOrderData.Product_Amount);
    if (!Number.isFinite(total) || !Number.isFinite(courier) || !Number.isFinite(amount) || amount < 0) throw Error("Historical order amounts require review.");
    return {
      product: savedOrderData.product,
      quantity: Number(qty),
      productAmount: amount,
      courierAmount: courier,
      total,
      productListAmount: Number((_savedOrderData$Produ = savedOrderData.Product_List_Amount) !== null && _savedOrderData$Produ !== void 0 ? _savedOrderData$Produ : amount),
      discountAmount: Number(savedOrderData.Discount_Amount || 0),
      offer: savedOrderData["Offer Type"] ? {
        type: savedOrderData["Offer Type"],
        value: Number(savedOrderData["Offer Value"]),
        duration: savedOrderData["Offer Duration"]
      } : null
    };
  }
  function render() {
    var _catalog$selected;
    const productSelect = document.getElementById("admin-product-type");
    if (productSelect && catalog.families.length) {
      var _savedOrderData;
      const prior = productSelect.value, oldSku = (_savedOrderData = savedOrderData) === null || _savedOrderData === void 0 ? void 0 : _savedOrderData.sku;
      const family = catalog.families.find((f) => f.id === prior) || catalog.families.find((f) => f.products.some((p) => p.sku === oldSku)) || catalog.families.find((f) => {
        var _savedOrderData2;
        return f.name === ((_savedOrderData2 = savedOrderData) === null || _savedOrderData2 === void 0 ? void 0 : _savedOrderData2.product);
      }) || catalog.families[0];
      productSelect.replaceChildren();
      for (const f of catalog.families) {
        const option = document.createElement("option");
        option.value = f.id;
        option.textContent = f.label;
        option.selected = f.id === family.id;
        productSelect.append(option);
      }
      catalog.select(family.id);
    }
    const productPanel = document.getElementById("admin-product-panel");
    if (productPanel) {
      productPanel.hidden = catalog.families.length <= 1;
      productPanel.style.display = catalog.families.length <= 1 ? "none" : "";
    }
    const products = productSelect ? ((_catalog$selected = catalog.selected) === null || _catalog$selected === void 0 ? void 0 : _catalog$selected.products) || [] : checkout.products;
    for (const id of ["quantity", "quick-qty"]) {
      var _select$selectedOptio, _savedOrderData3, _savedOrderData4;
      const select = document.getElementById(id);
      if (!select) continue;
      const priorSku = (_select$selectedOptio = select.selectedOptions[0]) === null || _select$selectedOptio === void 0 ? void 0 : _select$selectedOptio.dataset.sku;
      const sku = priorSku || (id === "quick-qty" ? (_savedOrderData3 = savedOrderData) === null || _savedOrderData3 === void 0 ? void 0 : _savedOrderData3.sku : null);
      select.replaceChildren();
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = (translations[$("#language-select").val()] || translations.en).dd_select || "Select Quantity";
      empty.disabled = true;
      empty.selected = true;
      select.append(empty);
      for (const p of products) {
        const option = document.createElement("option");
        option.value = String(p.units);
        option.dataset.sku = p.sku;
        option.textContent = [productSelect ? "" : p.displayName || p.name, p.variant, p.label || p.units, p.size, p.colour].filter(Boolean).join(" · ");
        option.selected = p.sku === sku;
        select.append(option);
      }
      if (id === "quick-qty" && editingOrderId && !sku && (_savedOrderData4 = savedOrderData) !== null && _savedOrderData4 !== void 0 && _savedOrderData4.quantity) {
        const historical = document.createElement("option");
        historical.value = String(savedOrderData.quantity);
        historical.textContent = `${savedOrderData.quantity} · ${savedOrderData.product || "Existing order"}`;
        historical.selected = true;
        select.append(historical);
      }
    }
  }
  async function load() {
    if (!ready) ready = checkout.load().then(async (result) => {
      await catalog.load();
      adminPhone = String(result.settings.contactPhone);
      isOutOfStock = result.settings.stockStatus === "no";
      globalQtyList = [...new Set(result.products.map((p) => Number(p.units)))].sort((a, b) => a - b);
      render();
      return true;
    }).catch((error) => {
      ready = null;
      showAlert(error.message);
      return false;
    });
    return ready;
  }
  window.kafakCheckoutUI = {
    load,
    render,
    checkout,
    productChanged: false,
    displayName(name) {
      var _checkout$products;
      return ((_checkout$products = checkout.products) === null || _checkout$products === void 0 || (_checkout$products = _checkout$products.find((p) => p.name === name)) === null || _checkout$products === void 0 ? void 0 : _checkout$products.displayName) || name;
    },
    productName() {
      var _catalog$selected2;
      return ((_catalog$selected2 = catalog.selected) === null || _catalog$selected2 === void 0 ? void 0 : _catalog$selected2.name) || "";
    },
    changeProduct() {
      this.productChanged = true;
      render();
      const quick = $("#quick-qty").is(":visible"), control = document.querySelector(quick ? "#quick-qty" : "#quantity");
      if (control) {
        control.selectedIndex = 1;
        updatePrice(control.value, quick);
      }
      checkForChanges();
    },
    async price(qty, quick) {
      var _savedOrderData5;
      await load();
      const sku = selected(quick), state = quick ? $("#edit-state").val() : userData.state || $("#state").val();
      if (quick && editingOrderId && !((_savedOrderData5 = savedOrderData) !== null && _savedOrderData5 !== void 0 && _savedOrderData5.sku) && !this.productChanged && Number(qty) === Number(savedOrderData.quantity) && state === savedOrderData.state) {
        checkout.priced = null;
        return historicalQuote(qty);
      }
      if (!sku) {
        checkout.priced = null;
        if (quick && editingOrderId && Number(qty) === Number(savedOrderData.quantity) && state === savedOrderData.state) return historicalQuote(qty);
        return null;
      }
      try {
        return await checkout.price(sku, state);
      } catch (error) {
        checkout.priced = null;
        showAlert(error.message);
        return null;
      }
    },
    async submit(data) {
      await load();
      const quick = $("#quick-qty").is(":visible"), sku = selected(quick);
      const result = await checkout.submit(_objectSpread(_objectSpread({}, data), {}, {
        preorderConfirmed: isOutOfStock
      }), sku);
      return {
        res: result,
        data: result.legacy
      };
    }
  };
})();
