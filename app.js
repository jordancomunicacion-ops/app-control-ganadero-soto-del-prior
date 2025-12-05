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
  };
  reader.readAsDataURL(file);
});

avatarRemove?.addEventListener('click', () => {
  profileAvatar.dataset.src = '';
  renderAvatar(null, profileNameInput?.value || currentUser);
  saveProfile();
});

document.addEventListener('DOMContentLoaded', loadSession);

// SIGPAC INTEGRATION - Fixed API endpoints
const sigpacProvInput = qs('#sigpacProv');
const sigpacMuniInput = qs('#sigpacMuni');
const sigpacPoliInput = qs('#sigpacPoli');
const sigpacParcInput = qs('#sigpacParc');
const searchSigpacBtn = qs('#searchSigpacBtn');
const sigpacStatus = qs('#sigpacStatus');
const sigpacLoading = qs('#sigpacLoading');
const locationBadge = qs('#locationBadge');
const sizeBadge = qs('#sizeBadge');

// SIGPAC API - Using correct query service
const SIGPAC_QUERY_BASE = 'https://sigpac-hubcloud.es/servicioconsultassigpac/query';

async function searchSIGPAC(provincia, municipio, poligono, parcela) {
    // For SIGPAC query service, we need: pr/mu/ag/zo/po/pa/re
    // ag (agregado), zo (zona), re (recinto) default to 0 if not provided
    const pr = provincia || '00';
    const mu = municipio || '000';
    const ag = '0'; // agregado - usually 0
    const zo = '0'; // zona - usually 0
    const po = poligono || '0';
    const pa = parcela || '0';
    const re = '0'; // recinto - we'll get the first one

    const url = SIGPAC_QUERY_BASE + '/recinfo/' + pr + '/' + mu + '/' + ag + '/' + zo + '/' + po + '/' + pa + '/' + re + '.json';

    const response = await fetch(url);
    if (!response.ok) throw new Error('Error HTTP: ' + response.status);
    return await response.json();
}

function parseSIGPACData(data) {
    if (!data || !data.properties) return null;
    const props = data.properties;
    return {
        location: (props.dn_muni || props.municipio || '') + ', ' + (props.dn_prov || props.provincia || ''),
        superficie: props.superficie || 0,
        uso: props.uso_sigpac || props.uso || '',
        provincia: props.dn_prov || props.provincia || '',
        municipio: props.dn_muni || props.municipio || '',
        poligono: props.poligono || '',
        parcela: props.parcela || ''
    };
}

function fillFarmFormFromSIGPAC(parsed) {
    if (!parsed) return;
    if (parsed.location && farmLocationInput) {
        farmLocationInput.value = parsed.location;
        if (locationBadge) locationBadge.classList.remove('hidden');
    }
    if (parsed.superficie && farmSizeInput) {
        farmSizeInput.value = parsed.superficie.toFixed(2);
        if (sizeBadge) sizeBadge.classList.remove('hidden');
    }
    showSigpacStatus('success', 'Datos cargados: ' + parsed.superficie.toFixed(2) + ' ha en ' + parsed.location + ' (Pol: ' + parsed.poligono + ', Parc: ' + parsed.parcela + ')');
}

function showSigpacStatus(type, message) {
    if (!sigpacStatus) return;
    sigpacStatus.className = 'sigpac-status ' + type;
    sigpacStatus.classList.remove('hidden');
    sigpacStatus.textContent = message;
    setTimeout(function () { if (sigpacStatus) sigpacStatus.classList.add('hidden'); }, 10000);
}

function setSigpacLoading(loading) {
    if (!sigpacLoading) return;
    if (loading) {
        sigpacLoading.classList.remove('hidden');
    } else {
        sigpacLoading.classList.add('hidden');
    }
    if (searchSigpacBtn) searchSigpacBtn.disabled = loading;
}

async function handleSigpacSearch() {
    const provincia = sigpacProvInput ? sigpacProvInput.value.trim() : '';
    const municipio = sigpacMuniInput ? sigpacMuniInput.value.trim() : '';
    const poligono = sigpacPoliInput ? sigpacPoliInput.value.trim() : '';
    const parcela = sigpacParcInput ? sigpacParcInput.value.trim() : '';

    if (!provincia || !municipio || !poligono || !parcela) {
        showSigpacStatus('error', 'Introduce provincia, municipio, poligono y parcela');
        return;
    }

    try {
        setSigpacLoading(true);
        const data = await searchSIGPAC(provincia, municipio, poligono, parcela);
        const parsed = parseSIGPACData(data);
        if (!parsed) {
            showSigpacStatus('error', 'No se encontro ninguna parcela con esos datos');
            return;
        }
        fillFarmFormFromSIGPAC(parsed);
    } catch (error) {
        showSigpacStatus('error', 'Error: ' + error.message + '. Verifica que los datos sean correctos (provincia debe ser codigo de 2 digitos)');
    } finally {
        setSigpacLoading(false);
    }
}

if (searchSigpacBtn) {
    searchSigpacBtn.addEventListener('click', handleSigpacSearch);
}

var sigpacInputs = [sigpacProvInput, sigpacMuniInput, sigpacPoliInput, sigpacParcInput];
for (var i = 0; i < sigpacInputs.length; i++) {
    if (sigpacInputs[i]) {
        sigpacInputs[i].addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSigpacSearch();
            }
        });
    }
}

if (farmLocationInput) {
    farmLocationInput.addEventListener('input', function () {
        if (locationBadge) locationBadge.classList.add('hidden');
    });
}
if (farmSizeInput) {
    farmSizeInput.addEventListener('input', function () {
        if (sizeBadge) sizeBadge.classList.add('hidden');
    });
}
