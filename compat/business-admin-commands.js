(function(scope) {
  "use strict";
  const allowed = /* @__PURE__ */ new Set(["adjustStickerStock", "bulkIndiaPostBooking", "bulkUpdateStatus", "deleteOrder", "deleteRefund", "addExpense", "editExpense", "updatePaidNum", "updatePhoneNumbers", "addPostalTrackers", "assignTrackers", "revertTrackers", "saveInventory", "editOrder", "submitOffline"]);
  const canonical = (x) => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canonical(x[k])])) : x;
  class AdminCommands {
    constructor(api, storage, {
      id = () => crypto.randomUUID(),
      digest = async (text) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))).map((n) => n.toString(16).padStart(2, "0")).join("")
    } = {}) {
      this.api = api;
      this.storage = storage;
      this.id = id;
      this.digest = digest;
      this.inflight = /* @__PURE__ */ new Map();
    }
    async key(payload) {
      return "kafak-business-command:" + await this.digest(JSON.stringify(canonical(payload)));
    }
    async send(payload, {
      preview = false
    } = {}) {
      if (!allowed.has(payload === null || payload === void 0 ? void 0 : payload.action)) throw Error("This action is not connected to the database yet.");
      const key = await this.key(payload) + (preview ? ":preview" : "");
      if (this.inflight.has(key)) return this.inflight.get(key);
      const work = this.run(key, payload, preview).finally(() => this.inflight.delete(key));
      this.inflight.set(key, work);
      return work;
    }
    async run(key, payload, preview) {
      var _data$data;
      let entry;
      const stored = this.storage.getItem(key);
      try {
        entry = stored ? JSON.parse(stored) : {
          requestId: this.id(),
          uploadId: this.id()
        };
      } catch (_unused) {
        throw Error("Saved request cannot be read; resolve it before retrying.");
      }
      if (!entry.requestId || !entry.uploadId) throw Error("Saved request is incomplete.");
      if (entry.result) return entry.result;
      this.storage.setItem(key, JSON.stringify(entry));
      const data = JSON.parse(JSON.stringify(payload));
      if (data.data && ["addExpense", "editExpense"].includes(data.action)) data.data.expId = data.data.expId || data.data.editId || data.data.id;
      if ((_data$data = data.data) !== null && _data$data !== void 0 && _data$data.fileData) {
        if (preview) throw Error("Upload previews do not create Drive files.");
        if (!entry.receipt) {
          const uploaded = await this.api.uploadReceipt({
            requestId: entry.uploadId,
            fileData: data.data.fileData,
            fileName: data.data.fileName
          });
          if (!/^https:\/\/drive\.google\.com\//.test(uploaded.url || "")) throw Error("Drive upload was not confirmed");
          entry.receipt = uploaded.url;
          this.storage.setItem(key, JSON.stringify(entry));
        }
        data.data.proofUrl = entry.receipt;
      }
      if (data.data) {
        delete data.data.fileData;
        delete data.data.fileName;
      }
      const result = await this.api.adminAction(data, entry.requestId, {
        preview
      });
      if (result.result !== "success" && !(data.action === "deleteRefund" && result.result === "not_found")) throw Error("The database did not confirm this action.");
      if (data.action === "bulkUpdateStatus" && Number(result.count) !== data.updates.length) throw Error("The whole batch was not confirmed.");
      entry.result = result;
      this.storage.setItem(key, JSON.stringify(entry));
      return result;
    }
    async acknowledge(payload, {
      preview = false
    } = {}) {
      this.storage.removeItem(await this.key(payload) + (preview ? ":preview" : ""));
    }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = AdminCommands;
  else scope.KafakBusinessAdminCommands = AdminCommands;
})(typeof window === "undefined" ? globalThis : window);
