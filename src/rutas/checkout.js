const { enviar } = require('../http');
const { CUPONES } = require('../datos');
const { ordenDe, reiniciarOrden, vistaOrden, redondear } = require('../ordenes');

module.exports = {
  'GET /api/cart': (req, res) => enviar(res, 200, vistaOrden(ordenDe())),
  'POST /api/cart/reset': (req, res) => enviar(res, 200, { message: 'Orden reiniciada.', ...vistaOrden(reiniciarOrden()) }),
  'POST /api/checkout/apply-coupon': (req, res, body) => {
    const o = ordenDe();
    const code = String(body.couponCode || '').trim().toUpperCase();
    if (!CUPONES[code]) return enviar(res, 400, { error: 'Cupón inválido.' });
    // VULNERABILIDAD INTENCIONAL: no se registra el uso del cupón.
    // Cada petición vuelve a descontar 20% del total ya rebajado.
    o.total = redondear(o.total * (1 - CUPONES[code].valor / 100));
    enviar(res, 200, { message: 'Cupón aplicado.', ...vistaOrden(o) });
  },
  'POST /api/checkout/pay': (req, res) => enviar(res, 200, { message: 'Pago procesado.', montoCobrado: ordenDe().total })
};
