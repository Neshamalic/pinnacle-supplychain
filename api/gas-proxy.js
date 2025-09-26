// api/gas-proxy.js  (Vercel Serverless - CommonJS)

const GAS_BASE =
  process.env.GAS_BASE ||
  'https://script.google.com/macros/s/AKfycbxQ-sLWW04v6hdL6WaWd3aiaWL9fOD-Thu0kqEIAjpncIB9Rv7BZ7k9psAUWTxwsJdL/exec';

function hasCaptcha(html = '') {
  const t = String(html).toLowerCase();
  return t.includes('<html') &&
         (t.includes('captcha') || t.includes('unusual traffic') || t.includes('introduce los caracteres'));
}

module.exports = async (req, res) => {
  try {
    const qsIndex = req.url.indexOf('?');
    const qs = qsIndex >= 0 ? req.url.substring(qsIndex) : '';
    const url = GAS_BASE + qs;

    const init = { method: req.method };
    if (req.method === 'POST') {
      // Si Vercel entregó string, lo reenviamos tal cual; si es objeto, serializamos.
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      init.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      init.body = rawBody;
    }

    const r = await fetch(url, init);
    const text = await r.text();

    if (!text) return res.status(r.status).json({ ok: false, error: 'Respuesta vacía del backend.' });
    if (hasCaptcha(text)) return res.status(502).json({ ok: false, error: 'CAPTCHA detectado por Google. El proxy lo bloqueó.' });

    try {
      const json = JSON.parse(text);
      return res.status(r.status).json(json);
    } catch {
      return res.status(r.status).send(text);
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
};

