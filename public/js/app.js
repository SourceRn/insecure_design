const $ = id => document.getElementById(id);
const fmt = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const response = await fetch(url, opts);
  let data = {};
  try { data = await response.json(); } catch {}
  return { ok: response.ok, status: response.status, data };
}

function msg(text, ok) {
  $('msg').textContent = text || '';
  $('msg').className = 'msg ' + (ok ? 'ok' : 'err');
}

function render(cart) {
  $('subtotal').textContent = fmt(cart.subtotalBase);
  $('descuento').textContent = '-' + fmt(cart.descuento);
  $('total').textContent = fmt(cart.totalActual);
  const porcentaje = cart.subtotalBase ? cart.totalActual / cart.subtotalBase * 100 : 0;
  $('pct').textContent = porcentaje.toFixed(1) + '%';
  $('meter').style.width = porcentaje + '%';
}

// ------------------------------------------------------------------
// NOTA DE DISEÑO: esto es UX normal de cualquier tienda en línea — el
// botón se deshabilita tras un click exitoso para que el usuario no
// aplique el cupón por accidente dos veces. ESTO NO ES UNA MEDIDA DE
// SEGURIDAD. Es cosmético: cualquiera puede re-habilitar el botón desde
// DevTools, o simplemente repetir la petición POST con Postman/curl,
// porque el servidor (/api/checkout/apply-coupon) nunca valida si el
// cupón ya fue usado. La seguridad real tiene que vivir en el backend.
// ------------------------------------------------------------------
function bloquearBotonCupon() {
  $('apply').disabled = true;
  $('apply').textContent = 'Cupón aplicado ✓';
  $('code').disabled = true;
}

function desbloquearBotonCupon() {
  $('apply').disabled = false;
  $('apply').textContent = 'Aplicar';
  $('code').disabled = false;
}

async function refresh() {
  const result = await api('GET', '/api/cart');
  if (result.ok) render(result.data);
}

$('apply').onclick = async () => {
  const result = await api('POST', '/api/checkout/apply-coupon', { couponCode: $('code').value });
  msg(result.data.message || result.data.error, result.ok);
  if (result.ok) bloquearBotonCupon(); // solo cosmético, ver nota arriba
  await refresh();
};

$('pay').onclick = async () => {
  const result = await api('POST', '/api/checkout/pay');
  msg(result.data.message ? result.data.message + '. Monto: ' + fmt(result.data.montoCobrado) : result.data.error, result.ok);
  await refresh();
};

$('reset').onclick = async () => {
  const result = await api('POST', '/api/cart/reset');
  desbloquearBotonCupon();
  msg(result.data.message || 'Orden reiniciada.', result.ok);
  await refresh();
};

refresh();