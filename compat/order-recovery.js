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
(() => {
  "use strict";
  const storage = window.kafakStorage;
  const scope = new URLSearchParams(location.search).get("oid") || "new";
  const draftKey = "kafak-draft-v1:" + scope, receiptKey = "kafak-receipt-v1:" + scope;
  const ids = ["admin-product-type", "phone", "name", "whatsapp", "pincode", "house", "place", "altphone", "quantity", "po-select", "edit-name", "edit-phone", "edit-whatsapp", "edit-pincode", "edit-house", "edit-place", "edit-altphone", "edit-postoffice", "edit-postoffice-select", "edit-district", "edit-state", "quick-qty"];
  let restoring = false, timer;
  const read = (key) => {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch (_unused) {
      return null;
    }
  };
  function capture() {
    var _savedOrderData;
    if (restoring || window.orderSuccess || !storage.persistent) return;
    const wizard = $("#wizard-view").is(":visible");
    const editing = $("#address-edit-box").is(":visible");
    if (!wizard && !editing) return;
    const fields = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) fields[id] = el.value;
    }
    storage.setItem(draftKey, JSON.stringify({
      fields,
      wizard,
      step: currentStep,
      data: userData,
      poList,
      version: (_savedOrderData = savedOrderData) === null || _savedOrderData === void 0 ? void 0 : _savedOrderData.version,
      at: Date.now()
    }));
  }
  async function restore(d) {
    restoring = true;
    try {
      var _savedOrderData2, _window$kafakCheckout;
      if (!d.wizard && d.version !== ((_savedOrderData2 = savedOrderData) === null || _savedOrderData2 === void 0 ? void 0 : _savedOrderData2.version)) {
        showAlert("This order changed since your draft. Your draft is kept; review the latest order before restoring changes.");
        return;
      }
      await ((_window$kafakCheckout = window.kafakCheckoutUI) === null || _window$kafakCheckout === void 0 ? void 0 : _window$kafakCheckout.load());
      if (d.wizard) {
        $("#step-0,#returning-user-view").hide();
        startWizard();
        userData = _objectSpread({}, d.data);
        poList = d.poList || [];
        const select = document.getElementById("po-select");
        if (select) {
          select.replaceChildren();
          for (const po of poList) {
            const o = document.createElement("option");
            o.value = o.textContent = po.officename;
            select.append(o);
          }
        }
      } else if (!$("#address-edit-box").is(":visible")) toggleAddressEdit();
      for (const _ref of Object.entries(d.fields || {})) {
        var _ref2 = _slicedToArray(_ref, 2);
        const id = _ref2[0];
        const value = _ref2[1];
        const el = document.getElementById(id);
        if (el) {
          el.value = value;
          if (id === "admin-product-type") onProductChange();
        }
      }
      if (d.wizard) {
        currentStep = d.step;
        showStep(currentStep);
        updateFooterButtons("wizard");
      } else {
        await handleEditPincode($("#edit-pincode").val());
        const po = d.fields["edit-postoffice"];
        if ($("#edit-postoffice-select option").toArray().some((o) => o.value === po)) $("#edit-postoffice-select").val(po).trigger("change");
        checkForChanges();
      }
      $("#draft-recovery").remove();
    } finally {
      restoring = false;
    }
  }
  function openReceipt(r) {
    if (!(r !== null && r !== void 0 && r.orderid)) return false;
    storage.removeItem(receiptKey);
    if (scope === r.orderid) return true;
    const url = new URL("order.html", location.href);
    url.searchParams.set("oid", r.orderid);
    if (r.accessToken) url.hash = "access=" + encodeURIComponent(r.accessToken);
    location.replace(url.href);
    return true;
  }
  function waitForView() {
    return new Promise((resolve) => {
      const ready = () => !$("#full-loader").is(":visible");
      if (ready()) return resolve();
      const observer = new MutationObserver(() => {
        if (ready()) {
          observer.disconnect();
          clearTimeout(timeout);
          resolve();
        }
      });
      observer.observe(document.getElementById("full-loader"), {
        attributes: true,
        attributeFilter: ["style"]
      });
      const timeout = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 2e4);
    });
  }
  window.kafakRecovery = {
    capture,
    completed() {
      storage.removeItem(receiptKey);
    },
    confirmed(data) {
      var _window$kafakOrderEdi;
      const last = read("kafak-business-last-order");
      const r = {
        orderid: data.orderid,
        name: data.name,
        accessToken: data.accessToken || ((_window$kafakOrderEdi = window.kafakOrderEditorUI) === null || _window$kafakOrderEdi === void 0 ? void 0 : _window$kafakOrderEdi.access(data.orderid)) || ((last === null || last === void 0 ? void 0 : last.orderid) === data.orderid ? last.accessToken : void 0),
        at: Date.now()
      };
      storage.setItem(receiptKey, JSON.stringify(r));
      storage.removeItem(draftKey);
    }
  };
  document.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(capture, 150);
  });
  document.addEventListener("change", capture);
  window.addEventListener("pagehide", capture);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) capture();
  });
  const original = window.showStep;
  window.showStep = function(...args) {
    const result = original.apply(this, args);
    queueMicrotask(capture);
    return result;
  };
  const initialDraft = read(draftKey);
  if (initialDraft) restoring = true;
  $(document).ready(async () => {
    const r = read(receiptKey);
    if (r && openReceipt(r)) {
      restoring = false;
      return;
    }
    if (!initialDraft) return;
    try {
      var _savedOrderData3;
      await waitForView();
      if (scope !== "new" && ((_savedOrderData3 = savedOrderData) === null || _savedOrderData3 === void 0 ? void 0 : _savedOrderData3.orderid) !== scope) return;
      await restore(initialDraft);
    } catch (e) {
      showAlert(e.message);
    } finally {
      restoring = false;
    }
  });
})();
