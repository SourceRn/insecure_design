const { CATALOGO } = require('./datos');

const redondear = n => Math.round(n * 100) / 100;

function nuevaOrden() { return { items: [{ sku: 'LAP-001', qty: 1 }], total: 1000 }; }

let orden = nuevaOrden();

function ordenDe() { return orden; }

function reiniciarOrden() { orden = nuevaOrden(); return orden; }

function vistaOrden(o) {
  const subtotalBase = redondear(o.items.reduce((s, i) => s + CATALOGO[i.sku].price * i.qty, 0));
  return { subtotalBase, descuento: redondear(subtotalBase - o.total), totalActual: redondear(o.total) };
}
module.exports = { redondear, ordenDe, reiniciarOrden, vistaOrden };