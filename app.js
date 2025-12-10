// Soil Data
let SOIL_DATA = [];

async function initializeSoilData() {
  try {
    if (typeof SoilDataManager !== 'undefined') {
      await SoilDataManager.init();
      renderSoilData();
    }
  } catch (e) { console.error('Soil init error', e); }
}

function renderSoilData() {
  const tbody = qs('#soilMatrixBody'); // needs a table with this ID
  if (!tbody) return;

  // Check if SoilDataManager exists
  const data = typeof SoilDataManager !== 'undefined' ? SoilDataManager.getAll() : [];

  tbody.innerHTML = '';
  data.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
  < td > ${item.cultivo_forrajero}</td >
            <td>${item.textura_ideal}</td>
            <td>${item.pH_ideal}</td>
            <td>${item.contenido_MO}</td>
            <td>${item.retencion_agua}</td>
            <td>${item.drenaje}</td>
`;
    tbody.appendChild(row);
  });
}
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


// Current User State
let currentUser = null;

// BREED_DATA will be loaded dynamically from CSV
let BREED_DATA = {};

// Load breed data from CSV on startup
async function initializeBreedData() {
  try {
    if (typeof BreedDataManager !== 'undefined') {
      BREED_DATA = await BreedDataManager.load(); // Just load, cleaner. (Manager handles default)

      // If empty, try reload
      if (Object.keys(BREED_DATA).length === 0) {
        BREED_DATA = await BreedDataManager.reload();
      }

      if (typeof populateBreedSelects === 'function') populateBreedSelects();
      if (typeof renderBreedData === 'function') renderBreedData();

      console.log('Loaded', Object.keys(BREED_DATA).length, 'breeds');
    }
  } catch (error) {
    console.error('Failed to load breed data:', error);
    alert('Error loading breed data: ' + error.message);
  }
}

// Admin function to reload breed data from CSV
window.reloadBreedData = async function () {
  if (typeof BreedDataManager !== 'undefined') {
    try {
      BREED_DATA = await BreedDataManager.reload();
      alert(`Razas recargadas: ${Object.keys(BREED_DATA).length} razas disponibles`);
      if (typeof populateBreedSelects === 'function') populateBreedSelects();
      if (typeof renderBreedData === 'function') renderBreedData();
    } catch (e) { alert('Error: ' + e.message); }
  }
};

// FEED_DATA will be loaded dynamically from CSV
// FEED_DATA will be loaded dynamically from CSV
let FEED_DATA = {};
window.FEED_DATA = FEED_DATA; // Explicitly expose for external modules

// Load feed data from CSV on startup
async function initializeFeedData() {
  try {
    if (typeof FeedDataManager !== 'undefined') {
      FEED_DATA = await FeedDataManager.load();
      if (Object.keys(FEED_DATA).length === 0) {
        FEED_DATA = await FeedDataManager.reload();
      }

      if (typeof renderFeedData === 'function') {
        renderFeedData();
      }
      window.FEED_DATA = FEED_DATA; // Update global ref
      console.log('Loaded', Object.keys(FEED_DATA).length, 'feeds');
    }
  } catch (error) {
    console.error('Failed to load feed data:', error);
    alert('Error loading feeds: ' + error.message);
  }
}

// Admin function to reload feed data from CSV
window.reloadFeedData = async function () {
  if (typeof FeedDataManager !== 'undefined') {
    FEED_DATA = await FeedDataManager.reload();
    alert(`Alimentos recargados: ${Object.keys(FEED_DATA).length} alimentos disponibles`);
    if (typeof renderFeedData === 'function') {
      renderFeedData();
    }
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
const profileSection = qs('#profile');
const avatarInput = qs('#avatarInput');
const avatarRemove = qs('#avatarRemove');
const profileForm = qs('#profileForm');
const profileNameInput = qs('#profileName');
const profileEmailInput = qs('#profileEmail');
const profileDescInput = qs('#profileDesc');
const profileCancel = qs('#profileCancel');
const logoutBtn = qs('#logoutBtn');
const settingsBtn = qs('#profileBtn');


const actionReport = qs('#action-report');
const navData = qs('#nav-data');
// const barDes = qs('#bar-destete'); // Keeping commented or removing if not in HTML
// const qualExc = qs('#qual-exc');
// const qualBuena = qs('#qual-buena');
// const qualMedia = qs('#qual-media');
// const qualBaja = qs('#qual-baja');

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
const farmSlopeInput = qs('#farmSlope');
const farmIrrigationInput = qs('#farmIrrigation');
const farmSigpacUseInput = qs('#farmSigpacUse');

const farmLatInput = qs('#farmLat');
const farmLonInput = qs('#farmLon');
const farmEditId = qs('#farmEditId');
const toggleFarmFormBtn = qs('#toggleFarmForm');
const farmFormCard = qs('#farmFormCard');
const cancelFarmFormBtn = qs('#cancelFarmEdit');

// Animal Form Selectors
const animalForm = qs('#animalForm');
const animalIdInput = qs('#animalId');
const animalNameInput = qs('#animalName');
const animalFarmInput = qs('#animalFarm'); // Select
const animalBreedInput = qs('#animalBreed');
const animalSexInput = qs('#animalSex');
const animalFatherInput = qs('#animalFather');
const animalMotherInput = qs('#animalMother');
const animalBirthInput = qs('#animalBirth');
const animalBirthWeightInput = qs('#animalBirthWeight');
const animalWeightInput = qs('#animalWeight');
const animalNotesInput = qs('#animalNotes');
const cancelAnimalFormBtn = qs('#cancelAnimalForm');
const toggleAnimalFormBtn = qs('#toggleAnimalForm');
const animalFormCard = qs('#animalFormCard');

// Utility: Robust UUID Generator (Polyfill for crypto.randomUUID)
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) { console.warn('crypto.randomUUID failed, using fallback'); }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getProfileKey(user) { return `profile_${user}`; }
function defaultProfile(user) { return { name: user, email: `${user}@correo.com`, desc: 'Inteligencia ganadera', avatar: null }; }

function getFincas() { return currentUser ? storage.read(`fincas_${currentUser}`, []) : []; }
function saveFincas(fincas) { if (currentUser) storage.write(`fincas_${currentUser}`, fincas); }
function saveUser(profileData) {
  if (!currentUser) return;
  const key = getProfileKey(currentUser);
  storage.write(key, profileData);
}

function showAuth() {
  authSection.classList.remove('hidden');
  appSection.classList.add('hidden');
}

function showApp(user) {
  if (authSection) authSection.classList.add('hidden');
  if (appSection) appSection.classList.remove('hidden');
  if (profileName) profileName.textContent = user;
  if (loginUser) loginUser.value = user;

  // Admin Check removed: Data tab is now available for all users.
  if (navData) navData.classList.remove('hidden');

  renderFincas();
  updateWeather();
  activateSection('home');

  // Load Animals
  if (typeof renderAnimals === 'function') renderAnimals();

  // Load Profile Data properly
  loadProfile(user);
}

// --- Helper: Reproductive Status Calculation ---
function getReproductiveStatus(animal, events) {
  if (!animal) return { status: 'Desconocido', isFertile: false, reason: 'No animal' };

  // 1. Initial Checks (Sex, Age)
  if (animal.sex !== 'Hembra') return { status: 'Macho', isFertile: false, reason: 'Solo hembras' };

  const ageMonths = calculateAgeMonths(animal.birthDate);
  if (ageMonths < 14) return { status: 'Inmadura', isFertile: false, reason: 'Menor de 14 meses' };

  // 2. Analyze Event History
  // Filter events for this animal and sort by date (ascending)
  const history = events
    .filter(e => e.animalId === animal.id || e.animalCrotal === animal.crotal) // Handle both ID/Crotal links
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let status = 'Vacía'; // Default assume fertile if adult female
  let reason = 'Apta para reproducción';
  let isFertile = true;

  let lastPartoDate = null;
  let lastInsemDate = null;

  history.forEach(ev => {
    const d = new Date(ev.date);
    if (ev.type === 'Parto') {
      lastPartoDate = d;
      status = 'Postparto';
      isFertile = false;
      reason = 'Recién parida';
    } else if (ev.type === 'Inseminación' || (ev.type === 'Protocolo' && ev.desc.includes('IATF'))) {
      if (lastPartoDate && d < lastPartoDate) return; // Ignore events before last birth
      lastInsemDate = d;
      status = 'Cubierta'; // Waiting for diagnosis
      isFertile = false;
      reason = 'Inseminada, pendiente diagnóstico';
    } else if (ev.type === 'Revisión' && (ev.desc.includes('Diagnóstico') || ev.desc.includes('Ecografía'))) {
      if (lastInsemDate && d > lastInsemDate) {
        // Logic to parse result from description if possible, or assume user manages it manually?
        // For now, let's assume if "Diagnóstico Gestación" -> result is in notes? 
        // Implementation Detail: Use specific text in Desc or a new field?
        // Simplification: If Desc contains 'Pregnada' or 'Gestante' -> Gestante.
        // If Desc contains 'Vacía' or 'Negativo' -> Vacía.
        const desc = (ev.desc || '').toLowerCase();
        if (desc.includes('gestante') || desc.includes('preñada') || desc.includes('positiv')) {
          status = 'Gestante';
          isFertile = false;
          reason = 'Confirmada gestante';
        } else if (desc.includes('vacía') || desc.includes('vacia') || desc.includes('negativ')) {
          status = 'Vacía';
          isFertile = true;
          reason = 'Diagnóstico negativo (Vacía)';
        }
      }
    }
  });

  // 3. Postparto Time Check
  if (status === 'Postparto' && lastPartoDate) {
    const daysSince = (new Date() - lastPartoDate) / (1000 * 60 * 60 * 24);
    if (daysSince >= 45) {
      status = 'Vacía';
      isFertile = true;
      reason = 'Periodo voluntario de espera cumplido';
    } else {
      reason = `Postparto (${Math.floor(daysSince)} días). Mínimo 45.`;
    }
  }

  return { status, isFertile, reason };
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

  // Load external data safely (Breeds, Feeds, Soils)
  // Use Promise.allSettled so a failure in one doesn't stop critical app logic
  Promise.allSettled([
    initializeBreedData(),
    initializeFeedData(),
    initializeSoilData()
  ]).then(() => {
    console.log('All external data initialization attempts finished.');
    // Trigger specific UI updates if needed
  });

  // Migration: Update existing animals with new Breed Stats & Farm assignment
  setTimeout(() => migrateExistingAnimals(), 1000);

  // --- USER REQUEST: CLEAR FARMS for manual test ---
  const wipeKey = 'FARMS_CLEARED_MANUAL_TEST';
  if (!localStorage.getItem(wipeKey)) {
    saveFincas([]); // Delete all
    renderFincas();
    localStorage.setItem(wipeKey, 'true');
    console.log('All farms cleared per user request.');
    // Optional visual feedback
    setTimeout(() => alert('🗑️ Se han eliminado todas las fincas. Todo listo para empezar de cero.'), 500);
  }

  // --- USER REQUEST: CLEAR ANIMALS for manual test ---
  const wipeAnimalsKey = 'ANIMALS_CLEARED_MANUAL_TEST';
  if (!localStorage.getItem(wipeAnimalsKey)) {
    if (currentUser) {
      storage.write(`animals_${currentUser}`, []);
      if (typeof renderAnimals === 'function') renderAnimals();
      localStorage.setItem(wipeAnimalsKey, 'true');
      console.log('All animals cleared per user request.');
      setTimeout(() => alert('🗑️ Se han eliminado todos los animales.'), 600);
    }
  }


}

// Migration Logic
function migrateExistingAnimals() {
  if (!currentUser) return;
  const key = `animals_${currentUser}`;
  let animals = storage.read(key, []);
  let modified = false;

  animals = animals.map(animal => {
    let changed = false;

    // 1. Assign to "Soto del Prior" if missing
    if (!animal.farm || animal.farm !== 'Soto del Prior') {
      animal.farm = 'Soto del Prior';
      changed = true;
    }

    // 2. Update stats from BreedDataManager
    if (typeof BreedDataManager !== 'undefined' && animal.breed) {
      // Find breed by name (fuzzy match)
      const breedData = BreedDataManager.getBreedByName(animal.breed);
      if (breedData) {
        // Update Target Weight if vastly different (optional, be careful not to overwrite user edits if any)
        // But user asked to "complete records".
        if (!animal.weight_target) {
          animal.weight_target = breedData.weight_male_adult; // Default to male max? Or female?
          changed = true;
        }

        // Update Efficiency Stats (These are usually read from breed anyway, but if stored on animal, update them)
        if (breedData.fcr_feedlot) {
          animal.expected_fcr = breedData.fcr_feedlot;
          changed = true;
        }
        if (breedData.adg_feedlot) {
          animal.expected_adg = breedData.adg_feedlot;
          changed = true;
        }
      }
    }

    if (changed) modified = true;
    return animal;
  });

  if (modified) {
    storage.write(key, animals);
    console.log('Animals migrated to new data schema.');
    if (typeof renderAnimals === 'function') renderAnimals();
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

// farmForm listener moved to app-sigpac.js to avoid duplication and support new fields
// Toggle Weather Config Visibility
window.toggleWeatherConfig = function () {
  const privateRadio = qs('input[name="weatherSource"][value="private"]');
  const configDiv = qs('#weatherStationConfig');
  if (privateRadio && privateRadio.checked) {
    configDiv.classList.remove('hidden');
  } else {
    configDiv.classList.add('hidden');
  }
};

// Farm Form Listener - Restored and Updated
farmForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUser) {
    alert('Inicia sesión para registrar fincas.');
    return;
  }

  // Helper to safely get values
  const getValue = (sel) => {
    const el = qs(sel);
    return el ? el.value.trim() : '';
  };

  const weatherSource = qs('input[name="weatherSource"]:checked')?.value || 'public';

  const finca = {
    id: crypto.randomUUID(),
    name: getValue('#farmName'),
    location: getValue('#farmLocation'),
    size: parseFloat(getValue('#farmSize')) || 0,
    soil: getValue('#farmSoil'),
    license: getValue('#farmLicense'),
    animals: parseInt(getValue('#farmAnimals'), 10) || 0,
    management: getValue('#farmManagement'),
    feed: getValue('#farmFeed'), // Keeping generic feed field if it exists

    // SIGPAC Fields
    slope: getValue('#farmSlope'),
    irrigation: getValue('#farmIrrigation'),
    sigpacUse: getValue('#farmSigpacUse'),
    lat: getValue('#farmLat'), // Hidden field
    lon: getValue('#farmLon'), // Hidden field

    // Weather Config
    weatherSource: weatherSource,
    weatherStationId: weatherSource === 'private' ? getValue('#farmWeatherId') : ''
  };

  // Validation
  if (!finca.name) {
    alert('El nombre de la finca es obligatorio.');
    return;
  }

  const fincas = getFincas();
  const editId = farmEditId?.value;

  if (editId) {
    const index = fincas.findIndex(f => f.id === editId);
    if (index !== -1) {
      finca.id = editId; // Preserve ID
      fincas[index] = finca;
      alert('Finca actualizada correctamente.');
    }
  } else {
    fincas.push(finca);
    alert('Finca registrada correctamente.');
  }

  // Reset UI
  saveFincas(fincas);
  farmForm.reset();
  farmEditId.value = '';

  // Reset Weather UI
  qs('input[name="weatherSource"][value="public"]').checked = true;
  toggleWeatherConfig();

  if (farmFormCard) farmFormCard.classList.add('hidden');
  if (toggleFarmFormBtn) toggleFarmFormBtn.textContent = '➕ Nueva Finca';
  const submitBtn = farmForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Guardar Finca';

  renderFincas();
});




// --- Batch Import Logic ---
if (toggleFarmFormBtn) {
  toggleFarmFormBtn.addEventListener('click', () => {
    if (farmFormCard) {
      if (farmFormCard.classList.contains('hidden')) {
        farmFormCard.classList.remove('hidden');
        toggleFarmFormBtn.textContent = 'Cancelar';
      } else {
        farmFormCard.classList.add('hidden');
        toggleFarmFormBtn.textContent = 'Nueva Finca';
      }
    }
  });
}

if (cancelFarmFormBtn) {
  cancelFarmFormBtn.addEventListener('click', () => {
    if (farmFormCard) farmFormCard.classList.add('hidden');
    if (toggleFarmFormBtn) toggleFarmFormBtn.textContent = 'Nueva Finca';
    farmForm.reset();
  });
}

window.deleteFarm = function (id) {
  if (!confirm('¿Estás seguro de eliminar esta finca? Irreversible.')) return;
  const fincas = getFincas();
  const filtered = fincas.filter(f => f.id !== id);
  saveFincas(filtered);
  renderFincas();
};

window.currentFarmId = null;

function renderFincas() {
  if (!fincasList) return;
  const fincas = getFincas();
  fincasList.innerHTML = '';

  if (typeof populateFarmSelects === 'function') populateFarmSelects();

  if (!fincas.length) {
    fincasList.innerHTML = '<p class="status">Sin fincas registradas.</p>';
    updateStats([]);
    return;
  }

  fincas.forEach((finca) => {
    const el = document.createElement('div');
    el.className = 'farm';

    const weatherWidgetId = `weather-${finca.id}`;

    el.innerHTML = `
      <div class="farm-title">
        <div>
          <strong>${finca.name}</strong>
          <div class="farm-meta">${finca.location} · ${finca.size} ha</div>
        </div>
        <span class="tag">${finca.soil}</span>
      </div>
      
      <div id="${weatherWidgetId}" class="weather-widget" style="margin: 8px 0; padding: 8px; background: #f0f9ff; border-radius: 6px; font-size: 0.9em; display: flex; align-items: center; gap: 8px;">
          <span>⏳ Cargando clima...</span>
      </div>

      <div class="farm-meta">Licencia: ${finca.license} · Animales: ${finca.animals}</div>
      <div class="farm-meta">Manejo: ${finca.management} · Alimentacion: ${finca.feed}</div>
      ${(finca.slope || finca.sigpacUse || finca.irrigation) ? `
      <div class="farm-meta" style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #eee;">
        ${finca.slope ? `<span>${finca.slope}% Pend.</span>` : ''}
        ${finca.irrigation ? `<span>${finca.irrigation}% Regadío</span>` : ''}
      </div>` : ''
      }
    `;

    // Make card clickable (Event attached after innerHTML to ensure stability)
    el.onclick = (e) => {
      // Prevent click if deleting (button click)
      if (e.target.tagName === 'BUTTON') return;
      openFarmDetail(finca.id);
    };
    el.style.cursor = 'pointer';

    fincasList.appendChild(el);

    // Weather Fetch (Same as before)
    if (finca.weatherSource === 'private') {
      const widget = el.querySelector(`#${weatherWidgetId}`);
      if (widget) {
        widget.innerHTML = `📡 <strong>Estación Propia</strong> <span style="color:#059669; margin-left: auto;">●</span>`;
        widget.style.background = '#ecfdf5';
        widget.style.color = '#065f46';
      }
    } else {
      if (window.WeatherService && finca.lat && finca.lon) {
        window.WeatherService.getWeather(finca.lat, finca.lon).then(data => {
          const widget = el.querySelector(`#${weatherWidgetId}`);
          if (widget && data) {
            widget.innerHTML = `
              <span style="font-size: 1.2em;">${data.icon}</span>
              <div><strong>${data.temp}ºC</strong> · ${data.condition}</div>
            `;
          } else if (widget) {
            widget.innerHTML = '⚠️ Clima no disponible';
          }
        });
      } else {
        const widget = el.querySelector(`#${weatherWidgetId}`);
        if (widget) widget.innerHTML = '⚠️ Sin coordenadas';
      }
    }
  });
  updateStats(fincas);
}

// --- Farm Detail Modal Logic ---
function openFarmDetail(id) {
  const fincas = getFincas();
  const finca = fincas.find(f => f.id === id);
  if (!finca) return;

  window.currentFarmId = id;
  const modal = qs('#farmDetailModal');
  if (!modal) return;

  // Populate Fields
  qs('#detailFarmName').textContent = finca.name;
  qs('#detailFarmSize').textContent = `${finca.size} ha`;
  qs('#detailFarmLocation').textContent = finca.location;
  qs('#detailFarmLat').textContent = finca.lat || '-';
  qs('#detailFarmLon').textContent = finca.lon || '-';

  qs('#detailFarmSlope').textContent = finca.slope || '0';
  qs('#detailFarmIrrigation').textContent = finca.irrigation || '0';
  qs('#detailFarmUse').textContent = finca.sigpacUse || '-';
  qs('#detailFarmSoil').textContent = finca.soil || '-';

  qs('#detailFarmLicense').textContent = finca.license || '-';
  qs('#detailFarmAnimals').textContent = finca.animals || '0';
  qs('#detailFarmManagement').textContent = finca.management || '-';
  qs('#detailFarmFeed').textContent = finca.feed || '-';

  // Weather in Modal
  const weatherDiv = qs('#detailFarmWeather');
  if (weatherDiv) {
    weatherDiv.innerHTML = '⏳ Cargando datos climáticos...';
    if (finca.weatherSource === 'private') {
      weatherDiv.innerHTML = `
  < div style = "text-align: center;" >
                    <div style="font-size: 1.5em; margin-bottom: 5px;">📡</div>
                    <strong>Estación Privada</strong><br>
                    ID: ${finca.weatherStationId || 'No configurado'}
                </div>`;
    } else if (window.WeatherService && finca.lat && finca.lon) {
      window.WeatherService.getWeather(finca.lat, finca.lon).then(data => {
        if (data) {
          weatherDiv.innerHTML = `
  < div style = "display: flex; gap: 20px; align-items: center;" >
                            <div style="font-size: 3em;">${data.icon}</div>
                            <div>
                                <div style="font-size: 1.5em; font-weight: bold;">${data.temp}ºC</div>
                                <div style="color: #666;">${data.condition}</div>
                                <div style="margin-top: 5px; font-size: 0.9em;">
                                    💧 Humedad: ${data.humidity}% <br>
                                    💨 Viento: ${data.wind} km/h
                                </div>
                            </div>
                        </div >
  `;
        } else {
          weatherDiv.innerHTML = '⚠️ No se pudo cargar el clima.';
        }
      });
    } else {
      weatherDiv.innerHTML = '⚠️ Coordenadas no disponibles para mostrar el clima.';
    }
  }

  // Nutrition Engine: Soil Compatibility
  const cropDiv = qs('#detailFarmCrops');
  if (cropDiv && window.NutritionEngine) {
    // Create a dummy soil profile based on the text string we have
    const soilType = finca.soil || 'Franco';
    const soilProfile = {
      textura_ideal: soilType, // Approximate match
      pH: 6.5, // Assumption
      drenaje: 'Bueno' // Assumption
    };

    const recs = window.NutritionEngine.getCompatibleFeeds(soilProfile);

    if (recs.length > 0) {
      cropDiv.innerHTML = `
  < div style = "background: #ecfdf5; padding: 10px; border-radius: 6px; border: 1px solid #a7f3d0;" >
                  <strong>✅ Cultivos Sugeridos:</strong>
                  <ul style="margin: 5px 0 0 20px; list-style-type: disc;">
                      ${recs.map(r => `<li>${r}</li>`).join('')}
                  </ul>
              </div >
  `;
    } else {
      cropDiv.innerHTML = `< em > No hay recomendaciones específicas para suelo ${soilType}, pero puedes probar cultivos tolerantes.</em > `;
    }
  }

  modal.classList.remove('hidden');
}

// Close Modal Logic
const closeFarmBtn = qs('#closeFarmDetail');
const farmModal = qs('#farmDetailModal');
if (closeFarmBtn && farmModal) {
  closeFarmBtn.addEventListener('click', () => {
    farmModal.classList.add('hidden');
  });
  // Close on click outside
  window.addEventListener('click', (e) => {
    if (e.target === farmModal) {
      farmModal.classList.add('hidden');
    }
  });
}

// Edit/Delete from Modal
const btnEditFarm = qs('#btnEditFarmModal');
const btnDeleteFarm = qs('#btnDeleteFarmModal');

if (btnEditFarm) {
  btnEditFarm.addEventListener('click', () => {
    if (!window.currentFarmId) return;
    // Load into form (simple way: reuse logic if possible, or just alert for now as full edit is complex to wiring)
    // For now we will close modal and trigger the edit logic if we can access the form
    const fincas = getFincas();
    const finca = fincas.find(f => f.id === window.currentFarmId);
    if (finca) {
      // Populate form logic (need to manually populate fields)
      if (farmFormCard) farmFormCard.classList.remove('hidden');
      qs('#farmName').value = finca.name;
      qs('#farmLocation').value = finca.location;
      qs('#farmSize').value = finca.size;
      // ... populate other fields ... 
      // Ideally we should extract a 'fillFarmForm' function. 
      // For this step I'll just alert that it's ready to edit.
      farmModal.classList.add('hidden');
      alert('Funcionalidad de edición completa pendiente de refactorizar fillForm. Por ahora usa el botón borrar y crea de nuevo.');
    }
  });
}

if (btnDeleteFarm) {
  btnDeleteFarm.addEventListener('click', () => {
    if (!window.currentFarmId) return;
    if (confirm('¿Seguro que quieres eliminar esta finca?')) {
      deleteFarm(window.currentFarmId);
      farmModal.classList.add('hidden');
    }
  });
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

  if (sectionId === 'animals') {
    if (typeof renderAnimals === 'function') renderAnimals();
  }
  if (sectionId === 'events') {
    populateAnimalSelects();
    renderEvents();
  }
  if (sectionId === 'farms') {
    if (typeof renderFincas === 'function') renderFincas();
  }
  if (sectionId === 'data') {
    renderBreedData();
    if (typeof renderFeedData === 'function') renderFeedData();
    renderSoilData();
  }
}

function renderSoilData() {
  const tbody = qs('#soilTableBody');
  if (!tbody || !window.SoilDataManager) return;

  tbody.innerHTML = '';
  const soils = window.SoilDataManager.getAll();

  soils.forEach(s => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #eee';
    row.innerHTML = `
  < td style = "padding: 12px; font-weight:500;" > ${s.cultivo_forrajero}</td >
            <td style="padding: 12px;">${s.textura_ideal}</td>
            <td style="padding: 12px;">${s.pH_ideal}</td>
            <td style="padding: 12px;">${s.contenido_MO}</td>
            <td style="padding: 12px;">${s.drenaje}</td>
`;
    tbody.appendChild(row);
  });
}

function renderBreedData() {
  const tbody = qs('#breedTable tbody');
  const breedCountSpan = qs('#breedCount');
  if (!tbody) return;

  tbody.innerHTML = '';
  const breeds = Object.values(BREED_DATA);
  const breedCount = breeds.length;
  if (breedCountSpan) breedCountSpan.textContent = breedCount;

  // Sort by Name for display
  breeds.sort((a, b) => a.name.localeCompare(b.name));

  breeds.forEach((breed) => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #e2e8f0';
    row.innerHTML = `
  < td style = "padding: 12px;" > ${breed.name || '-'}</td >
      <td style="padding: 12px;">${breed.code || breed.id || '-'}</td>
      <td style="padding: 12px;">${breed.subspecies_name || breed.subspecies || '-'}</td>
      <td style="padding: 12px;">${breed.weight_male_adult || '-'}</td>
      <td style="padding: 12px;">${breed.weight_female_adult || '-'}</td>
      <td style="padding: 12px;">${breed.slaughter_age_months || breed.slaughter_age?.raw || '-'}</td>
      <td style="padding: 12px;">${breed.adg_feedlot || '-'}</td>
      <td style="padding: 12px;">${breed.adg_grazing || '-'}</td>
      <td style="padding: 12px;">${breed.fcr_feedlot || '-'}</td>
      <td style="padding: 12px;">${breed.heat_tolerance || '-'}</td>
      <td style="padding: 12px;">${breed.marbling || '-'}</td>
      <td style="padding: 12px;">${breed.calving_ease || '-'}</td>
`;
    tbody.appendChild(row);
  });
}

const filterAgeSelect = qs('#filterAge');

// --- Helper: Calculate Age in Months ---
function calculateAgeMonths(birthDate) {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

// --- Helper: Categorize Animal ---
// --- Helpers ---
function getShortCrotal(crotal) {
  if (!crotal) return '';
  const str = String(crotal);
  return str.length > 4 ? str.slice(-4) : str;
}

function formatCrotalHTML(crotal) {
  if (!crotal) return '';
  const str = String(crotal);
  if (str.length <= 4) return `< strong > ${str}</strong > `;
  const prefix = str.slice(0, -4);
  const suffix = str.slice(-4);
  return `< span style = "color:var(--muted)" > ${prefix}</span > <strong>${suffix}</strong>`;
}

function calculateAnimalType(animal) {
  const months = calculateAgeMonths(animal.birthDate);
  const sex = animal.sex || 'Macho';

  if (sex === 'Hembra') {
    if (months < 6) return 'Becerra';
    if (months < 12) return 'Ternera';
    if (months < 24) return 'Añoja';
    if (months < 36) return 'Novilla';
    return 'Vaca'; // Default adult
    // Nodriza usually implies status 'Lactating', but we'll stick to age for now unless status exists
  } else {
    // Macho
    if (months < 6) return 'Becerro';
    if (months < 12) return 'Ternero';
    if (months < 24) return 'Añojo';
    if (months < 36) return 'Utrero';
    if (months < 48) return 'Novillo';
    return 'Toro';
  }
}

function updateStats(fincas = []) {
  const animals = storage.read(`animals_${currentUser}`, []);
  const total = animals.length;

  if (qs('#stat-animales')) qs('#stat-animales').textContent = total;
  if (qs('#stat-fincas')) qs('#stat-fincas').textContent = fincas.length;

  // Distribution Counts
  const counts = {
    'Becerro': 0, 'Ternero': 0, 'Añojo': 0, 'Utrero': 0, 'Novillo': 0, 'Toro': 0, 'Buey': 0,
    'Becerra': 0, 'Ternera': 0, 'Añoja': 0, 'Novilla': 0, 'Vaca': 0, 'Nodriza': 0
  };

  animals.forEach(a => {
    const type = calculateAnimalType(a);
    if (counts[type] !== undefined) counts[type]++;
  });

  // Update Table Cells
  const mapIds = {
    'count-bueyes': 'Buey', 'count-toros': 'Toro', 'count-utreros': 'Utrero',
    'count-novillos': 'Novillo', 'count-anojos': 'Añojo', 'count-terneros-m': 'Ternero',
    'count-becerros': 'Becerro',
    'count-nodrizas': 'Nodriza', 'count-vacas': 'Vaca', 'count-novillas': 'Novilla',
    'count-anojas': 'Añoja', 'count-terneras-h': 'Ternera', 'count-becerras': 'Becerra'
  };

  for (const [id, type] of Object.entries(mapIds)) {
    const el = qs(`#${id}`);
    if (el) el.textContent = counts[type];
  }

  const base = Math.max(1, total);
  if (barSac) barSac.style.height = `${40 + Math.min(50, base * 5)}%`;
  if (barDes) barDes.style.height = `${20 + Math.min(30, base * 3)}%`;
  if (qualExc) qualExc.textContent = String(Math.max(0, total - 1));
  if (qualBuena) qualBuena.textContent = String(Math.max(0, total));
  if (qualMedia) qualMedia.textContent = '0';
  if (qualBaja) qualBaja.textContent = '0';
}

function populateBreedSelects() {
  const breeds = Object.values(BREED_DATA).sort((a, b) => a.name.localeCompare(b.name));
  const filterSelect = qs('#filterBreed');
  const formSelect = qs('#animalBreed');

  // 1. Populate Filter
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">Todas las razas</option>';
    breeds.forEach(breed => {
      const opt = document.createElement('option');
      opt.value = breed.name; // Use Name for compatibility with existing string filters
      opt.textContent = breed.name;
      filterSelect.appendChild(opt);
    });
  }

  // 2. Populate Registration Form
  if (formSelect) {
    formSelect.innerHTML = '<option value="">Selecciona raza</option>';
    breeds.forEach(breed => {
      const opt = document.createElement('option');
      opt.value = breed.name; // Use Name for compatibility
      opt.textContent = breed.name;
      formSelect.appendChild(opt);
    });
    // Add 'Otra' manually if it's not in data but allowed
    const other = document.createElement('option');
    other.value = 'Otra';
    other.textContent = 'Otra';
    formSelect.appendChild(other);
  }
}

function updateAgeOptions() {
  if (!filterAgeSelect) return;
  const sex = filterSexSelect.value;
  filterAgeSelect.innerHTML = '<option value="">Todos</option>';

  let options = [];
  if (sex === 'Macho') {
    options = ['Becerro', 'Ternero', 'Añojo', 'Utrero', 'Novillo', 'Toro', 'Buey'];
  } else if (sex === 'Hembra') {
    options = ['Becerra', 'Ternera', 'Añoja', 'Novilla', 'Vaca', 'Nodriza'];
  } else {
    // Combined
    options = ['Becerro/a', 'Ternero/a', 'Añojo/a', 'Novillo/a', 'Toro/Vaca'];
    // Or just simplify to not showing specific if no sex selected, or show all.
    // Let's show all distinct types sorted
    options = ['Becerro', 'Becerra', 'Ternero', 'Ternera', 'Añojo', 'Añoja', 'Utrero', 'Novillo', 'Novilla', 'Toro', 'Vaca'];
  }

  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt;
    el.textContent = opt;
    filterAgeSelect.appendChild(el);
  });
}




function loadProfile(user) {
  if (!user) return;
  const saved = storage.read(getProfileKey(user), defaultProfile(user));

  // Update Sidebar/Display
  if (profileName) profileName.textContent = saved.name || user;

  // Update Form Inputs
  if (profileNameInput) profileNameInput.value = saved.name || '';
  if (profileEmailInput) profileEmailInput.value = saved.email || '';
  if (profileDescInput) profileDescInput.value = saved.desc || '';

  // FIX: Restore dataset.src so next save doesn't wipe it
  if (profileAvatar) profileAvatar.dataset.src = saved.avatar || '';

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

  // Safe Save: Don't accidentally wipe avatar if DOM isn't fully synced
  const existing = storage.read(getProfileKey(currentUser), {});
  const currentSrc = profileAvatar ? profileAvatar.dataset.src : null;

  // Use currentSrc if it exists (string), otherwise keep existing (fallback)
  // If user clicked remove, currentSrc is '', which is falsy but valid.
  // logic: if currentSrc is strictly set (even empty string), use it. If undefined/null, keep existing.
  let finalAvatar = existing.avatar;
  if (currentSrc !== undefined && currentSrc !== null) {
    finalAvatar = currentSrc;
  }

  const profile = {
    name: profileNameInput?.value.trim() || currentUser,
    email: profileEmailInput?.value.trim() || '',
    desc: profileDescInput?.value.trim() || '',
    avatar: finalAvatar
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
// WEATHER INTEGRATION
// ==========================================
async function updateWeather() {
  const fincas = getFincas();
  if (fincas.length === 0) return;

  // Use first farm with coordinates
  const farm = fincas.find(f => f.lat && f.lon);
  if (!farm) return;

  const lat = farm.lat;
  const lon = farm.lon;

  const card = qs('#weather-card');
  if (card) card.style.display = 'block';

  // Update Radar Iframe
  const radarFrame = qs('#rain-radar-frame');
  if (radarFrame) {
    // Windy.com Embed
    radarFrame.src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=precipitation_probability&timezone=auto`;
    console.log('Fetching detailed weather...');
    const res = await fetch(url);
    const data = await res.json();

    const cur = data.current;
    if (cur) {
      const tempEl = qs('#weather-temp');
      const humEl = qs('#weather-hum');
      const windEl = qs('#weather-wind');

      if (tempEl) tempEl.textContent = `${cur.temperature_2m}°C`;
      if (humEl) humEl.textContent = `💧 ${cur.relative_humidity_2m}%`;
      if (windEl) windEl.textContent = `💨 ${cur.wind_speed_10m} km/h`;
    }

    // Rain Alert Logic
    if (data.hourly && data.hourly.precipitation_probability) {
      const probs = data.hourly.precipitation_probability.slice(0, 24);
      const maxProb = Math.max(...probs);
      const alertEl = qs('#rain-alert');
      if (alertEl) {
        if (maxProb > 40) {
          alertEl.classList.remove('hidden');
          alertEl.title = `Probabilidad máxima: ${maxProb}%`;
          alertEl.innerHTML = `☔ Alerta Lluvia (${maxProb}%)`;
        } else {
          alertEl.classList.add('hidden');
        }
      }
    }

    // 3-Day Forecast
    if (data.daily) {
      const forecastEl = qs('#weather-forecast');
      if (forecastEl) {
        forecastEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
          const min = data.daily.temperature_2m_min[i];
          const max = data.daily.temperature_2m_max[i];
          const code = data.daily.weathercode[i];
          const dateC = new Date(data.daily.time[i]);
          const dayName = i === 0 ? 'Hoy' : dateC.toLocaleDateString('es-ES', { weekday: 'short' });

          let icon = '☀️';
          if (code > 3) icon = '☁️';
          if (code > 40) icon = '🌫️';
          if (code > 50) icon = '🌧️';
          if (code > 60) icon = '🌧️';
          if (code > 70) icon = '❄️';
          if (code > 80) icon = '⛈️';
          if (code > 95) icon = '⛈️';

          const row = document.createElement('div');
          row.innerHTML = `<strong>${dayName}</strong> ${icon} ${Math.round(max)}°/${Math.round(min)}°`;
          forecastEl.appendChild(row);
        }
      }
    }
  } catch (err) {
    console.error('Weather error', err);
    const card = qs('#weather-card');
    if (card) {
      card.style.display = 'block';
      card.innerHTML = '<p style="padding:10px; font-size:12px;">Error clima/red</p>';
    }
  }
}

// SIGPAC logic removed (See app-sigpac.js)

// Button Event Listeners
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    logout();
  });
}

if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    activateSection('profile');
  });
}

// Profile Form Actions
if (profileForm) {
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Save profile logic here
    const name = profileNameInput?.value;
    const email = profileEmailInput?.value;
    if (name) {
      const sidebarName = qs('#sidebarName');
      if (sidebarName) sidebarName.textContent = name;
      // Update current user profile
      if (currentUser) {
        const currentProfile = storage.read(getProfileKey(currentUser), defaultProfile(currentUser));
        currentProfile.name = name;
        currentProfile.email = email;
        saveUser(currentProfile);

        // Update UI immediately
        if (sidebarName) sidebarName.textContent = name;
      }
      alert('Perfil actualizado');
      activateSection('home');
    }
  });
}

if (profileCancel) {
  profileCancel.addEventListener('click', () => {
    activateSection('home');
  });
}

// Helper to populate farms in select
function populateFarmSelect() {
  if (!animalFarmInput) return;
  const fincas = getFincas();
  animalFarmInput.innerHTML = '<option value="">Selecciona una finca</option>';
  fincas.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    animalFarmInput.appendChild(opt);
  });
}

// Animal Management Logic
if (toggleAnimalFormBtn) {
  toggleAnimalFormBtn.addEventListener('click', () => {
    if (animalFormCard) {
      if (animalFormCard.classList.contains('hidden')) {
        // Refresh farm list before showing
        populateFarmSelect();
        animalFormCard.classList.remove('hidden');
        toggleAnimalFormBtn.textContent = 'Cancelar';
      } else {
        animalFormCard.classList.add('hidden');
        toggleAnimalFormBtn.textContent = 'Nuevo Animal';
      }
    }
  });
}
// --- Helper: Populate Farm Selects (for Forms & Filters) ---
function populateFarmSelects() {
  const fincas = getFincas();
  const animalFarmSelect = qs('#animalFarm');
  const filterFarmSelect = qs('#filterFarm');

  [animalFarmSelect, filterFarmSelect].forEach(select => {
    if (!select) return;
    // Save current selection if possible
    const current = select.value;
    select.innerHTML = select.id === 'filterFarm'
      ? '<option value="">Todas las fincas</option>'
      : '<option value="">Selecciona una finca</option>';

    fincas.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      select.appendChild(opt);
    });
    // Restore if still valid
    if (fincas.find(f => f.id === current)) select.value = current;
  });
}
if (cancelAnimalFormBtn) {
  cancelAnimalFormBtn.addEventListener('click', () => {
    if (animalFormCard) animalFormCard.classList.add('hidden');
    if (toggleAnimalFormBtn) toggleAnimalFormBtn.textContent = '➕ Nuevo Animal';
  });
}

if (animalForm) {
  animalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Load animals first for parent lookup
    const animals = storage.read(`animals_${currentUser}`, []);

    const inputFather = animalFatherInput?.value.trim() || '';
    const inputMother = animalMotherInput?.value.trim() || '';
    const inputBreed = animalBreedInput?.value || '';

    let finalBreed = inputBreed;
    let geneticData = null;

    // BREEDING LOGIC:
    // If both parents are known, calculate genetic outcome (F1 or Pure)
    if (inputFather && inputMother) {
      const dad = animals.find(a => a.crotal === inputFather);
      const mom = animals.find(a => a.crotal === inputMother);

      if (dad && mom) {
        // Load latest breed data
        const allBreeds = await BreedDataManager.load();

        const sireBreed = allBreeds[dad.breed];
        const damBreed = allBreeds[mom.breed];

        if (sireBreed && damBreed) {
          if (sireBreed.id === damBreed.id) {
            finalBreed = sireBreed.name; // Pure
          } else {
            // F1 Hybrid
            if (window.BreedingEngine) {
              const f1 = window.BreedingEngine.calculateHybrid(sireBreed, damBreed);
              finalBreed = f1.name; // e.g. "Cruce Angus x Limousin"
              geneticData = f1;
            } else {
              finalBreed = `F1 ${damBreed.name} x ${sireBreed.name}`;
            }
          }
          // Update input to reflect calculation
          if (animalBreedInput) animalBreedInput.value = finalBreed;
        }
      } else {
        // Provided parents but not found in DB -> Treat as Unknowns? 
        if (!inputBreed) finalBreed = 'Mestiza';
      }
    } else {
      // Missing one or both parents
      // User rule: "consideradas mestizas" if unkown
      if (!inputBreed) finalBreed = 'Mestiza';
    }

    const newAnimal = {
      id: crypto.randomUUID(), // Internal ID
      crotal: animalIdInput?.value.trim(),
      name: animalNameInput?.value.trim(),
      farmId: animalFarmInput?.value || '',
      breed: finalBreed,
      sex: animalSexInput?.value || '',
      birthDate: animalBirthInput?.value || '',
      father: inputFather,
      mother: inputMother,
      birthWeight: parseFloat(animalBirthWeightInput?.value) || 0,
      currentWeight: parseFloat(animalWeightInput?.value) || 0,
      notes: animalNotesInput?.value.trim() || '',
      createdAt: new Date().toISOString()
    };

    // Attach genetic data if generated (F1)
    if (geneticData) {
      newAnimal._genetics = geneticData;
      newAnimal.customMetrics = {
        adg_feedlot: geneticData.adg_feedlot,
        weight_max: geneticData.weight_male_adult,
        heat_tolerance: geneticData.heat_tolerance
      };
    }

    if (!newAnimal.crotal || !newAnimal.farmId || !newAnimal.birthDate) {
      alert('Por favor, completa los campos obligatorios (Crotal, Finca, Fecha Nacimiento).');
      return;
    }

    animals.push(newAnimal);
    storage.write(`animals_${currentUser}`, animals);

    alert(`Animal registrado: ${newAnimal.breed}`);
    animalForm.reset();
    if (animalFormCard) animalFormCard.classList.add('hidden');
    if (toggleAnimalFormBtn) toggleAnimalFormBtn.textContent = '➕ Nuevo Animal';

    // Trigger render updates if function exists
    if (typeof renderAnimals === 'function') renderAnimals();
    updateStats(getFincas()); // Update global stats if they depend on animals
  });

}

// Detail Selectors
const animalDetailModal = qs('#animalDetailModal');
const closeAnimalDetail = qs('#closeAnimalDetail');
const closeDetailBtn = qs('#closeDetailBtn');

// Detail Fields
const detailCrotal = qs('#detailCrotal');
const detailBreed = qs('#detailBreed');
const detailSex = qs('#detailSex');
const detailBirth = qs('#detailBirth');
const detailBirthWeight = qs('#detailBirthWeight');
const detailWeight = qs('#detailWeight');
const detailGain = qs('#detailGain');
const detailFather = qs('#detailFather');
const detailMother = qs('#detailMother');
const detailFarm = qs('#detailFarm');
const detailNotes = qs('#detailNotes');

const detailOffspring = qs('#detailOffspring');

// Crotal Helpers
function getShortCrotal(crotal) {
  if (!crotal) return 'N/A';
  const str = String(crotal).trim();
  // Pattern: Starts with ES, followed by 12 digits (Total 14)
  if (/^ES\d{12}$/.test(str)) {
    return str.slice(-4);
  }
  return str;
}

function formatCrotalHTML(crotal) {
  const str = String(crotal || '').trim();
  if (/^ES\d{12}$/.test(str)) {
    const prefix = str.slice(0, 10); // ES + 8 digits
    const suffix = str.slice(10);    // Last 4 digits
    return `${prefix}<b style="font-size:1.2em">${suffix}</b>`;
  }
  return `<span style="font-weight:700">${str}</span>`;
}


function updateStats(fincas = []) {
  const animals = storage.read(`animals_${currentUser}`, []);
  const events = storage.read('events', []);

  // Main KPIs
  if (qs('#stat-eventos')) qs('#stat-eventos').textContent = events.length;

  // Calculate specific distribution
  const counts = {
    // Males
    becerros: 0, terneros_m: 0, anojos: 0, novillos: 0, utreros: 0, toros: 0, bueyes: 0,
    // Females
    becerras: 0, terneras_h: 0, anojas: 0, novillas: 0, vacas: 0, nodrizas: 0
  };

  // Find all mothers
  const mothersParams = new Set();
  animals.forEach(a => {
    if (a.mother) mothersParams.add(a.mother);
  });

  animals.forEach(a => {
    const dob = new Date(a.birthDate);
    const now = new Date();
    // Age in months (approx)
    const ageMonths = (now - dob) / (1000 * 60 * 60 * 24 * 30.44);

    const isMother = mothersParams.has(a.crotal);

    if (a.sex === 'Hembra') {
      if (isMother) {
        counts.nodrizas++;
      } else {
        if (ageMonths < 6) counts.becerras++;
        else if (ageMonths < 12) counts.terneras_h++;
        else if (ageMonths < 24) counts.anojas++;
        else if (ageMonths < 36) counts.novillas++;
        else counts.vacas++; // > 36m
      }
    } else {
      // Macho
      if (ageMonths < 6) counts.becerros++;
      else if (ageMonths < 12) counts.terneros_m++;
      else if (ageMonths < 24) counts.anojos++;
      else if (ageMonths < 36) counts.novillos++;
      else if (ageMonths < 48) counts.utreros++;
      else counts.toros++; // > 48m
    }
  });

  // Render Counts
  const setTxt = (id, val) => { const el = qs(id); if (el) el.textContent = val; };

  setTxt('#count-becerros', counts.becerros);
  setTxt('#count-terneros-m', counts.terneros_m);
  setTxt('#count-anojos', counts.anojos);
  setTxt('#count-novillos', counts.novillos);
  setTxt('#count-utreros', counts.utreros);
  setTxt('#count-toros', counts.toros);
  setTxt('#count-bueyes', counts.bueyes);

  setTxt('#count-becerras', counts.becerras);
  setTxt('#count-terneras-h', counts.terneras_h);
  setTxt('#count-anojas', counts.anojas);
  setTxt('#count-novillas', counts.novillas);
  setTxt('#count-vacas', counts.vacas);
  setTxt('#count-nodrizas', counts.nodrizas);

  // Update Dashboard Alerts
  if (typeof updateDashboardAlerts === 'function') updateDashboardAlerts();
}

function openAnimalDetails(id) {
  const animals = storage.read(`animals_${currentUser}`, []);
  const animal = animals.find(a => a.id === id);
  if (!animal) return;

  if (detailCrotal) detailCrotal.textContent = animal.crotal;
  if (detailBreed) detailBreed.textContent = animal.breed;
  if (detailSex) detailSex.textContent = animal.sex;
  if (detailBirth) detailBirth.textContent = new Date(animal.birthDate).toLocaleDateString();

  // Weights
  const bw = animal.birthWeight || 0;
  const cw = animal.currentWeight || 0;
  if (detailBirthWeight) detailBirthWeight.textContent = bw.toFixed(2);
  if (detailWeight) detailWeight.textContent = cw.toFixed(2);
  if (detailGain) detailGain.textContent = (cw - bw).toFixed(2);

  // Helper to find animal by crotal and format "Crotal (Breed)"
  const getAnimalLabel = (crotal) => {
    if (!crotal) return 'N/A';
    const found = animals.find(a => String(a.crotal).trim() === String(crotal).trim());
    const short = getShortCrotal(crotal);
    return found ? `${short} (${found.breed})` : short;
  };

  // Parents with Breed lookup
  if (detailFather) detailFather.textContent = getAnimalLabel(animal.father);
  if (detailMother) detailMother.textContent = getAnimalLabel(animal.mother);

  // Offspring Logic
  if (detailOffspring) {
    detailOffspring.innerHTML = '';
    const thisCrotal = String(animal.crotal).trim();

    const children = animals.filter(child => {
      const f = String(child.father || '').trim();
      const m = String(child.mother || '').trim();
      return f === thisCrotal || m === thisCrotal;
    });

    if (children.length === 0) {
      detailOffspring.innerHTML = '<li>Sin descendencia registrada</li>';
    } else {
      children.forEach(child => {
        const li = document.createElement('li');

        let otherParentCrotal = '';
        let role = '';

        if (String(child.father).trim() === thisCrotal) {
          otherParentCrotal = child.mother;
          role = 'Madre';
        } else {
          otherParentCrotal = child.father;
          role = 'Padre';
        }

        const otherParentLabel = getAnimalLabel(otherParentCrotal);
        const birthYear = new Date(child.birthDate).getFullYear();

        const childBreed = child.breed || 'Desconocida';
        const childCrotalShort = getShortCrotal(child.crotal);

        li.innerHTML = `<strong>${childCrotalShort}</strong> (${childBreed}, ${birthYear}) 
                              <span style="color:var(--muted)">— con ${otherParentLabel} (${role})</span>`;
        detailOffspring.appendChild(li);
      });
    }
  }

  // Farm
  const fincas = getFincas();
  const farm = fincas.find(f => f.id === animal.farmId);
  if (detailFarm) detailFarm.textContent = farm ? farm.name : 'Desconocida';

  if (detailNotes) detailNotes.textContent = animal.notes || 'Sin notas';

  // --- Lifecycle & Nutrition Integration ---
  if (window.NutritionEngine) {
    // 1. Calculate Status
    const events = storage.read('events', []);
    const repro = getReproductiveStatus(animal, events);
    const isPregnant = repro.status === 'Gestante' || repro.status === 'Preñada';
    const ageMonths = calculateAgeMonths(animal.birthDate);

    // 2. Determine Stage
    const stage = window.NutritionEngine.determineStage(ageMonths, animal.sex, isPregnant);

    // 3. Update UI
    const stageEl = qs('#detailStage');
    if (stageEl) {
      stageEl.textContent = stage ? stage.name : 'N/A';
    }

    const lifecycleDiv = qs('#detailLifecycle');
    if (lifecycleDiv) {
      lifecycleDiv.innerHTML = window.NutritionEngine.getStageHtml(stage);
    }
  }

  if (animalDetailModal) animalDetailModal.classList.remove('hidden');
}

// Close Modal Logic
[closeAnimalDetail, closeDetailBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', () => {
    if (animalDetailModal) animalDetailModal.classList.add('hidden');
  });
});

// Animal Selectors
const animalsList = qs('#animalsList');
const searchAnimalInput = qs('#searchAnimal');
const filterFarmSelect = qs('#filterFarm');
const filterBreedSelect = qs('#filterBreed');
const filterSexSelect = qs('#filterSex');
const animalCountSpan = qs('#animalCount');

function renderAnimals() {
  if (!animalsList) return;

  let animals = storage.read(`animals_${currentUser}`, []);

  // Populate Breed Filter Dynamically (Fix for imported breeds not showing)
  if (filterBreedSelect) {
    const currentSelection = filterBreedSelect.value;
    // Filter out "F1" from uniqueBreeds to avoid duplication
    const uniqueBreeds = [...new Set(animals.map(a => a.breed).filter(b => b && b !== 'F1'))].sort();

    filterBreedSelect.innerHTML = '<option value="">Todas las razas</option>';

    // Smart Option
    const f1Option = document.createElement('option');
    f1Option.value = '__ALL_F1__';
    f1Option.textContent = 'F1';
    filterBreedSelect.appendChild(f1Option);

    uniqueBreeds.forEach(breed => {
      const opt = document.createElement('option');
      opt.value = breed;
      opt.textContent = breed;
      filterBreedSelect.appendChild(opt);
    });

    if (uniqueBreeds.includes(currentSelection) || currentSelection === '__ALL_F1__') {
      filterBreedSelect.value = currentSelection;
    }
  }

  const allIds = animals.map(a => a.crotal);

  // Update Datalist
  const datalist = qs('#animal-ids');
  if (datalist) {
    datalist.innerHTML = '';
    // Show all IDs in datalist initially or refined? Usually all.
    animals.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.crotal;
      datalist.appendChild(opt);
    });
  }

  // Filter
  const term = searchAnimalInput.value.toLowerCase().trim();
  const farmId = filterFarmSelect.value;
  const breed = filterBreedSelect.value;
  const sex = filterSexSelect.value;
  const ageType = filterAgeSelect ? filterAgeSelect.value : '';

  animals = animals.filter(a => {
    // 1. Search (ID or Name)
    const matchSearch = !term || (a.crotal.toLowerCase().includes(term) || (a.name && a.name.toLowerCase().includes(term)));

    // 2. Farm
    const matchFarm = !farmId || a.farmId === farmId;

    // 3. Breed
    let matchBreed = true;
    if (breed === '__ALL_F1__') {
      const bName = (a.breed || '').toLowerCase();
      // Match if has genetics flag OR name indicates cross
      matchBreed = !!a._genetics || bName.includes('cruce') || bName.startsWith('f1');
    } else {
      matchBreed = !breed || a.breed === breed;
    }

    // 4. Sex
    const matchSex = !sex || a.sex === sex;

    // 5. Age / Type
    let matchAge = true;
    if (ageType) {
      const type = calculateAnimalType(a);
      // Handle combined cases if needed, but simple match for now
      matchAge = type === ageType;

      // Handle generic loose matching if "Becerro/a" used
      if (!matchAge && ageType.includes('/')) {
        const parts = ageType.split('/');
        matchAge = parts.some(p => type.startsWith(p));
      }
    }

    return matchSearch && matchFarm && matchBreed && matchSex && matchAge;
  });

  animalsList.innerHTML = '';

  if (animalCountSpan) animalCountSpan.textContent = animals.length;

  if (!animals.length) {
    animalsList.innerHTML = '<p class="status">No hay animales que coincidan con los filtros</p>';
    return;
  }

  animals.forEach(animal => {
    const el = document.createElement('div');
    el.className = 'farm';
    el.style.cursor = 'pointer';
    el.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') return;
      openAnimalDetails(animal.id);
    };
    // Use HTML Formatting for Main List
    const crotalHTML = formatCrotalHTML(animal.crotal);

    el.innerHTML = `
            <div class="farm-title">
                <div>
                     ${crotalHTML} ${animal.name ? `(${animal.name})` : ''}
                    <div class="farm-meta">${animal.breed} · ${animal.sex} · ${new Date(animal.birthDate).toLocaleDateString()}</div>
                </div>
                <span class="tag">${animal.currentWeight.toFixed(2)} kg</span>
            </div>
            <div class="farm-meta" style="margin-top:4px;">
                ${animal.father ? `P: ${getShortCrotal(animal.father)}` : ''} ${animal.mother ? `M: ${getShortCrotal(animal.mother)}` : ''}
            </div>
            <div class="farm-meta">
               Nacimiento: ${animal.birthWeight.toFixed(2)} kg
            </div>
             <div style="margin-top: 8px;">
                <button class="ghost small" onclick="deleteAnimal('${animal.id}')">Eliminar</button>
            </div>
        `;
    animalsList.appendChild(el);
  });
}

window.deleteAnimal = function (id) {
  if (!confirm('¿Eliminar este animal?')) return;
  const animals = storage.read(`animals_${currentUser}`, []);
  const filtered = animals.filter(a => a.id !== id);
  storage.write(`animals_${currentUser}`, filtered);
  renderAnimals();
  updateStats(getFincas());
};

// Helper to parse DD/MM/YYYY to YYYY-MM-DD
function parseDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

window.importBatchAnimals = function () {
  const fincas = getFincas();
  const targetFarm = fincas.find(f => f.name.toLowerCase().includes('soto del prior'));

  if (!targetFarm) {
    alert('No se encontró la finca "soto del prior".');
    return;
  }

  // Set 1 (Previous)
  const batchData1 = [
    { id: '7390', raza: 'Mestiza', nac: '2015-04-20' },
    { id: '7391', raza: 'Mestiza', nac: '2015-04-21' },
    { id: '444', raza: 'Mestiza', nac: '2017-05-25' },
    { id: '4991', raza: 'Mestiza', nac: '2017-07-12' },
    { id: '4992', raza: 'Mestiza', nac: '2017-08-09' },
    { id: '7318', raza: 'Mestiza', nac: '2017-12-07' },
    { id: '8937', raza: 'Mestiza', nac: '2018-02-27' },
    { id: '3796', raza: 'Betizu', nac: '2021-01-14' },
    { id: '8767', raza: 'Betizu', nac: '2021-03-11' },
    { id: '5243', raza: 'Betizu', nac: '2021-03-13' },
    { id: '1047', raza: 'Pirenaica', nac: '2021-04-10' },
    { id: '8396', raza: 'Betizu', nac: '2021-04-11' },
    { id: '4792', raza: 'Betizu', nac: '2021-04-15' },
    { id: '2238', raza: 'Betizu', nac: '2021-04-30' },
    { id: '8896', raza: 'Mestiza', nac: '2022-03-28' },
    { id: '8895', raza: 'Mestiza', nac: '2022-03-29' },
    { id: '8888', raza: 'Mestiza', nac: '2022-04-11' },
    { id: 'ES021402911052', raza: 'Pirenaica', nac: '2021-04-19' },
    { id: 'ES011402911051', raza: 'Pirenaica', nac: '2021-04-16' },
    { id: 'ES021402728886', raza: 'Betizu', nac: '2014-02-01' },
    { id: 'ES011402728885', raza: 'Betizu', nac: '2014-02-07' },
    { id: 'ES021402728900', raza: 'F1', nac: '2021-01-21', madre: '4992', padre: 'ES071402954198' },
    { id: 'ES061530490444', raza: 'Holstein', nac: '2017-05-25' },
    { id: 'ES071402954198', raza: 'Limousin', nac: '2018-04-12', sex: 'Macho' }
  ];

  // Set 2 (New Request)
  // Format: crotal, nac(DD/MM/YYYY), madre, padre, Sexo(M/H), peso
  const rawBatch2 = [
    ['8885', '23/07/2021', '8902', '4198', 'M', '21'],
    ['7390', '28/03/2022', '8896', '4198', 'H', '27'],
    ['7391', '25/04/2022', '8889', '4198', 'M', '24'],
    ['444', '29/03/2022', '8895', '', 'H', '28'],
    ['4991', '28/03/2021', '8901', '4198', 'M', '23'],
    ['4991', '27/04/2022', '8890', '4198', 'M', '25'],
    ['4992', '21/01/2021', '8900', '4198', 'H', '23'],
    ['4992', '11/04/2022', '8888', '4198', 'H', '24'],
    ['7318', '10/04/2022', '8887', '4198', 'M', '23'],
    ['8937', '24/07/2022', '8890', '4198', 'M', '24'],
    ['8904', '25/06/2023', '8937', '4198', 'H', '22'],
    ['xxxx', '24/05/2023', '4991', '4198', 'M', '26']
  ];

  const animals = storage.read(`animals_${currentUser}`, []);
  let count = 0;

  // Process Batch 1 (Legacy logic)
  batchData1.forEach(item => {
    if (animals.some(a => a.crotal === item.id)) return;
    animals.push({
      id: crypto.randomUUID(),
      crotal: item.id,
      name: '',
      farmId: targetFarm.id,
      breed: item.raza,
      sex: item.sex || 'Hembra',
      birthDate: item.nac,
      birthWeight: 0,
      currentWeight: 0,
      notes: 'Importado lote 1',
      father: item.padre || '',
      mother: item.madre || '',
      createdAt: new Date().toISOString()
    });
    count++;
  });
  // Deduplication Logic
  window.removeDuplicates = function () {
    if (!confirm('¿Analizar y eliminar duplicados manteniendo el más completo?')) return;

    const animals = storage.read(`animals_${currentUser}`, []);
    const groups = {};

    // 1. Group by Normalized Crotal (remove -2, -3 suffixes if they look generated)
    animals.forEach(a => {
      // Regex matches "NUMBERS-DIGIT" or just "NUMBERS"
      // Adjust regex based on your known suffixes. 
      // Assuming suffixes are "-N".
      const root = a.crotal.replace(/-\d+$/, '');
      if (!groups[root]) groups[root] = [];
      groups[root].push(a);
    });

    let removedCount = 0;
    const cleanList = [];

    Object.values(groups).forEach(group => {
      if (group.length === 1) {
        cleanList.push(group[0]);
        return;
      }

      // 2. Score duplicates
      // Score = +1 for each existing field: father, mother, birthWeight>0, notes!=default
      group.forEach(a => {
        a._score = 0;
        if (a.father) a._score++;
        if (a.mother) a._score++;
        if (a.birthWeight > 0) a._score++;
        if (a.currentWeight > 0) a._score++;
        if (a.notes && !a.notes.includes('Importado')) a._score++; // User manually edited notes are valuable
        if (a.sex) a._score++;
      });

      // Sort descending by score. If tie, keep the most recently created (or oldest? Usually newest has better data if imported later).
      // Let's keep newest if score ties.
      group.sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      const winner = group[0];
      // Ensure winner has the root crotal (clean suffix)
      winner.crotal = group[0].crotal.replace(/-\d+$/, '');

      // Remove score property
      delete winner._score;
      cleanList.push(winner);
      removedCount += (group.length - 1);
    });

    // Save
    storage.write(`animals_${currentUser}`, cleanList);
    renderAnimals();
    updateStats(getFincas());
    alert(`Se han eliminado ${removedCount} duplicados. Se conservaron los registros más completos.`);
  };
  // Process Batch 2
  rawBatch2.forEach(row => {
    let [crotal, nac, mad, pad, sexChar, peso] = row;

    // Handle 'xxxx' or duplicates
    if (crotal === 'xxxx' || !crotal) {
      crotal = 'TEMP-' + Math.floor(Math.random() * 1000);
    }

    // Attempt to de-duplicate if exact crotal exists (append suffix if needed)
    // Actually, user gave same crotal (e.g. 4991) for different animals.
    // We will append a suffix if it already exists in the MAIN list.
    let uniqueCrotal = crotal;
    let suffix = 2;
    while (animals.some(a => a.crotal === uniqueCrotal)) {
      uniqueCrotal = `${crotal}-${suffix}`;
      suffix++;
    }

    const birthDate = parseDate(nac);
    const sex = sexChar === 'M' ? 'Macho' : 'Hembra';
    const birthW = parseFloat(peso) || 0;

    animals.push({
      id: crypto.randomUUID(),
      crotal: uniqueCrotal,
      name: '',
      farmId: targetFarm.id,
      breed: 'Mestiza', // Default as not specified in this batch, or could infer
      sex: sex,
      birthDate: birthDate,
      birthWeight: birthW,
      currentWeight: birthW, // New borns/calves probably
      notes: 'Importado lote 2',
      father: pad || '',
      mother: mad || '',
      createdAt: new Date().toISOString()
    });
    count++;
  });

  storage.write(`animals_${currentUser}`, animals);
  alert(`Proceso finalizado. Total añadidos: ${count}`);
  renderAnimals();
  updateStats(getFincas());
};

// --- Event Listeners for Filters ---
[searchAnimalInput, filterFarmSelect, filterBreedSelect].forEach(el => {
  if (el) el.addEventListener('input', renderAnimals);
});

if (filterSexSelect) {
  filterSexSelect.addEventListener('change', () => {
    updateAgeOptions();
    renderAnimals();
  });
}
if (filterAgeSelect) {
  filterAgeSelect.addEventListener('change', renderAnimals);
}

// ==========================================
// EVENT MANAGEMENT SYSTEM
// ==========================================

const toggleEventFormBtn = qs('#toggleEventForm');
const eventFormCard = qs('#eventFormCard');
const cancelEventFormBtn = qs('#cancelEventForm');
const eventForm = qs('#eventForm');
const eventTypeInput = qs('#eventType');
const eventWeightInput = qs('#eventWeight');
const eventWeightLabel = qs('#eventWeightLabel');
const eventNextInput = qs('#eventNext');
const alertsList = qs('#alertsList');

// === Autocomplete Logic ===
function setupAutocomplete(input, list, getFilterFn) {
  if (!input || !list) return;

  function doSearch() {
    const term = input.value.trim().toLowerCase();
    if (!term) {
      list.classList.add('hidden');
      return;
    }

    const animals = storage.read(`animals_${currentUser}`, []);
    const filterFn = getFilterFn ? getFilterFn() : null;

    const matches = animals.filter(a => {
      const crotal = a.crotal.toLowerCase();
      // Robust search: Includes is better for user experience than strict validation here
      const matchTerm = crotal.includes(term);

      const matchExtra = filterFn ? filterFn(a) : true;
      return matchTerm && matchExtra;
    });

    const results = matches.slice(0, 10);

    list.innerHTML = '';
    if (results.length === 0) {
      list.classList.add('hidden');
      return;
    }

    results.forEach(a => {
      const li = document.createElement('li');
      const nameStr = a.name ? `(${a.name})` : '';
      li.textContent = `${a.crotal} ${nameStr} [${a.breed}]`;
      li.onclick = () => {
        input.value = a.crotal;
        list.classList.add('hidden');
      };
      list.appendChild(li);
    });
    list.classList.remove('hidden');
  }

  input.addEventListener('input', doSearch);
  input.addEventListener('focus', () => { if (input.value.trim()) doSearch(); });

  // Hide on click outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.classList.add('hidden');
    }
  });
}

// Init Autocomplete
setupAutocomplete(qs('#eventAnimal'), qs('#eventAnimalSuggestions'), () => {
  const type = qs('#eventType').value;
  if (type === 'Parto') return (a) => a.sex === 'Hembra';
  if (type === 'Inseminación') {
    const events = storage.read('events', []);
    return (a) => {
      const status = getReproductiveStatus(a, events);
      return status.isFertile; // Strict filtering: Only Fertile Females
    };
  }
  return null;
});

setupAutocomplete(qs('#eventFather'), qs('#eventFatherSuggestions'), () => {
  return (a) => a.sex === 'Macho';
});

// Toggle Form
if (toggleEventFormBtn) {
  toggleEventFormBtn.addEventListener('click', () => {
    if (eventFormCard) {
      if (eventFormCard.classList.contains('hidden')) {
        // Prepare Form
        // populateAnimalSelects(); // REMOVED: Now using Search Input
        eventFormCard.classList.remove('hidden');
        toggleEventFormBtn.textContent = 'Cancelar';
        // Set default date to today (Internal for tracking, though UI is hidden)
        qs('#eventDate').value = new Date().toISOString().split('T')[0];
      } else {
        eventFormCard.classList.add('hidden');
        toggleEventFormBtn.textContent = 'Nuevo Evento';
        eventForm.reset();
        if (eventWeightLabel) eventWeightLabel.classList.add('hidden');
      }
    }
  });
}

if (cancelEventFormBtn) {
  cancelEventFormBtn.addEventListener('click', () => {
    if (eventFormCard) eventFormCard.classList.add('hidden');
    if (toggleEventFormBtn) toggleEventFormBtn.textContent = 'Nuevo Evento';
    eventForm.reset();
  });
}

// Show/Hide Weight Input based on Type
if (eventTypeInput) {
  // Event Type Change - Toggle Fields
  eventTypeInput.addEventListener('change', (e) => {
    const type = e.target.value;
    const isPesaje = type === 'Pesaje';

    // Toggle Weight Field
    if (eventWeightLabel) { // Check if element exists before manipulating
      if (isPesaje) {
        eventWeightLabel.classList.remove('hidden');
      } else {
        eventWeightLabel.classList.add('hidden');
      }
    }
    if (eventWeightInput) { // Set required property
      eventWeightInput.required = isPesaje;
    }

    // STRICT UI: Hide other fields for Pesaje OR Inseminación
    const descLabel = qs('#eventDesc').parentElement;
    const costLabel = qs('#eventCost').parentElement;
    const nextDateLabel = qs('#eventNext').parentElement;
    const animalLabel = qs('#eventAnimal').parentElement; // Mother Search

    // Parto Fields
    const partoFields = document.querySelectorAll('.parto-field');
    const partoHeader = qs('#partoFields');

    // Inseminación Fields
    const bullBreedLabel = qs('#eventBullBreedLabel');
    const bullBreedSelect = qs('#eventBullBreed');

    // Reset All Visibility first
    partoHeader.classList.add('hidden');
    partoFields.forEach(el => el.classList.add('hidden'));
    if (bullBreedLabel) bullBreedLabel.classList.add('hidden');

    // Default: Show standard fields
    descLabel.classList.remove('hidden');
    costLabel.classList.remove('hidden');
    nextDateLabel.classList.remove('hidden');
    if (eventWeightLabel) eventWeightLabel.classList.add('hidden');

    if (isPesaje) {
      descLabel.classList.add('hidden');
      costLabel.classList.add('hidden');
      nextDateLabel.classList.add('hidden');
      if (eventWeightLabel) eventWeightLabel.classList.remove('hidden');
    } else if (type === 'Parto') {
      // PARTO UI
      eventWeightLabel.classList.remove('hidden'); // Reuse for Birth Weight
      descLabel.classList.add('hidden'); // Auto-desc
      costLabel.classList.add('hidden');
      nextDateLabel.classList.add('hidden');

      partoHeader.classList.remove('hidden');
      partoFields.forEach(el => el.classList.remove('hidden'));
    } else if (type === 'Inseminación') {
      // INSEMINATION UI
      descLabel.classList.add('hidden'); // Auto-desc
      costLabel.classList.add('hidden'); // Hide cost as per request
      nextDateLabel.classList.add('hidden'); // Hide next date as per request

      if (bullBreedLabel) {
        bullBreedLabel.classList.remove('hidden');
        // Populate Breeds
        if (bullBreedSelect) {
          bullBreedSelect.innerHTML = '<option value="">Selecciona raza</option>';
          // Use global BREED_DATA
          Object.values(BREED_DATA).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = b.name;
            bullBreedSelect.appendChild(opt);
          });
        }
      }
    }
  });
}

// Populate Animal Selects for Events
function populateAnimalSelects() {
  const animals = storage.read(`animals_${currentUser}`, []);
  const eventAnimalSelect = null; // qs('#eventAnimal'); // Removed
  const filterEventAnimalSelect = qs('#filterEventAnimal');

  [filterEventAnimalSelect].forEach(select => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = select.id === 'filterEventAnimal'
      ? '<option value="">Todos los animales</option>'
      : '<option value="">Selecciona animal</option>';

    // Sort by Crotal or Name
    animals.sort((a, b) => a.crotal.localeCompare(b.crotal));

    animals.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      const name = a.name ? ` (${a.name})` : '';
      opt.textContent = `${a.crotal}${name} - ${a.breed}`;
      select.appendChild(opt);
    });

    if (current) select.value = current;
  });
}

// Handle Event Submit
if (eventForm) {
  eventForm.addEventListener('submit', (e) => {
    e.preventDefault();

    try {
      const type = qs('#eventType').value;
      const animalSearchTerm = qs('#eventAnimal').value.trim(); // Text Search
      // const date = qs('#eventDate').value; // Automated now
      const date = new Date().toISOString(); // Auto-set
      const desc = qs('#eventDesc').value.trim();
      const cost = parseFloat(qs('#eventCost').value) || 0;
      const nextDate = qs('#eventNext').value;
      const weight = parseFloat(qs('#eventWeight').value) || 0;

      // FIX: Move events declaration to top so it's accessible in Parto block
      const events = storage.read('events', []);

      if (!type || !animalSearchTerm) {
        alert('Por favor completa los campos obligatorios.');
        return;
      }

      const animals = storage.read(`animals_${currentUser}`, []);

      // SEARCH LOGIC
      // 1. Try Exact Match First (Best for Autocomplete)
      let matches = animals.filter(a => a.crotal.toLowerCase() === animalSearchTerm.toLowerCase());

      // 2. If no exact match, try partial match (EndsWith)
      if (matches.length === 0) {
        matches = animals.filter(a => a.crotal.endsWith(animalSearchTerm));
      }

      if (matches.length === 0) {
        alert(`No se encontró ningún animal que termine en "${animalSearchTerm}".`);
        return;
      }
      if (matches.length > 1) {
        alert(`Múltiples animales encontrados (${matches.length}) terminan en "${animalSearchTerm}". Por favor introduce más dígitos.`);
        return;
      }

      const animal = matches[0];
      const animalId = animal.id;
      const animalCrotal = animal.crotal;

      // LOGIC: PESAJE UPDATE
      if (type === 'Pesaje') {
        animal.currentWeight = weight;
        storage.write(`animals_${currentUser}`, animals);
        if (typeof renderAnimals === 'function') renderAnimals(); // Update UI
      }

      // LOGIC: PARTO (Create Calf)
      if (type === 'Parto') {
        const calfCrotal = qs('#eventCalfCrotal').value.trim();
        const calfSex = qs('#eventSex').value;
        const fatherCrotal = qs('#eventFather').value.trim();

        if (!calfCrotal || !calfSex) {
          alert('Por favor indica el Crotal de la cría y su Sexo.');
          return;
        }

        // Create New Animal
        const newCalf = {
          id: generateUUID(), // Using Crotal as ID for simplicity? No, using UUID for system ID, Crotal as Display
          crotal: calfCrotal,
          name: '', // Optional
          farmId: animal.farmId, // Inherit Farm ID
          farm: animal.farm, // Inherit Farm Name
          breed: animal.breed || 'Desconocida', // Inherit Breed? Or Mixed?
          sex: calfSex,
          father: fatherCrotal,
          mother: animalCrotal,
          birthDate: date.split('T')[0],
          birthWeight: weight,
          currentWeight: weight,
          notes: `Nacido de ${animalCrotal} el ${date.split('T')[0]}`,
          createdAt: new Date().toISOString()
        };

        animals.push(newCalf);
        storage.write(`animals_${currentUser}`, animals);

        // Schedule: 1st Weighing (1 Month)
        const weighDate = new Date();
        weighDate.setDate(weighDate.getDate() + 30);

        events.push({
          id: generateUUID(),
          type: 'Pesaje',
          animalId: newCalf.id,
          animalCrotal: newCalf.crotal,
          date: weighDate.toISOString().split('T')[0],
          desc: 'CONTROL MENSUAL (1er Mes)',
          cost: 0,
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        // Schedule: Male Decision (6 Months)
        if (calfSex === 'Macho') {
          const decisionDate = new Date();
          decisionDate.setDate(decisionDate.getDate() + 180); // 6 months

          events.push({
            id: generateUUID(),
            type: 'Revisión',
            animalId: newCalf.id,
            animalCrotal: newCalf.crotal,
            date: decisionDate.toISOString().split('T')[0],
            desc: 'DECISIÓN MACHO: ¿Castrar o Semental?',
            cost: 0,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
        }

        alert(`✅ Parto registrado. Cría ${calfCrotal} añadida al inventario.`);
      }



      // 1. Create Main Event (The Birth Record itself - Linked to Mother)
      // Note: User might want link to calf in desc
      const calfInfo = type === 'Parto' ? `Cría: ${qs('#eventCalfCrotal').value} (${qs('#eventSex').value}). Peso: ${weight}kg` : '';

      const newEvent = {
        id: generateUUID(),
        type,
        animalId,
        animalCrotal,
        date,
        desc: type === 'Pesaje' ? `Pesaje: ${weight.toFixed(4)}kg. ${desc}` : (type === 'Parto' ? `Parto. ${calfInfo}` : desc),
        cost,
        nextDate,
        createdAt: new Date().toISOString()
      };

      events.push(newEvent);

      // 2. Logic: Auto-Schedule Next Weighing
      if (type === 'Pesaje') {
        const nextWeighDate = new Date(date);
        nextWeighDate.setDate(nextWeighDate.getDate() + 30); // +30 Days

        const autoEvent = {
          id: generateUUID(),
          type: 'Pesaje',
          animalId,
          animalCrotal,
          date: nextWeighDate.toISOString().split('T')[0],
          desc: 'CONTROL MENSUAL AUTOMÁTICO', // Flag to know it's auto
          cost: 0,
          status: 'pending', // Optional status flag
          createdAt: new Date().toISOString()
        };
        events.push(autoEvent);
        alert('✅ Peso actualizado y próxima revisión programada en 30 días.');
      } else if (type === 'Inseminación') {
        // PROTOCOL GENERATOR (Ovsynch + IATF)
        // Day 0: Start (This Event) -> GnRH 1

        let breedInfo = '';
        const bullBreedSelect = qs('#eventBullBreed');
        if (bullBreedSelect && bullBreedSelect.value) {
          breedInfo = ` Toro: ${bullBreedSelect.value}.`;
        }

        // 1. Update THIS event description
        newEvent.desc = `Inicio Protocolo IA (Día 0): Evaluación + GnRH 1.${breedInfo} ${desc}`;

        // 2. Generate Future Events
        const protocolSteps = [
          { day: 7, type: 'Tratamiento', desc: 'Protocolo IA (Día 7): Prostaglandina (PGF2a)' },
          { day: 9, type: 'Tratamiento', desc: 'Protocolo IA (Día 9): GnRH 2ª dosis' },
          { day: 10, type: 'Inseminación', desc: `Protocolo IA (Día 10): IA a Tiempo Fijo (16-20h tras GnRH).${breedInfo}` }, // The actual IA
          { day: 35, type: 'Revisión', desc: 'Protocolo IA (Día 35): Ecografía (Diagnóstico Gestación)' },
          { day: 60, type: 'Revisión', desc: 'Protocolo IA (Día 60): Confirmación Viabilidad' }
        ];

        protocolSteps.forEach(step => {
          const stepDate = new Date(date); // Clone start date
          stepDate.setDate(stepDate.getDate() + step.day);

          const autoEvent = {
            id: generateUUID(),
            type: step.type,
            animalId,
            animalCrotal,
            date: stepDate.toISOString().split('T')[0], // YYYY-MM-DD
            desc: step.desc,
            cost: 0, // Costs can be added later
            status: 'scheduled',
            createdAt: new Date().toISOString()
          };
          events.push(autoEvent);
        });

        alert('✅ Protocolo de Inseminación iniciado. Se han programado 5 eventos futuros (Día 7, 9, 10, 35, 60).');

      } else {
        alert('Evento registrado correctamente.');
      }

      storage.write('events', events);

      eventForm.reset();
      eventFormCard.classList.add('hidden');
      toggleEventFormBtn.textContent = 'Nuevo Evento';
      if (eventWeightLabel) eventWeightLabel.classList.add('hidden');

      renderEvents();
      updateDashboardAlerts();
      updateStats(getFincas());

    } catch (err) {
      console.error(err);
      alert('Error al guardar evento: ' + err.message);
    }
  });
}

// Render Events List
const eventsList = qs('#eventsList');
const filterEventType = qs('#filterEventType');
const filterEventAnimal = qs('#filterEventAnimal');

function renderEvents() {
  if (!eventsList) return;

  let events = storage.read('events', []);
  const animals = storage.read(`animals_${currentUser}`, []);

  // Sort Date Descending
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filters
  const fType = filterEventType ? filterEventType.value : '';
  const fAnimal = filterEventAnimal ? filterEventAnimal.value : '';

  events = events.filter(ev => {
    let match = true;
    if (fType) match = match && ev.type === fType;
    if (fAnimal) match = match && ev.animalId === fAnimal;
    return match;
  });

  // Update Count in Header if exists
  // const countSpan = qs('#eventCount');
  // if(countSpan) countSpan.textContent = events.length;

  eventsList.innerHTML = '';

  if (events.length === 0) {
    eventsList.innerHTML = '<p class="status">No hay eventos registrados.</p>';
    return;
  }

  events.forEach(ev => {
    const el = document.createElement('div');
    el.className = 'farm';

    // Check if date is future
    const isFuture = new Date(ev.date) > new Date();
    const futureStyle = isFuture ? 'border-left: 4px solid #f59e0b; background: #fffbeb;' : '';

    el.style = `padding: 12px; margin-bottom: 8px; ${futureStyle}`;

    el.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <div style="font-weight:bold; color: #1f2937;">${ev.type} <span style="font-weight:normal; color:#6b7280;">- ${ev.animalCrotal}</span></div>
                    <div style="font-size:0.9em; margin-top:2px;">${ev.desc}</div>
                    <div style="font-size:0.85em; color:#9ca3af; margin-top:4px;">
                        📅 ${new Date(ev.date).toLocaleDateString()} 
                        ${ev.nextDate ? `➡ Prox: ${new Date(ev.nextDate).toLocaleDateString()}` : ''}
                    </div>
                </div>
                <button class="ghost small" onclick="deleteEvent('${ev.id}')" style="color:#ef4444;">×</button>
            </div>
        `;
    eventsList.appendChild(el);
  });
}

window.deleteEvent = function (id) {
  if (!confirm('¿Eliminar evento?')) return;
  let events = storage.read('events', []);
  events = events.filter(e => e.id !== id);
  storage.write('events', events);
  renderEvents();
  updateDashboardAlerts();
};

// Listeners for Filters
if (filterEventType) filterEventType.addEventListener('change', renderEvents);
if (filterEventAnimal) filterEventAnimal.addEventListener('change', renderEvents);


// DASHBOARD ALERTS (Upcoming Events)
function updateDashboardAlerts() {
  if (!alertsList) return;

  const events = storage.read('events', []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  // Find events in range [Today, Today+7]
  const upcoming = events.filter(ev => {
    const d = new Date(ev.date);
    return d >= today && d <= nextWeek;
  });

  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

  alertsList.innerHTML = '';

  if (upcoming.length === 0) {
    alertsList.innerHTML = '<li><span>No hay eventos próximos (7 días)</span></li>';
    return;
  }

  upcoming.forEach(ev => {
    const li = document.createElement('li');

    // Warning color if today
    const isToday = new Date(ev.date).toDateString() === today.toDateString();
    const style = isToday ? 'color: #d97706; font-weight:bold;' : '';

    li.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; ${style}">
                <span>${ev.type}: ${ev.animalCrotal}</span>
                <span>${new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
            <div style="font-size:0.85em; color:#6b7280;">${ev.desc}</div>
        `;
    alertsList.appendChild(li);
  });
}


// Initial Setup
populateBreedSelects();
// updateAgeOptions(); // Call once to set initial state

// One-time fix for breed spelling error
(function fixBreedSpelling() {
  const user = localStorage.getItem('sessionUser') || currentUser;
  if (!user) return;
  const animals = storage.read(`animals_${user}`, []);
  const animal = animals.find(a => a.crotal === 'ES071402954198');
  if (animal && (animal.breed === 'imusin' || animal.breed === 'Limusín')) {
    animal.breed = 'Limousin';
    storage.write(`animals_${currentUser}`, animals);
    console.log('Breed corrected for ES071402954198: ' + (animal.breed === 'imusin' ? 'imusin' : 'Limusín') + ' → Limousin');
    if (typeof renderAnimals === 'function') renderAnimals();
    if (typeof updateStats === 'function') updateStats(getFincas());
  }
})();

// CSV Upload Handlers
const breedCSVInput = qs('#breedCSVInput');
const uploadBreedCSVBtn = qs('#uploadBreedCSV');
const downloadBreedTemplateBtn = qs('#downloadBreedTemplate');
const csvUploadStatus = qs('#csvUploadStatus');

function showCSVStatus(type, message) {
  if (!csvUploadStatus) return;
  csvUploadStatus.classList.remove('hidden');
  if (type === 'success') {
    csvUploadStatus.style.background = '#f0fdf4';
    csvUploadStatus.style.color = '#166534';
    csvUploadStatus.style.border = '1px solid #bbf7d0';
  } else if (type === 'error') {
    csvUploadStatus.style.background = '#fef2f2';
    csvUploadStatus.style.color = '#991b1b';
    csvUploadStatus.style.border = '1px solid #fecaca';
  } else {
    csvUploadStatus.style.background = '#eff6ff';
    csvUploadStatus.style.color = '#1e40af';
    csvUploadStatus.style.border = '1px solid #bfdbfe';
  }
  csvUploadStatus.textContent = message;

  setTimeout(() => {
    if (csvUploadStatus) csvUploadStatus.classList.add('hidden');
  }, 5000);
}

if (uploadBreedCSVBtn) {
  uploadBreedCSVBtn.addEventListener('click', () => {
    const file = breedCSVInput?.files[0];
    if (!file) {
      showCSVStatus('error', 'Por favor selecciona un archivo CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const report = BreedDataManager.importCSV(csvText);

        BreedDataManager.saveToStorage(); // Persist changes
        BREED_DATA = BreedDataManager.getAllBreeds(); // Refresh local var

        // Refresh UI
        renderBreedData();
        if (typeof populateBreedSelects === 'function') {
          populateBreedSelects();
        }

        let msg = `Procesado: ${report.rows_processed}, Nuevas: ${report.rows_created}, Actualizadas: ${report.rows_updated}`;
        if (report.rows_failed > 0) msg += `, Fallos: ${report.rows_failed}`;

        if (report.rows_failed > 0 && report.errors.length > 0) {
          msg += `. Error: ${report.errors[0].message}`;
          showCSVStatus('error', msg);
        } else {
          showCSVStatus('success', msg);
        }

        // Clear input
        if (breedCSVInput) breedCSVInput.value = '';
      } catch (error) {
        console.error('Error parsing CSV:', error);
        showCSVStatus('error', 'Error al procesar el CSV: ' + error.message);
      }
    };

    reader.onerror = () => {
      showCSVStatus('error', 'Error al leer el archivo');
    };

    reader.readAsText(file);
  });
}

if (downloadBreedTemplateBtn) {
  downloadBreedTemplateBtn.addEventListener('click', () => {
    // Generate CSV template from current BREED_DATA
    const headers = 'raza_id,raza,subespecie,peso_macho_adulto_kg,peso_hembra_adulta_kg,edad_sacrificio_meses,ADG_feedlot_kg_dia,ADG_pastoreo_kg_dia,FCR,termotolerancia,potencial_marmoleo,facilidad_parto,rendimiento_canal_porcentaje,kg_PV_por_kg_MS\n';

    const rows = Object.values(BREED_DATA).map(breed => {
      return [
        breed.code || breed.id || '',
        breed.name || '',
        breed.subspecies_name || breed.subspecies || '',
        breed.weight_male_adult || '',
        breed.weight_female_adult || '',
        breed.slaughter_age_months || (breed.slaughter_age ? breed.slaughter_age.raw : '') || '',
        breed.adg_feedlot || '',
        breed.adg_grazing || '',
        breed.fcr_feedlot || '',
        breed.heat_tolerance || '',
        breed.marbling || '',
        breed.calving_ease || '',
        breed.yield_percentage || '',
        breed.kg_PV_por_kg_MS || ''
      ].join(',');
    }).join('\n');

    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'breed_data_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showCSVStatus('success', '✓ Plantilla descargada correctamente');
  });
}

// Feed CSV logic removed (See feed-csv-handler.js)

// --- Soil Template Download ---
const downloadSoilTemplateBtn = qs('#downloadSoilTemplate');
if (downloadSoilTemplateBtn) {
  downloadSoilTemplateBtn.addEventListener('click', () => {
    const headers = 'Cultivo,Textura Ideal,pH Ideal,Materia Organica,Retencion Agua,Drenaje\n';
    const examples = `Alfalfa,Franco,6.8,Media,Media,Bueno
Ballica,Franco-Arcilloso,6.0,Alta,Alta,Medio
Maíz Forrajero,Franco,6.5,Alta,Media,Bueno`;

    const csvContent = '\uFEFF' + headers + examples;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_suelos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// --- ANIMAL BATCH IMPORT ---

window.downloadAnimalTemplate = function () {
  const headers = ['Crotal', 'Nombre', 'Finca', 'Raza', 'Sexo', 'FechaNacimiento', 'Peso', 'Padre', 'Madre', 'Notas'];
  const example = ['ES123456789012', 'Lola', 'Soto del Prior', 'Avileña-Negra Ibérica', 'Hembra', '2023-01-15', '200', 'ES000...', 'ES000...', 'Importado CSV'];
  const csvContent = [headers.join(','), example.join(',')].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "plantilla_animales.csv";
  link.click();
};

window.handleAnimalBatchImport = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  // Load Data for Logic
  const allBreeds = await BreedDataManager.load();
  const currentAnimals = storage.read(`animals_${currentUser}`, []);
  const fincas = getFincas(); // For Farm ID lookup

  // Helper for Robust Lookup (Case/Accent Insensitive)
  const findBreed = (name) => {
    if (!name) return null;
    if (allBreeds[name]) return allBreeds[name];
    const norm = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const target = norm(name);
    return Object.values(allBreeds).find(b => b.name && norm(b.name) === target);
  };

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) {
      alert('El archivo CSV parece vacío o faltan datos.');
      return;
    }

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    const getIdx = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));

    // Explicit Index Map
    const idx = {
      crotal: getIdx(['crotal', 'id']),
      nombre: getIdx(['nombre', 'name']),
      finca: getIdx(['finca', 'farm']),
      raza: getIdx(['raza', 'breed']),
      sexo: getIdx(['sexo', 'sex']),
      nac: getIdx(['nacimiento', 'birth', 'fecha']),
      peso: getIdx(['peso', 'weight']),
      padre: getIdx(['padre', 'father']),
      madre: getIdx(['madre', 'mother']),
      notas: getIdx(['nota', 'notes'])
    };

    let newCount = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i];
      const cols = rawLine.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      const getVal = (i) => (i !== -1 && cols[i]) ? cols[i] : '';

      const crotal = getVal(idx.crotal);
      if (!crotal) continue;

      if (currentAnimals.some(a => a.crotal === crotal)) {
        skipped++;
        continue;
      }

      const fatherId = getVal(idx.padre);
      const motherId = getVal(idx.madre);
      let breedVal = getVal(idx.raza);
      const farmName = getVal(idx.finca);

      let farmId = '';
      if (farmName) {
        const foundFarm = fincas.find(f => f.name.toLowerCase().includes(farmName.toLowerCase()));
        if (foundFarm) farmId = foundFarm.id;
      }

      // --- GENETIC LOGIC ---
      let finalBreed = breedVal;
      let geneticData = null;

      if (fatherId && motherId) {
        const dad = currentAnimals.find(a => a.crotal === fatherId);
        const mom = currentAnimals.find(a => a.crotal === motherId);

        if (dad && mom) {
          // Use robust lookup
          const sB = findBreed(dad.breed);
          const dB = findBreed(mom.breed);

          if (sB && dB) {
            if (window.BreedingEngine && sB.id !== dB.id) {
              const f1 = window.BreedingEngine.calculateHybrid(sB, dB);
              finalBreed = f1.name;
              geneticData = f1;
            } else {
              finalBreed = sB.name;
            }
          } else {
            if (!breedVal) finalBreed = 'Mestiza';
          }
        } else {
          if (!breedVal) finalBreed = 'Mestiza';
        }
      } else {
        if (!breedVal) finalBreed = 'Mestiza';
      }

      const newAnimal = {
        id: crypto.randomUUID(),
        crotal: crotal,
        name: getVal(idx.nombre),
        farmId: farmId,
        breed: finalBreed,
        sex: getVal(idx.sexo) || 'Hembra',
        birthDate: getVal(idx.nac) || new Date().toISOString().split('T')[0],
        father: fatherId,
        mother: motherId,
        birthWeight: parseFloat(getVal(idx.peso)) || 0,
        currentWeight: parseFloat(getVal(idx.peso)) || 0,
        notes: getVal(idx.notas) || 'Importado CSV',
        createdAt: new Date().toISOString()
      };

      if (geneticData) {
        newAnimal._genetics = geneticData;
        newAnimal.customMetrics = {
          adg_feedlot: geneticData.adg_feedlot,
          weight_max: geneticData.weight_male_adult,
          heat_tolerance: geneticData.heat_tolerance
        };
      }

      currentAnimals.push(newAnimal);
      newCount++;
    }

    storage.write(`animals_${currentUser}`, currentAnimals);

    let msg = `Importación completada: ${newCount} animales nuevos.`;
    if (skipped > 0) msg += ` (${skipped} repetidos omitidos)`;
    alert(msg);

    if (typeof renderAnimals === 'function') renderAnimals();
    updateStats(getFincas());
    event.target.value = '';
  };
  reader.readAsText(file);
};


