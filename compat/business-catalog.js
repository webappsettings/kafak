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
  class BusinessCatalog {
    constructor(api) {
      this.api = api;
      this.products = [];
      this.families = [];
      this.selected = null;
      this.quote = null;
      this.serial = 0;
    }
    async load() {
      const products = await this.api.catalog();
      if (!Array.isArray(products) || !products.length) throw Error("No active products are configured.");
      const groups = /* @__PURE__ */ new Map();
      for (const product of products) {
        if (!product.sku || !Number.isSafeInteger(Number(product.units)) || Number(product.units) < 1 || !Number.isFinite(Number(product.price))) throw Error("The product catalog contains an invalid variant.");
        const key = JSON.stringify([product.name, product.category, product.variant, product.packGrams, product.unit, product.packSize, product.size, product.colour]);
        if (!groups.has(key)) groups.set(key, {
          id: product.sku,
          name: product.name,
          label: [product.displayName || product.name, product.variant, product.packGrams ? product.packGrams + " g" : product.packSize, product.size, product.colour].filter(Boolean).join(" · "),
          products: []
        });
        const family = groups.get(key);
        if (family.products.some((p) => Number(p.units) === Number(product.units))) throw Error("Product quantities are ambiguous. Correct the catalog before ordering.");
        family.products.push(product);
      }
      this.products = products;
      this.families = [...groups.values()];
      for (const family of this.families) family.products.sort((a, b) => Number(a.units) - Number(b.units));
      this.selected = this.families.find((f) => {
        var _this$selected;
        return f.id === ((_this$selected = this.selected) === null || _this$selected === void 0 ? void 0 : _this$selected.id);
      }) || this.families[0];
      this.quote = null;
      this.serial++;
      return this.families;
    }
    select(sku) {
      const family = this.families.find((f) => f.products.some((p) => p.sku === sku));
      if (!family) throw Error("Select an available product.");
      this.selected = family;
      this.quote = null;
      this.serial++;
      return family;
    }
    variant(quantity) {
      var _this$selected2;
      const product = (_this$selected2 = this.selected) === null || _this$selected2 === void 0 ? void 0 : _this$selected2.products.find((p) => Number(p.units) === Number(quantity));
      if (!product) throw Error("Select an available quantity.");
      return product;
    }
    async price(quantity, state, provider) {
      const product = this.variant(quantity), serial = ++this.serial;
      this.quote = null;
      if (!String(state || "").trim()) throw Error("Select a delivery state.");
      const quote = await this.api.quote(product.sku, state, provider);
      if (serial !== this.serial) return null;
      if (quote.sku !== product.sku || !Number.isFinite(quote.total) || quote.total < 0) throw Error("The server quote could not be verified.");
      this.quote = _objectSpread(_objectSpread({}, quote), {}, {
        state,
        requestedProvider: provider || ""
      });
      return this.quote;
    }
    order(fields, quantity, state, provider) {
      const product = this.variant(quantity), quote = this.quote;
      if (!quote || quote.sku !== product.sku || quote.state !== state || quote.requestedProvider !== (provider || "")) throw Error("Review the latest delivery quote before saving.");
      return _objectSpread(_objectSpread({}, fields), {}, {
        sku: product.sku,
        product: product.name,
        quantity: Number(product.units),
        state,
        provider: provider || void 0,
        expectedTotal: quote.total
      });
    }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = BusinessCatalog;
  else scope.KafakBusinessCatalog = BusinessCatalog;
})(typeof window === "undefined" ? globalThis : window);
