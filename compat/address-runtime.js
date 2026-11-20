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
  const marker = "(?:G[.\\s]*P[.\\s]*O|P[.\\s]*O|[BSH][.\\s]*O|POST[\\s.]+OFFICE)";
  const markerEnd = new RegExp("(?:^|[\\s,.(])" + marker + "[.\\s)]*$", "i");
  const markers = new RegExp("(^|[\\s,.(])" + marker + "(?=$|[\\s,.)])", "gi");
  const tidy = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").replace(/^[\s,;|]+|[\s,;|]+$/g, "").trim();
  const key = (value) => tidy(value).normalize("NFKC").toLowerCase().replace(/[\s.,;|()_\-/]+/g, "");
  function bare(value) {
    let text = tidy(value), before;
    do {
      before = text;
      text = tidy(text.replace(markerEnd, ""));
    } while (text !== before);
    return text;
  }
  function onlyOffice(value, officeKey) {
    const cleaned = key(String(value).replace(markers, " "));
    if (!cleaned || !officeKey || cleaned.length % officeKey.length) return false;
    return cleaned === officeKey.repeat(cleaned.length / officeKey.length);
  }
  function postOffice(value) {
    const original = tidy(value);
    if (!original) return "";
    const suffix = new RegExp("(?:^|[\\s,.(])G[.\\s]*P[.\\s]*O(?=$|[\\s,.)])", "i").test(original) ? "GPO" : "PO";
    const parts = original.split(/[,;|\n]+/).map(bare).filter(Boolean);
    let office = parts[0] || bare(original);
    const markedParts = original.split(new RegExp("(?:^|[\\s,.])" + marker + "(?=$|[\\s,.])", "gi")).map((v) => tidy(v.replace(/^[,;|]+|[,;|]+$/g, ""))).filter(Boolean);
    if (markedParts.length > 1 && markedParts.every((p) => key(p) === key(markedParts[0]))) office = bare(markedParts[0]);
    else if (parts.length > 1 && !parts.every((p) => onlyOffice(p, key(office)))) office = bare(original);
    const words = office.split(/\s+/);
    for (let size = 1; size <= Math.floor(words.length / 2); size++) {
      if (words.length % size === 0) {
        const candidate = words.slice(0, size).join(" ");
        if (onlyOffice(office, key(candidate))) {
          office = candidate;
          break;
        }
      }
    }
    return office ? office + " " + suffix : original;
  }
  const escapePattern = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function removeCopies(value, owners, prefix = false) {
    const targets = owners.map(tidy).filter(Boolean).sort((a, b) => b.length - a.length);
    const patterns = targets.map((target) => ({
      key: key(target),
      head: new RegExp("^" + escapePattern(target).split(/[\s.]+/).join("[\\s.]+") + "(?:[\\s,;|]+|$)", "i"),
      tail: new RegExp("(^|[\\s,;|])" + escapePattern(target).split(/[\s.]+/).join("[\\s.]+") + "[.\\s]*$", "i")
    }));
    const seen = /* @__PURE__ */ new Set();
    return String(value == null ? "" : value).split(/[,;|\n]+/).map((part) => {
      let result = tidy(part), before;
      do {
        before = result;
        for (const target of patterns) {
          if (key(result) === target.key) {
            result = "";
            break;
          }
          result = tidy(result.replace(target.tail, "$1"));
          if (prefix) result = tidy(result.replace(target.head, ""));
        }
      } while (result !== before && result);
      if (result !== tidy(part)) result = tidy(result.replace(/(?:^|\s)(?:N\/R|NEAR|NR|AT)\s*$/i, ""));
      if (!result || seen.has(key(result))) return "";
      seen.add(key(result));
      return result;
    }).filter(Boolean).join(", ");
  }
  function removeNumbers(value, input) {
    let text = String(value == null ? "" : value);
    const numbers = [...new Set([input.phone, input.whatsapp, input.altphone, input.paidNum].map((v) => String(v || "").replace(/\D/g, "")).filter((v) => v.length >= 8 && v.length <= 15))];
    for (let number of numbers) {
      if (number.length === 12 && number.startsWith("91")) number = number.slice(2);
      const digits = number.split("").join("[\\s().-]*");
      const country = number.length === 10 ? "(?:\\+?91[\\s().-]*)?" : "";
      const label = "(?:(?:PH(?:ONE)?|MOB(?:ILE)?|TEL|WHATSAPP|WA)[\\s:.-]*)?";
      text = text.replace(new RegExp("(^|[\\s,;|(:])" + label + country + digits + "(?=$|[^0-9])", "gi"), "$1");
    }
    const pin = String(input.pincode || "").trim();
    if (/^\d{6}$/.test(pin)) text = text.replace(new RegExp("(^|[\\s,;|(:])(?:(?:PIN(?:CODE|[\\s]+CODE)?)[\\s:.-]*)?" + pin + "(?=$|[\\s,;|.)])", "gi"), "$1");
    return text;
  }
  function normalize(input) {
    const owners = [input.district, input.state];
    const shared = (value) => removeCopies(removeNumbers(value, input), owners);
    const po = postOffice(shared(input.postoffice) || input.postoffice), name = bare(po), officeKey = key(name);
    if (!officeKey) {
      const house2 = shared(input.house);
      return _objectSpread(_objectSpread({}, input), {}, {
        house: house2,
        place: removeCopies(shared(input.place), [house2], true)
      });
    }
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped.split(/[\s.]+/).join("[\\s.]+");
    const marked = new RegExp("(^|[\\s,;|()])" + pattern + "[\\s,.]+" + marker + "(?=$|[\\s,;|.)])", "gi");
    const clean = (value) => String(value == null ? "" : value).split(/[,;|\n]+/).map((part) => {
      if (onlyOffice(part, officeKey)) return "";
      let result = part, before;
      do {
        before = result;
        result = result.replace(marked, "$1");
      } while (result !== before);
      if (result !== part) result = result.replace(/\(\s*\)/g, "").replace(/(?:^|\s)(?:N\/R|NEAR|NR|AT)\s*$/i, "");
      return tidy(result);
    }).filter(Boolean).join(", ");
    const house = removeCopies(shared(clean(shared(input.house))), [name]);
    const place = removeCopies(removeCopies(shared(clean(shared(input.place))), [name]), [house], true);
    return _objectSpread(_objectSpread({}, input), {}, {
      house,
      place,
      postoffice: po
    });
  }
  const api = {
    normalize,
    postOffice
  };
  scope.KafakAddress = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
