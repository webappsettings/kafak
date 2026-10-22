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
  function legacy(row) {
    var _row$Status, _row$timestamp, _row$Grand_Total, _row$grandTotal, _row$Product_Amount, _row$Courier_Charge, _ref, _row$DispatchedDate, _ref2, _row$DeliveredDate, _row$courier;
    return _objectSpread(_objectSpread({}, row), {}, {
      Status: (_row$Status = row.Status) !== null && _row$Status !== void 0 ? _row$Status : row.status,
      timestamp: (_row$timestamp = row.timestamp) !== null && _row$timestamp !== void 0 ? _row$timestamp : row.date,
      Grand_Total: (_row$Grand_Total = row.Grand_Total) !== null && _row$Grand_Total !== void 0 ? _row$Grand_Total : row.total,
      grandTotal: (_row$grandTotal = row.grandTotal) !== null && _row$grandTotal !== void 0 ? _row$grandTotal : row.total,
      Product_Amount: (_row$Product_Amount = row.Product_Amount) !== null && _row$Product_Amount !== void 0 ? _row$Product_Amount : row.productAmount,
      Courier_Charge: (_row$Courier_Charge = row.Courier_Charge) !== null && _row$Courier_Charge !== void 0 ? _row$Courier_Charge : row.courierAmount,
      paidDate: row.paidDate || "",
      "Dispatched Date": (_ref = (_row$DispatchedDate = row["Dispatched Date"]) !== null && _row$DispatchedDate !== void 0 ? _row$DispatchedDate : row.dispatchedDate) !== null && _ref !== void 0 ? _ref : "",
      "Delivered Date": (_ref2 = (_row$DeliveredDate = row["Delivered Date"]) !== null && _row$DeliveredDate !== void 0 ? _row$DeliveredDate : row.deliveredDate) !== null && _ref2 !== void 0 ? _ref2 : "",
      courier: (_row$courier = row.courier) !== null && _row$courier !== void 0 ? _row$courier : row.provider
    });
  }
  class OrderEditor {
    constructor(api, storage, newId = () => crypto.randomUUID()) {
      this.api = api;
      this.storage = storage;
      this.newId = newId;
      this.current = null;
      this.generation = 0;
    }
    async load(id, {
      admin = false,
      token
    } = {}) {
      const generation = ++this.generation;
      const response = admin ? await this.api.order(id) : await this.api.ownOrder(id, token);
      const row = legacy(admin ? response.data : response);
      if (row.orderid !== id || !Number.isSafeInteger(row.version)) throw Error("The current order version could not be verified.");
      if (generation !== this.generation) return null;
      this.current = row;
      this.admin = admin;
      this.token = token;
      return row;
    }
    async save(input, {
      sku,
      expectedTotal,
      provider,
      increasePaid = false
    } = {}) {
      var _this$storage$require, _this$storage;
      if (!this.current) throw Error("Reload this order before saving.");
      const current = this.current, admin = this.admin, token = this.token;
      const data = Object.fromEntries(fields.filter((f) => Object.hasOwn(input, f)).map((f) => {
        var _input$f;
        return [f, String((_input$f = input[f]) !== null && _input$f !== void 0 ? _input$f : "").trim()];
      }));
      if (admin) for (const field of ["adminMeta", "paidNum"]) {
        var _input$field;
        if (Object.hasOwn(input, field)) data[field] = String((_input$field = input[field]) !== null && _input$field !== void 0 ? _input$field : "");
      }
      if (sku) {
        data.sku = sku;
        if (expectedTotal !== void 0) data.expectedTotal = expectedTotal;
      }
      if (provider !== void 0) {
        if (!admin) throw Error("Only the business can change the delivery provider.");
        data.provider = provider;
      }
      const payload = {
        version: current.version,
        data
      }, key = "kafak-business-edit:" + current.orderid;
      const fingerprint = JSON.stringify({
        admin,
        data
      });
      let pending;
      try {
        pending = JSON.parse(this.storage.getItem(key) || "null");
      } catch (_unused) {
        throw Error("The pending edit cannot be read. Resolve it before changing this order.");
      }
      if (pending && pending.fingerprint !== fingerprint) throw Error("Confirm the previous edit before changing it.");
      if (!pending && !admin && !["Pending", "Sent"].includes(current.Status)) throw Error("Contact the business to change an order after payment or dispatch.");
      if (!pending) {
        if (increasePaid) {
          if (!admin) throw Error("Only the business can adjust a paid order");
          payload.data.expectedPreviousTotal = current.Grand_Total;
        }
        pending = {
          requestId: this.newId(),
          fingerprint,
          payload,
          action: increasePaid ? "increasePaidOrder" : "editOrder"
        };
        this.storage.setItem(key, JSON.stringify(pending));
      }
      if (this.inflight) {
        if (this.inflight.key !== key) throw Error("Another order edit is being saved.");
        return this.inflight.promise;
      }
      const mayAlreadyExist = pending.attempted === true;
      pending.attempted = true;
      this.storage.setItem(key, JSON.stringify(pending));
      (_this$storage$require = (_this$storage = this.storage).requirePersistent) === null || _this$storage$require === void 0 || _this$storage$require.call(_this$storage);
      const request = admin ? this.api.adminAction(_objectSpread({
        action: pending.action || "editOrder",
        oid: current.orderid
      }, pending.payload), pending.requestId) : this.api.editOwnOrder(current.orderid, token, pending.payload, pending.requestId);
      const promise = request.then((result) => {
        var _this$current, _this$current2;
        if (result.result !== "success") throw Error("The order edit was not confirmed.");
        const row = legacy(admin ? _objectSpread(_objectSpread({}, result.orderData), {}, {
          shortCode: result.orderData.shortCode || current.shortCode,
          accessToken: result.orderData.accessToken || current.accessToken,
          version: result.version
        }) : result.order);
        if (row.orderid !== current.orderid || !Number.isSafeInteger(row.version)) throw Error("The edited order response was incomplete. Retry the same edit.");
        const latest = ((_this$current = this.current) === null || _this$current === void 0 ? void 0 : _this$current.orderid) === row.orderid && this.current.version > row.version ? this.current : row;
        this.storage.setItem("kafak-business-edited-order", JSON.stringify({
          orderid: latest.orderid,
          version: latest.version
        }));
        this.storage.removeItem(key);
        if (((_this$current2 = this.current) === null || _this$current2 === void 0 ? void 0 : _this$current2.orderid) === row.orderid) this.current = latest;
        return latest;
      }).catch((error) => {
        if (!mayAlreadyExist && [400, 409, 422].includes(error.status)) this.storage.removeItem(key);
        throw error;
      }).finally(() => {
        this.inflight = null;
      });
      this.inflight = {
        key,
        promise
      };
      return promise;
    }
  }
  OrderEditor.legacy = legacy;
  if (typeof module !== "undefined" && module.exports) module.exports = OrderEditor;
  else scope.KafakBusinessOrderEditor = OrderEditor;
})(typeof window === "undefined" ? globalThis : window);
