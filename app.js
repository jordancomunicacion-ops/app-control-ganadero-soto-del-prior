// Simple storage helper
const storage = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error('No se pudo leer', key, err);
      return fallback;
    }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { console.error('No se pudo guardar', err); }
  }
};

const qs = (sel) => document.querySelector(sel);
const loginTab = qs('#loginTab');
const registerTab = qs('#registerTab');
const loginForm = qs('#loginForm');
const loginAlert = qs('#loginAlert');
const registerForm = qs('#registerForm');
const rememberCheck = qs('#rememberCheck');
const authSection = qs('#auth');
const appSection = qs('#app');
const profileName = qs('#profileName');
const profileEmail = qs('#profileEmail');
const profileSubtitle = qs('#profileSubtitle');
const sidebarAvatar = qs('#sidebarAvatar');
const profileAvatar = qs('#profileAvatar');
const profileSection = qs('#perfil');
const avatarInput = qs('#profileAvatarInput');
const avatarRemove = qs('#avatarRemove');
const profileForm = qs('#profileForm');
const profileNameInput = qs('#profileNameInput');
const profileEmailInput = qs('#profileEmailInput');
const profileDescInput = qs('#profileDescInput');
const profileCancel = qs('#profileCancel');
const logoutBtn = qs('#logout');
const settingsBtn = qs('#settingsBtn');
const metricTotal = qs('#metric-total');
const metricQuality = qs('#metric-quality');
const metricEngorde = qs('#metric-engorde');
const metricGain = qs('#metric-gain');
const barSac = qs('#bar-sacrificado');
const barDes = qs('#bar-destete');
const qualExc = qs('#qual-exc');
const qualBuena = qs('#qual-buena');
const qualMedia = qs('#qual-media');
const qualBaja = qs('#qual-baja');
const actionReport = qs('#action-report');
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const farmForm = qs('#farmForm');
const fincasList = qs('#fincasList');
const farmNameInput = qs('#farmName');
const farmLocationInput = qs('#farmLocation');
const farmSizeInput = qs('#farmSize');
const farmSoilInput = qs('#farmSoil');
const farmLicenseInput = qs('#farmLicense');
const farmAnimalsInput = qs('#farmAnimals');
const farmManagementInput = qs('#farmManagement');
const farmFeedInput = qs('#farmFeed');

let currentUser = null;

function getProfileKey(user) { return `profile_${user}`; }
function defaultProfile(user) { return { name: user, email: `${user}@correo.com`, desc: 'Inteligencia ganadera', avatar: null }; }
function getFincas() { return currentUser ? storage.read(`fincas_${currentUser}`, []) : []; }
function saveFincas(fincas) { if (currentUser) storage.write(`fincas_${currentUser}`, fincas); }

function showAuth() {
  authSection.classList.remove('hidden');
  appSection.classList.add('hidden');
}

function showApp(user) {
  authSection.classList.add('hidden');
  appSection.classList.remove('hidden');
  loadProfile(user);
  renderFincas();
  activateSection('section-dashboard');
}

function loadSession() {
  const remembered = storage.read('rememberedCreds', null);
  if (remembered) {
    qs('#loginUser').value = remembered.user || '';
    qs('#loginPass').value = remembered.pass || '';
    if (rememberCheck) rememberCheck.checked = true;
  }
  const user = storage.read('sessionUser', null);
  if (user) {
    currentUser = user;
    showApp(user);
  } else {
    showAuth();
  }
}

function switchTab(tab) {
  if (tab === 'login') {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

loginTab?.addEventListener('click', () => switchTab('login'));
registerTab?.addEventListener('click', () => switchTab('register'));

registerForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = qs('#regUser').value.trim();
  const email = qs('#regEmail').value.trim();
  const pass = qs('#regPass').value;
  if (!user || !pass || !email) return;
  const users = storage.read('users', []);
  if (users.some((u) => u.user === user)) {
    alert('Ese usuario ya existe');
    return;
  }
  users.push({ user, pass });
  storage.write('users', users);
  storage.write(getProfileKey(user), defaultProfile(user));
  storage.write('sessionUser', user);
  currentUser = user;
  showApp(user);
  registerForm.reset();
  loginAlert?.classList.add('hidden');
});

loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = qs('#loginUser').value.trim();
  const pass = qs('#loginPass').value;
  const users = storage.read('users', []);
  const match = users.find((u) => u.user === user && u.pass === pass);
  if (!match) {
    if (loginAlert) loginAlert.classList.remove('hidden');
    return;
  }
  if (loginAlert) loginAlert.classList.add('hidden');
  if (rememberCheck?.checked) storage.write('rememberedCreds', { user, pass });
  else storage.write('rememberedCreds', null);
  storage.write('sessionUser', user);
  currentUser = user;
  showApp(user);
  loginForm.reset();
});

logoutBtn?.addEventListener('click', () => {
  storage.write('sessionUser', null);
  currentUser = null;
  showAuth();
  profileSection?.classList.add('hidden');
  renderFincas();
});

actionReport?.addEventListener('click', () => {
  alert('Informe generado localmente (demo).');
});

settingsBtn?.addEventListener('click', () => {
  if (!profileSection) return;
  const isHidden = profileSection.classList.contains('hidden');
  if (isHidden) {
    activateSection('perfil');
    profileSection.classList.remove('hidden');
    profileSection.scrollIntoView({ behavior: 'smooth' });
  } else {
    profileSection.classList.add('hidden');
  }
});

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.dataset.target;
    if (target) activateSection(target);
  });
});

farmForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUser) {
    alert('Inicia sesion para registrar fincas.');
    return;
  }
  const finca = {
    id: crypto.randomUUID(),
    name: farmNameInput?.value.trim(),
    location: farmLocationInput?.value.trim(),
    size: parseFloat(farmSizeInput?.value),
    soil: farmSoilInput?.value.trim(),
    license: farmLicenseInput?.value.trim(),
    animals: parseInt(farmAnimalsInput?.value, 10),
    management: farmManagementInput?.value.trim(),
    feed: farmFeedInput?.value.trim()
  };
  if (!finca.name || !finca.location || Number.isNaN(finca.size) || !finca.soil || !finca.license || Number.isNaN(finca.animals) || !finca.management || !finca.feed) {
    alert('Completa todos los campos.');
    return;
  }
  const fincas = getFincas();
  fincas.push(finca);
  saveFincas(fincas);
  farmForm.reset();
  renderFincas();
});

function renderFincas() {
  if (!fincasList) return;
  const fincas = getFincas();
  fincasList.innerHTML = '';
  if (!fincas.length) {
    fincasList.innerHTML = '<p class="status">Sin fincas registradas.</p>';
    updateStats([]);
    return;
  }
  fincas.forEach((finca) => {
    const el = document.createElement('div');
    el.className = 'farm';
    el.innerHTML = `
      <div class="farm-title">
        <div>
          <strong>${finca.name}</strong>
          <div class="farm-meta">${finca.location} · ${finca.size} ha</div>
        </div>
        <span class="tag">${finca.soil}</span>
      </div>
      <div class="farm-meta">Licencia: ${finca.license} · Animales: ${finca.animals}</div>
      <div class="farm-meta">Manejo: ${finca.management} · Alimentacion: ${finca.feed}</div>
    `;
    fincasList.appendChild(el);
  });
  updateStats(fincas);
}

function activateSection(sectionId) {
  sections.forEach((sec) => {
    if (sec.id === sectionId) sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });
  navLinks.forEach((link) => {
    if (link.dataset.target === sectionId) link.classList.add('active');
    else link.classList.remove('active');
  });
  if (sectionId !== 'perfil' && profileSection) profileSection.classList.add('hidden');
}

function updateStats(fincas = []) {
  const total = fincas.length;
  if (metricTotal) metricTotal.textContent = String(total);
  if (metricQuality) metricQuality.textContent = `${Math.max(0, 60 + total * 2).toFixed(1)}/100`;
  if (metricEngorde) metricEngorde.textContent = String(Math.max(0, Math.round(total / 2)));
  if (metricGain) metricGain.textContent = `${Math.max(0, total * 5)} kg`;
  const base = Math.max(1, total);
  if (barSac) barSac.style.height = `${40 + Math.min(50, base * 5)}%`;
  if (barDes) barDes.style.height = `${20 + Math.min(30, base * 3)}%`;
  if (qualExc) qualExc.textContent = String(Math.max(0, total - 1));
  if (qualBuena) qualBuena.textContent = String(Math.max(0, total));
  if (qualMedia) qualMedia.textContent = '0';
  if (qualBaja) qualBaja.textContent = '0';
}

function loadProfile(user) {
  if (!user) return;
  const saved = storage.read(getProfileKey(user), defaultProfile(user));
  if (profileName) profileName.textContent = saved.name || user;
  if (profileEmail) profileEmail.textContent = saved.email || '';
  if (profileSubtitle) profileSubtitle.textContent = saved.desc || 'Inteligencia ganadera';
  if (profileNameInput) profileNameInput.value = saved.name || '';
  if (profileEmailInput) profileEmailInput.value = saved.email || '';
  if (profileDescInput) profileDescInput.value = saved.desc || '';
  renderAvatar(saved.avatar, saved.name || user);
  return saved;
}

function renderAvatar(dataUrl, name) {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  [sidebarAvatar, profileAvatar].forEach((el) => {
    if (!el) return;
    el.innerHTML = '';
    el.textContent = '';
    el.style.backgroundImage = '';
    if (dataUrl) {
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = name || 'avatar';
      el.appendChild(img);
    } else {
      el.textContent = initial;
    }
  });
}

function saveProfile() {
  if (!currentUser) return;
  const profile = {
    name: profileNameInput?.value.trim() || currentUser,
    email: profileEmailInput?.value.trim() || '',
    desc: profileDescInput?.value.trim() || '',
    avatar: profileAvatar.dataset.src || null
  };
  storage.write(getProfileKey(currentUser), profile);
  loadProfile(currentUser);
}

profileForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveProfile();
});

profileCancel?.addEventListener('click', () => {
  loadProfile(currentUser);
});

avatarInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    profileAvatar.dataset.src = reader.result;
    renderAvatar(reader.result, profileNameInput?.value || currentUser);
    saveProfile();
  };
  reader.readAsDataURL(file);
});

avatarRemove?.addEventListener('click', () => {
  profileAvatar.dataset.src = '';
  renderAvatar(null, profileNameInput?.value || currentUser);
  saveProfile();
});

document.addEventListener('DOMContentLoaded', loadSession);

// ==========================================
// SIGPAC INTEGRATION (Fixed & Robust)
// ==========================================

const sigpacProvInput = qs('#sigpacProv');
const sigpacMuniInput = qs('#sigpacMuni');
const sigpacPoliInput = qs('#sigpacPoli');
const sigpacParcInput = qs('#sigpacParc');
const searchSigpacBtn = qs('#searchSigpacBtn');
const sigpacStatus = qs('#sigpacStatus');
const sigpacLoading = qs('#sigpacLoading');

const locationBadge = qs('#locationBadge');
const sizeBadge = qs('#sizeBadge');


const SIGPAC_QUERY_BASE = 'https://sigpac-hubcloud.es/servicioconsultassigpac/query';
const SIGPAC_CODES_BASE = 'https://sigpac-hubcloud.es/codigossigpac';

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

async function fetchMunicipalities(provCode) {
  if (!provCode) return [];
  // Ensure provCode is 2 chars just in case
  const p = pad(provCode, 2);
  const url = `${SIGPAC_CODES_BASE}/municipio${p}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // data.codigos: array of { codigo: number, descripcion: string }
    return data.codigos || [];
  } catch (err) {
    console.error('Error fetching municipalities:', err);
    throw err;
  }
}

async function searchSIGPAC(prov, muni, poli, parc) {
  // Standard SIGPAC structure: 
  // Prov(2) / Muni(3) / Ag(1) / Zone(1) / Poly(3) / Parc(5) / Rec(1)

  const pr = pad(prov || 0, 2);
  const mu = pad(muni || 0, 3);
  const ag = '0';
  const zo = '0';
  const po = pad(poli || 0, 3);
  const pa = pad(parc || 0, 5);

  // We try querying Recinto 1. If it fails, we might need a different strategy,
  // but Recinto 1 exists for almost all declared parcels.
  const re = '1';

  const url = `${SIGPAC_QUERY_BASE}/recinfo/${pr}/${mu}/${ag}/${zo}/${po}/${pa}/${re}.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Parcela no encontrada (HTTP ${response.status})`);
  }
  return await response.json();
}

function parseSIGPACData(data) {
  let item = null;

  // Check if it's an array (Standard recinfo response)
  if (Array.isArray(data) && data.length > 0) {
    item = data[0];
  }
  // Check if it's GeoJSON properties (Fallback/Legacy)
  else if (data && data.properties) {
    item = data.properties;
  }

  if (!item) return null;

  // Get human-readable names from the dropdowns if available
  let muniName = item.dn_muni || item.municipio;
  let provName = item.dn_prov || item.provincia;

  // Try to get text from dropdowns
  if (sigpacMuniInput && sigpacMuniInput.options[sigpacMuniInput.selectedIndex]) {
    muniName = sigpacMuniInput.options[sigpacMuniInput.selectedIndex].text;
  }
  if (sigpacProvInput && sigpacProvInput.options[sigpacProvInput.selectedIndex]) {
    provName = sigpacProvInput.options[sigpacProvInput.selectedIndex].text;
  }

  return {
    location: `${muniName}, ${provName}`,
    superficie: item.superficie || 0,
    uso: item.uso_sigpac || item.uso || '',
    provincia: item.provincia || '',
    municipio: item.municipio || '',
    poligono: item.poligono || '',
    parcela: item.parcela || ''
  };
}

function fillFarmFormFromSIGPAC(parsed) {
  if (!parsed) return;

  if (parsed.location && farmLocationInput) {
    farmLocationInput.value = parsed.location;
    // Trigger input event to update visual state if needed
    farmLocationInput.dispatchEvent(new Event('input'));
  }

  if (parsed.superficie && farmSizeInput) {
    farmSizeInput.value = parsed.superficie.toFixed(2);
    farmSizeInput.dispatchEvent(new Event('input'));
  }

  showSigpacStatus('success', `Datos cargados: ${parsed.superficie.toFixed(2)} ha en ${parsed.location}`);
}

function showSigpacStatus(type, message) {
  if (!sigpacStatus) return;

  if (type === 'error') {
    sigpacStatus.style.background = '#fef2f2';
    sigpacStatus.style.color = '#991b1b';
    sigpacStatus.style.border = '1px solid #fecaca';
  } else {
    sigpacStatus.style.background = '#f0fdf4';
    sigpacStatus.style.color = '#166534';
    sigpacStatus.style.border = '1px solid #bbf7d0';
  }

  sigpacStatus.classList.remove('hidden');
  sigpacStatus.textContent = message;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (sigpacStatus) sigpacStatus.classList.add('hidden');
  }, 5000);
}

function setSigpacLoading(loading, text) {
  if (!sigpacLoading) return;

  if (loading) {
    sigpacLoading.classList.remove('hidden');
    const span = sigpacLoading.querySelector('span');
    if (span && text) span.textContent = text;
  } else {
    sigpacLoading.classList.add('hidden');
  }

  if (searchSigpacBtn) searchSigpacBtn.disabled = loading;
}

// === Event Listeners ===

if (sigpacProvInput) {
  sigpacProvInput.addEventListener('change', async function () {
    const isoCode = this.value; // e.g. "31"
    const muniSelect = sigpacMuniInput;

    if (!muniSelect) return;

    // Reset
    muniSelect.innerHTML = '<option value="">Cargando...</option>';
    muniSelect.disabled = true;

    if (!isoCode) {
      muniSelect.innerHTML = '<option value="">Selecciona provincia primero</option>';
      return;
    }

    try {
      setSigpacLoading(true, 'Cargando municipios...');
      const municipios = await fetchMunicipalities(isoCode);

      // Sort alphabetically
      municipios.sort((a, b) => a.descripcion.localeCompare(b.descripcion));

      // Populate
      muniSelect.innerHTML = '<option value="">Selecciona municipio</option>';
      municipios.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.codigo; // e.g. 1 (number)
        opt.textContent = m.descripcion;
        muniSelect.appendChild(opt);
      });

      muniSelect.disabled = false;

    } catch (err) {
      showSigpacStatus('error', 'Error al cargar municipios. Inténtalo de nuevo.');
      muniSelect.innerHTML = '<option value="">Error carga</option>';
    } finally {
      setSigpacLoading(false);
    }
  });
}

if (searchSigpacBtn) {
  searchSigpacBtn.addEventListener('click', async function () {
    // Collect values
    const prov = sigpacProvInput ? sigpacProvInput.value : '';
    const muni = sigpacMuniInput ? sigpacMuniInput.value : '';
    const poli = sigpacPoliInput ? sigpacPoliInput.value.trim() : '';
    const parc = sigpacParcInput ? sigpacParcInput.value.trim() : '';

    if (!prov || !muni || !poli || !parc) {
      showSigpacStatus('error', 'Faltan datos. Selecciona provincia, municipio e introduce polígono y parcela.');
      return;
    }

    try {
      setSigpacLoading(true, 'Consultando SIGPAC...');
      const data = await searchSIGPAC(prov, muni, poli, parc);
      const parsed = parseSIGPACData(data);

      if (!parsed) {
        showSigpacStatus('error', 'Respuesta inesperada del servidor.');
        return;
      }

      fillFarmFormFromSIGPAC(parsed);

    } catch (err) {
      showSigpacStatus('error', 'Error: ' + err.message);
    } finally {
      setSigpacLoading(false);
    }
  });
}
