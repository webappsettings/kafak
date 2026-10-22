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
(function(scope) {
  "use strict";
  class BusinessOrder {
    constructor(api, storage, newId = () => crypto.randomUUID()) {
      this.api = api;
      this.storage = storage;
      this.newId = newId;
      this.quoteSerial = 0;
      this.currentQuote = null;
      this.pending = null;
      const saved = storage.getItem("kafak-business-pending-order");
      if (saved) {
        var _this$pending, _this$pending2;
        try {
          this.pending = JSON.parse(saved);
        } catch (_unused) {
          this.pendingError = "The saved submission cannot be read. Contact Kafak before submitting again.";
        }
        if (!((_this$pending = this.pending) !== null && _this$pending !== void 0 && _this$pending.requestId) || !((_this$pending2 = this.pending) !== null && _this$pending2 !== void 0 && _this$pending2.data)) {
          this.pendingError = "The saved submission is incomplete. Contact Kafak before submitting again.";
          this.pending = null;
        }
      }
    }
    async load() {
      const _await$Promise$all = await Promise.all([this.api.catalog(), this.api.settings()]), _await$Promise$all2 = _slicedToArray(_await$Promise$all, 2), products = _await$Promise$all2[0], settings = _await$Promise$all2[1];
      if (!Array.isArray(products) || !settings.contactPhone) throw new Error("The catalog is unavailable. Please retry.");
      this.products = products;
      this.settings = settings;
      return {
        products,
        settings
      };
    }
    async price(sku, state) {
      const serial = ++this.quoteSerial;
      this.currentQuote = null;
      if (!sku || !state.trim()) return null;
      const quote = await this.api.quote(sku, state);
      if (serial !== this.quoteSerial) return null;
      if (quote.sku !== sku || !Number.isFinite(quote.total)) throw new Error("The delivery price could not be verified.");
      this.currentQuote = {
        sku,
        state,
        quote
      };
      return quote;
    }
    async submit(fields) {
      var _this$storage$require, _this$storage;
      if (this.pendingError) throw Error(this.pendingError);
      if (this.pending) throw new Error("Confirm the previous submission using Retry before starting another order.");
      if (this.settings.acceptingOrders !== true) throw new Error("This preview is not accepting orders yet. Use the current order page.");
      const priced = this.currentQuote;
      if (!priced || priced.sku !== fields.sku || priced.state !== fields.state) throw new Error("Review the latest delivery total before submitting.");
      if (this.settings.stockStatus === "no" && fields.preorderConfirmed !== true) throw new Error("Confirm this pre-order before submitting.");
      this.pending = {
        requestId: this.newId(),
        data: _objectSpread(_objectSpread({}, fields), {}, {
          expectedTotal: priced.quote.total
        })
      };
      try {
        this.storage.setItem("kafak-business-pending-order", JSON.stringify(this.pending));
      } catch (e) {
        this.pending = null;
        throw new Error("Allow browser storage before submitting so a retry cannot duplicate your order.");
      }
      (_this$storage$require = (_this$storage = this.storage).requirePersistent) === null || _this$storage$require === void 0 || _this$storage$require.call(_this$storage);
      return this.retry();
    }
    async retry() {
      var _this$storage$require2, _this$storage2;
      if (!this.pending) throw new Error("There is no pending submission.");
      if (this.inFlight) return this.inFlight;
      const submission = this.pending;
      const mayAlreadyExist = submission.attempted === true;
      submission.attempted = true;
      this.storage.setItem("kafak-business-pending-order", JSON.stringify(submission));
      (_this$storage$require2 = (_this$storage2 = this.storage).requirePersistent) === null || _this$storage$require2 === void 0 || _this$storage$require2.call(_this$storage2);
      this.inFlight = this.api.submitOrder(submission.data, submission.requestId).then((result) => {
        if (result.result !== "success" || !result.orderid || !result.accessToken || !result.quote) throw Object.assign(new Error("The order response was incomplete. Retry to confirm the same order."), {
          uncertain: true
        });
        this.storage.setItem("kafak-business-last-order", JSON.stringify({
          orderid: result.orderid,
          accessToken: result.accessToken,
          shortCode: result.shortCode,
          name: submission.data.name
        }));
        this.storage.removeItem("kafak-business-pending-order");
        this.pending = null;
        return _objectSpread(_objectSpread({}, result), {}, {
          customer: submission.data
        });
      }).catch((error) => {
        if (!mayAlreadyExist && [400, 409, 422].includes(error.status)) {
          this.storage.removeItem("kafak-business-pending-order");
          this.pending = null;
          this.currentQuote = null;
        }
        throw error;
      }).finally(() => {
        this.inFlight = null;
      });
      return this.inFlight;
    }
    static contact(order) {
      const keys = {
        whatsapp: "whatsapp",
        phone: "phone",
        alt: "altphone",
        paid: "paidNum"
      };
      const meta = String(order.adminMeta || "").replace(/P?_\d+/g, "").trim();
      let type = /^[MWAGPSTR\s]*$/.test(meta) ? meta.includes("G") ? "paid" : meta.includes("M") ? "phone" : meta.includes("A") ? "alt" : meta.includes("W") ? "whatsapp" : null : null;
      if (!type && order.preferredWhatsAppNumber) {
        const normalized = (n) => String(n || "").replace(/\D/g, "").slice(-10);
        type = Object.keys(keys).find((k) => normalized(order[keys[k]]) === normalized(order.preferredWhatsAppNumber));
        if (!type) {
          order.paidNum = order.paidNum || order.preferredWhatsAppNumber;
          type = "paid";
        }
      }
      if (!type || !order[keys[type]]) type = order.whatsapp ? "whatsapp" : "phone";
      return {
        type,
        number: order[keys[type]] || order.whatsapp || order.phone || ""
      };
    }
    static async shareLink(page, order) {
      if (!/^[A-Za-z0-9_-]{22}$/.test(order.shortCode || "") && order.accessToken) {
        const response = await fetch("https://production.kafaklife.com/kafak-business/api/public/order?" + new URLSearchParams({
          oid: order.orderid
        }), {
          headers: {
            Authorization: "Bearer " + order.accessToken
          },
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Unable to prepare the secure link. Please retry.");
        const current = await response.json();
        if (!/^[A-Za-z0-9_-]{22}$/.test(current.shortCode || "")) throw new Error("Secure link unavailable. Please reload the order.");
        order.shortCode = current.shortCode;
      }
      return this.privateLink(page, order);
    }
    static privateLink(page, order) {
      if (/^[A-Za-z0-9_-]{22}$/.test(order.shortCode || "")) return new URL("/o/#" + order.shortCode, page).href;
      const url = new URL(page);
      url.search = "";
      url.searchParams.set("oid", order.orderid);
      url.hash = new URLSearchParams({
        access: order.accessToken
      }).toString();
      return url.href;
    }
    static whatsapp(settings, order, customer, link) {
      const phone = String(settings.contactPhone).replace(/\D/g, "");
      if (!/^\d{10,15}$/.test(phone)) throw new Error("The business WhatsApp number is not configured.");
      const q = order.quote;
      const message = ["NEW ORDER", order.orderid, customer.name, `${q.product} · ${q.variant} · ${q.quantity}`, `Product: ₹${q.productAmount}`, `Delivery: ₹${q.courierAmount}`, `Total: ₹${q.total}`, [customer.house, customer.place, customer.postoffice, customer.district, customer.state, customer.pincode].filter(Boolean).join(", "), `Phone: ${customer.phone}`, link].join("\n");
      return "https://wa.me/" + (phone.length === 10 ? "91" : "") + phone + "?text=" + encodeURIComponent(message);
    }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = BusinessOrder;
  else scope.KafakBusinessOrder = BusinessOrder;
})(typeof window === "undefined" ? globalThis : window);
