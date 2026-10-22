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
(function(scope) {
  "use strict";
  const fields = ["name", "phone", "house", "place", "postoffice", "pincode", "district", "state", "whatsapp", "altphone", "message", "language"];
  class Checkout {
    constructor(api, Order, storage) {
      this.api = api;
      this.order = new Order(api, storage);
      this.products = [];
      this.serial = 0;
      this.priced = null;
    }
    async load() {
      const result = await this.order.load();
      this.products = result.products;
      this.settings = result.settings;
      return result;
    }
    product(sku) {
      const p = this.products.find((p2) => p2.sku === sku);
      if (!p) throw Error("Select an available product and quantity.");
      return p;
    }
    async price(sku, state) {
      this.product(sku);
      const serial = ++this.serial;
      this.priced = null;
      const q = await this.order.price(sku, state);
      if (serial !== this.serial || !q) return null;
      this.priced = {
        sku,
        state,
        quote: q
      };
      return q;
    }
    async submit(input, sku) {
      var _result$quote$offer, _result$quote$offer2, _result$quote$offer3;
      if (input.orderid) throw Error("Use the existing-order edit workflow; do not create a duplicate.");
      const product = this.product(sku), priced = this.priced;
      if (!priced || priced.sku !== sku || priced.state !== input.state) throw Error("Wait for the current delivery total before submitting.");
      const data = Object.fromEntries(fields.map((f) => {
        var _input$f;
        return [f, String((_input$f = input[f]) !== null && _input$f !== void 0 ? _input$f : "").trim()];
      }));
      data.sku = sku;
      data.preorderConfirmed = input.preorderConfirmed === true;
      if (this.order.pending) {
        const expected = _objectSpread(_objectSpread({}, data), {}, {
          expectedTotal: priced.quote.total
        });
        if (JSON.stringify(expected) !== JSON.stringify(this.order.pending.data)) throw Error("A previous order is awaiting confirmation. Restore that draft and retry before changing it.");
      }
      const result = this.order.pending ? await this.order.retry() : await this.order.submit(data);
      return _objectSpread(_objectSpread({}, result), {}, {
        legacy: _objectSpread(_objectSpread({}, data), {}, {
          orderid: result.orderid,
          timestamp: result.timestamp,
          accessToken: result.accessToken,
          shortCode: result.shortCode,
          quantity: product.units,
          sku,
          product: result.quote.product,
          variant: result.quote.variant,
          Product_List_Amount: result.quote.productListAmount,
          Discount_Amount: result.quote.discountAmount,
          "Offer Type": ((_result$quote$offer = result.quote.offer) === null || _result$quote$offer === void 0 ? void 0 : _result$quote$offer.type) || "",
          "Offer Value": (_result$quote$offer2 = result.quote.offer) === null || _result$quote$offer2 === void 0 ? void 0 : _result$quote$offer2.value,
          "Offer Duration": ((_result$quote$offer3 = result.quote.offer) === null || _result$quote$offer3 === void 0 ? void 0 : _result$quote$offer3.duration) || "",
          Product_Amount: result.quote.productAmount,
          Courier_Charge: result.quote.courierAmount,
          Grand_Total: result.quote.total,
          quote: result.quote,
          Status: "Pending"
        })
      });
    }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = Checkout;
  else scope.KafakBusinessCheckout = Checkout;
})(typeof window === "undefined" ? globalThis : window);
