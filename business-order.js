/* Migration candidate: the live order page does not load this file yet. */
(function (scope) {
  'use strict';
  class BusinessOrder {
    constructor(api, storage, newId = () => crypto.randomUUID()) {
      this.api = api; this.storage = storage; this.newId = newId;
      this.quoteSerial = 0; this.currentQuote = null; this.pending = null;
      const saved = storage.getItem('kafak-business-pending-order');
      if (saved) {
        try { this.pending = JSON.parse(saved); }
        catch { this.pendingError='The saved submission cannot be read. Contact Kafak before submitting again.'; }
        if (!this.pending?.requestId || !this.pending?.data) {this.pendingError='The saved submission is incomplete. Contact Kafak before submitting again.';this.pending=null;}
      }
    }
    async load() {
      const [products, settings] = await Promise.all([this.api.catalog(), this.api.settings()]);
      if (!Array.isArray(products) || !settings.contactPhone) throw new Error('The catalog is unavailable. Please retry.');
      this.products = products; this.settings = settings;
      return { products, settings };
    }
    async price(sku, state) {
      const serial = ++this.quoteSerial;
      this.currentQuote = null;
      if (!sku || !state.trim()) return null;
      const quote = await this.api.quote(sku, state);
      if (serial !== this.quoteSerial) return null;
      if (quote.sku !== sku || !Number.isFinite(quote.total)) throw new Error('The delivery price could not be verified.');
      this.currentQuote = { sku, state, quote };
      return quote;
    }
    async submit(fields) {
      if(this.pendingError)throw Error(this.pendingError);
      if (this.pending) throw new Error('Confirm the previous submission using Retry before starting another order.');
      if (this.settings.acceptingOrders !== true) throw new Error('This preview is not accepting orders yet. Use the current order page.');
      const priced = this.currentQuote;
      if (!priced || priced.sku !== fields.sku || priced.state !== fields.state) throw new Error('Review the latest delivery total before submitting.');
      if (this.settings.stockStatus === 'no' && fields.preorderConfirmed !== true) throw new Error('Confirm this pre-order before submitting.');
      this.pending = { requestId: this.newId(), data: { ...fields, expectedTotal: priced.quote.total } };
      // Persist before sending. A reload or lost response must reuse this UUID.
      try { this.storage.setItem('kafak-business-pending-order', JSON.stringify(this.pending)); }
      catch (e) { this.pending = null; throw new Error('Allow browser storage before submitting so a retry cannot duplicate your order.'); }
      this.storage.requirePersistent?.();return this.retry();
    }
    async retry() {
      if (!this.pending) throw new Error('There is no pending submission.');
      if (this.inFlight) return this.inFlight;
      const submission = this.pending;
      const mayAlreadyExist = submission.attempted === true;
      submission.attempted = true;
      this.storage.setItem('kafak-business-pending-order', JSON.stringify(submission));
      this.storage.requirePersistent?.();
      this.inFlight = this.api.submitOrder(submission.data, submission.requestId).then(result => {
        if (result.result !== 'success' || !result.orderid || !result.accessToken || !result.quote) throw Object.assign(new Error('The order response was incomplete. Retry to confirm the same order.'), { uncertain: true });
        // Save the private link before removing retry information.
        this.storage.setItem('kafak-business-last-order', JSON.stringify({ ...result, name: submission.data.name }));
        this.storage.removeItem('kafak-business-pending-order');
        this.pending = null;
        return { ...result, customer: submission.data };
      }).catch(error => {
        // These errors explicitly reject a request before a transaction commits.
        // Network failures and 5xx retain the exact payload and UUID for retry.
        if (!mayAlreadyExist && [400, 409, 422].includes(error.status)) {
          this.storage.removeItem('kafak-business-pending-order');
          this.pending = null; this.currentQuote = null;
        }
        throw error;
      }).finally(() => { this.inFlight = null; });
      return this.inFlight;
    }
    static contact(order){
      const keys={whatsapp:'whatsapp',phone:'phone',alt:'altphone',paid:'paidNum'};
      const meta=String(order.adminMeta||'').replace(/P?_\d+/g,'').trim();
      let type=/^[MWAGPSTR\s]*$/.test(meta)?(meta.includes('G')?'paid':meta.includes('M')?'phone':meta.includes('A')?'alt':meta.includes('W')?'whatsapp':null):null;
      if(!type&&order.preferredWhatsAppNumber){const normalized=n=>String(n||'').replace(/\D/g,'').slice(-10);type=Object.keys(keys).find(k=>normalized(order[keys[k]])===normalized(order.preferredWhatsAppNumber));if(!type){order.paidNum=order.paidNum||order.preferredWhatsAppNumber;type='paid';}}
      if(!type||!order[keys[type]])type=order.whatsapp?'whatsapp':'phone';
      return {type,number:order[keys[type]]||order.whatsapp||order.phone||''};
    }
    static async shareLink(page, order) {
      if (!/^[A-Za-z0-9_-]{22}$/.test(order.shortCode||'') && order.accessToken) {
        const response=await fetch('https://production.kafaklife.com/kafak-business/api/public/order?'+new URLSearchParams({oid:order.orderid}),{headers:{Authorization:'Bearer '+order.accessToken},cache:'no-store'});
        if(!response.ok)throw new Error('Unable to prepare the secure link. Please retry.');
        const current=await response.json();
        if(!/^[A-Za-z0-9_-]{22}$/.test(current.shortCode||''))throw new Error('Secure link unavailable. Please reload the order.');
        order.shortCode=current.shortCode;
      }
      return this.privateLink(page,order);
    }
    static privateLink(page, order) {
      if (/^[A-Za-z0-9_-]{22}$/.test(order.shortCode||'')) return new URL('/o/#'+order.shortCode,page).href;
      const url = new URL(page); url.search = '';
      url.searchParams.set('oid', order.orderid);
      url.hash = new URLSearchParams({ access: order.accessToken }).toString();
      return url.href;
    }
    static whatsapp(settings, order, customer, link) {
      const phone = String(settings.contactPhone).replace(/\D/g, '');
      if (!/^\d{10,15}$/.test(phone)) throw new Error('The business WhatsApp number is not configured.');
      const q = order.quote;
      const message = [ 'NEW ORDER', order.orderid, customer.name,
        `${q.product} · ${q.variant} · ${q.quantity}`,
        `Product: ₹${q.productAmount}`, `Delivery: ₹${q.courierAmount}`, `Total: ₹${q.total}`,
        [customer.house, customer.place, customer.postoffice, customer.district, customer.state, customer.pincode].filter(Boolean).join(', '),
        `Phone: ${customer.phone}`, link ].join('\n');
      return 'https://wa.me/' + (phone.length === 10 ? '91' : '') + phone + '?text=' + encodeURIComponent(message);
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = BusinessOrder;
  else scope.KafakBusinessOrder = BusinessOrder;
})(typeof window === 'undefined' ? globalThis : window);
