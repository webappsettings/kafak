/* Maps the existing courier settings controls to versioned database actions. */
(function (scope) {
  'use strict';
  class BusinessCourierSettings {
    constructor(api, newId = () => crypto.randomUUID()) {
      this.api = api; this.newId = newId; this.rows = []; this.pending = null;
    }
    async load() {
      const response = await this.api.courierSettings();
      if (response.status !== 'success' || !Array.isArray(response.data)) throw new Error('Courier settings could not be loaded.');
      this.rows = response.data;
      return response;
    }
    row(number) {
      const row = this.rows[Number(number) - 2];
      if (!row?.key || !row.version) throw new Error('Reload courier settings before saving.');
      return row;
    }
    async save(data, options) {
      const fingerprint = JSON.stringify(data);
      if (this.pending && this.pending.fingerprint !== fingerprint) throw new Error('Retry the previous settings change before making another change.');
      if (!this.pending) this.pending = { fingerprint, id: this.newId(), data };
      if (this.inFlight) return this.inFlight;
      const pending = this.pending;
      this.inFlight = this.api.adminAction(pending.data, pending.id, options).then(result => {
        if (result.result !== 'success' || result.status !== 'success') throw Object.assign(new Error('The settings change could not be confirmed. Retry the same change.'), { uncertain: true });
        this.pending = null;
        return result;
      }).catch(error => {
        if ([400, 409, 422].includes(error.status)) this.pending = null;
        throw error;
      }).finally(() => { this.inFlight = null; });
      return this.inFlight;
    }
    rates(number, rates, margin, options) {
      const row = this.row(number);
      return this.save({ action: 'updateCourierRates', key: row.key, version: row.version, rates, margin }, options);
    }
    default(number, options) {
      const row = this.row(number);
      return this.save({ action: 'setDefaultCourier', key: row.key, version: row.version }, options);
    }
    add(state, provider, rates, margin, rateGroup, options) {
      return this.save({ action: 'addCourierRow', state, provider, rates, margin, rateGroup }, options);
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = BusinessCourierSettings;
  else scope.KafakBusinessCourierSettings = BusinessCourierSettings;
})(typeof window === 'undefined' ? globalThis : window);
