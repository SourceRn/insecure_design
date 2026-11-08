const http = require('http');
const { PORT, VERSION } = require('./src/config');
const { cabecerasSeguras, enviar, leerJSON, estatico, bitacora } = require('./src/http');
const rutas = { ...require('./src/rutas/checkout') };
const servidor = http.createServer(async (req, res) => {
  cabecerasSeguras(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const handler = rutas[`${req.method} ${url.pathname}`];
  if (!handler) {
    if (url.pathname.startsWith('/api/')) return enviar(res, 404, { error: 'Ruta no encontrada' });
    return estatico(req, res, url.pathname);
  }
  let body = {};
  if (req.method === 'POST') {
    const esJSON = /^application\/json/i.test(req.headers['content-type'] || '');
    if (!esJSON && Number(req.headers['content-length'] || 0) > 0) {
      enviar(res, 415, { error: 'Content-Type debe ser application/json' });
      return bitacora(req, res, {});
    }
    body = await leerJSON(req);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      enviar(res, 400, { error: 'Solicitud inválida' });
      return bitacora(req, res, {});
    }
  }
  try { handler(req, res, body, url.searchParams, {}); }
  catch (e) {
    console.error(e);
    if (!res.headersSent) enviar(res, 500, { error: 'Error interno' });
  }
  bitacora(req, res, body);
});
servidor.listen(PORT, () => console.log(`TecnoShop (${VERSION}) en http://localhost:${PORT}\n`));
