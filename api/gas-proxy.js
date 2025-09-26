// api/gas-proxy.js
// Vercel Serverless Function (CommonJS)

const GAS_BASE =
  process.env.GAS_BASE ||
  'https://script.google.com/macros/s/AKfycbxQ-sLWW04v6hdL6WaWd3aiaWL9fOD-Thu0kqEIAjpncIB9Rv7BZ7k9psAUWTxwsJdL/exec';

function hasCaptcha(htmlText = '') {
  const t = String(htmlText).toLowerCase();
  return t.includes('<html') &&
         (t.includes('captcha') || t.includes('unusual traffic') || t.includes('introduce los caracteres'));
}

module.exports = async (req, res) => {
  try {
    // conserva la query original
    const qsIndex = req.url.indexOf('?');
    const qs = qsIndex >= 0 ? req.url.substring(qsIndex) : '';
    const url = GAS_BASE + qs;

    const init = { method: req.method };
    if (req.method === 'POST') {
      init.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      init.body = JSON.stringify(req.body ?? {});
    }

    const r = await fetch(url, init);
    const text = await r.text();

    if (!text) return res.status(r.status).json({ ok: false, error: 'Respuesta vacía del backend.' });
    if (hasCaptcha(text)) {
      return res.status(502).json({
        ok: false,
        error: 'Google devolvió un CAPTCHA. El proxy lo detectó y lo bloqueó. Deja el proxy como único acceso.'
      });
    }

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
