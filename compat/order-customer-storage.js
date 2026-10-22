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
(function(scope) {
  "use strict";
  const fields = ["name", "phone", "whatsapp", "altphone", "house", "place", "postoffice", "district", "state", "pincode", "quantity"];
  const parse = (storage, key, fallback) => {
    try {
      return JSON.parse(storage.getItem(key) || "null") || fallback;
    } catch (_unused) {
      return fallback;
    }
  };
  function links(storage) {
    return parse(storage, "kafak-customer-links", {});
  }
  function remember(storage, row) {
    var _map$row$orderid, _storage$requirePersi;
    if (!(row !== null && row !== void 0 && row.orderid)) return;
    const map = links(storage), key = String(row.phone || "").replace(/\D/g, "").slice(-10);
    map[row.orderid] = {
      orderid: row.orderid,
      phone: key,
      accessToken: row.accessToken || ((_map$row$orderid = map[row.orderid]) === null || _map$row$orderid === void 0 ? void 0 : _map$row$orderid.accessToken)
    };
    storage.setItem("kafak-customer-links", JSON.stringify(map));
    const last = parse(storage, "kafak-business-last-order", null);
    if ((last === null || last === void 0 ? void 0 : last.orderid) === row.orderid) storage.setItem("kafak-business-last-order", JSON.stringify(minimalReceipt(last)));
    (_storage$requirePersi = storage.requirePersistent) === null || _storage$requirePersi === void 0 || _storage$requirePersi.call(storage);
  }
  function retire(storage, row) {
    if (storage.getItem("kafakAdmin") === "true" || storage.getItem("kafak-business-edit:" + row.orderid) || storage.getItem("kafak-business-pending-order")) return false;
    const map = parse(storage, "kafakCustomerData", {});
    const entries = Object.entries(map).filter(([, old]) => (old === null || old === void 0 ? void 0 : old.orderid) === row.orderid);
    if (!entries.length) return false;
    if (entries.some(([, old]) => fields.some((f) => {
      var _row$f;
      return old[f] != null && String(old[f]).trim() !== String((_row$f = row[f]) !== null && _row$f !== void 0 ? _row$f : "").trim();
    }))) return false;
    remember(storage, _objectSpread(_objectSpread({}, row), {}, {
      accessToken: row.accessToken || entries[0][1].accessToken
    }));
    for (const _ref of entries) {
      var _ref2 = _slicedToArray(_ref, 1);
      const key = _ref2[0];
      delete map[key];
    }
    storage.setItem("kafakCustomerData", JSON.stringify(map));
    return true;
  }
  function minimalReceipt(row) {
    return {
      result: row.result,
      orderid: row.orderid,
      accessToken: row.accessToken,
      shortCode: row.shortCode,
      name: row.name
    };
  }
  function customerMap(storage) {
    const map = parse(storage, "kafakCustomerData", {}), result = {};
    for (const _ref3 of Object.entries(map)) {
      var _ref4 = _slicedToArray(_ref3, 2);
      const phone = _ref4[0];
      const row = _ref4[1];
      result[phone] = row !== null && row !== void 0 && row.orderid ? {
        phone,
        orderid: row.orderid,
        accessToken: row.accessToken
      } : row;
    }
    for (const row of Object.values(links(storage))) if (row.phone) result[row.phone] = row;
    return result;
  }
  function saveDraftMap(storage, incoming) {
    const map = parse(storage, "kafakCustomerData", {});
    for (const _ref5 of Object.entries(incoming)) {
      var _ref6 = _slicedToArray(_ref5, 2);
      const phone = _ref6[0];
      const row = _ref6[1];
      if (row !== null && row !== void 0 && row.orderid) remember(storage, row);
      else map[phone] = row;
    }
    storage.setItem("kafakCustomerData", JSON.stringify(map));
  }
  const api = {
    links,
    remember,
    retire,
    minimalReceipt,
    customerMap,
    saveDraftMap
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.KafakCustomerStorage = api;
})(typeof window === "undefined" ? globalThis : window);
