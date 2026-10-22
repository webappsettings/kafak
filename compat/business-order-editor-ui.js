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
  const api = new KafakBusinessApi(), editor = new KafakBusinessOrderEditor(api, storage);
  function access(id) {
    var _editor$recoveredAcce, _last, _savedOrderData, _window$KafakCustomer, _Object$values$find;
    if (((_editor$recoveredAcce = editor.recoveredAccess) === null || _editor$recoveredAcce === void 0 ? void 0 : _editor$recoveredAcce.orderid) === id) return editor.recoveredAccess.accessToken;
    const fromHash = new URLSearchParams(location.hash.slice(1)).get("access");
    if (new URLSearchParams(location.search).get("oid") === id && /^[A-Za-z0-9_-]{43}$/.test(fromHash || "")) return fromHash;
    let last;
    try {
      last = JSON.parse(storage.getItem("kafak-business-last-order") || "null");
    } catch (_unused) {
    }
    if (((_last = last) === null || _last === void 0 ? void 0 : _last.orderid) === id && last.accessToken) return last.accessToken;
    if (typeof savedOrderData === "object" && ((_savedOrderData = savedOrderData) === null || _savedOrderData === void 0 ? void 0 : _savedOrderData.orderid) === id && savedOrderData.accessToken) return savedOrderData.accessToken;
    const link = (_window$KafakCustomer = window.KafakCustomerStorage) === null || _window$KafakCustomer === void 0 ? void 0 : _window$KafakCustomer.links(storage)[id];
    if (link !== null && link !== void 0 && link.accessToken) return link.accessToken;
    if (typeof localUsersMap === "object") return (_Object$values$find = Object.values(localUsersMap).find((row) => (row === null || row === void 0 ? void 0 : row.orderid) === id && row.accessToken)) === null || _Object$values$find === void 0 ? void 0 : _Object$values$find.accessToken;
    return void 0;
  }
  function confirmed(row) {
    try {
      if (storage.getItem("kafakAdmin") !== "true") {
        var _window$KafakCustomer2, _window$KafakCustomer3;
        (_window$KafakCustomer2 = window.KafakCustomerStorage) === null || _window$KafakCustomer2 === void 0 || _window$KafakCustomer2.remember(storage, _objectSpread(_objectSpread({}, row), {}, {
          accessToken: access(row.orderid) || row.accessToken
        }));
        (_window$KafakCustomer3 = window.KafakCustomerStorage) === null || _window$KafakCustomer3 === void 0 || _window$KafakCustomer3.retire(storage, row);
      }
    } catch (_unused2) {
    }
    return _objectSpread(_objectSpread({}, row), {}, {
      accessToken: access(row.orderid) || row.accessToken,
      quote: {
        sku: row.sku,
        product: row.product,
        variant: row.variant,
        quantity: Number(row.quantity),
        productAmount: Number(row.Product_Amount),
        courierAmount: Number(row.Courier_Charge),
        total: Number(row.Grand_Total)
      }
    });
  }
  window.kafakOrderEditorUI = {
    editor,
    access,
    async recover(id, phone) {
      const result = await api.request("/public/order-recovery", {
        method: "POST",
        data: {
          oid: id,
          phone
        }
      });
      if (result.orderid !== id || !/^[A-Za-z0-9_-]{43}$/.test(result.accessToken || "")) throw Error("Unable to open the order. Please retry.");
      editor.recoveredAccess = {
        orderid: id,
        accessToken: result.accessToken
      };
      try {
        var _window$KafakCustomer4;
        (_window$KafakCustomer4 = window.KafakCustomerStorage) === null || _window$KafakCustomer4 === void 0 || _window$KafakCustomer4.remember(storage, _objectSpread(_objectSpread({}, result), {}, {
          phone
        }));
      } catch (_unused3) {
      }
      return result;
    },
    async track(article) {
      var _editor$current, _savedOrderData2;
      if (storage.getItem("kafakAdmin") === "true") return api.request("/admin/parcel-tracking?" + new URLSearchParams({
        trackingId: article
      }));
      const id = ((_editor$current = editor.current) === null || _editor$current === void 0 ? void 0 : _editor$current.orderid) || (typeof savedOrderData === "object" ? (_savedOrderData2 = savedOrderData) === null || _savedOrderData2 === void 0 ? void 0 : _savedOrderData2.orderid : null);
      if (!id) throw Error("Open your saved order to track the parcel.");
      return api.request("/public/parcel-tracking?" + new URLSearchParams({
        oid: id
      }), {
        accessToken: access(id)
      });
    },
    async delivered(id) {
      const key = "kafak-business-delivery:" + id;
      let requestId = storage.getItem(key);
      if (!requestId) {
        requestId = crypto.randomUUID();
        storage.setItem(key, requestId);
      }
      const result = storage.getItem("kafakAdmin") === "true" ? await api.adminAction({
        action: "bulkUpdateStatus",
        updates: [{
          oid: id,
          status: "Delivered"
        }]
      }, requestId) : await api.mutation("/public/order-delivered?" + new URLSearchParams({
        oid: id
      }), {}, requestId, {
        accessToken: access(id)
      });
      if (result.result !== "success") throw Error("Delivery update was not confirmed");
      storage.removeItem(key);
      return result;
    },
    async customer(phone) {
      var _last2, _window$KafakCustomer5, _last3;
      const normalized = String(phone || "").replace(/\D/g, "").slice(-10);
      if (storage.getItem("kafakAdmin") === "true") {
        try {
          var _response$data;
          const response = await api.customer(normalized);
          if ((_response$data = response.data) !== null && _response$data !== void 0 && _response$data.orderid) {
            const row = await editor.load(response.data.orderid, {
              admin: true
            });
            if (row) response.data = _objectSpread(_objectSpread({}, response.data), confirmed(row));
          }
          return response;
        } catch (error) {
          if (error.status !== 401) throw error;
          storage.removeItem("kafakAdmin");
        }
      }
      let last;
      try {
        last = JSON.parse(storage.getItem("kafak-business-last-order") || "null");
      } catch (_unused4) {
      }
      const remembered = typeof localUsersMap === "object" ? localUsersMap[normalized] : null;
      if (remembered !== null && remembered !== void 0 && remembered.orderid) last = remembered;
      if (!((_last2 = last) !== null && _last2 !== void 0 && _last2.orderid)) last = Object.values(((_window$KafakCustomer5 = window.KafakCustomerStorage) === null || _window$KafakCustomer5 === void 0 ? void 0 : _window$KafakCustomer5.links(storage)) || {}).find((row) => row.phone === normalized);
      if ((_last3 = last) !== null && _last3 !== void 0 && _last3.orderid) {
        try {
          const row = await editor.load(last.orderid, {
            token: last.accessToken
          });
          if (row && String(row.phone || "").replace(/\D/g, "").slice(-10) === normalized) return {
            result: "success",
            data: _objectSpread(_objectSpread({}, confirmed(row)), {}, {
              authorized: true
            })
          };
        } catch (error) {
          if (![401, 404].includes(error.status)) throw error;
        }
      }
      return {
        result: "success",
        data: {
          phone: normalized,
          authorized: false
        }
      };
    },
    async latestCustomer(id) {
      return confirmed(KafakBusinessOrderEditor.legacy(await api.ownOrder(id, access(id))));
    },
    async read(id) {
      const token = access(id), admin = storage.getItem("kafakAdmin") === "true";
      let row;
      if (admin) {
        try {
          row = await editor.load(id, {
            admin: true
          });
        } catch (error) {
          if (error.status !== 401) throw error;
          storage.removeItem("kafakAdmin");
          row = await editor.load(id, {
            token
          });
        }
      } else row = await editor.load(id, {
        token
      });
      return row ? {
        result: "success",
        data: confirmed(row)
      } : null;
    },
    async retrySaved(id) {
      const pending = JSON.parse(storage.getItem("kafak-business-edit:" + id) || "null");
      if (!pending) throw Error("No saved edit is waiting.");
      await editor.load(id, {
        admin: storage.getItem("kafakAdmin") === "true",
        token: access(id)
      });
      const d = pending.payload.data;
      return confirmed(await editor.save(d, {
        sku: d.sku,
        expectedTotal: d.expectedTotal,
        provider: d.provider,
        increasePaid: pending.action === "increasePaidOrder"
      }));
    },
    async save(data, {
      increasePaid = false
    } = {}) {
      var _editor$current2, _editor$current3, _document$querySelect, _window$kafakCheckout, _document$dispatchEve, _document;
      if (((_editor$current2 = editor.current) === null || _editor$current2 === void 0 ? void 0 : _editor$current2.orderid) !== data.orderid) {
        const shown = typeof savedOrderData === "object" ? savedOrderData : null;
        if (!data.orderid || (shown === null || shown === void 0 ? void 0 : shown.orderid) !== data.orderid || !Number.isSafeInteger(shown.version)) throw Error("Refresh the order status before saving changes.");
        const row2 = await editor.load(data.orderid, {
          admin: storage.getItem("kafakAdmin") === "true",
          token: access(data.orderid)
        });
        if (!row2 || row2.version !== shown.version) throw Error("This order changed. Refresh its status before saving.");
      }
      if ((_editor$current3 = editor.current) !== null && _editor$current3 !== void 0 && _editor$current3.readOnly) throw Error("Please contact Kafak to change this order.");
      let sku = (_document$querySelect = document.querySelector("#quick-qty")) === null || _document$querySelect === void 0 || (_document$querySelect = _document$querySelect.selectedOptions[0]) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.dataset.sku;
      const current = editor.current;
      const sameSavedPack = (!current.sku || sku === current.sku) && Number(data.quantity) === Number(current.quantity) && !((_window$kafakCheckout = window.kafakCheckoutUI) !== null && _window$kafakCheckout !== void 0 && _window$kafakCheckout.productChanged);
      if (sameSavedPack && data.state === current.state) sku = void 0;
      if (!sku && Number(data.quantity) !== Number(editor.current.quantity)) throw Error("Select an available product and quantity.");
      let expectedTotal;
      if (sku) {
        var _window$kafakCheckout2;
        const priced = (_window$kafakCheckout2 = window.kafakCheckoutUI) === null || _window$kafakCheckout2 === void 0 ? void 0 : _window$kafakCheckout2.checkout.priced;
        if (!priced || priced.sku !== sku || priced.state !== data.state) throw Error("Wait for the current delivery total before saving.");
        expectedTotal = priced.quote.total;
      }
      const row = confirmed(await editor.save(data, {
        sku,
        expectedTotal,
        increasePaid
      }));
      (_document$dispatchEve = (_document = document).dispatchEvent) === null || _document$dispatchEve === void 0 || _document$dispatchEve.call(_document, new Event("kafak-order-saved"));
      return {
        res: {
          result: "success",
          orderid: row.orderid,
          timestamp: row.timestamp
        },
        data: row
      };
    }
  };
})();
