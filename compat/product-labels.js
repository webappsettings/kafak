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
  const types = {
    W650: {
      name: "Wild Honey 650g",
      image: "label_design.jpg",
      mrp: "750.00",
      batch: "",
      width: 210,
      height: 59.4
    },
    C650: {
      name: "Cheruthen 650g",
      image: "label-cheruthen-650.jpg",
      mrp: "2200.00",
      batch: "HN26LY02",
      width: 210,
      height: 59.4
    },
    C300: {
      name: "Cheruthen 300g",
      image: "label-cheruthen-300.jpg",
      mrp: "1020.00",
      batch: "HN26LY02",
      width: 148.5,
      height: 700 * 25.4 / 300
    }
  };
  const escape = (v) => String(v !== null && v !== void 0 ? v : "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
  const date = () => {
    const d = /* @__PURE__ */ new Date();
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    }).format(d);
  };
  function items(order) {
    var _order$items, _order$Order_Items;
    const rows = (_order$items = order.items) !== null && _order$items !== void 0 && _order$items.length ? order.items : (_order$Order_Items = order.Order_Items) !== null && _order$Order_Items !== void 0 && _order$Order_Items.length ? order.Order_Items : [{
      product: order.product || order.Product || "Vanthen",
      packGrams: order["Pack Grams"] || (/300/.test(order.variant || order.Variant || order.sku || "") ? 300 : 650),
      quantity: order.quantity || order.Quantity
    }];
    const result = {
      W650: 0,
      C650: 0,
      C300: 0
    };
    for (const r of rows) {
      const name = String(r.product || "").trim().toLowerCase(), grams = Number(r.packGrams), key = name === "cheruthen" ? grams === 300 ? "C300" : grams === 650 ? "C650" : null : name === "vanthen" && grams === 650 ? "W650" : null;
      if (!key) throw Error("Review the label for " + (r.product || "unknown product") + " " + grams + "g before printing.");
      const q = Number(r.quantity);
      if (!Number.isSafeInteger(q) || q < 1) throw Error("Invalid bottle quantity");
      result[key] += q;
    }
    return result;
  }
  function printed(meta) {
    const result = {
      W650: 0,
      C650: 0,
      C300: 0
    };
    for (const m of String(meta || "").matchAll(/\blb(w650|c650|c300)_(\d+)\b/g)) result[m[1].toUpperCase()] = Math.max(result[m[1].toUpperCase()], Number(m[2]));
    return result;
  }
  function demand(orders2, pending2 = []) {
    const edits = new Map(pending2.filter((u) => u.action === "meta" && u.meta !== void 0).map((u) => [u.oid, u.meta])), statuses = new Map(pending2.filter((u) => u.status && (!u.action || u.action === "status")).map((u) => [u.oid, u.status])), counts = {
      W650: 0,
      C650: 0,
      C300: 0
    };
    let paid = 0, done = 0;
    const allocations = [];
    for (const o of orders2) {
      var _ref, _ref2, _edits$get;
      if (String(statuses.get(o.orderid) || o.Status || o.status).toLowerCase() !== "paid") continue;
      const current = items(o), meta = String((_ref = (_ref2 = (_edits$get = edits.get(o.orderid)) !== null && _edits$get !== void 0 ? _edits$get : o.adminMeta) !== null && _ref2 !== void 0 ? _ref2 : o["Admin Meta"]) !== null && _ref !== void 0 ? _ref : ""), used = printed(meta), need = {};
      for (const k of Object.keys(types)) {
        paid += current[k];
        done += Math.min(current[k], used[k]);
        need[k] = Math.max(0, current[k] - used[k]);
        counts[k] += need[k];
      }
      if (Object.values(need).some(Boolean)) allocations.push({
        oid: o.orderid,
        meta,
        current,
        need
      });
    }
    return {
      counts,
      paid,
      printed: done,
      allocations,
      total: Object.values(counts).reduce((a, b) => a + b, 0)
    };
  }
  const capacity = [7, 5, 4, 2, 1, 0];
  function paginate(labels, limit) {
    if (limit) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 7) throw Error("Select 1–7 labels per page");
      const result = [];
      for (let n = 0; n < labels.length; n += limit) result.push(...paginate(labels.slice(n, n + limit)));
      return result;
    }
    const large = [...labels.filter((l) => l.type === "W650"), ...labels.filter((l) => l.type !== "W650" && l.type !== "C300")], small = labels.filter((l) => l.type === "C300"), pages = [];
    while (large.length) {
      const row = large.splice(0, 5);
      pages.push({
        large: row,
        small: small.splice(0, capacity[row.length])
      });
    }
    while (small.length) pages.push({
      large: [],
      small: small.splice(0, 7)
    });
    return pages;
  }
  function labelHtml(label2) {
    const t = types[label2.type], small = label2.type === "C300";
    return `<div class="label-art ${small ? "small-label" : ""}" data-type="${label2.type}"><img src="${escape(label2.image || t.image)}" alt="${escape(t.name)}"><div class="label-values"><div>${escape(label2.mrp)}</div><div>${escape(label2.batch)}</div><div>${escape(label2.date)}</div></div></div>`;
  }
  const css = `@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0;background:white;font-family:Arial,sans-serif}.sheet{width:210mm;height:297mm;overflow:hidden;break-after:page;page-break-after:always;position:relative;background:#fff}.sheet:last-child{break-after:auto;page-break-after:auto}.large-row{width:210mm;height:59.4mm}.label-art{width:210mm;height:59.4mm;position:relative;overflow:hidden}.label-art img{position:absolute;width:100%;height:100%;object-fit:fill}.label-values{position:absolute;left:82.3%;top:16%;width:11.55%;height:19%;background:white;border-radius:1mm;padding:.6mm 1mm;font-size:2.5mm;font-weight:700;line-height:3.3mm;white-space:nowrap}.small-label{width:148.5mm;height:${types.C300.height}mm}.small-label .label-values{left:82.2%;top:11.5%;width:14.55%;height:14.3%;padding:.4mm 1mm;font-size:2.1mm;line-height:2.6mm;font-weight:500}.small-row{width:210mm;height:${types.C300.height}mm;display:flex}.small-rotated-row{width:210mm;height:148.5mm;display:flex}.rotated-cell{position:relative;width:${types.C300.height}mm;height:148.5mm;overflow:hidden}.rotated-cell .label-art{position:absolute;left:${types.C300.height}mm;top:0;transform-origin:0 0;transform:rotate(90deg)}@media screen{body{background:#ddd}.sheet{margin:12px auto;box-shadow:0 1px 8px #888}}`;
  function documentHtml(labels, limit, layout) {
    const pages = layout || paginate(labels, limit);
    return `<!doctype html><html><head><meta charset="utf-8"><title>KAFAK Product Labels</title><style>${css}</style></head><body>` + pages.map((page) => {
      let out = page.large.map((l) => `<div class="large-row">${labelHtml(l)}</div>`).join("");
      const space = 297 - page.large.length * 59.4, leftCount = Math.min(page.small.length, Math.floor((space + 1e-3) / types.C300.height));
      if (page.small.length) out += `<div class="small-block" style="position:relative;width:210mm;height:${space}mm">` + page.small.map((l, n) => n < leftCount ? `<div class="small-row" style="position:absolute;left:0;top:${n * types.C300.height}mm">${labelHtml(l)}</div>` : `<div class="rotated-cell" style="position:absolute;left:148.5mm;top:${(n - leftCount) * 148.5}mm">${labelHtml(l)}</div>`).join("") + "</div>";
      return '<section class="sheet">' + out + "</section>";
    }).join("") + "</body></html>";
  }
  function stockPreview(saved, orders2, pending2 = [], baselines = []) {
    const result = _objectSpread(_objectSpread({}, saved), {}, {
      loose: _objectSpread({}, saved.loose),
      appliedOrders: 0,
      used: {
        W650: 0,
        C650: 0,
        C300: 0
      },
      updates: []
    }), updateMap = /* @__PURE__ */ new Map();
    if (!saved.initialized) return result;
    const meta = new Map(pending2.filter((u) => u.action === "meta" && u.meta !== void 0).map((u) => [u.oid, u])), statuses = new Map(pending2.filter((u) => u.status && (!u.action || u.action === "status")).map((u) => [u.oid, u.status])), server = new Map(baselines.map((o) => [o.oid, o])), local = new Map(orders2.map((o) => [o.orderid, o]));
    for (const base of baselines) {
      var _meta$get$meta, _meta$get;
      if (!local.has(base.oid)) continue;
      const next = (_meta$get$meta = (_meta$get = meta.get(base.oid)) === null || _meta$get === void 0 ? void 0 : _meta$get.meta) !== null && _meta$get$meta !== void 0 ? _meta$get$meta : base.meta, used = printed(next), known = printed(base.meta);
      for (const k of Object.keys(types)) used[k] = Math.max(used[k], known[k]);
      updateMap.set(base.oid, {
        oid: base.oid,
        action: "meta",
        meta: Object.values(used).some(Boolean) ? mark(next, used) : next
      });
    }
    const hasPrint = (value) => /(?:^|\s)P(?:_\d+)?(?=\s|$)/.test(String(value || "")), eligible = (value) => ["Paid", "Dispatched", "Delivered", "Completed"].includes(value);
    for (const oid of [.../* @__PURE__ */ new Set([...meta.keys(), ...statuses.keys()])].sort()) {
      var _ref3, _ref4, _base$meta, _ref5, _ref6, _base$status, _u$meta, _updateMap$get$meta, _updateMap$get;
      const u = meta.get(oid), o = local.get(oid), base = server.get(oid);
      if (!o && !base) continue;
      const before = (_ref3 = (_ref4 = (_base$meta = base === null || base === void 0 ? void 0 : base.meta) !== null && _base$meta !== void 0 ? _base$meta : u === null || u === void 0 ? void 0 : u.oldMeta) !== null && _ref4 !== void 0 ? _ref4 : o === null || o === void 0 ? void 0 : o.adminMeta) !== null && _ref3 !== void 0 ? _ref3 : "", beforeStatus = (_ref5 = (_ref6 = (_base$status = base === null || base === void 0 ? void 0 : base.status) !== null && _base$status !== void 0 ? _base$status : o === null || o === void 0 ? void 0 : o.Status) !== null && _ref6 !== void 0 ? _ref6 : o === null || o === void 0 ? void 0 : o.status) !== null && _ref5 !== void 0 ? _ref5 : "", next = (_u$meta = u === null || u === void 0 ? void 0 : u.meta) !== null && _u$meta !== void 0 ? _u$meta : before, status = statuses.get(oid) || beforeStatus;
      if (!eligible(status) || !hasPrint(next) || hasPrint(before) && eligible(beforeStatus)) continue;
      const counts = (base === null || base === void 0 ? void 0 : base.counts) || items(o), printedCounts = printed((_updateMap$get$meta = (_updateMap$get = updateMap.get(oid)) === null || _updateMap$get === void 0 ? void 0 : _updateMap$get.meta) !== null && _updateMap$get$meta !== void 0 ? _updateMap$get$meta : next);
      let used = 0;
      for (const k of Object.keys(types)) {
        const n = Math.min(Math.max(0, counts[k] - printedCounts[k]), result.loose[k]);
        result.loose[k] -= n;
        result.used[k] += n;
        printedCounts[k] += n;
        used += n;
      }
      if (used) {
        result.appliedOrders++;
        updateMap.set(oid, {
          oid,
          action: "meta",
          meta: mark(next, printedCounts)
        });
      }
    }
    result.updates = [...updateMap.values()];
    return result;
  }
  function mark(meta, current) {
    let text = String(meta || "").replace(/\blb(?:w650|c650|c300)_\d+\b/g, "").replace(/\s+/g, " ").trim();
    if (!/(?:^|\s)S(?:\s|$)/.test(text)) text = (text + " S").trim();
    return [text, ...Object.keys(types).filter((k) => current[k]).map((k) => "lb" + k.toLowerCase() + "_" + current[k])].join(" ");
  }
  function fill(pages, type, make) {
    if (type !== "none" && !types[type]) throw Error("Select a filler product");
    let extras = 0;
    const result = pages.map((page) => {
      const next = {
        large: page.large.slice(),
        small: page.small.slice()
      };
      if (type === "C300") {
        const n = capacity[next.large.length] - next.small.length;
        for (let k = 0; k < n; k++) {
          next.small.push(_objectSpread(_objectSpread({}, make(type)), {}, {
            extra: true
          }));
          extras++;
        }
      } else if (type !== "none") {
        let n = next.large.length;
        while (n < 5 && capacity[n + 1] >= next.small.length) n++;
        while (next.large.length < n) {
          next.large.push(_objectSpread(_objectSpread({}, make(type)), {}, {
            extra: true
          }));
          extras++;
        }
      }
      return next;
    });
    const arranged = paginate(result.flatMap((p) => [...p.large, ...p.small]));
    return {
      pages: arranged,
      labels: arranged.flatMap((p) => [...p.large, ...p.small]),
      extras,
      type
    };
  }
  const core = {
    types,
    date,
    items,
    printed,
    demand,
    paginate,
    fill,
    labelHtml,
    documentHtml,
    css,
    mark,
    stockPreview
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
    return;
  }
  scope.KafakProductLabels = core;
  let predictionSerial = 0, settings = {}, previewType = "W650", fillType = "W650", dirtyBatch = false;
  const original = {
    inject: scope.injectLeftDrawer,
    batch: scope.refreshLabelBatch
  };
  const orders = () => typeof allOrders !== "undefined" ? allOrders : [];
  const pending = () => JSON.parse(localStorage.getItem("pendingUpdates") || "[]");
  const stockApi = typeof KafakBusinessApi !== "undefined" ? new KafakBusinessApi() : null;
  let stock = null, stockRequest = null, stockBaselines = [];
  const stockWatch = /* @__PURE__ */ new Set();
  let stockQueried = /* @__PURE__ */ new Set();
  async function loadStock() {
    if (!stockApi) throw Error("Sticker stock service is unavailable.");
    for (const u of pending().filter((u2) => u2.action === "meta" || !u2.action || u2.action === "status")) stockWatch.add(u.oid);
    if (!stockRequest) {
      const oids = [...stockWatch];
      stockRequest = stockApi.request("/admin/label-stock-preview", {
        method: "POST",
        data: {
          oids
        }
      }).then((r) => {
        stock = r.stock;
        stockBaselines = r.orders || [];
        stockQueried = new Set(oids);
        return stock;
      }).finally(() => stockRequest = null);
    }
    await stockRequest;
    if ([...stockWatch].some((id) => !stockQueried.has(id))) return loadStock();
    return stock;
  }
  function projectedStock() {
    var _stock;
    return (_stock = stock) !== null && _stock !== void 0 && _stock.initialized ? stockPreview(stock, orders(), pending(), stockBaselines) : stock;
  }
  function applyStockView(view) {
    var _window$globalInvento;
    if (view !== null && view !== void 0 && view.initialized && (_window$globalInvento = window.globalInventoryDB) !== null && _window$globalInvento !== void 0 && _window$globalInvento.sticker) window.globalInventoryDB.sticker.labelStock = _objectSpread(_objectSpread({}, window.globalInventoryDB.sticker.labelStock || {}), {}, {
      loose: _objectSpread({}, view.loose),
      blankSheets: view.blankSheets
    });
  }
  const choice = () => {
    var _document$getElementB;
    return ((_document$getElementB = document.getElementById("label-product-type")) === null || _document$getElementB === void 0 ? void 0 : _document$getElementB.value) || "auto";
  };
  const ids = (type) => type === "W650" ? {
    mrp: "label-mrp",
    batch: "label-batch",
    date: "label-date"
  } : {
    mrp: "label-" + type.toLowerCase() + "-mrp",
    batch: "label-" + type.toLowerCase() + "-batch",
    date: "label-" + type.toLowerCase() + "-date"
  };
  const iso = (value) => {
    const parts = String(value || "").replace(/\s/g, "").split("/");
    return parts.length === 3 ? "20" + parts[2].slice(-2) + "-" + parts[1] + "-" + parts[0] : value;
  };
  const displayDate = (value) => /^\d{4}-\d\d-\d\d$/.test(value) ? value.slice(8) + "/" + value.slice(5, 7) + "/" + value.slice(2, 4) : "";
  function readSettings() {
    for (const type of Object.keys(types)) {
      const id = ids(type);
      if (document.getElementById(id.mrp)) settings[type] = {
        mrp: document.getElementById(id.mrp).value,
        batch: document.getElementById(id.batch).value.trim().toUpperCase(),
        date: displayDate(document.getElementById(id.date).value)
      };
    }
  }
  function label(type) {
    const t = types[type], s = settings[type] || {
      mrp: t.mrp,
      batch: t.batch,
      date: date()
    };
    return _objectSpread(_objectSpread({
      type
    }, s), {}, {
      mrp: Number(s.mrp).toFixed(2)
    });
  }
  function install() {
    if (document.getElementById("label-product-type")) return;
    const anchor = document.getElementById("label-preview-box");
    if (!anchor) return;
    settings = {
      W650: {
        mrp: $("#label-mrp").val(),
        batch: $("#label-batch").val(),
        date: $("#label-date").val()
      },
      C650: {
        mrp: "2200.00",
        batch: "HN26LY02",
        date: date()
      },
      C300: {
        mrp: "1020.00",
        batch: "HN26LY02",
        date: date()
      }
    };
    const panel = document.createElement("div");
    panel.className = "mb-3";
    panel.innerHTML = '<label class="small fw-bold text-muted mb-1" style="font-size:10px" for="label-product-type">LABEL PRODUCT</label><select id="label-product-type" class="form-select form-select-sm fw-bold"><option value="auto">Paid orders · correct product labels</option>' + Object.entries(types).map(([k, t]) => `<option value="${k}">${t.name} · manual copies</option>`).join("") + '</select><div id="label-manual-controls" class="mt-2" hidden><label class="small text-muted fw-bold mb-1" for="label-manual-copies" style="font-size:10px">COPIES REQUESTED</label><input type="number" id="label-manual-copies" class="form-control form-control-sm" min="1" max="1000" step="1" value="1"></div><div id="label-product-breakdown" class="small text-muted mt-2" style="font-size:10px;white-space:pre-line"></div>';
    anchor.parentNode.insertBefore(panel, anchor.previousElementSibling);
    document.getElementById("label-product-type").onchange = () => {
      document.getElementById("label-manual-controls").hidden = choice() === "auto";
      if (choice() !== "auto") previewType = choice();
      preview();
      scope.updatePrintPrediction();
    };
    document.getElementById("label-manual-copies").oninput = () => scope.updatePrintPrediction();
    document.getElementById("printed-bottles-count").previousElementSibling.textContent = "Labels confirmed (Paid):";
    const oldPerPage = document.getElementById("stickers-per-page"), oldBox = document.getElementById("label-mrp").parentElement;
    if (document.getElementById("label-date")._flatpickr) document.getElementById("label-date")._flatpickr.destroy();
    oldBox.innerHTML = '<input type="hidden" id="stickers-per-page" value="5">' + Object.entries(types).map(([type, t]) => {
      const id = ids(type), s = settings[type];
      return `<details class="product-label-settings border rounded-3 mb-2 bg-white" data-product="${type}"><summary class="fw-bold d-flex justify-content-between align-items-center px-3 py-3" style="font-size:11px;cursor:pointer;list-style:none">${escape(t.name)}<span class="text-muted" aria-hidden="true">⌄</span></summary><div class="px-3 pb-3"><label class="small fw-bold text-muted mb-1" style="font-size:10px" for="${id.mrp}">MRP (₹)</label><input type="number" min="0.01" step="0.01" required id="${id.mrp}" class="form-control form-control-sm mb-2 fw-semibold" value="${escape(s.mrp)}"><label class="small fw-bold text-muted mb-1" style="font-size:10px" for="${id.batch}">BATCH NO.</label><input type="text" required maxlength="40" id="${id.batch}" class="form-control form-control-sm mb-2 fw-semibold text-uppercase" value="${escape(s.batch)}"><label class="small fw-bold text-muted mb-1" style="font-size:10px" for="${id.date}">DATE OF PKG</label><input type="date" required id="${id.date}" class="form-control form-control-sm fw-semibold" value="${escape(iso(s.date))}"></div></details>`;
    }).join("");
    for (const detail of oldBox.querySelectorAll("details")) {
      const type = detail.dataset.product;
      detail.ontoggle = () => {
        if (detail.open) {
          previewType = type;
          preview();
        }
      };
      for (const input of detail.querySelectorAll("input")) input.oninput = () => {
        if (input.id === "label-batch") dirtyBatch = true;
        previewType = type;
        readSettings();
        preview();
        scope.updatePrintPrediction();
      };
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn w-100 fw-bold shadow text-white mt-3";
    button.style.cssText = "background:#1e293b;font-size:13px;padding:12px 0;border-radius:12px";
    button.textContent = "PRINT LABELS";
    button.onclick = print;
    oldBox.append(button);
    const modes = document.getElementById("print-qty-mode");
    modes.onchange = () => {
      fillType = modes.value;
      scope.updatePrintPrediction();
    };
    const sheets = document.getElementById("manual-sheets-input");
    sheets.readOnly = true;
    sheets.removeAttribute("oninput");
    readSettings();
    preview();
  }
  function preview() {
    readSettings();
    const box = document.getElementById("label-preview-box");
    if (!box) return;
    const drawer = document.getElementById("left-drawer");
    if (drawer && !drawer.classList.contains("open") && drawer.style.left !== "0px") {
      box.innerHTML = '<div class="small text-muted p-3">Open Label tools to preview.</div>';
      return;
    }
    const t = types[previewType], width = box.clientWidth || 318;
    box.style.cssText = "width:100%;max-width:350px;position:relative;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;height:" + width * t.height / t.width + "px";
    box.innerHTML = '<div style="position:absolute;transform-origin:0 0;transform:scale(' + width / (t.width * 96 / 25.4) + ')">' + labelHtml(label(previewType)) + "</div>";
    const heading = box.previousElementSibling;
    if ((heading === null || heading === void 0 ? void 0 : heading.tagName) === "H6") heading.textContent = "LIVE PREVIEW · " + t.name;
    if (!document.getElementById("product-label-css")) {
      const style = document.createElement("style");
      style.id = "product-label-css";
      style.textContent = css.replace(/@page\{[^}]*\}/, "").replace(/html,body\{[^}]*\}/, "").replace(/@media screen\{[\s\S]*$/, "");
      document.head.append(style);
    }
  }
  function job() {
    readSettings();
    const projected = projectedStock(), d = demand(orders(), [...pending(), ...(projected === null || projected === void 0 ? void 0 : projected.updates) || []]), automatic = choice() === "auto", requested = [];
    if (automatic) {
      for (const k of Object.keys(types)) for (let n = 0; n < d.counts[k]; n++) requested.push(label(k));
    } else {
      const n = Number(document.getElementById("label-manual-copies").value);
      if (!Number.isSafeInteger(n) || n < 1 || n > 1e3) throw Error("Select 1–1000 labels.");
      for (let i = 0; i < n; i++) requested.push(label(choice()));
    }
    const result = fill(paginate(requested), fillType, label);
    return _objectSpread(_objectSpread(_objectSpread({}, d), result), {}, {
      requested: requested.length,
      automatic
    });
  }
  function renderPrediction(j, error = "") {
    document.getElementById("label-product-breakdown").textContent = `Paid: ${j.paid} bottles · Labels confirmed: ${j.printed}
` + Object.keys(types).filter((k) => j.counts[k]).map((k) => types[k].name + ": " + j.counts[k]).join(" · ") + `
Print: ${j.requested} requested + ${j.extras} extra${j.extras ? " " + types[fillType].name : ""} = ${j.labels.length} labels · ${j.pages.length} A4 sheets`;
    $("#unprinted-bottles-count").text(j.total);
    $("#printed-bottles-count").text(j.printed);
    $("#manual-sheets-input").val(j.pages.length);
    $("#exact-sheets-count").text(j.pages.length + ".0");
    const modes = document.getElementById("print-qty-mode");
    modes.dataset.userSelected = "false";
    modes.previousElementSibling.textContent = "FILL REMAINING A4 SPACE";
    modes.innerHTML = Object.entries(types).map(([k, t]) => `<option value="${k}">Fill with ${escape(t.name)}${k === "W650" ? " (default)" : ""}</option>`).join("") + '<option value="none">Leave blank · exact requested labels</option>';
    modes.value = fillType;
    renderStock(j, error);
    modes.onchange = () => {
      fillType = modes.value;
      scope.updatePrintPrediction();
    };
    preview();
  }
  async function predict() {
    var _stock2;
    const generation = ++predictionSerial;
    if ((_stock2 = stock) !== null && _stock2 !== void 0 && _stock2.initialized && document.getElementById("label-product-type")) {
      try {
        renderPrediction(job());
      } catch (_unused) {
      }
    }
    let stockError = "";
    await loadStock().catch((e) => stockError = e.message);
    if (generation !== predictionSerial) return;
    install();
    try {
      renderPrediction(job(), stockError);
    } catch (e) {
      document.getElementById("label-product-breakdown").textContent = e.message;
    }
  }
  function renderStock(j, error = "") {
    var _stock3;
    const box = document.getElementById("a4-stock-display-container");
    if (!box) return;
    if (!((_stock3 = stock) !== null && _stock3 !== void 0 && _stock3.initialized)) {
      box.innerHTML = '<div class="small text-danger">' + escape(error || "Set opening sticker stock before printing.") + "</div>";
      return;
    }
    const view = projectedStock();
    applyStockView(view);
    const counts = {
      W650: 0,
      C650: 0,
      C300: 0
    };
    for (const l of j.labels) counts[l.type]++;
    const after = {};
    for (const k of Object.keys(types)) after[k] = view.loose[k] + counts[k] - (j.automatic ? j.counts[k] : 0);
    box.innerHTML = (error ? '<div class="small text-warning mb-1">Using last saved stock; refresh is unavailable.</div>' : "") + `<div class="rounded-3 border p-2 mb-2" style="background:#fff3cd;border-color:#ffe69c!important"><div class="d-flex justify-content-between align-items-center mb-2"><strong style="font-size:11px">Loose stickers · ${Object.values(view.loose).reduce((a, b) => a + b, 0)}</strong>${view.appliedOrders ? '<span class="badge bg-warning text-dark ms-1" style="font-size:9px">Pending sync</span>' : ""}<button type="button" id="edit-typed-label-stock" class="btn btn-sm btn-warning py-0 px-2" style="font-size:10px">Edit</button></div>${Object.entries(types).map(([k, t]) => `<div class="d-flex justify-content-between py-1" style="font-size:11px"><span>${escape(t.name)}</span><strong>${view.loose[k]} stickers</strong></div>`).join("")}${j.labels.length ? '<div class="small border-top pt-2 mt-1" style="font-size:10px">After printing: ' + Object.keys(types).map((k) => escape(types[k].name) + " " + after[k]).join(" · ") + "</div>" : ""}</div><div class="rounded-3 border bg-white p-2 d-flex justify-content-between align-items-center"><span style="font-size:11px"><strong>Blank A4 sheets: <span class="${view.blankSheets < 0 ? "text-danger" : "text-primary"}">${view.blankSheets}</span></strong>${j.pages.length ? '<br><span class="text-muted" style="font-size:10px">After printing: ' + (view.blankSheets - j.pages.length) + "</span>" : ""}</span><button type="button" id="edit-typed-paper-stock" class="btn btn-sm btn-outline-primary py-0 px-2" style="font-size:10px">Edit</button></div>`;
    document.getElementById("edit-typed-label-stock").onclick = editStock;
    document.getElementById("edit-typed-paper-stock").onclick = editStock;
  }
  async function editStock() {
    var _projectedStock;
    if ((_projectedStock = projectedStock()) !== null && _projectedStock !== void 0 && _projectedStock.appliedOrders) {
      showToast("warning", "Sync or discard pending address prints before changing physical stock.");
      return;
    }
    try {
      await loadStock();
      const version = stock.version, stockRequestId = crypto.randomUUID();
      const result = await Swal.fire({
        title: "Actual sticker stock",
        html: '<div class="text-start">' + Object.entries(types).map(([k, t]) => `<label class="small fw-bold mt-2" for="stock-${k}">${escape(t.name)}</label><input id="stock-${k}" type="number" min="0" step="1" required class="form-control form-control-sm" value="${stock.loose[k]}">`).join("") + `<label class="small fw-bold mt-2" for="stock-blank-sheets">Blank A4 sheets</label><input id="stock-blank-sheets" type="number" min="0" step="1" required class="form-control form-control-sm" value="${stock.blankSheets}"></div>`,
        showCancelButton: true,
        showLoaderOnConfirm: true,
        confirmButtonText: "Save stock",
        preConfirm: async () => {
          const loose = Object.fromEntries(Object.keys(types).map((k) => [k, Number(document.getElementById("stock-" + k).value)])), raw = [...Object.keys(types).map((k) => document.getElementById("stock-" + k).value), document.getElementById("stock-blank-sheets").value], blankSheets = Number(raw[raw.length - 1]);
          if (raw.some((v) => v.trim() === "" || !Number.isSafeInteger(Number(v)) || Number(v) < 0)) {
            Swal.showValidationMessage("Enter a non-negative whole number in every field.");
            return false;
          }
          try {
            return await stockApi.adminAction({
              action: "setLabelStock",
              version,
              loose,
              blankSheets,
              note: "Admin physical stock count"
            }, stockRequestId);
          } catch (e) {
            Swal.showValidationMessage(e.message);
            return false;
          }
        }
      });
      if (result.isConfirmed) {
        stock = result.value.stock;
        await scope.updatePrintPrediction();
        showToast("success", "Sticker stock saved.");
      }
    } catch (e) {
      showToast("error", e.message);
    }
  }
  async function savePrintReceipt(pending2) {
    var _response$issues, _response$issues2;
    const response = await stockApi.adminAction(pending2.payload, pending2.requestId);
    if (response.result !== "success") throw Error("Print stock was not confirmed. Retry the saved print receipt.");
    localStorage.removeItem("kafak-label-print-receipt");
    stock = response.stock;
    for (const update of response.orders || []) {
      const o = orders().find((r) => r.orderid === update.oid);
      if (o && (!Number.isSafeInteger(o.version) || o.version <= update.version)) {
        o.adminMeta = update.meta;
        o.version = update.version;
      }
    }
    localStorage.setItem("allOrdersCache", JSON.stringify(orders()));
    await scope.updatePrintPrediction();
    if (typeof renderLiveStockTracker === "function") renderLiveStockTracker();
    showToast((_response$issues = response.issues) !== null && _response$issues !== void 0 && _response$issues.length ? "warning" : "success", (_response$issues2 = response.issues) !== null && _response$issues2 !== void 0 && _response$issues2.length ? "Stock saved. Changed orders were left unchanged; their printed labels were added as spares." : "Print and sticker balances saved.");
  }
  async function print() {
    let j;
    try {
      var _stock4, _projectedStock2;
      const waiting = JSON.parse(localStorage.getItem("kafak-label-print-receipt") || "null");
      if (waiting) {
        if (waiting.state === "prepared") {
          const recovery = await Swal.fire({
            title: "Previous print interrupted",
            text: "Were those labels printed successfully?",
            showCancelButton: true,
            confirmButtonText: "Yes, save printed stock",
            cancelButtonText: "No, discard this print"
          });
          if (!recovery.isConfirmed) {
            localStorage.removeItem("kafak-label-print-receipt");
            return;
          }
          waiting.state = "confirmed";
          localStorage.setItem("kafak-label-print-receipt", JSON.stringify(waiting));
        }
        await savePrintReceipt(waiting);
        return;
      }
      await loadStock();
      if (!((_stock4 = stock) !== null && _stock4 !== void 0 && _stock4.initialized)) throw Error("Set opening sticker stock before printing.");
      j = job();
      if ((_projectedStock2 = projectedStock()) !== null && _projectedStock2 !== void 0 && _projectedStock2.appliedOrders) throw Error("Sync pending address prints before printing product labels.");
      if (stock.blankSheets < j.pages.length) throw Error("Need " + j.pages.length + " blank A4 sheets; recorded stock is " + stock.blankSheets + ". Update the physical paper stock first.");
      if (j.automatic && pending().some((u) => j.allocations.some((a) => a.oid === u.oid))) throw Error("Sync pending order updates before printing, so sticker stock is saved once.");
      if (!j.labels.length) throw Error("No product labels need printing.");
      const invalid = j.labels.find((l) => {
        var _l$batch, _l$date;
        return !Number.isFinite(Number(l.mrp)) || Number(l.mrp) <= 0 || !((_l$batch = l.batch) !== null && _l$batch !== void 0 && _l$batch.trim()) || !((_l$date = l.date) !== null && _l$date !== void 0 && _l$date.trim());
      });
      if (invalid) {
        const detail = document.querySelector('.product-label-settings[data-product="' + invalid.type + '"]');
        if (detail) detail.open = true;
        previewType = invalid.type;
        preview();
        throw Error("Fill MRP, batch number and packaging date for " + types[invalid.type].name + " before printing.");
      }
    } catch (e) {
      showToast("warning", e.message);
      return;
    }
    const counts = {
      W650: 0,
      C650: 0,
      C300: 0
    };
    for (const l of j.labels) counts[l.type]++;
    const receipt = {
      state: "prepared",
      requestId: crypto.randomUUID(),
      payload: {
        action: "recordLabelPrint",
        counts,
        sheets: j.pages.length,
        allocations: j.automatic ? j.allocations.map((a) => ({
          oid: a.oid,
          current: a.current,
          need: a.need
        })) : []
      }
    };
    try {
      localStorage.setItem("kafak-label-print-receipt", JSON.stringify(receipt));
    } catch (_unused2) {
      showToast("error", "Allow browser storage before printing so the stock receipt can be recovered.");
      return;
    }
    const w = window.open("", "LabelPrintWindow", "width=900,height=900");
    if (!w) {
      localStorage.removeItem("kafak-label-print-receipt");
      showToast("warning", "Allow the print window, then retry.");
      return;
    }
    const url = URL.createObjectURL(new Blob([documentHtml(j.labels, void 0, j.pages).replace("<head>", '<head><base href="' + escape(new URL(".", window.location.href).href) + '">')], {
      type: "text/html;charset=utf-8"
    }));
    try {
      w.location.href = url;
      await new Promise((resolve, reject) => {
        const started = Date.now(), timer = setInterval(() => {
          if (w.closed) {
            clearInterval(timer);
            reject(Error("Print window closed. No print marks were changed."));
            return;
          }
          try {
            const images = [...w.document.images];
            if (w.document.readyState === "complete" && images.length === j.labels.length && images.every((i) => i.complete)) {
              clearInterval(timer);
              images.every((i) => i.naturalWidth) ? resolve() : reject(Error("Label image could not load. Retry printing."));
            } else if (Date.now() - started > 3e4) {
              clearInterval(timer);
              reject(Error("Label images are still loading. Retry printing."));
            }
          } catch (_unused3) {
          }
        }, 100);
      });
      w.focus();
      w.print();
    } catch (e) {
      localStorage.removeItem("kafak-label-print-receipt");
      showToast("error", e.message);
      return;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 3e5);
    }
    const confirmed = await Swal.fire({
      title: "Were all labels printed?",
      text: `${j.requested} ${j.automatic ? "order" : "manual"} labels + ${j.extras} filler labels on ${j.pages.length} A4 sheets. Confirm only after printing succeeds.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Printed successfully",
      cancelButtonText: "Not printed",
      confirmButtonColor: "#198754"
    });
    if (!confirmed.isConfirmed) {
      localStorage.removeItem("kafak-label-print-receipt");
      return;
    }
    receipt.state = "confirmed";
    localStorage.setItem("kafak-label-print-receipt", JSON.stringify(receipt));
    try {
      await savePrintReceipt(receipt);
    } catch (e) {
      showToast("error", e.message + " Print receipt kept; click PRINT LABELS to retry saving without printing again.");
    }
  }
  scope.KafakProductLabels.editStock = editStock;
  scope.injectLeftDrawer = function() {
    original.inject();
    install();
  };
  scope.updatePrintPrediction = predict;
  scope.printProductLabels = print;
  scope.updateLabelPreview = preview;
  scope.refreshLabelBatch = async function() {
    var _businessApi, _original$batch;
    if (typeof businessApi === "undefined" || !((_businessApi = businessApi) !== null && _businessApi !== void 0 && _businessApi.request)) return (_original$batch = original.batch) === null || _original$batch === void 0 ? void 0 : _original$batch.call(original);
    if (!settings.W650 || dirtyBatch) return;
    const field = document.getElementById("label-batch");
    field.value = "";
    field.placeholder = "Loading current batch...";
    settings.W650.batch = "";
    preview();
    try {
      var _batches$find;
      const _await$businessApi$re = await businessApi.request("/admin/salary-batches"), batches = _await$businessApi$re.batches;
      if (dirtyBatch || document.getElementById("label-batch").value !== "") return;
      const value = ((_batches$find = batches.find((b) => b.Status === "Open" && b.Product === "Vanthen")) === null || _batches$find === void 0 ? void 0 : _batches$find["Batch Number"]) || "";
      settings.W650.batch = value;
      $("#label-batch").val(value);
      preview();
    } catch (_unused4) {
      document.getElementById("label-batch").placeholder = "Batch unavailable - retry before printing";
    }
  };
})(typeof window === "undefined" ? globalThis : window);
