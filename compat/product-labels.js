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
    let large = labels.filter((l) => l.type !== "C300"), small = labels.filter((l) => l.type === "C300"), pages = [];
    const memo = /* @__PURE__ */ new Map();
    function cost(a, b) {
      if (!a && !b) return 0;
      const key = a + "," + b;
      if (memo.has(key)) return memo.get(key);
      let best = Infinity;
      for (let n = 0; n <= Math.min(5, a); n++) {
        const m = Math.min(capacity[n], b);
        if (!n && !m) continue;
        best = Math.min(best, 1 + cost(a - n, b - m));
      }
      memo.set(key, best);
      return best;
    }
    while (large.length || small.length) {
      let best = null;
      for (let n = 0; n <= Math.min(5, large.length); n++) {
        const m = Math.min(capacity[n], small.length);
        if (!n && !m) continue;
        const score = labels.length <= 150 ? 1 + cost(large.length - n, small.length - m) : Math.ceil((large.length - n) / 5) + Math.ceil((small.length - m) / 6) + 1;
        if (!best || score < best.score || score === best.score && n + m > best.n + best.m) best = {
          n,
          m,
          score
        };
      }
      const page = {
        large: large.splice(0, best.n),
        small: small.splice(0, best.m)
      };
      pages.push(page);
    }
    return pages;
  }
  function labelHtml(label2) {
    const t = types[label2.type], small = label2.type === "C300";
    return `<div class="label-art ${small ? "small-label" : ""}" data-type="${label2.type}"><img src="${escape(label2.image || t.image)}" alt="${escape(t.name)}"><div class="label-values"><div>${escape(label2.mrp)}</div><div>${escape(label2.batch)}</div><div>${escape(label2.date)}</div></div></div>`;
  }
  const css = `@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0;background:white;font-family:Arial,sans-serif}.sheet{width:210mm;height:297mm;overflow:hidden;break-after:page;page-break-after:always;position:relative;background:#fff}.sheet:last-child{break-after:auto;page-break-after:auto}.large-row{width:210mm;height:59.4mm}.label-art{width:210mm;height:59.4mm;position:relative;overflow:hidden}.label-art img{position:absolute;width:100%;height:100%;object-fit:fill}.label-values{position:absolute;left:82.3%;top:16%;width:11.55%;height:19%;background:white;border-radius:1mm;padding:.6mm 1mm;font-size:2.5mm;font-weight:700;line-height:3.3mm;white-space:nowrap}.small-label{width:148.5mm;height:${types.C300.height}mm}.small-label .label-values{left:82.2%;top:11.5%;width:14.55%;height:14.3%;padding:.4mm 1mm;font-size:2.1mm;line-height:2.6mm;font-weight:500}.small-row{width:210mm;height:${types.C300.height}mm;display:flex}.small-rotated-row{width:210mm;height:148.5mm;display:flex}.rotated-cell{position:relative;width:${types.C300.height}mm;height:148.5mm;overflow:hidden}.rotated-cell .label-art{position:absolute;left:${types.C300.height}mm;top:0;transform-origin:0 0;transform:rotate(90deg)}@media screen{body{background:#ddd}.sheet{margin:12px auto;box-shadow:0 1px 8px #888}}`;
  function documentHtml(labels, limit) {
    const pages = paginate(labels, limit);
    return `<!doctype html><html><head><meta charset="utf-8"><title>KAFAK Product Labels</title><style>${css}</style></head><body>` + pages.map((page) => {
      let out = page.large.map((l) => `<div class="large-row">${labelHtml(l)}</div>`).join("");
      const space = 297 - page.large.length * 59.4, leftCount = Math.min(page.small.length, Math.floor((space + 1e-3) / types.C300.height));
      if (page.small.length) out += `<div class="small-block" style="position:relative;width:210mm;height:${space}mm">` + page.small.map((l, n) => n < leftCount ? `<div class="small-row" style="position:absolute;left:0;top:${n * types.C300.height}mm">${labelHtml(l)}</div>` : `<div class="rotated-cell" style="position:absolute;left:148.5mm;top:${(n - leftCount) * 148.5}mm">${labelHtml(l)}</div>`).join("") + "</div>";
      return '<section class="sheet">' + out + "</section>";
    }).join("") + "</body></html>";
  }
  function mark(meta, current) {
    let text = String(meta || "").replace(/\blb(?:w650|c650|c300)_\d+\b/g, "").replace(/\s+/g, " ").trim();
    if (!/(?:^|\s)S(?:\s|$)/.test(text)) text = (text + " S").trim();
    return [text, ...Object.keys(types).filter((k) => current[k]).map((k) => "lb" + k.toLowerCase() + "_" + current[k])].join(" ");
  }
  const core = {
    types,
    date,
    items,
    printed,
    demand,
    paginate,
    labelHtml,
    documentHtml,
    css,
    mark
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
    return;
  }
  scope.KafakProductLabels = core;
  let predictionSerial = 0, settings = {};
  const original = {
    inject: scope.injectLeftDrawer,
    predict: scope.updatePrintPrediction,
    print: scope.printProductLabels,
    preview: scope.updateLabelPreview,
    batch: scope.refreshLabelBatch
  };
  const orders = () => typeof allOrders !== "undefined" ? allOrders : [];
  const pending = () => JSON.parse(localStorage.getItem("pendingUpdates") || "[]");
  const choice = () => {
    var _document$getElementB;
    return ((_document$getElementB = document.getElementById("label-product-type")) === null || _document$getElementB === void 0 ? void 0 : _document$getElementB.value) || "auto";
  };
  function install() {
    if (document.getElementById("label-product-type")) return;
    const anchor = document.getElementById("label-preview-box");
    if (!anchor) return;
    const panel = document.createElement("div");
    panel.className = "mb-3";
    panel.innerHTML = '<label class="small fw-bold text-muted mb-1" style="font-size:10px" for="label-product-type">LABEL PRODUCT</label><select id="label-product-type" class="form-select form-select-sm fw-bold"><option value="auto">Paid orders · correct product labels</option>' + Object.entries(types).map(([k, t]) => `<option value="${k}">${t.name} · manual copies</option>`).join("") + '</select><div id="label-product-breakdown" class="small text-muted mt-2" style="font-size:10px"></div>';
    anchor.parentNode.insertBefore(panel, anchor.previousElementSibling);
    document.getElementById("label-product-type").onchange = change;
    document.getElementById("printed-bottles-count").previousElementSibling.textContent = "Labels confirmed (Paid):";
    for (const n of [6, 7]) {
      const option = document.createElement("option");
      option.value = String(n);
      option.textContent = n + " (300g)";
      document.getElementById("stickers-per-page").append(option);
    }
    const wild = {
      mrp: $("#label-mrp").val(),
      batch: $("#label-batch").val(),
      date: $("#label-date").val()
    };
    settings.W650 = wild;
    settings.C650 = {
      mrp: "2200.00",
      batch: "HN26LY02",
      date: date()
    };
    settings.C300 = {
      mrp: "1020.00",
      batch: "HN26LY02",
      date: date()
    };
    change();
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
  function change() {
    const type = choice(), automatic = type === "auto";
    for (const id of ["label-mrp", "label-batch", "label-date"]) document.getElementById(id).disabled = automatic;
    const perPage = document.getElementById("stickers-per-page");
    perPage.disabled = automatic;
    for (const n of [6, 7]) perPage.querySelector('option[value="' + n + '"]').hidden = type !== "C300";
    if (type === "C300") perPage.value = "7";
    else if (Number(perPage.value) > 5) perPage.value = "5";
    document.getElementById("manual-sheets-input").readOnly = automatic;
    {
      const s = settings[automatic ? "W650" : type];
      $("#label-mrp").val(s.mrp);
      $("#label-batch").val(s.batch);
      $("#label-date").val(s.date);
      document.getElementById("print-qty-mode").dataset.userSelected = "false";
    }
    scope.updateLabelPreview();
    scope.updatePrintPrediction();
  }
  function preview() {
    const type = choice();
    settings[type === "auto" ? "W650" : type] = {
      mrp: $("#label-mrp").val(),
      batch: $("#label-batch").val().toUpperCase(),
      date: $("#label-date").val()
    };
    const box = document.getElementById("label-preview-box");
    if (!box) return;
    const drawer = document.getElementById("left-drawer");
    if (drawer && !drawer.classList.contains("open") && drawer.style.left !== "0px") {
      box.innerHTML = '<div class="small text-muted p-3">Open Label tools to preview.</div>';
      return;
    }
    const use = type === "auto" ? "C650" : type, t = types[use], width = box.clientWidth || 318;
    box.style.cssText = "width:100%;max-width:350px;position:relative;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;height:" + width * t.height / t.width + "px";
    box.innerHTML = '<div style="position:absolute;transform-origin:0 0;transform:scale(' + width / (t.width * 96 / 25.4) + ')">' + labelHtml(label(use)) + "</div>";
    if (!document.getElementById("product-label-css")) {
      const style = document.createElement("style");
      style.id = "product-label-css";
      style.textContent = css.replace(/@page\{[^}]*\}/, "").replace(/html,body\{[^}]*\}/, "").replace(/@media screen\{[\s\S]*$/, "");
      document.head.append(style);
    }
  }
  function job() {
    const d = demand(orders(), pending()), labels = [];
    for (const k of Object.keys(types)) for (let n = 0; n < d.counts[k]; n++) labels.push(label(k));
    return _objectSpread(_objectSpread({}, d), {}, {
      labels,
      pages: paginate(labels)
    });
  }
  async function predict(manual = false) {
    const generation = ++predictionSerial;
    await original.predict(manual);
    if (generation !== predictionSerial) return;
    install();
    try {
      const j = job(), auto = choice() === "auto";
      document.getElementById("label-product-breakdown").textContent = `Paid: ${j.paid} bottles · Labels confirmed: ${j.printed} · To print: ${j.total}
` + Object.keys(types).filter((k) => j.counts[k]).map((k) => types[k].name + ": " + j.counts[k]).join(" · ") + (auto ? " · Loose sticker stock is separate." : "");
      $("#unprinted-bottles-count").text(j.total);
      $("#printed-bottles-count").text(j.printed);
      if (auto) {
        $("#manual-sheets-input").val(j.pages.length);
        $("#exact-sheets-count").text(j.pages.length + ".0");
        const modes = document.getElementById("print-qty-mode");
        modes.dataset.userSelected = "false";
        modes.innerHTML = `<option value="${j.total}">${j.total} exact product labels · ${j.pages.length} A4 sheets</option>`;
      } else {
        const n = Number($("#print-qty-mode").val()) || 0, actual = paginate(Array.from({
          length: n
        }, () => label(choice())), Number($("#stickers-per-page").val()) || 5).length;
        $("#manual-sheets-input").val(actual);
        $("#exact-sheets-count").text(actual + ".0");
      }
      preview();
    } catch (e) {
      document.getElementById("label-product-breakdown").textContent = e.message;
    }
  }
  async function print() {
    let j, labels;
    try {
      j = job();
      if (choice() === "auto") labels = j.labels;
      else {
        const n = Number($("#print-qty-mode").val()) || 0;
        if (!Number.isSafeInteger(n) || n < 1 || n > 1e3) throw Error("Select 1–1000 labels.");
        labels = Array.from({
          length: n
        }, () => label(choice()));
      }
      if (!labels.length) throw Error("No product labels need printing.");
      if (labels.some((l) => {
        var _l$batch, _l$date;
        return !Number(l.mrp) || !((_l$batch = l.batch) !== null && _l$batch !== void 0 && _l$batch.trim()) || !((_l$date = l.date) !== null && _l$date !== void 0 && _l$date.trim());
      })) throw Error("Fill MRP, batch number and packaging date before printing.");
    } catch (e) {
      showToast("warning", e.message);
      return;
    }
    const w = window.open("", "LabelPrintWindow", "width=900,height=900");
    if (!w) {
      showToast("warning", "Allow the print window, then retry.");
      return;
    }
    const url = URL.createObjectURL(new Blob([documentHtml(labels, choice() === "auto" ? void 0 : Number($("#stickers-per-page").val()) || 5).replace("<head>", '<head><base href="' + escape(new URL(".", window.location.href).href) + '">')], {
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
            if (w.document.readyState === "complete" && images.length === labels.length && images.every((i) => i.complete)) {
              clearInterval(timer);
              images.every((i) => i.naturalWidth) ? resolve() : reject(Error("Label image could not load. Retry printing."));
            } else if (Date.now() - started > 3e4) {
              clearInterval(timer);
              reject(Error("Label images are still loading. Retry printing."));
            }
          } catch (_unused) {
          }
        }, 100);
      });
      w.focus();
      w.print();
    } catch (e) {
      showToast("error", e.message);
      return;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 3e5);
    }
    if (choice() !== "auto") return;
    const confirmed = await Swal.fire({
      title: "Were all labels printed?",
      text: `${labels.length} labels on ${j.pages.length} A4 sheets. Confirm only after printing succeeds.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Printed successfully",
      cancelButtonText: "Not printed",
      confirmButtonColor: "#198754"
    });
    if (!confirmed.isConfirmed) return;
    const updates = pending();
    for (const a of j.allocations) {
      var _ref3, _existing$meta;
      const o = orders().find((r) => r.orderid === a.oid);
      if (!o) continue;
      const existing = updates.find((u) => u.oid === a.oid && u.action === "meta"), meta = String((_ref3 = (_existing$meta = existing === null || existing === void 0 ? void 0 : existing.meta) !== null && _existing$meta !== void 0 ? _existing$meta : o.adminMeta) !== null && _ref3 !== void 0 ? _ref3 : "");
      if (meta !== a.meta) {
        showToast("warning", "Order changed. Its label mark was kept unchanged; refresh before retrying.");
        continue;
      }
      const value = mark(meta, a.current);
      if (existing) existing.meta = value;
      else updates.push({
        oid: a.oid,
        action: "meta",
        oldMeta: meta,
        meta: value,
        status: o.Status,
        time: Date.now()
      });
      o.adminMeta = value;
    }
    localStorage.setItem("pendingUpdates", JSON.stringify(updates));
    localStorage.setItem("allOrdersCache", JSON.stringify(orders()));
    scope.updateSyncButtonUI();
    scope.updatePrintPrediction();
    showToast("success", "Labels confirmed. Sync to save the print marks.");
  }
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
    if (!settings.W650) return;
    settings.W650.batch = "";
    if (choice() === "auto" || choice() === "W650") $("#label-batch").val("");
    try {
      var _batches$find;
      const _await$businessApi$re = await businessApi.request("/admin/salary-batches"), batches = _await$businessApi$re.batches;
      const value = ((_batches$find = batches.find((b) => b.Status === "Open" && b.Product === "Vanthen")) === null || _batches$find === void 0 ? void 0 : _batches$find["Batch Number"]) || "";
      settings.W650.batch = value;
      if (choice() === "auto" || choice() === "W650") {
        $("#label-batch").val(value);
        preview();
      }
    } catch (_unused2) {
      if (choice() === "auto" || choice() === "W650") document.getElementById("label-batch").placeholder = "Batch unavailable - retry before printing";
    }
  };
})(typeof window === "undefined" ? globalThis : window);
