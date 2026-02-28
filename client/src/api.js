const BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

function getToken() { return localStorage.getItem('vaad_token'); }
export function setToken(t) { localStorage.setItem('vaad_token', t); }
export function clearToken() { localStorage.removeItem('vaad_token'); }

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'שגיאה');
  return data;
}

export const api = {
  login: (username, password) => req('POST','/api/auth/login',{username,password}),
  // transactions
  getTx: (params={}) => req('GET',`/api/transactions?${new URLSearchParams(params)}`),
  addTx: t => req('POST','/api/transactions',t),
  updateTx: (id,t) => req('PUT',`/api/transactions/${id}`,t),
  deleteTx: id => req('DELETE',`/api/transactions/${id}`),
  bulkTx: txs => req('POST','/api/transactions/bulk',{transactions:txs}),
  // apartments
  getApts: () => req('GET','/api/apartments'),
  updateApt: (id,a) => req('PUT',`/api/apartments/${id}`,a),
  // stats & reports
  getStats: () => req('GET','/api/stats'),
  getReport: (dateFrom,dateTo) => req('GET',`/api/report?dateFrom=${dateFrom}&dateTo=${dateTo}`),
  // log
  getLog: () => req('GET','/api/log'),
  // settings
  getSettings: () => req('GET','/api/settings'),
  saveSettings: s => req('POST','/api/settings',s),
  // email
  emailStatus: () => req('GET','/api/email/status'),
  emailTest: () => req('POST','/api/email/test'),
  emailSend: aptId => req('POST',`/api/email/send/${aptId}`),
  emailSendAll: () => req('POST','/api/email/send-all'),
};
