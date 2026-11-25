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
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}
function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) {
        if (Object(t) !== t) return;
        f = false;
      } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
(function() {
  "use strict";
  if (window.KAFAK_BACKEND !== "business") return;
  const api = new KafakBusinessApi(), storage = window.kafakStorage;
  const escape = (value) => KafakUI.escape(value), money = (value) => Number(value).toFixed(2);
  let serial = 0, removing = false;
  const current = () => typeof savedOrderData === "object" ? savedOrderData : null;
  function render() {
    var _row$items;
    const row = current(), qty = document.getElementById("quick-qty");
    if (!(row !== null && row !== void 0 && row.orderid) || !qty) return;
    let box = document.getElementById("mixed-order-products");
    if (!box) {
      box = document.createElement("div");
      box.id = "mixed-order-products";
      box.className = "mb-3";
      qty.parentNode.insertBefore(box, document.getElementById("quick-qty-label") || qty);
    }
    box.replaceChildren();
    if ((_row$items = row.items) !== null && _row$items !== void 0 && _row$items.length) {
      const list = document.createElement("div");
      list.className = "border rounded-3 bg-light p-3 mb-2";
      for (const _ref of row.items.entries()) {
        var _window$kafakCheckout;
        var _ref2 = _slicedToArray(_ref, 2);
        const index = _ref2[0];
        const item = _ref2[1];
        const line = document.createElement("div");
        line.className = "d-flex justify-content-between gap-2 small py-1";
        const name = document.createElement("span"), amount = document.createElement("strong");
        name.textContent = (((_window$kafakCheckout = window.kafakCheckoutUI) === null || _window$kafakCheckout === void 0 ? void 0 : _window$kafakCheckout.displayName(item.product)) || item.product) + " · " + item.packGrams + "g × " + item.quantity;
        amount.textContent = "₹" + money(item.productAmount);
        const right = document.createElement("div");
        right.className = "d-flex align-items-center gap-2";
        right.append(amount);
        if (row.items.length > 1 && storage.getItem("kafakAdmin") === "true" && ["pending", "sent", "paid"].includes(String(row.Status || row.status).toLowerCase()) && !/P_/.test(row.adminMeta || "")) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "btn btn-sm btn-outline-danger mixed-remove-product";
          button.dataset.index = String(index);
          button.style.cssText = "width:26px;height:26px;padding:0;line-height:1;flex-shrink:0";
          button.title = "Remove product";
          button.setAttribute("aria-label", "Remove " + item.product + " " + item.packGrams + "g");
          button.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
          button.disabled = removing;
          button.onclick = () => remove(index);
          right.append(button);
        }
        line.append(name, right);
        list.append(line);
      }
      box.append(list);
      qty.replaceChildren();
      const option = document.createElement("option");
      option.value = String(row.quantity);
      option.textContent = row.quantity + " bottles · Mixed products";
      option.selected = true;
      qty.append(option);
      const panel = document.getElementById("admin-product-panel");
      if (panel) panel.style.display = "none";
    }
    if (storage.getItem("kafakAdmin") === "true" && ["pending", "sent", "paid"].includes(String(row.Status || row.status).toLowerCase()) && !/P_/.test(row.adminMeta || "")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "btn-add-order-product";
      button.className = "btn btn-sm btn-outline-dark rounded-pill px-3";
      button.innerHTML = '<i class="fas fa-plus me-1"></i> Add product';
      button.onclick = open;
      box.append(button);
    }
    if (storage.getItem("kafakAdmin") === "true" && storage.getItem("kafak-mixed-remove:" + row.orderid)) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "btn btn-sm btn-outline-danger ms-2";
      retry.textContent = "Finish product removal";
      retry.disabled = removing;
      retry.onclick = () => remove(1);
      box.append(retry);
    }
  }
  async function price(state, provider) {
    const row = current(), generation = ++serial, admin = storage.getItem("kafakAdmin") === "true";
    window.KafakMixedUI.priced = null;
    const quote = await api.request((admin ? "/admin/mixed-quote?" : "/public/mixed-quote?") + new URLSearchParams(_objectSpread({
      oid: row.orderid,
      state
    }, admin && provider ? {
      provider
    } : {})), admin ? {} : {
      accessToken: window.kafakOrderEditorUI.access(row.orderid)
    });
    if (generation !== serial) return null;
    window.KafakMixedUI.priced = {
      state,
      provider,
      quote
    };
    return quote;
  }
  async function open() {
    const row = current();
    if (!(row !== null && row !== void 0 && row.orderid)) return;
    const key = "kafak-mixed-add:" + row.orderid;
    if (storage.getItem("kafak-mixed-remove:" + row.orderid)) {
      showAlert("Finish the pending product removal before adding another product.");
      return;
    }
    if ($("#address-edit-box").is(":visible") || storage.getItem("kafak-business-edit:" + row.orderid)) {
      showAlert("Save your address changes before adding a product.");
      return;
    }
    let updates = [];
    try {
      updates = JSON.parse(storage.getItem("pendingUpdates") || "[]");
    } catch (_unused) {
    }
    if (updates.some((u) => u.oid === row.orderid)) {
      showAlert("Sync this order before adding a product.");
      return;
    }
    try {
      await window.kafakCheckoutUI.load();
      const products = window.kafakCheckoutUI.checkout.products.filter((p) => ["Vanthen", "Cheruthen"].includes(p.name));
      if (!products.length) throw Error("No honey products are available.");
      let pending = JSON.parse(storage.getItem(key) || "null"), quote = null, sequence = 0;
      const result = await Swal.fire({
        title: pending ? "Finish adding product" : "Add product",
        html: `<div class="text-start"><label class="small fw-bold mb-2" for="mixed-add-sku">Product / pack</label><select id="mixed-add-sku" class="form-select form-select-sm" disabled><option value="">Select product</option>${products.map((p) => `<option value="${escape(p.sku)}">${escape(p.displayName || p.name)} · ${Number(p.packGrams) || ""}g × ${Number(p.units)} · ₹${money(p.price)}</option>`).join("")}</select><div id="mixed-add-quote" class="small mt-3" aria-live="polite"></div></div>`,
        showCancelButton: true,
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: () => !Swal.isLoading(),
        confirmButtonText: pending ? "Retry save" : "Save product",
        confirmButtonColor: "#212529",
        customClass: {
          popup: "ios-popup"
        },
        didOpen: () => {
          const select = document.getElementById("mixed-add-sku"), preview = document.getElementById("mixed-add-quote");
          Swal.getConfirmButton().disabled = !pending;
          if (pending) {
            select.value = pending.payload.sku;
            select.disabled = true;
            preview.textContent = "Previous save is awaiting confirmation. Retry checks the same request without adding twice.";
            return;
          }
          select.onchange = async () => {
            const generation = ++sequence;
            quote = null;
            Swal.getConfirmButton().disabled = true;
            if (!select.value) {
              preview.textContent = "";
              return;
            }
            preview.textContent = "Checking total…";
            try {
              const q = await api.request("/admin/add-product-quote?" + new URLSearchParams({
                oid: row.orderid,
                sku: select.value
              }));
              if (generation !== sequence) return;
              quote = q;
              preview.innerHTML = q.items.map((i) => `<div class="d-flex justify-content-between gap-2 py-1"><span>${escape(i.product)} ${Number(i.packGrams)}g × ${Number(i.quantity)}</span><strong>₹${money(i.productAmount)}</strong></div>`).join("") + `<div class="d-flex justify-content-between py-1"><span>Courier</span><strong>₹${money(q.courierAmount)}</strong></div><div class="d-flex justify-content-between border-top pt-2 fw-bold"><span>Total</span><span>₹${money(q.total)}</span></div>` + (String(row.Status).toLowerCase() === "paid" ? `<div class="mt-2">Already paid: ₹${money(q.previousTotal)} · Balance: ₹${money(q.total - q.previousTotal)}</div>` : "");
              Swal.getConfirmButton().disabled = false;
            } catch (error) {
              if (generation === sequence) preview.textContent = error.message;
            }
          };
          select.disabled = false;
        },
        preConfirm: async () => {
          if (!pending) {
            if (!quote) {
              Swal.showValidationMessage("Select a product and wait for its total.");
              return false;
            }
            pending = {
              requestId: crypto.randomUUID(),
              payload: {
                action: "addOrderProduct",
                oid: row.orderid,
                sku: document.getElementById("mixed-add-sku").value,
                version: quote.version,
                expectedTotal: quote.total,
                expectedPreviousTotal: quote.previousTotal
              }
            };
            storage.setItem(key, JSON.stringify(pending));
          }
          document.getElementById("mixed-add-sku").disabled = true;
          try {
            storage.requirePersistent();
            const saved = await api.adminAction(pending.payload, pending.requestId);
            if (saved.result !== "success") throw Error("Product save was not confirmed. Retry the same save.");
            storage.removeItem(key);
            return saved;
          } catch (error) {
            if ([400, 403, 409, 422].includes(error.status)) {
              storage.removeItem(key);
              pending = null;
              quote = null;
              document.getElementById("mixed-add-sku").disabled = false;
            }
            Swal.showValidationMessage(error.message);
            return false;
          }
        }
      });
      if (result.isConfirmed) {
        const latest = await window.kafakOrderEditorUI.read(row.orderid);
        if (!(latest !== null && latest !== void 0 && latest.data)) throw Error("Product saved. Refresh this order to see the latest details.");
        window.kafakCheckoutUI.productChanged = false;
        showReturningUserView(latest.data, true, true);
        document.dispatchEvent(new Event("kafak-order-saved"));
        Swal.fire({
          icon: "success",
          title: "Product added",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1600
        });
      }
    } catch (error) {
      showAlert(error.message);
    }
  }
  async function remove(index) {
    const row = current();
    if (!(row !== null && row !== void 0 && row.orderid) || removing) return;
    if ($("#address-edit-box").is(":visible") || storage.getItem("kafak-business-edit:" + row.orderid) || storage.getItem("kafak-mixed-add:" + row.orderid)) {
      showAlert("Finish your pending changes before removing a product.");
      return;
    }
    let updates = [];
    try {
      updates = JSON.parse(storage.getItem("pendingUpdates") || "[]");
    } catch (_unused2) {
    }
    if (updates.some((u) => u.oid === row.orderid)) {
      showAlert("Sync this order before removing a product.");
      return;
    }
    const key = "kafak-mixed-remove:" + row.orderid;
    removing = true;
    render();
    try {
      var _pending, _row$items2;
      let pending = JSON.parse(storage.getItem(key) || "null");
      const quote = pending ? {
        total: pending.payload.expectedTotal,
        previousTotal: pending.payload.expectedPreviousTotal
      } : await api.request("/admin/remove-product-quote?" + new URLSearchParams({
        oid: row.orderid,
        index
      }));
      const item = ((_pending = pending) === null || _pending === void 0 ? void 0 : _pending.item) || ((_row$items2 = row.items) === null || _row$items2 === void 0 ? void 0 : _row$items2[pending ? pending.payload.index : index]) || {
        product: "Added product",
        packGrams: "",
        quantity: 1
      };
      const result = await Swal.fire({
        title: pending ? "Finish removing product" : "Remove product?",
        html: `<div class="small">${escape(item.product)} ${Number(item.packGrams)}g × ${Number(item.quantity)}<div class="mt-2">Updated total: <strong>₹${money(quote.total)}</strong></div></div>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: pending ? "Retry remove" : "Remove product",
        confirmButtonColor: "#dc3545",
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: () => !Swal.isLoading(),
        customClass: {
          popup: "ios-popup"
        },
        preConfirm: async () => {
          if (!pending) {
            pending = {
              requestId: crypto.randomUUID(),
              item,
              payload: {
                action: "removeOrderProduct",
                oid: row.orderid,
                index,
                version: quote.version,
                expectedTotal: quote.total,
                expectedPreviousTotal: quote.previousTotal
              }
            };
            storage.setItem(key, JSON.stringify(pending));
          }
          try {
            storage.requirePersistent();
            const saved = await api.adminAction(pending.payload, pending.requestId);
            if (saved.result !== "success") throw Error("Removal was not confirmed. Retry the same removal.");
            storage.removeItem(key);
            return saved;
          } catch (error) {
            if ([400, 403, 409, 422].includes(error.status)) {
              storage.removeItem(key);
              Swal.showValidationMessage(error.message);
              setTimeout(() => Swal.close(), 1800);
              return false;
            }
            Swal.showValidationMessage(error.message);
            return false;
          }
        }
      });
      if (result.isConfirmed) {
        const latest = await window.kafakOrderEditorUI.read(row.orderid);
        if (!(latest !== null && latest !== void 0 && latest.data)) throw Error("Product removed. Refresh this order to see the latest details.");
        window.kafakCheckoutUI.productChanged = false;
        showReturningUserView(latest.data, true, true);
        document.dispatchEvent(new Event("kafak-order-saved"));
        Swal.fire({
          icon: "success",
          title: "Product removed",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1600
        });
      }
    } catch (error) {
      showAlert(error.message);
    } finally {
      removing = false;
      render();
    }
  }
  window.KafakMixedUI = {
    render,
    price,
    open,
    remove,
    priced: null
  };
})();
