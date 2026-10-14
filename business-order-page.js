(async function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const api = new KafakBusinessApi();
  const message = text => { $('#message').textContent = text; };
  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  let flow, busy = false, pinSerial = 0, pinTimer, priceTimer;
  function pending() {
    $('#pending').hidden = !flow.pending;
    $('#fields').disabled = busy || !!flow.pending;
    $('#retry').disabled = busy;
  }
  function clearPrice() {
    for (const id of ['product-price','delivery-price','total-price']) $('#' + id).textContent = '—';
    $('#provider').textContent = ''; $('#submit').disabled = true;
  }
  async function price() {
    clearPrice(); message('');
    try {
      const quote = await flow.price($('#sku').value, $('#state').value.trim());
      if (!quote) return;
      $('#product-price').textContent = money(quote.productAmount);
      $('#delivery-price').textContent = money(quote.courierAmount);
      $('#total-price').textContent = money(quote.total);
      $('#provider').textContent = quote.provider;
      $('#submit').disabled = flow.settings.acceptingOrders !== true;
      if (!flow.settings.acceptingOrders) $('#submit').textContent = 'Preview only · Ordering not active yet';
    } catch (error) { message(error.message); }
  }
  function showConfirmation(result) {
    $('#entry').hidden = true; $('#pending').hidden = true; $('#confirmation').hidden = false;
    $('#confirmed-id').textContent = result.orderid;
    $('#confirmed-total').textContent = 'Total: ' + money(result.quote.total);
    const link = KafakBusinessOrder.privateLink(location.href, result);
    $('#private-link').href = link;
    $('#whatsapp-link').href = KafakBusinessOrder.whatsapp(flow.settings, result, result.customer, link);
    message('');
  }
  async function send(retry) {
    if (busy) return;
    busy = true; pending(); message('Confirming your order…');
    try {
      // Form values were captured before disabling the controls.
      const result = retry ? await flow.retry() : await flow.submit(send.fields);
      showConfirmation(result);
    } catch (error) {
      message(error.uncertain || flow.pending ? 'The order is not confirmed yet. Use Retry saved submission to check the same request. ' + error.message : error.message);
      if (!flow.pending) await priceAfterError(error.message);
    } finally { busy = false; pending(); }
  }
  async function priceAfterError(text) { await price(); message(text + ' Review the displayed total before submitting again.'); }
  try {
    const oid = new URL(location.href).searchParams.get('oid');
    if (oid) {
      $('#entry').hidden = true;
      const access = new URLSearchParams(location.hash.slice(1)).get('access');
      const order = await api.ownOrder(oid, access);
      $('#saved-order').hidden = false;
      for (const [label, value] of [['Order',order.orderid],['Status',order.status],['Product',order.product],['Pack',order.variant],['Total',money(order.total)],['Delivery address',[order.name,order.house,order.place,order.postoffice,order.district,order.state,order.pincode].filter(Boolean).join(', ')],['Tracking',order.tracking]]) {
        const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value||'—'));$('#saved-details').append(p);
      }
      return;
    }
    flow = new KafakBusinessOrder(api, sessionStorage);
    const { products, settings } = await flow.load();
    $('#sku').replaceChildren(new Option('Choose a product / ഉൽപ്പന്നം തിരഞ്ഞെടുക്കുക', ''));
    for (const product of products) $('#sku').append(new Option([product.name,product.variant,product.label,product.size,product.colour].filter(Boolean).join(' · ') + ' — ' + money(Number(product.price)), product.sku));
    $('#preorder-box').hidden = settings.stockStatus !== 'no'; pending();
    $('#sku').addEventListener('change', price);
    $('#state').addEventListener('input', () => {
      ++flow.quoteSerial; flow.currentQuote=null; clearPrice();
      clearTimeout(priceTimer);priceTimer=setTimeout(price,350);
    });
    async function lookupPin() {
      const pin=$('#pin').value, serial=++pinSerial;
      if (!/^\d{6}$/.test(pin)) return;
      try {
        const response=await fetch('pincode_json_files/'+pin+'.json');if(!response.ok)return;
        const data=await response.json();if(serial!==pinSerial)return;
        const offices=Array.isArray(data)?data.map(o=>({Name:o.officename,District:o.district,State:o.statename})):[];
        if(!Array.isArray(offices)||!offices.length)return;
        $('#postoffices').replaceChildren(...offices.map(o=>new Option(o.Name,o.Name)));
        $('#postoffice').value=offices.length===1?offices[0].Name:'';
        $('#district').value=offices[0].District;$('#state').value=offices[0].State;await price();
      } catch { message('Address lookup is unavailable. Enter your post office, district and state.'); }
    }
    $('#pin').addEventListener('input', () => {
      ++pinSerial;clearTimeout(pinTimer);
      pinTimer=setTimeout(lookupPin,350);
    });
    $('#business-order-form').addEventListener('submit', event => {
      event.preventDefault();if(!event.target.reportValidity())return;
      send.fields=Object.fromEntries(new FormData(event.target));send.fields.state=send.fields.state.trim();send.fields.preorderConfirmed=event.target.elements.preorderConfirmed.checked;
      send(false);
    });
    $('#retry').addEventListener('click', () => send(true));
  } catch (error) { message(error.message); }
})();
