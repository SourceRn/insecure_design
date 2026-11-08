const fs = require('fs');
const path = require('path');
const { MAX_BODY } = require('./config');
const PUBLIC = path.join(__dirname, '..', 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
};
function cabecerasSeguras(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
}
function enviar(res, status, data) {
  res._status = status;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
function leerJSON(req) {
  return new Promise((resolve) => {
    let raw = '';
    let demasiado = false;
    req.on('data', (c) => {
      raw += c;
      if (raw.length > MAX_BODY) {
        demasiado = true;
        req.destroy();
      }
    });
    req.on('close', () => { if (demasiado) resolve(null); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
  });
}
function estatico(req, res, pathname) {
  const archivo = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!archivo.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403); return res.end();
  }
  fs.readFile(archivo, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream' });
    res.end(data);
  });
}
function bitacora(req, res, body) {
  const color = res._status < 300 ? '\\x1b[32m' : res._status < 500 ? '\\x1b[33m' : '\\x1b[31m';
  const extra = Object.keys(body).length ? ' ' + JSON.stringify(body) : '';
  const hora = new Date().toLocaleTimeString('es-MX');
  console.log(`\\x1b[90m${hora}\\x1b[0m ${req.method} ${req.url.split('?')[0]}${extra} ${color}${res._status}\\x1b[0m`);
}
module.exports = { cabecerasSeguras, enviar, leerJSON, estatico, bitacora };
