'use strict';
const API = (() => {
  async function req(method, path, body) {
    const opts = { method, credentials: 'include', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try { res = await fetch('/api' + path, opts); }
    catch { throw new Error('Network error — check your connection'); }

    if (res.status === 401) {
      window.location.replace('/login.html');
      return null;
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }
  return {
    get:   p      => req('GET',    p),
    post:  (p, b) => req('POST',   p, b),
    put:   (p, b) => req('PUT',    p, b),
    patch: (p, b) => req('PATCH',  p, b),
    del:   p      => req('DELETE', p),
  };
})();
