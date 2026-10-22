(function(scope) {
  function createRefresh({
    current,
    blocked,
    read,
    apply,
    tracking,
    now = Date.now
  }) {
    let busy = false, lastTracking = 0;
    return async function refresh2() {
      const before = current();
      if (busy || !(before !== null && before !== void 0 && before.orderid) || blocked()) return;
      busy = true;
      try {
        var _current;
        const latest = await read(before.orderid);
        if (blocked() || ((_current = current()) === null || _current === void 0 ? void 0 : _current.orderid) !== before.orderid) return;
        if (latest.version !== current().version) apply(latest);
        if (now() - lastTracking >= 6e4) {
          lastTracking = now();
          tracking(latest);
        }
      } catch (_unused) {
      } finally {
        busy = false;
      }
    };
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = createRefresh;
    return;
  }
  if (scope.KAFAK_BACKEND !== "business") return;
  let baseline = "";
  const snapshot = () => JSON.stringify([...document.querySelectorAll('[id^="edit-"],#quick-qty,#admin-product-type')].filter((e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)).map((e) => [e.id, e.value.trim()]));
  const isDirty = () => baseline !== snapshot();
  for (const event of ["kafak-order-rendered", "kafak-order-saved"]) document.addEventListener(event, () => {
    queueMicrotask(() => {
      baseline = snapshot();
    });
  });
  const refresh = createRefresh({
    current: () => typeof savedOrderData === "object" ? savedOrderData : null,
    blocked: () => {
      var _document$activeEleme;
      return document.hidden || isDirty() || window.kafakStorage.getItem("kafakAdmin") === "true" || !scope.kafakOrderEditorUI || !$("#returning-user-view").is(":visible") || $("#address-edit-box").is(":visible") || $(".btn-update-sage").data("is-processing") || ((_document$activeEleme = document.activeElement) === null || _document$activeEleme === void 0 ? void 0 : _document$activeEleme.matches("input,textarea,select"));
    },
    read: (id) => scope.kafakOrderEditorUI.latestCustomer(id),
    apply: (row) => {
      scope.kafakOrderEditorUI.editor.current = row;
      loadOrderData(row, true);
    },
    tracking: (row) => {
      if (row.tracking && document.getElementById("inline-track-" + row.tracking)) scope.loadLiveTrackingInline(row.tracking, row.postoffice, $("#language-select").val() || "en", true);
    }
  });
  setTimeout(refresh, 2e3);
  setInterval(refresh, 15e3);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  scope.addEventListener("focus", refresh);
  scope.addEventListener("online", refresh);
})(typeof window === "undefined" ? globalThis : window);
