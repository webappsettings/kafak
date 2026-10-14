/* Kafak Business transport. Loaded only by the migration frontend until cutover. */
(function (scope) {
  'use strict';
  class BusinessApi {
    constructor(base = 'https://production.kafaklife.com/kafak-business/api', fetcher = (...args) => globalThis.fetch(...args)) {
      this.base = base.replace(/\/$/, '');
      this.fetcher = fetcher;
      this.pending = new Map();
    }
    async request(path, { method = 'GET', data, requestId, accessToken, signal, timeout = 20000 } = {}) {
      const controller = new AbortController();
      const abort = () => controller.abort(signal.reason);
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const headers = { Accept: 'application/json' };
        if (data !== undefined) headers['Content-Type'] = 'application/json';
        if (requestId) headers['Idempotency-Key'] = requestId;
        if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
        const response = await this.fetcher(this.base + path, {
          method, headers, credentials: 'include', signal: controller.signal,
          ...(data === undefined ? {} : { body: JSON.stringify(data) })
        });
        let body;
        try { body = await response.json(); }
        catch { throw Object.assign(new Error('The server response could not be confirmed. Keep this request and retry.'), { uncertain: method !== 'GET' }); }
        if (!response.ok) throw Object.assign(new Error(body.error || body.message || 'Request failed'), { status: response.status, uncertain: response.status >= 500 && method !== 'GET' });
        return body;
      } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError' || error instanceof TypeError) error.uncertain = method !== 'GET';
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    }
    catalog() { return this.request('/public/catalog'); }
    settings() { return this.request('/public/settings'); }
    quote(sku, state, provider) {
      const query = new URLSearchParams({ sku, state });
      if (provider) query.set('provider', provider);
      return this.request('/public/quote?' + query);
    }
    login(username, password) { return this.request('/login', { method: 'POST', data: { username, password } }); }
    me() { return this.request('/me'); }
    logout() { return this.request('/logout', { method: 'POST', data: {} }); }
    orders({ before, q, status, view = 'history' } = {}) {
      const query = new URLSearchParams({ view, limit: '50' });
      for (const [key, value] of Object.entries({ before, q, status })) if (value) query.set(key, value);
      return this.request('/admin/orders?' + query);
    }
    today() { return this.request('/admin/orders/today'); }
    order(id) { return this.request('/admin/order?' + new URLSearchParams({ oid: id })); }
    customer(phone) { return this.request('/admin/customer?' + new URLSearchParams({ phone })); }
    ownOrder(id, accessToken) { return this.request('/public/order?' + new URLSearchParams({ oid: id }), { accessToken }); }
    mutation(path, data, requestId, { accessToken } = {}) {
      if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(requestId || '')) return Promise.reject(new Error('Keep a request ID with this draft before submitting.'));
      const fingerprint = JSON.stringify({ path, data, accessToken });
      const existing = this.pending.get(requestId);
      if (existing) return existing.fingerprint === fingerprint ? existing.promise : Promise.reject(new Error('This request ID is already submitting different data.'));
      const promise = this.request(path, { method: 'POST', data, requestId, accessToken }).finally(() => this.pending.delete(requestId));
      this.pending.set(requestId, { fingerprint, promise });
      return promise;
    }
    submitOrder(data, requestId) {
      if (!data.sku || data.expectedTotal == null || !Number.isFinite(Number(data.expectedTotal)) || data.expectedTotal === '' || Number(data.expectedTotal) < 0) return Promise.reject(new Error('Review the product and delivery quote before submitting.'));
      return this.mutation('/public/orders', data, requestId);
    }
    adminAction(data, requestId, { preview = false } = {}) {
      return this.mutation(preview ? '/admin/preview' : '/admin/action', data, requestId);
    }
    editOwnOrder(id, accessToken, data, requestId) {
      return this.mutation('/public/order?' + new URLSearchParams({ oid: id }), data, requestId, { accessToken });
    }
    uploadReceipt(file) { return this.request('/drive-upload', { method: 'POST', data: file, timeout: 65000 }); }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = BusinessApi;
  else scope.KafakBusinessApi = BusinessApi;
})(typeof window === 'undefined' ? globalThis : window);
