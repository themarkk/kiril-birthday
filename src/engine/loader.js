// Carica tutti i JSON elencati in data/manifest.json. L'arte mancante non blocca il gioco (ci sono i fallback).

async function getJson(url, optional = false) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    try {
      return await res.json();
    } catch (e) {
      throw new Error(`${url}: JSON non valido (${e.message})`);
    }
  } catch (e) {
    if (optional) {
      console.warn('[loader] opzionale mancante:', e.message);
      return {};
    }
    throw e;
  }
}

export async function loadAll(manifestUrl = './data/manifest.json') {
  const manifest = await getJson(manifestUrl);
  const base = manifestUrl.replace(/manifest\.json$/, '');
  const data = { manifest, art: {}, maps: {}, dialogues: {} };
  const jobs = [];
  for (const name of manifest.art || []) {
    jobs.push(getJson(`${base}art/${name}.json`, true).then(j => { data.art[name] = j; }));
  }
  for (const id of manifest.maps || []) {
    jobs.push(getJson(`${base}maps/${id}.json`).then(j => { data.maps[id] = j; }));
  }
  for (const id of manifest.dialogues || []) {
    jobs.push(getJson(`${base}dialogues/${id}.json`).then(j => { data.dialogues[id] = j; }));
  }
  for (const name of manifest.other || []) {
    jobs.push(getJson(`${base}${name}.json`, name === 'music').then(j => { data[name] = j; }));
  }
  await Promise.all(jobs);
  return data;
}

export function showBootError(msg) {
  const el = document.getElementById('boot-error');
  if (!el) return;
  const local = location.protocol === 'file:';
  el.hidden = false;
  el.innerHTML = '';
  const p = document.createElement('p');
  p.textContent = local
    ? 'Il gioco va aperto tramite un server (es. python3 -m http.server 8080), non come file.'
    : 'Ops, qualcosa non si è caricato. Ricarica la pagina.';
  const small = document.createElement('p');
  small.style.opacity = '.6';
  small.style.fontSize = '14px';
  small.textContent = msg;
  el.append(p, small);
}
