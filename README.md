# TecnoShop — práctica OWASP A06:2025 Diseño inseguro (VERSIÓN VULNERABLE)

Esta edición se enfoca exclusivamente en el cupón de descuento reutilizable. No contiene login, usuarios, sesiones ni recuperación de contraseña.

## Ejecutar
Requiere Node.js 18 o superior.
```bash
npm start
```
Abre http://localhost:3000

Cupón válido: `PROMO20` (20%).

## Falla intencional
El servidor no registra que el cupón ya fue usado. Cada petición descuenta 20% del total actual:
$1,000 → $800 → $640 → $512 → $409.60...

Reinicia la orden para volver a comenzar la demostración. Los datos se guardan en memoria y se reinician al reiniciar el servidor.

Consulta `TUTORIAL-RESOLUCION.md` para corregirla paso a paso.
