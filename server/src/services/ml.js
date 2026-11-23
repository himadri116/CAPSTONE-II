const { mlUrl } = require('../config');

exports.analyze = async (files) => {
  const res = await fetch(`${mlUrl}/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ files }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`ML service responded ${res.status}`);
  return res.json();
};
