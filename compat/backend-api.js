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
  class BusinessApi {
    constructor(base = "https://production.kafaklife.com/kafak-business/api", fetcher = (...args) => globalThis.fetch(...args)) {
      this.base = base.replace(/\/$/, "");
      this.fetcher = fetcher;
      this.pending = /* @__PURE__ */ new Map();
    }
    async request(path, {
      method = "GET",
      data,
      requestId,
      accessToken,
      signal,
      timeout = 2e4
    } = {}) {
      const controller = new AbortController();
      const abort = () => controller.abort(signal.reason);
      if (signal !== null && signal !== void 0 && signal.aborted) abort();
      else signal === null || signal === void 0 || signal.addEventListener("abort", abort, {
        once: true
      });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeout);
      try {
        const headers = {
          Accept: "application/json"
        };
        if (data !== void 0) headers["Content-Type"] = "application/json";
        if (requestId) headers["Idempotency-Key"] = requestId;
        if (accessToken) headers.Authorization = "Bearer " + accessToken;
        const response = await this.fetcher(this.base + path, _objectSpread({
          method,
          headers,
          credentials: "include",
          signal: controller.signal
        }, data === void 0 ? {} : {
          body: JSON.stringify(data)
        }));
        let body;
        try {
          body = await response.json();
        } catch (_unused) {
          throw Object.assign(new Error("The server response could not be confirmed. Keep this request and retry."), {
            uncertain: method !== "GET"
          });
        }
        if (!response.ok) throw Object.assign(new Error(body.error || body.message || "Request failed"), {
          status: response.status,
          uncertain: response.status >= 500 && method !== "GET"
        });
        return body;
      } catch (error) {
        if (timedOut) throw Object.assign(new Error("The server is taking too long to respond. Please try again shortly."), {
          uncertain: method !== "GET"
        });
        if (error.name === "AbortError" || error.name === "TimeoutError" || error instanceof TypeError) error.uncertain = method !== "GET";
        throw error;
      } finally {
        clearTimeout(timer);
        signal === null || signal === void 0 || signal.removeEventListener("abort", abort);
      }
    }
    catalog() {
      return this.request("/public/catalog");
    }
    settings() {
      return this.request("/public/settings");
    }
    quote(sku, state, provider) {
      const query = new URLSearchParams({
        sku,
        state
      });
      if (provider) query.set("provider", provider);
      return this.request("/public/quote?" + query);
    }
    login(username, password) {
      return this.request("/login", {
        method: "POST",
        data: {
          username,
          password
        }
      });
    }
    me() {
      return this.request("/me?optional=1").then((user) => {
        if (user.authenticated === false) throw Object.assign(new Error("Sign in required"), {
          status: 401
        });
        return user;
      });
    }
    logout() {
      return this.request("/logout", {
        method: "POST",
        data: {}
      });
    }
    orders({
      before,
      q,
      status,
      view = "history"
    } = {}) {
      const query = new URLSearchParams({
        view,
        limit: "50"
      });
      for (const _ref of Object.entries({
        before,
        q,
        status
      })) {
        var _ref2 = _slicedToArray(_ref, 2);
        const key = _ref2[0];
        const value = _ref2[1];
        if (value) query.set(key, value);
      }
      return this.request("/admin/orders?" + query);
    }
    feed() {
      return this.request("/admin/feed");
    }
    today() {
      return this.request("/admin/orders/today");
    }
    order(id) {
      return this.request("/admin/order?" + new URLSearchParams({
        oid: id
      }));
    }
    customer(phone) {
      return this.request("/admin/customer?" + new URLSearchParams({
        phone
      }));
    }
    courierSettings() {
      return this.request("/admin/courier-settings");
    }
    ownOrder(id, accessToken) {
      return this.request("/public/order?" + new URLSearchParams({
        oid: id
      }), {
        accessToken
      });
    }
    mutation(path, data, requestId, {
      accessToken
    } = {}) {
      if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(requestId || "")) return Promise.reject(new Error("Keep a request ID with this draft before submitting."));
      const fingerprint = JSON.stringify({
        path,
        data,
        accessToken
      });
      const existing = this.pending.get(requestId);
      if (existing) return existing.fingerprint === fingerprint ? existing.promise : Promise.reject(new Error("This request ID is already submitting different data."));
      const promise = this.request(path, {
        method: "POST",
        data,
        requestId,
        accessToken
      }).finally(() => this.pending.delete(requestId));
      this.pending.set(requestId, {
        fingerprint,
        promise
      });
      return promise;
    }
    submitOrder(data, requestId) {
      if (!data.sku || data.expectedTotal == null || !Number.isFinite(Number(data.expectedTotal)) || data.expectedTotal === "" || Number(data.expectedTotal) < 0) return Promise.reject(new Error("Review the product and delivery quote before submitting."));
      return this.mutation("/public/orders", data, requestId);
    }
    adminAction(data, requestId, {
      preview = false
    } = {}) {
      return this.mutation(preview ? "/admin/preview" : "/admin/action", data, requestId);
    }
    createAdminOrder(data, requestId, {
      preview = false
    } = {}) {
      return this.mutation(preview ? "/admin/create-preview" : "/admin/orders", data, requestId);
    }
    editOwnOrder(id, accessToken, data, requestId) {
      return this.mutation("/public/order?" + new URLSearchParams({
        oid: id
      }), data, requestId, {
        accessToken
      });
    }
    uploadReceipt(file) {
      return this.request("/drive-upload", {
        method: "POST",
        data: file,
        timeout: 65e3
      });
    }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = BusinessApi;
  else scope.KafakBusinessApi = BusinessApi;
})(typeof window === "undefined" ? globalThis : window);
