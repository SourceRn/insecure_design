# Tutorial: corregir el cupón infinito de TecnoShop

## Objetivo
Partir únicamente de la versión vulnerable y modificar el servidor para que `PROMO20` solo pueda utilizarse una vez por orden. No se necesita login ni recuperación de contraseña: esta práctica representa una regla de negocio mal definida y no aplicada.

## 1. Ejecutar y observar la falla
En la carpeta del proyecto vulnerable:
```bash
npm start
```
Abre `http://localhost:3000`, deja `PROMO20` y pulsa **Aplicar**. El botón se deshabilita y
el precio baja un 20%. Hasta aquí, parece que la interfaz te protege de aplicarlo dos veces.

Ahora **recarga la página** (F5) y pulsa **Aplicar** otra vez. El botón vuelve a estar
habilitado, y el precio vuelve a bajar. Repite el proceso varias veces:

| Aplicación | Acción              |      Total |
|-----------:|:--------------------|-----------:|
| Inicial    | —                    | $1,000.00  |
| 1          | Aplicar              |   $800.00  |
| 2          | Recargar + Aplicar   |   $640.00  |
| 3          | Recargar + Aplicar   |   $512.00  |
| 4          | Recargar + Aplicar   |   $409.60  |

El botón deshabilitado nunca fue una protección real: es solo un estado temporal en la
memoria del navegador. Al recargar la página, ese estado se pierde y el botón vuelve a
estar disponible — porque el servidor nunca supo que el cupón ya se había usado.

La aplicación del navegador no es la causa principal: el servidor acepta repetidamente el
mismo cupón, sin importar cuántas veces se recargue la página ni qué tan "bloqueado" se vea
el botón en pantalla.

## 2. Localizar el código vulnerable
Abre `src/rutas/checkout.js`. Busca la ruta:
```js
'POST /api/checkout/apply-coupon'
```
En la versión vulnerable aparece esta operación:
```js
o.total = redondear(o.total * (1 - CUPONES[code].valor / 100));
```
El servidor toma el total actual y vuelve a restarle el 20%. Además, no guarda ningún dato que indique que `PROMO20` ya se utilizó.

## 3. Definir la regla de negocio
Antes de programar, escribe la regla que debe cumplir la tienda:

- Un cupón debe existir en el catálogo de cupones.
- Cada cupón se puede aplicar como máximo una vez por orden.
- El descuento se calcula desde el subtotal original.
- Una orden pagada no admite más cambios.

Esta definición evita que el comportamiento dependa de cuántas veces se pulse el botón.

## 4. Guardar los cupones utilizados en la orden
Abre `src/ordenes.js`. En la función `nuevaOrden`, cambia el objeto vulnerable por uno que guarde una lista de cupones y el estado de la orden:
```js
function nuevaOrden() {
  return {
    items: [{ sku: 'LAP-001', qty: 1 }],
    appliedCoupons: [],
    status: 'abierta'
  };
}
```
`appliedCoupons` comienza vacío y contendrá los códigos que ya se utilizaron. `status` permite distinguir una orden abierta de una pagada.

## 5. Calcular siempre desde el subtotal original
En `src/ordenes.js`, agrega o adapta esta función:
```js
function calcularTotales(o) {
  const subtotalBase = redondear(
    o.items.reduce(
      (s, i) => s + CATALOGO[i.sku].price * i.qty,
      0
    )
  );

  const descuento = redondear(
    o.appliedCoupons.reduce(
      (s, code) => s + subtotalBase * CUPONES[code].valor / 100,
      0
    )
  );

  return {
    subtotalBase,
    descuento,
    totalActual: redondear(Math.max(0, subtotalBase - descuento))
  };
}
```
La diferencia importante es que el 20% se calcula con `subtotalBase`, no con el total después del descuento. Para esta práctica se permite un cupón por orden.

Asegúrate de que `vistaOrden` utilice `calcularTotales` y exporta ambas funciones:
```js
function vistaOrden(o) {
  return {
    ...calcularTotales(o),
    status: o.status,
    cuponesAplicados: o.appliedCoupons
  };
}
module.exports = {
  redondear, ordenDe, reiniciarOrden, calcularTotales, vistaOrden
};
```

## 6. Validar el cupón en el servidor
Regresa a `src/rutas/checkout.js`. Dentro de `POST /api/checkout/apply-coupon`, después de validar que el código exista, agrega las reglas:
```js
if (o.status !== 'abierta') {
  return enviar(res, 409, { error: 'La orden ya fue pagada.' });
}

if (
  o.appliedCoupons.includes(code) ||
  o.appliedCoupons.length >= MAX_CUPONES_POR_ORDEN
) {
  return enviar(res, 409, {
    error: 'Este cupón ya fue utilizado en esta orden.'
  });
}
```
Importa el límite desde configuración:
```js
const { MAX_CUPONES_POR_ORDEN } = require('../config');
```
Y, cuando pase todas las validaciones, registra el uso antes de responder:
```js
o.appliedCoupons.push(code);
enviar(res, 200, {
  message: 'Cupón aplicado.',
  ...vistaOrden(o)
});
```
La validación y el registro deben ocurrir en el servidor. Deshabilitar el botón en JavaScript no sería suficiente, porque alguien podría enviar la petición directamente a la API.

## 7. Evitar que se pague dos veces
En la ruta `POST /api/checkout/pay`, valida que la orden siga abierta. Después calcula el total, cambia su estado a `pagada` y responde:
```js
const o = ordenDe();
if (o.status !== 'abierta') {
  return enviar(res, 409, { error: 'La orden ya fue pagada.' });
}
const { totalActual } = calcularTotales(o);
o.status = 'pagada';
enviar(res, 200, {
  message: 'Pago procesado.',
  montoCobrado: totalActual
});
```

## 8. Probar la corrección
Reinicia el servidor y pulsa **Reiniciar orden** para comenzar desde $1,000.

1. Aplica `PROMO20`: debe quedar en $800.
2. Aplica `PROMO20` otra vez: debe responder que ya fue utilizado y conservar $800.
3. Pulsa **Pagar**: debe cobrar $800.
4. Intenta aplicar el cupón o pagar de nuevo: el servidor debe rechazarlo.
5. Pulsa **Reiniciar orden**: comienza una orden nueva y el cupón vuelve a estar disponible.

## 9. Qué explicar al grupo
**Diseño inseguro (OWASP A06):** el sistema no había definido ni aplicado correctamente una regla esencial del negocio: la cantidad de veces que puede utilizarse un cupón. La API aceptaba solicitudes repetidas y generaba descuentos acumulativos.

**Corrección:** definir la regla, mantener el estado de los cupones usados en la orden, validar cada solicitud del lado del servidor, calcular el descuento sobre el precio original y bloquear cambios después del pago.

**Nota para una aplicación real:** este proyecto didáctico guarda la orden en memoria y usa una sola orden compartida para simplificar la exposición. En producción se necesitaría una base de datos, órdenes asociadas a un identificador seguro y una operación atómica/transaccional para evitar que dos solicitudes simultáneas consuman el mismo cupón.
