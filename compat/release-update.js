(() => {
  const release = "20261022d";
  let edited = false, checking = false;
  document.addEventListener("input", () => {
    edited = true;
  }, true);
  document.addEventListener("change", () => {
    edited = true;
  }, true);
  async function check() {
    if (checking || document.hidden || edited) return;
    checking = true;
    try {
      const response = await fetch("release.json?t=" + Date.now(), {
        cache: "no-store"
      });
      const latest = await response.json();
      if (response.ok && latest.release && latest.release !== release && !edited) {
        const url = new URL(location.href);
        if (url.searchParams.get("_release") === latest.release) return;
        url.searchParams.set("_release", latest.release);
        location.replace(url.href);
      }
    } catch (_unused) {
    } finally {
      checking = false;
    }
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      var _event$data;
      if (((_event$data = event.data) === null || _event$data === void 0 ? void 0 : _event$data.type) === "KAFAK_RELEASE") check();
    });
    navigator.serviceWorker.register("sw.js", {
      updateViaCache: "none"
    }).then((reg) => {
      reg.update().catch(() => {
      });
      setInterval(() => reg.update().catch(() => {
      }), 6e4);
    }).catch(() => {
    });
  }
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", check);
  setInterval(check, 6e4);
  check();
})();
