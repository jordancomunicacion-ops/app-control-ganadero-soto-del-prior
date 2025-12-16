// Soil Data Management
// Logic delegated to soil-manager.js and soil-ui-handler.js
async function initializeSoilData() {
  try {
    if (typeof SoilDataManager !== 'undefined') {
      await SoilDataManager.init();
      // renderSoilTable is defined globally in soil-ui-handler.js
      if (typeof renderSoilTable === 'function') {
        renderSoilTable();
      }
    }
  } catch (e) { console.error('Soil init error', e); }
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

// Global Z-Index Manager for Modals
window.modalZIndexCounter = 1000;
window.bringModalToFront = function (modalElement) {
  if (!modalElement) return;
  window.modalZIndexCounter += 10;
  modalElement.style.zIndex = window.modalZIndexCounter;
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

      // --- INJECT SPECIAL BELLOTA FEED (User Definition) ---
      // This ensures the specific scientific values are available even if not in CSV
      const bellotaId = 'BELLHO_01'; // ID for Bellota Holm Oak
      FEED_DATA[bellotaId] = {
        id: bellotaId,
        name: "Bellota de encina",
        type: "Concentrado", // Technically Energy concentrate in this context
        ms_percent: 55, // 55% DM
        pb: 6.5,       // 6.5% CP
        fdn: 26,       // 26% NDF
        adf: 16,       // 16% ADF
        en_mcal: 1.5,  // ~1.5 Mcal ENg (User said 1.4-1.6 ENg)
        em_mcal: 2.35, // 2.35 Mcal EM
        fat: 9.5,      // 9.5% Fat
        oleic: 60,     // 60% Oleic Acid (User: 55-65%)
        starch: 48,    // 48% Starch+Sugars
        p_pct: 0.12,   // Estimated low P
        ca_pct: 0.1    // Low Ca
      };
      // -----------------------------------------------------

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
const alertsList = qs('#alertsList');
const navData = qs('#nav-data');


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

// Animal List Selectors (Moved to top)
const animalsList = qs('#animalsList');
const searchAnimalInput = qs('#searchAnimal');
const filterFarmSelect = qs('#filterFarm');
const filterBreedSelect = qs('#filterBreed');
const filterSexSelect = qs('#filterSex');
const animalCountSpan = qs('#animalCount');

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
  // Force visibility of all nav tabs to ensure no "hidden" class persists
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.remove('hidden');
    el.style.display = ''; // Reset inline display if any
  });

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
// --- Helper: Reproductive Status Calculation ---
window.getReproductiveStatus = function (animal, events) {
  return calculateReproductiveStatus(animal, events);
};

function calculateReproductiveStatus(animal, events) {
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

        // 1. Check for Structured Result (New Method)
        if (ev.result) {
          if (ev.result === 'Gestante' || ev.result === 'Preñada') {
            status = 'Gestante';
            isFertile = false;
            reason = 'Confirmada gestante (Diagnóstico)';
          } else if (ev.result === 'Vacía' || ev.result === 'Negativo') {
            status = 'Vacía';
            isFertile = true;
            reason = 'Diagnóstico negativo (Vacía)';
          }
        }
        // 2. Fallback to Description Parser (Legacy)
        else {
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
    } else if (ev.type === 'Aborto') {
      // Logic: An abortion resets logic ONLY if we were in an active "potential pregnancy".
      // That means: We have an Insemination AFTER the last birth.
      // And this Abortion is AFTER that Insemination.
      const activeInsemination = lastInsemDate && (!lastPartoDate || lastInsemDate > lastPartoDate);

      if (activeInsemination && d > lastInsemDate) {
        status = 'Vacía';
        isFertile = true;
        reason = 'Aborto registrado (Vuelta a mantenimiento)';
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

  // --- AUTOMATED CHECKS: Lifecycle Transitions ---
  setTimeout(() => runLifecycleChecks(), 2000); // Small delay to ensure data loaded
}

// Automated Lifecycle Checks
function runLifecycleChecks() {
  if (!currentUser || !window.NutritionEngine) return;

  // Read fresh data
  const animals = storage.read(`animals_${currentUser}`, []);
  let events = storage.read('events', []);
  let eventsChanged = false;
  let newAlerts = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today

  // --- GLOBAL SEASON ALERTS (MONTANERA) ---
  if (NutritionEngine && NutritionEngine.BELLOTA_PROTOCOL) {
    const year = today.getFullYear();
    const seasonStart = new Date(year, 8, 1); // Sept 1 (Trigger -30d for Oct 1) ? 
    // Oct 1 is Month 9.
    // Triggers: Sept 1 (-30), Sept 16 (-15), Sept 24 (-7).

    // Helper to create system event
    const checkAndCreateSeasonEvent = (targetDate, label, daysBefore) => {
      const trigger = new Date(targetDate);
      trigger.setDate(trigger.getDate() - daysBefore);

      if (today.getTime() === trigger.getTime()) {
        const desc = `🌰 AVISO MONTANERA: ${label} en ${daysBefore} días (${targetDate.toLocaleDateString()}). Preparar fincas/suplemento.`;
        const exists = events.some(e => e.date === today.toISOString().split('T')[0] && e.desc === desc);
        if (!exists) {
          events.push({
            id: generateUUID(),
            type: 'Sistema',
            animalId: 'SYSTEM',
            animalCrotal: 'AVISO',
            date: today.toISOString().split('T')[0],
            desc: desc,
            cost: 0,
            status: 'pending',
            actionRequired: 'Montanera',
            createdAt: new Date().toISOString()
          });
          eventsChanged = true;
          newAlerts++;
        }
      }
    };

    // Define Dates for Current Cycle
    // We check relative to "Today".
    // If Today is Sept -> Target is Oct this year.
    // If Today is Jan -> Target is Jan this year.

    const currentYearOct1 = new Date(year, 9, 1); // Oct 1
    const currentYearJan31 = new Date(year, 0, 31); // Jan 31

    // Check Start Triggers (Oct 1)
    [30, 15, 7].forEach(d => checkAndCreateSeasonEvent(currentYearOct1, 'Comienzo Montanera', d));

    // Check End Triggers (Jan 31)
    [30, 15, 7].forEach(d => checkAndCreateSeasonEvent(currentYearJan31, 'Fin Montanera', d));

    // DEBUG: FORCE ALERT FOR USER VERIFICATION IF REQUESTED
    // If today is NOT a trigger date, we won't see anything.
    // Let's add a "Manual Check" log or a one-time welcome alert if protocol is new?
    // User asked "is it possible error or not the date?". 
    // I will explain in message, but I can add a dedicated Check button in UI? 
    // No, let's just make sure the Logic runs.
    console.log('[App] Montanera Check Run. Today:', today.toISOString());
  }

  animals.forEach(animal => {
    // Get expected transitions
    const transitions = window.NutritionEngine.getTransitionEvents(animal);

    transitions.forEach(t => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);

      // --- LOGIC: 7-Day Pre-Alert for DESTETE (Assuming 6-7 months logic) ---
      // Male Transicion -> 6 months. Female Pre-destete -> 7 months. 
      // We check if this transition is around that age.
      const isWeaning = (t.ageMonths === 6 || t.ageMonths === 7);

      // Determine Trigger Date
      // If weaning/decision, 7 days before. Else, on the day.
      const triggerDate = new Date(tDate);
      if (isWeaning) {
        triggerDate.setDate(triggerDate.getDate() - 7);
      }

      // Check if we passed the trigger date
      if (today >= triggerDate) {

        // CHECK 1: PRE-ALERT DESTETE (For All)
        if (isWeaning) {
          const alreadyExists = events.some(ev =>
            ev.animalId === animal.id &&
            (ev.actionRequired === 'Destete' || (ev.type === 'Manejo' && ev.desc.includes('AVISO DESTETE') && ev.desc.includes(`(${t.ageMonths} meses)`)))
          );

          if (!alreadyExists) {
            events.push({
              id: generateUUID(),
              type: 'Manejo',
              animalId: animal.id,
              animalCrotal: animal.crotal,
              date: today.toISOString().split('T')[0], // Alert date = Today (so it shows up top)
              desc: `⚠️ AVISO DESTETE (${t.ageMonths} meses). Previsto para: ${t.date}.`,
              cost: 0,
              status: 'pending',
              actionRequired: 'Destete', // CORE FLAG
              plannedDate: t.date, // Store the real date
              createdAt: new Date().toISOString()
            });
            eventsChanged = true;
            newAlerts++;
          }

          // CHECK 2: ALERT DECISIÓN MACHO (For Males Only at 6 months)
          if (animal.sex === 'Macho' && t.ageMonths === 6) {
            const decisionExists = events.some(ev =>
              ev.animalId === animal.id &&
              (ev.actionRequired === 'DecisionMacho' || ev.desc.includes('DECISIÓN MACHO'))
            );

            if (!decisionExists) {
              events.push({
                id: generateUUID(),
                type: 'Revisión', // Keep it as Revisión/Manejo
                animalId: animal.id,
                animalCrotal: animal.crotal,
                date: today.toISOString().split('T')[0],
                desc: `⚠️ DECISIÓN MACHO: ¿Castrar o Semental? (${t.ageMonths} meses).`,
                cost: 0,
                status: 'pending',
                actionRequired: 'DecisionMacho', // CORE FLAG
                createdAt: new Date().toISOString()
              });
              eventsChanged = true;
              newAlerts++;
            }
          }

        } else {
          // START STANDARD LOGIC (NON-WEANING)
          const alreadyExists = events.some(ev =>
            ev.animalId === animal.id &&
            ev.type === 'Manejo' &&
            ev.desc.includes(`CAMBIO ETAPA`) &&
            ev.desc.includes(`(${t.ageMonths} meses)`)
          );

          if (!alreadyExists) {
            events.push({
              id: generateUUID(),
              type: 'Manejo',
              animalId: animal.id,
              animalCrotal: animal.crotal,
              date: t.date,
              desc: `⚠️ CAMBIO ETAPA (${t.ageMonths} meses) -> ${t.newStage}. Acción: Pesar y cambiar a dieta: ${t.diet}.`,
              cost: 0,
              status: 'pending',
              createdAt: new Date().toISOString()
            });
            eventsChanged = true;
            newAlerts++;
          }
        }
      }
    });
  });

  if (eventsChanged) {
    storage.write('events', events);
    console.log(`Generated ${newAlerts} lifecycle alerts.`);
    if (typeof renderEvents === 'function') renderEvents();
    // Optional: Toast notif
    // showToast(`Se han generado ${newAlerts} alertas de cambio de etapa.`);
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
// --- Custom Corral Logic ---
function updateCorralInputs(count, existingData = []) {
  const container = qs('#corralInputs');
  const wrapper = qs('#corralConfigContainer');
  if (!container || !wrapper) return;

  if (count > 0) {
    wrapper.classList.remove('hidden');
  } else {
    wrapper.classList.add('hidden');
    return;
  }

  container.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const defaultName = existingData[i - 1]?.name || `Corral ${i}`;
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" class="corral-name-input" data-index="${i}" value="${defaultName}" placeholder="Nombre Corral ${i}" style="font-size:0.9em;">
    `;
    container.appendChild(div);
  }
}

const farmCorralesInput = qs('#farmCorrales');
if (farmCorralesInput) {
  farmCorralesInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value) || 0;
    // We pass empty existing data because on fresh input change we usually just want defaults?
    // Or we should try to preserve if user just increases number?
    // Let's try to preserve current inputs values if possible.
    const currentInputs = document.querySelectorAll('.corral-name-input');
    const existing = Array.from(currentInputs).map((el, idx) => ({ id: idx + 1, name: el.value }));

    updateCorralInputs(val, existing);
  });
}

// Farm Form Listener
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
    numero_corrales: parseInt(getValue('#farmCorrales'), 10) || 1,
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
    weatherStationId: weatherSource === 'private' ? getValue('#farmWeatherId') : '',

    // Custom Corrales
    corrales: []
  };

  // Capture Corral Names
  const corralInputs = document.querySelectorAll('.corral-name-input');
  corralInputs.forEach((input, index) => {
    finca.corrales.push({
      id: index + 1, // Simple ID 1-based
      name: input.value.trim() || `Corral ${index + 1}`
    });
  });

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
          <div class="farm-meta">${finca.location} · ${finca.size} ha · ${finca.numero_corrales || 1} corr.</div>
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
  if (qs('#detailFarmCorrales')) qs('#detailFarmCorrales').textContent = finca.numero_corrales || 1;

  // Stats Calculate
  const licenseLimit = parseInt(finca.animals || 0);

  // 1. Get Live Inventory
  // Note: currentUser is global
  const allAnimals = storage.read(`animals_${currentUser}`, []);
  const farmAnimals = allAnimals.filter(a => a.farmId === id);
  const totalHeads = farmAnimals.length;

  // 2. Calculate Productive (Cows/Bulls > 15 months)
  const now = new Date();
  const productiveHeads = farmAnimals.reduce((count, animal) => {
    if (!animal.birthDate) return count;
    const birth = new Date(animal.birthDate);
    const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (ageMonths >= 15) return count + 1;
    return count;
  }, 0);

  // 3. Render Stats
  qs('#detailFarmLimit').textContent = licenseLimit;
  qs('#detailFarmTotal').textContent = totalHeads;
  qs('#detailFarmProductive').textContent = productiveHeads;

  // 4. Compliance Alert
  const alertEl = qs('#detailFarmAlert');
  if (alertEl) {
    if (totalHeads > licenseLimit) {
      // Red Alert
      const diff = totalHeads - licenseLimit;
      alertEl.style.display = 'block';
      alertEl.style.backgroundColor = '#fee2e2';
      alertEl.style.color = '#991b1b';
      alertEl.style.border = '1px solid #fca5a5';
      alertEl.textContent = `EXCESO DE CAPACIDAD: +${diff} animales sobre licencia.`;
    } else {
      // Green Alert
      const remaining = licenseLimit - totalHeads;
      alertEl.style.display = 'block';
      alertEl.style.backgroundColor = '#dcfce7';
      alertEl.style.color = '#166534';
      alertEl.style.border = '1px solid #86efac';
      alertEl.textContent = `En Regla: Capacidad para ${remaining} animales más.`;
    }
  }

  // Populate Fields
  if (qs('#detailFarmLicense')) qs('#detailFarmLicense').textContent = finca.license || '-';
  if (qs('#detailFarmAnimals')) qs('#detailFarmAnimals').textContent = finca.animals || '-';
  if (qs('#detailFarmManagement')) qs('#detailFarmManagement').textContent = finca.management || '-';
  if (qs('#detailFarmFeed')) qs('#detailFarmFeed').textContent = finca.feed || '-';

  recommendBreedsForFarm(finca);

  // Weather in Modal
  const weatherDiv = qs('#detailFarmWeather');
  if (weatherDiv) {
    weatherDiv.innerHTML = '⏳ Cargando datos climáticos...';
    if (finca.weatherSource === 'private') {
      weatherDiv.innerHTML = `
  <div style="text-align: center;">
                    <div style="font-size: 1.5em; margin-bottom: 5px;">📡</div>
                    <strong>Estación Privada</strong><br>
                    ID: ${finca.weatherStationId || 'No configurado'}
                </div>`;
    } else if (window.WeatherService && finca.lat && finca.lon) {
      window.WeatherService.getWeather(finca.lat, finca.lon).then(data => {
        if (data) {
          weatherDiv.innerHTML = `
  <div style="display: flex; gap: 20px; align-items: center;">
                            <div style="font-size: 3em;">${data.icon}</div>
                            <div>
                                <div style="font-size: 1.5em; font-weight: bold;">${data.temp}ºC</div>
                                <div style="color: #666;">${data.condition}</div>
                                <div style="margin-top: 5px; font-size: 0.9em;">
                                    💧 Humedad: ${data.humidity}% <br>
                                    💨 Viento: ${data.wind} km/h
                                </div>
                            </div>
                        </div>
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
              <div style="background: #ecfdf5; padding: 10px; border-radius: 6px; border: 1px solid #a7f3d0;">
                  <strong>✅ Cultivos Sugeridos:</strong>
                  <ul style="margin: 5px 0 0 20px; list-style-type: disc;">
                      ${recs.map(r => `<li>${r}</li>`).join('')}
                  </ul>
              </div>
  `;
    } else {
      cropDiv.innerHTML = `<em>No hay recomendaciones específicas para suelo ${soilType}, pero puedes probar cultivos tolerantes.</em>`;
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
  if (btnEditFarm) {
    btnEditFarm.addEventListener('click', () => {
      if (!window.currentFarmId) return;

      const fincas = getFincas();
      const finca = fincas.find(f => f.id === window.currentFarmId);

      if (finca) {
        if (farmFormCard) {
          farmFormCard.classList.remove('hidden');
          if (toggleFarmFormBtn) toggleFarmFormBtn.textContent = 'Cancelar';
        }

        // Populate fields
        if (qs('#farmName')) qs('#farmName').value = finca.name || '';
        if (qs('#farmLocation')) qs('#farmLocation').value = finca.location || '';
        if (qs('#farmSize')) qs('#farmSize').value = finca.size || '';
        if (qs('#farmSoil')) qs('#farmSoil').value = finca.soil || '';
        if (qs('#farmSlope')) qs('#farmSlope').value = finca.slope || '';
        if (qs('#farmIrrigation')) qs('#farmIrrigation').value = finca.irrigation || '';
        if (qs('#farmSigpacUse')) qs('#farmSigpacUse').value = finca.sigpacUse || '';

        if (qs('#farmLat')) qs('#farmLat').value = finca.lat || '';
        if (qs('#farmLon')) qs('#farmLon').value = finca.lon || '';

        if (qs('#farmLicense')) qs('#farmLicense').value = finca.license || '';
        if (qs('#farmAnimals')) qs('#farmAnimals').value = finca.animals || '';
        if (qs('#farmCorrales')) {
          const num = finca.numero_corrales || 1;
          qs('#farmCorrales').value = num;
          // Trigger update for inputs
          updateCorralInputs(num, finca.corrales || []);
        }
        if (qs('#farmManagement')) qs('#farmManagement').value = finca.management || '';
        // feed field is named 'farmFeed' in form but not shown in old logic, let's check
        // It seems it was removed from HTML shown previously? Using standard if exists.
        // Actually checking line 608: 'feed' is saved.

        // Weather Config
        if (finca.weatherSource === 'private') {
          const rad = qs('input[name="weatherSource"][value="private"]');
          if (rad) rad.checked = true;
          if (qs('#farmWeatherId')) qs('#farmWeatherId').value = finca.weatherStationId || '';
          toggleWeatherConfig();
        } else {
          const rad = qs('input[name="weatherSource"][value="public"]');
          if (rad) rad.checked = true;
          toggleWeatherConfig();
        }

        // Set Edit ID
        if (farmEditId) farmEditId.value = finca.id;

        // Update Title/Button to indicate Mode
        const formTitle = qs('#farmFormTitle'); // Add ID to h3 if needed or use logic
        if (formTitle) formTitle.textContent = 'Editar Finca';

        const submitBtn = farmForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Guardar Cambios';

        if (cancelFarmFormBtn) cancelFarmFormBtn.style.display = 'inline-block';

        // Close modal
        farmModal.classList.add('hidden');

        // Ensure we are on the Farms tab (we likely are, but effectively scrolling/focusing)
        farmFormCard.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
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
  const targetSection = document.getElementById(sectionId);
  if (!targetSection) {
    console.error(`Section with ID '${sectionId}' not found.`);
    alert(`Error: La sección '${sectionId}' no se encuentra en la página. Por favor recarga la página completamente.`);
    return;
  }

  sections.forEach((sec) => {
    if (sec.id === sectionId) {
      sec.classList.remove('hidden');
      sec.style.removeProperty('display'); // Clear potential conflicts first
      sec.style.setProperty('display', 'block', 'important'); // NUCLEAR OPTION
      sec.style.opacity = '1';
      sec.style.width = '100%';
    } else {
      sec.classList.add('hidden');
      sec.style.display = 'none';
    }
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
  if (sectionId === 'reports') {
    if (typeof populateFarmSelects === 'function') populateFarmSelects();
    if (typeof renderAnimals === 'function') renderAnimals();
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



function populateBreedSelects() {
  let breeds = Object.values(BREED_DATA).sort((a, b) => a.name.localeCompare(b.name));

  // FALLBACK: If no breeds loaded, use valid defaults
  if (breeds.length === 0) {
    console.warn('BREED_DATA empty, using fallback defaults.');
    const defaults = [
      { name: 'Wagyu' },
      { name: 'Angus' },
      { name: 'Hereford' },
      { name: 'Charolais' },
      { name: 'Limousin' },
      { name: 'Brahman' },
      { name: 'Nelore' },
      { name: 'Droughtmaster' },
      { name: 'Retinta' },
      { name: 'Morucha' },
      { name: 'Pirenaica' },
      { name: 'Betizú' },
      { name: 'Berrenda' },
      { name: 'Simmental' },
      { name: "Blonde d'Aquitaine" },
      { name: 'Azul Belga' }
    ];
    breeds = defaults.sort((a, b) => a.name.localeCompare(b.name));
  }

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
    // Windy.com Embed - Re-enabled by user request
    radarFrame.src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
    radarFrame.style.display = 'block';

    // Remove old error message if present
    const parent = radarFrame.parentElement;
    if (parent) {
      const existingMsg = parent.querySelector('.radar-msg');
      if (existingMsg) existingMsg.remove();
    }
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





// Animal Management Logic
if (toggleAnimalFormBtn) {
  toggleAnimalFormBtn.addEventListener('click', () => {
    if (animalFormCard) {
      if (animalFormCard.classList.contains('hidden')) {
        // Refresh farm list before showing
        populateFarmSelects();
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
  const eventFarmSelect = qs('#eventFarmKey');
  const reportFarmSelect = qs('#reportFarm');

  [animalFarmSelect, filterFarmSelect, eventFarmSelect, reportFarmSelect].forEach(select => {
    if (!select) return;
    // Save current selection if possible
    const current = select.value;

    let placeholder = 'Selecciona una finca';
    if (select.id === 'filterFarm' || select.id === 'reportFarm') placeholder = 'Todas las fincas';
    if (select.id === 'eventFarmKey') placeholder = 'Selecciona finca (Saneamiento)';

    select.innerHTML = `<option value="">${placeholder}</option>`;

    fincas.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      select.appendChild(opt);
    });
    // Restore if still valid
    if (fincas.find(f => f.id === current)) {
      select.value = current;
      // Trigger change event so dependent logic (like Corrales) runs
      select.dispatchEvent(new Event('change'));
    }
  });
}

// Listener for Animal Form Farm Selection
// Listener for Animal Form Farm Selection
if (animalFarmInput) {
  animalFarmInput.addEventListener('change', (e) => {
    const farmId = e.target.value;
    const corralSelect = qs('#animalCorral');
    if (!corralSelect) return;

    if (!farmId) {
      corralSelect.innerHTML = '<option value="">Selecciona Finca primero</option>';
      corralSelect.disabled = true;
      return;
    }

    // Find Farm and Populate Corrals
    const fincas = getFincas();
    const farm = fincas.find(f => f.id === farmId);

    corralSelect.innerHTML = '<option value="">Sin Asignar</option>';
    corralSelect.disabled = false;

    if (farm && farm.numero_corrales > 0) {
      const corrales = farm.corrales || [];
      // Default numbers if custom names missing or length mismatch
      for (let i = 1; i <= farm.numero_corrales; i++) {
        const custom = corrales.find(c => c.id === i);
        const name = custom ? custom.name : `Corral ${i}`;
        const opt = document.createElement('option');
        opt.value = i; // Store ID
        opt.textContent = name;
        corralSelect.appendChild(opt);
      }
    }
  });
}
if (cancelAnimalFormBtn) {
  cancelAnimalFormBtn.addEventListener('click', () => {
    if (animalFormCard) animalFormCard.classList.add('hidden');
    if (toggleAnimalFormBtn) toggleAnimalFormBtn.textContent = '➕ Nuevo Animal';
  });
}

// Listener for Report Farm Selection
const reportFarmSelect = qs('#reportFarm');
if (reportFarmSelect) {
  reportFarmSelect.addEventListener('change', (e) => {
    const farmId = e.target.value;
    const corralSelect = qs('#reportCorral');
    if (!corralSelect) return;

    if (!farmId) {
      corralSelect.innerHTML = '<option value="">Todos los corrales</option>';
      corralSelect.disabled = true;
      return;
    }

    const fincas = getFincas();
    const farm = fincas.find(f => f.id === farmId);
    if (!farm) {
      corralSelect.innerHTML = '<option value="">Todos los corrales</option>';
      corralSelect.disabled = true;
      return;
    }

    corralSelect.innerHTML = '<option value="">Todos los corrales</option>';
    corralSelect.disabled = false;

    if (farm.corrales && farm.corrales.length > 0) {
      farm.corrales.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        corralSelect.appendChild(opt);
      });
    } else {
      for (let i = 1; i <= farm.numero_corrales; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Corral ${i}`;
        corralSelect.appendChild(opt);
      }
    }
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
      corral: parseInt(qs('#animalCorral')?.value) || null,
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

window.openAnimalDetails = function (id) {
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

  // Farm Lookup Logic (Robust)
  const fincas = getFincas();
  let farm = fincas.find(f => String(f.id) === String(animal.farmId));

  // Fallback: Try looking up by name if ID fails (for legacy data)
  if (!farm && animal.farmName) {
    farm = fincas.find(f => f.name.toLowerCase() === animal.farmName.toLowerCase());
  }


  if (detailFarm) detailFarm.textContent = farm ? farm.name : 'Desconocida';

  // Corral Display Logic
  const detailCorralDisplay = qs('#detailCorralDisplay');
  if (detailCorralDisplay) {
    let corralName = 'Sin Asignar';
    if (animal.corral) {
      corralName = `Corral ${animal.corral}`; // Default

      if (farm && farm.corrales) {
        // Try to find custom name
        const found = farm.corrales.find(c => String(c.id) === String(animal.corral));
        if (found) corralName = found.name;
      }
    }
    detailCorralDisplay.textContent = corralName;
  }



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

  if (animalDetailModal) {
    window.bringModalToFront(animalDetailModal);
    animalDetailModal.classList.remove('hidden');
  }
};

// ...

// DASHBOARD ALERTS (Upcoming Events)
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
  // Use grid gap/style adjustments for the list container to look like cards stack
  alertsList.style.display = 'grid';
  alertsList.style.gap = '10px';
  alertsList.style.listStyle = 'none';
  alertsList.style.padding = '0';

  if (upcoming.length === 0) {
    alertsList.innerHTML = '<li style="color:var(--muted); font-style:italic;">No hay eventos próximos (7 días)</li>';
    return;
  }

  upcoming.forEach(ev => {
    const li = document.createElement('li');
    li.className = `event-card type-${ev.type}`;
    li.style.cursor = 'pointer';
    // Use flex layout to enable right-alignment of badge/arrow
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '16px';
    li.style.padding = '12px 16px';

    li.onclick = (e) => {
      if (e.target.closest('button')) return;
      if (window.openEventDetail) window.openEventDetail(ev.id);
    };

    const d = new Date(ev.date);
    const day = d.getDate();
    const monthShort = d.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();

    // Status Badge Logic
    let statusText = ev.completed ? 'Completado' : (ev.status || 'Pendiente');
    if (statusText === 'pending') statusText = 'Pendiente';

    let badgeColor = '#f1f5f9';
    let textColor = '#64748b';

    // Logic for colors based on status/timing
    if (ev.completed) {
      badgeColor = '#dcfce7';
      textColor = '#166534';
    } else if (statusText === 'Pendiente') {
      badgeColor = '#fef3c7';
      textColor = '#b45309';
    }

    li.innerHTML = `
      <div class="event-date-box">
          <span class="event-day">${day}</span>
          <span class="event-month">${monthShort}</span>
      </div>
      
      <div class="event-content" style="flex: 1; min-width: 0;">
          <div class="event-title">
              <span>${ev.type}</span>
          </div>
          <div class="event-subtitle">${ev.animalCrotal}</div>
          <div style="font-size:13px; color:#6b7280; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${ev.desc}
          </div>
      </div>

      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
           <span class="event-badge" style="background:${badgeColor}; color:${textColor}; margin:0;">${statusText}</span>
           <div style="display:flex; gap:5px;">
             ${ev.actionRequired === 'Destete' ?
        `<button class="btn small" style="font-size:10px; padding:2px 6px; background:#eab308; color:#fff; border:none;" onclick="openDesteteForm('${ev.animalId}', '${ev.animalCrotal}')">Destetar</button>` : ''}
             ${ev.actionRequired === 'DecisionMacho' ?
        `<button class="btn small" style="font-size:10px; padding:2px 6px; background:#8b5cf6; color:#fff; border:none;" onclick="openDecisionMachoForm('${ev.animalId}', '${ev.animalCrotal}')">Decidir</button>` : ''}
             <button class="ghost small" style="color:#9ca3af; padding: 4px 8px;">&gt;</button>
           </div>
      </div>
    `;
    alertsList.appendChild(li);
  });
}

// Close Modal Logic
[closeAnimalDetail, closeDetailBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', () => {
    if (animalDetailModal) animalDetailModal.classList.add('hidden');
  });
});

// Animal Selectors (Moved to top)

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

  // Populate Report Animals Datalist
  const reportAnimalList = qs('#report-animal-list');
  if (reportAnimalList) {
    reportAnimalList.innerHTML = '';
    animals.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.crotal; // Value to put in input
      opt.textContent = `${a.crotal} ${a.name ? '(' + a.name + ')' : ''}`;
      reportAnimalList.appendChild(opt);
    });
  }
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

// === Autocomplete Logic ===
function setupAutocomplete(input, list, getFilterFn) {
  if (!input || !list) return;

  function doSearch() {
    const term = input.value.trim().toLowerCase();
    console.log('Searching for:', term); // DEBUG
    if (!term) {
      list.classList.add('hidden');
      return;
    }

    const animals = storage.read(`animals_${currentUser}`, []);
    const filterFn = getFilterFn ? getFilterFn() : null;

    const matches = animals.filter(a => {
      const crotal = (a.crotal || '').toLowerCase();
      // Robust search: Includes is better for user experience than strict validation here
      const matchTerm = crotal.includes(term);

      const matchExtra = filterFn ? filterFn(a) : true;
      return matchTerm && matchExtra;
    });
    console.log('Matches found:', matches.length); // DEBUG

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
        populateFarmSelects();
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

    // Decision Macho Fields
    const dmFields = qs('#decisionMachoFields');

    // Sacrificio Fields
    const sacrificeFields = qs('#sacrificeFields');

    // Saneamiento Fields
    const saneamientoFields = qs('#saneamientoFields');

    // Mover de Corral Fields
    const moveCorralFields = qs('#moveCorralFields');




    // Reset All Visibility first
    partoHeader.classList.add('hidden');
    partoFields.forEach(el => el.classList.add('hidden'));
    if (bullBreedLabel) bullBreedLabel.classList.add('hidden');
    if (dmFields) dmFields.classList.add('hidden');
    if (sacrificeFields) sacrificeFields.classList.add('hidden');
    if (saneamientoFields) saneamientoFields.classList.add('hidden');
    if (moveCorralFields) moveCorralFields.classList.add('hidden');


    // Default: Show standard fields
    descLabel.classList.remove('hidden');
    costLabel.classList.remove('hidden');
    nextDateLabel.classList.remove('hidden');
    if (eventWeightLabel) eventWeightLabel.classList.add('hidden');

    // Event Type Change - Toggle Fields
    const eventFarmContainer = qs('#eventFarmContainer');
    const eventAnimalContainer = qs('#eventAnimalContainer');
    const eventFarmSelect = qs('#eventFarmKey');
    const eventAnimalInput = qs('#eventAnimal');

    if (type === 'Saneamiento') {
      if (saneamientoFields) saneamientoFields.classList.remove('hidden');
      if (eventFarmContainer) eventFarmContainer.classList.remove('hidden');
      if (eventAnimalContainer) eventAnimalContainer.classList.add('hidden');

      // Toggle Required
      if (eventFarmSelect) eventFarmSelect.required = true;
      if (eventAnimalInput) eventAnimalInput.required = false;

      descLabel.classList.add('hidden'); // Auto-desc
      costLabel.classList.add('hidden');
    } else {
      if (saneamientoFields) saneamientoFields.classList.add('hidden');
      if (eventFarmContainer) eventFarmContainer.classList.add('hidden');
      if (eventAnimalContainer) eventAnimalContainer.classList.remove('hidden');

      if (eventFarmSelect) {
        eventFarmSelect.required = false;
        eventFarmSelect.value = ''; // Reset
      }
      if (eventAnimalInput) eventAnimalInput.required = true; // Default back to required
    }

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
          // Use global BREED_DATA
          Object.values(BREED_DATA).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = b.name;
            bullBreedSelect.appendChild(opt);
          });
        }
      }
    } else if (type === 'Destete' || type === 'Aborto') {
      costLabel.classList.add('hidden');
    } else if (type === 'Decisión Macho') {
      if (dmFields) dmFields.classList.remove('hidden');
      descLabel.classList.add('hidden'); // Auto-desc
      costLabel.classList.add('hidden'); // Usually internal decision
    } else if (type === 'Sacrificio') {
      if (sacrificeFields) sacrificeFields.classList.remove('hidden');
      descLabel.classList.add('hidden'); // Auto-desc
      costLabel.classList.add('hidden'); // Replaced by Total Price
      nextDateLabel.classList.add('hidden'); // End of life
    } else if (type === 'Cambio de corral') {
      if (moveCorralFields) moveCorralFields.classList.remove('hidden');
      descLabel.classList.add('hidden'); // Auto-desc
      costLabel.classList.add('hidden');

      // Initial Population Logic
      const crotal = qs('#eventAnimal').value;
      const originInput = qs('#moveCorralOrigin');
      const destSelect = qs('#moveCorralDest');

      if (crotal && originInput && destSelect) {
        originInput.value = 'Calculando...';
        destSelect.innerHTML = '<option value="">Cargando...</option>';

        // Defer lookup to ensure latest data
        setTimeout(() => {
          const animals = storage.read(`animals_${currentUser}`, []);
          const animal = animals.find(a => a.crotal.endsWith(crotal) || a.crotal === crotal);

          if (animal) {
            const fincas = getFincas();
            const farm = fincas.find(f => f.id === animal.farmId);

            // 1. Determine Origin
            let originName = 'Sin Asignar';

            // Inheritance Logic
            if (animal.corral) {
              if (farm && farm.corrales) {
                const found = farm.corrales.find(c => c.id == animal.corral);
                originName = found ? found.name : `Corral ${animal.corral}`;
              } else {
                originName = `Corral ${animal.corral}`;
              }
            } else if (animal.mother) {
              // Check mother
              const mother = animals.find(m => m.crotal === animal.mother);
              if (mother && mother.corral) {
                if (farm && farm.corrales) { // Assuming same farm
                  const found = farm.corrales.find(c => c.id == mother.corral);
                  originName = found ? found.name : `Corral ${mother.corral}`;
                } else {
                  originName = `Corral ${mother.corral}`;
                }
                originName += ' (Madre)';
              }
            }
            originInput.value = originName;

            // 2. Populate Destinations
            destSelect.innerHTML = '<option value="">Selecciona nuevo corral</option>';
            if (farm && farm.corrales) {
              const num = farm.numero_corrales || 1;
              for (let i = 1; i <= num; i++) {
                const custom = farm.corrales.find(c => c.id == i);
                const name = custom ? custom.name : `Corral ${i}`;
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = name;
                destSelect.appendChild(opt);
              }
            } else {
              destSelect.innerHTML = '<option value="">Finca sin corrales</option>';
            }

          } else {
            originInput.value = 'Animal no encontrado';
          }
        }, 100);
      }
    } else {
      if (dmFields) dmFields.classList.add('hidden');
      if (sacrificeFields) sacrificeFields.classList.add('hidden');
    }
  });

  // Listener for Saneamiento Result (Toggle Crotal Input)
  const saneamientoResult = qs('#saneamientoResult');
  const saneamientoPositiveInput = qs('#saneamientoPositiveInput');
  if (saneamientoResult && saneamientoPositiveInput) {
    saneamientoResult.addEventListener('change', (e) => {
      if (e.target.value === 'Positivo') {
        saneamientoPositiveInput.classList.remove('hidden');
      } else {
        saneamientoPositiveInput.classList.add('hidden');
      }
    });
  }
}

// Auto-Fill Slaughter Category on Animal Selection
const eventAnimalInput = qs('#eventAnimal');
if (eventAnimalInput) {
  eventAnimalInput.addEventListener('blur', () => {
    // Only run if Event Type is Sacrificio
    if (qs('#eventType').value !== 'Sacrificio') return;

    const term = eventAnimalInput.value.trim();
    if (!term) return;

    const animals = storage.read(`animals_${currentUser}`, []);
    // Find match (exact or endsWith)
    const animal = animals.find(a => a.crotal.endsWith(term));

    if (!animal) return;

    // Calculate Age
    const birth = new Date(animal.birthDate);
    const now = new Date();
    const ageMonths = (now - birth) / (1000 * 60 * 60 * 24 * 30.44);

    let cat = '';

    if (ageMonths < 8) cat = 'V'; // Ternera
    else if (ageMonths >= 8 && ageMonths < 12) cat = 'Z'; // Añojo
    else {
      // > 12 Months
      if (animal.sex === 'Castrado' || animal.category === 'Buey') {
        cat = 'C';
      } else if (animal.sex === 'Macho') {
        if (ageMonths < 24) cat = 'A'; // Macho Joven
        else cat = 'B'; // Toro
      } else if (animal.sex === 'Hembra') {
        // Simplification: > 30 months = Cow (D), else Heifer (E)
        // Or check if she has calved? (Complexity)
        // Let's us > 24m as cutoff for D for now, or assume E until proven.
        if (ageMonths > 30) cat = 'D'; // Vaca
        else cat = 'E'; // Novilla
      }
    }

    const catSelect = qs('#sacrificeCategory');
    if (catSelect && cat) {
      catSelect.value = cat;
      // Visual feedback
      catSelect.style.backgroundColor = '#f0fdf4';
      setTimeout(() => catSelect.style.backgroundColor = '', 1000);
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

      // Logic for Move Corral
      if (type === 'Cambio de corral') {
        const newCorralId = qs('#moveCorralDest').value;
        const originTxt = qs('#moveCorralOrigin').value;

        if (!newCorralId) {
          alert('Por favor selecciona el nuevo corral de destino.');
          return;
        }

        const animals = storage.read(`animals_${currentUser}`, []);
        const animalIdx = animals.findIndex(a => a.crotal.endsWith(animalSearchTerm) || a.crotal === animalSearchTerm);

        if (animalIdx !== -1) {
          const animal = animals[animalIdx];

          // Update Animal
          animal.corral = parseInt(newCorralId);
          animals[animalIdx] = animal;
          storage.write(`animals_${currentUser}`, animals);

          // Set Auto Description
          // Trick to get text from select
          const sel = qs('#moveCorralDest');
          const destTxt = sel.options[sel.selectedIndex].text;

          // We inject description into the form input so normal flow picks it up
          qs('#eventDesc').value = `Movimiento: ${originTxt} -> ${destTxt}`;
        } else {
          alert('Error: Animal no encontrado para mover.');
          return;
        }
      }

      // const date = qs('#eventDate').value; // Automated now
      const date = new Date().toISOString(); // Auto-set
      let desc = qs('#eventDesc').value.trim(); // Make mutable for Decision Macho
      const cost = parseFloat(qs('#eventCost').value) || 0;
      const nextDate = qs('#eventNext').value;
      const weight = parseFloat(qs('#eventWeight').value) || 0;

      // FIX: Move events declaration to top so it's accessible in Parto block
      const events = storage.read('events', []);

      const animals = storage.read(`animals_${currentUser}`, []);

      let animal = null;
      let animalId = null;
      let animalCrotal = null;

      if (type === 'Saneamiento') {
        // Finca Logic
        const farmId = qs('#eventFarmKey').value;
        if (!farmId) {
          alert('Selecciona una Finca para el saneamiento.');
          return;
        }
        // Set context to "Farm"
        // We won't have a single 'animal' object here usually.
        // We will fetch herd inside the specific logic block.
      } else {
        // Standard Single Animal Logic
        if (!animalSearchTerm) { alert('Introduce el animal.'); return; }

        let matches = animals.filter(a => a.crotal.toLowerCase() === animalSearchTerm.toLowerCase());
        if (matches.length === 0) matches = animals.filter(a => a.crotal.endsWith(animalSearchTerm));

        if (matches.length === 0) {
          alert(`No se encontró ningún animal que termine en "${animalSearchTerm}".`);
          return;
        }
        if (matches.length > 1) {
          alert(`Múltiples animales encontrados (${matches.length}). Introduce más dígitos.`);
          return;
        }
        animal = matches[0];
        animalId = animal.id;
        animalCrotal = animal.crotal;
      }

      // LOGIC: PESAJE UPDATE
      if (type === 'Pesaje') {
        const prevWeight = animal.currentWeight || 0;
        animal.currentWeight = weight;

        // --- NEW: Calculate Estimates & History ---
        if (typeof CarcassAndQualityEngine !== 'undefined') {
          // 1. Calculate ADG from previous weight event or birth
          // Find last weight event
          // We need to look in 'events' or assume 'currentWeight' was the last one.
          // Problem: We don't have the DATE of the last weight easily unless we query events.
          // Let's query events for this animal, sort desc.
          const animalEvents = events.filter(e => e.animalId === animalId && e.type === 'Pesaje'); // Excludes current new one yet
          animalEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
          const lastEvent = animalEvents[0];

          let lastDate = lastEvent ? new Date(lastEvent.date) : new Date(animal.birthDate);
          let lastW = lastEvent ? (lastEvent.weight || prevWeight) : (animal.birthWeight || 0);

          // If no previous weight event, use birth
          if (!lastEvent && prevWeight > 0) lastW = prevWeight; // Fallback

          const curDate = new Date(date);
          const daysDiff = (curDate - lastDate) / (1000 * 60 * 60 * 24);

          let adgObs = 1.0; // Default fallback
          if (daysDiff > 0 && weight > lastW) {
            adgObs = (weight - lastW) / daysDiff;
          }

          // 2. Get Environment & Diet Variables
          const weatherTemp = parseFloat(qs('#weather-temp')?.textContent) || 20;
          const thi = CarcassAndQualityEngine.calculateTHI(weatherTemp, 50); // Approx

          // Diet Energy: We don't know the exact diet here in the Event Modal.
          // We will assume a default energy based on system or use a 'Standard' value.
          // Or use the configuration default.
          const dietE = 2.0; // Moderate energy assumption for history logging

          // 3. Run Estimates
          // Need breed data
          // We need to load it synchronously or assume it's in global BREED_DATA
          // BreedDataManager.getAll() is sync if loaded.
          let breedData = {};
          if (window.BREED_DATA && window.BREED_DATA[animal.breed]) {
            // If map is by ID, we need to find by name
            // BREED_DATA is object by ID usually.
            // Let's assume we can find it.
            const breeds = Object.values(window.BREED_DATA);
            breedData = breeds.find(b => b.name === animal.breed) || {};
          }

          const ageMonths = (curDate - new Date(animal.birthDate)) / (1000 * 60 * 60 * 24 * 30.44);

          const carcass = CarcassAndQualityEngine.estimateCarcassResult(
            { ageMonths, system: 'Intensivo' }, // Default system
            weight,
            adgObs,
            dietE,
            thi,
            breedData
          );

          const quality = CarcassAndQualityEngine.calculateQualityIndex(
            { ageMonths },
            breedData,
            dietE,
            adgObs,
            thi,
            10 // Days finishing unknown, assume low
          );

          // 4. Save to Animal History
          if (!animal.monthlyRecords) animal.monthlyRecords = [];
          animal.monthlyRecords.push({
            date: date,
            weightKg: weight,
            adg: adgObs,
            rc_est: carcass.rc_percent,
            carcass_weight_est: carcass.carcass_weight,
            meat_quality_index: quality.iq_score,
            marbling_est: quality.marbling_est,
            tenderness_risk: quality.tenderness_risk,
            diet_energy: dietE,
            thi: thi
          });
        }

        storage.write(`animals_${currentUser}`, animals);
        if (typeof renderAnimals === 'function') renderAnimals(); // Update UI
      }



      // LOGIC: SANEAMIENTO
      if (type === 'Saneamiento') {
        const result = qs('#saneamientoResult').value;
        const farmId = qs('#eventFarmKey').value;
        const fincas = getFincas();
        const farm = fincas.find(f => f.id === farmId);

        if (!result) {
          alert('Selecciona el resultado del saneamiento.');
          return;
        }

        const herdAnimals = animals.filter(a => a.farmId === farmId && a.status !== 'Muerto' && a.status !== 'Vendido' && a.status !== 'Sacrificado');
        const farmName = farm ? farm.name : 'Finca Desconocida';

        if (herdAnimals.length === 0) {
          alert('No hay animales activos en esta finca.');
          return;
        }

        if (result === 'Negativo') {
          // ALL NEGATIVE
          herdAnimals.forEach(a => {
            a.healthStatus = 'Sano';
            if (a.status === 'Cuarentena') a.status = 'Activo'; // Restore status if coming from quarantine? Or just healthStatus.
            // Let's keep status as 'Activo' usually, but healthStatus dedicated field.
            if (!a.status) a.status = 'Activo';
          });
          desc = 'Saneamiento NEGATIVO. Todo el rebaño declarado SANO.';
        } else if (result === 'Positivo') {
          // POSITIVE DETECTED
          const infectedText = qs('#saneamientoInfected').value;
          const infectedCrotals = infectedText.split(',').map(s => s.trim().toUpperCase()).filter(s => s);

          if (infectedCrotals.length === 0) {
            alert('Has indicado POSITIVO. Introduce los crotales infectados.');
            return;
          }

          let infectedCount = 0;

          herdAnimals.forEach(a => {
            const isPositive = infectedCrotals.some(ic => a.crotal.toUpperCase().endsWith(ic)); // Loose match or strict? EndsWith is safer for user input shorthands

            if (isPositive) {
              // INFECTED ANIMAL
              a.healthStatus = 'Tuberculosis+';
              a.status = 'Sacrificado'; // Auto-Sacrifice
              a.exitDate = date;
              a.actualPrice = 0; // No sales value
              a.actualCarcassWeight = 0; // Unknown yet
              a.deathReason = 'Saneamiento Positivo';

              infectedCount++;

              // Create specific sacrifice event for history?? 
              // It will appear in their history via this main event if we link it?
              // We usually link event to ONE animal. But this is a Bulk event.
              // For history tracking, we should push individual events?
              // Complexity: High. Let's assume the main event records it, 
              // and the animal status change is enough for now.
              // Or push a separate "Sacrificio Sanitario" event for each?
              if (a.id !== animal.id) { // Don't duplicate for the 'main' selected animal
                // Push discrete event
                events.push({
                  id: crypto.randomUUID(),
                  type: 'Sacrificio',
                  date: date,
                  animalId: a.id,
                  animalCrotal: a.crotal,
                  desc: 'Sacrificio Obligatorio (Saneamiento+)',
                  cost: 0
                });
              }

            } else {
              // REST OF HERD -> QUARANTINE
              a.healthStatus = 'Cuarentena';
              // Warn: Do we change main status? 'Activo' is fine, but health is 'Cuarentena'.
            }
          });

          // SCHEDULE CHECK +15 Days
          const checkDate = new Date(date);
          checkDate.setDate(checkDate.getDate() + 15);

          // We act as if the event is "General" (no specific animal ID?)
          // But our system requires an ID to query events usually. 
          // We can assign it to the first animal of the herd as a placeholder? 
          // OR create a "FARM-{ID}" "fake" animal ID? 
          // CURRENT SYSTEM: Events filter by animalId. Global events not fully supported in Animal List.
          // BUT in Dashboard all events show up.
          // Let's create a single event linked to a placeholder or the first animal to ensure visibility.

          let anchorId = herdAnimals[0].id;
          let anchorCrotal = `${farmName} (REBAÑO)`; // Special display

          events.push({
            id: crypto.randomUUID(),
            type: 'Revisión Cuarentena',
            date: checkDate.toISOString().split('T')[0],
            animalId: anchorId, // Anchor to first animal for data consistency 
            animalCrotal: anchorCrotal,
            desc: `⚠️ Revisión Cuarentena: ${farmName} (15 días post-positivo)`,
            actionRequired: 'Saneamiento',
            status: 'scheduled'
          });

          desc = `Saneamiento POSITIVO en ${farmName}. ${infectedCount} sacrificados. Resto (${herdAnimals.length - infectedCount}) en CUARENTENA.`;
        }

        // Add Main Event Record (To whom? To a placeholder or just push to events list?)
        // If we push with animalId null, it might break filters.
        // Let's use the anchor strategy: ID of the first animal of the herd.

        events.push({
          id: crypto.randomUUID(),
          type: 'Saneamiento',
          date: date, // Today
          animalId: herdAnimals[0] ? herdAnimals[0].id : 'FARM_EVENT',
          animalCrotal: `${farmName} (General)`,
          desc: desc, // Compiled description
          completed: true,
          status: 'completed'
        });

        storage.write(`animals_${currentUser}`, animals);
        storage.write('events', events);

        alert('Saneamiento registrado correctamente.');
        eventForm.reset();
        if (eventFormCard) eventFormCard.classList.add('hidden');
        if (toggleEventFormBtn) toggleEventFormBtn.textContent = 'Nuevo Evento';
        renderEvents();
        updateDashboardAlerts();
        return; // EXIT FUNCTION EARLY (Skip Standard Push)
      } // End Saneamiento Block

      // LOGIC: SACRIFICIO
      if (type === 'Sacrificio') {
        const sCategory = qs('#sacrificeCategory').value;
        const sWeight = parseFloat(qs('#sacrificeWeight').value) || 0;
        const sPrice = parseFloat(qs('#sacrificePrice').value) || 0;
        const sConf = qs('#sacrificeConf').value;
        const sFat = qs('#sacrificeFat').value;

        if (!sWeight || !sPrice || !sCategory) {
          alert('Por favor introduce la Categoría, Peso Canal y el Precio.');
          return;
        }

        // Update Animal
        animal.status = 'Sacrificado';
        animal.exitDate = date;
        animal.actualCategory = sCategory;
        animal.actualCarcassWeight = sWeight;
        animal.actualPrice = sPrice;
        if (sConf) animal.actualSeuropConf = sConf;
        if (sFat) animal.actualSeuropFat = sFat;

        // Auto-Description
        desc = `Sacrificio: Cat. ${sCategory} - ${sWeight}kg Canal @ ${sPrice}€ Total. (${sConf || '-'}/${sFat || '-'})`;

        // FUTURE: This is where we would trigger the "Training" of the algorithm comparison
        // CarcassAndQualityEngine.logTrainingData(animal);
      }

      // LOGIC: DECISIÓN MACHO
      if (type === 'Decisión Macho') {
        const decision = qs('#decisionMachoResult').value;
        if (!decision) {
          alert('Por favor selecciona el resultado de la decisión (Semental o Castrado).');
          return;
        }

        if (decision === 'Castrado') {
          animal.sex = 'Castrado';
          animal.category = 'Buey';
          // Postpone slaughter date?? handled by Nutrition Engine (Buey has longer lifecycle)
        } else if (decision === 'Semental') {
          animal.sex = 'Macho'; // Ensure stays Macho
          animal.category = 'Semental';
          animal.isBreeder = true; // Mark as potential father
        }
        desc = `Decisión Macho: ${decision}`;
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
          id: crypto.randomUUID(), // Using Crotal as ID for simplicity? No, using UUID for system ID, Crotal as Display
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
          id: crypto.randomUUID(),
          type: 'Pesaje',
          animalId: newCalf.id,
          animalCrotal: newCalf.crotal,
          date: weighDate.toISOString().split('T')[0],
          desc: 'CONTROL MENSUAL (1er Mes)',
          cost: 0,
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        // "Decisión Macho" is now handled dynamically in runLifecycleChecks (approx 6 months)

        alert(`✅ Parto registrado. Cría ${calfCrotal} añadida al inventario.`);
      }



      // 1. Create Main Event (The Birth Record itself - Linked to Mother)
      // Note: User might want link to calf in desc
      const calfInfo = type === 'Parto' ? `Cría: ${qs('#eventCalfCrotal').value} (${qs('#eventSex').value}). Peso: ${weight}kg` : '';

      const newEvent = {
        id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
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

// Helper: Grouping Logic
function getEventTimeGroup(date) {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: 'Hoy' };
  if (diffDays === 1) return { label: 'Mañana' };
  if (diffDays > 1 && diffDays <= 7) return { label: 'Esta Semana' };
  if (diffDays > 7 && diffDays <= 30) return { label: 'Este Mes' };

  // Future (Months/Seasons)
  if (diffDays > 30) {
    const month = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    // Capitalize first letter
    return { label: month.charAt(0).toUpperCase() + month.slice(1) };
  }

  // Past
  if (diffDays === -1) return { label: 'Ayer' };
  if (diffDays < -1 && diffDays >= -7) return { label: 'Semana Pasada' };
  if (diffDays < -7 && diffDays >= -30) return { label: 'Mes Pasado' };

  return { label: d.toLocaleString('es-ES', { month: 'long', year: 'numeric' }) };
}


function renderEvents() {
  if (!eventsList) return;

  let events = storage.read('events', []);

  // Sort Date Descending (Newest First)
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  const fType = filterEventType ? filterEventType.value : '';
  const fAnimal = filterEventAnimal ? filterEventAnimal.value : '';

  events = events.filter(ev => {
    let match = true;
    if (fType) match = match && ev.type === fType;
    if (fAnimal) match = match && ev.animalId === fAnimal;
    return match;
  });

  eventsList.innerHTML = '';

  if (events.length === 0) {
    eventsList.innerHTML = '<p class="status">No hay eventos registrados.</p>';
    return;
  }

  let currentGroupLabel = null;

  events.forEach(ev => {
    const group = getEventTimeGroup(ev.date);
    if (group.label !== currentGroupLabel) {
      currentGroupLabel = group.label;
      const header = document.createElement('div');
      header.className = 'timeline-header';
      header.textContent = currentGroupLabel;
      eventsList.appendChild(header);
    }

    const el = document.createElement('div');
    el.className = `event-card type-${ev.type}`;
    el.onclick = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      if (e.target.tagName === 'INPUT' || e.target.closest('input')) return;
      openEventDetail(ev.id);
    };

    const d = new Date(ev.date);
    const day = d.getDate();
    const monthShort = d.toLocaleString('es-ES', { month: 'short' }).replace('.', '');

    let statusText = ev.status ? ev.status.toUpperCase() : '';
    let badgeColor = '#6b7280';
    let textColor = '#fff';

    if (ev.status === 'scheduled') { badgeColor = '#2563eb'; statusText = 'Programado'; }
    else if (ev.status === 'completed') { badgeColor = '#16a34a'; statusText = 'Completado'; }
    else if (ev.status === 'pending') { badgeColor = '#d97706'; statusText = 'Pendiente'; }
    else if (ev.status === 'overdue') { badgeColor = '#dc2626'; statusText = 'Atrasado'; }

    // Add completed status to badge if not already set
    if (ev.completed && ev.status !== 'completed') {
      statusText = 'COMPLETADO';
      badgeColor = '#16a34a';
    }

    let statusBadge = '';
    if (statusText) {
      statusBadge = `<span class="event-badge" style="background:${badgeColor}; color:${textColor};">${statusText}</span>`;
    }

    // Custom Actions
    let actionBtn = '';
    if (ev.actionRequired === 'Destete' && !ev.completed && ev.status !== 'completed') {
      actionBtn = `<button class="btn small" style="background:#eab308; color:#fff; border:none; margin-right:5px;" onclick="openDesteteForm('${ev.animalId}', '${ev.animalCrotal}')">Destetar</button>`;
    } else if (ev.actionRequired === 'DecisionMacho' && !ev.completed && ev.status !== 'completed') {
      actionBtn = `<button class="btn small" style="background:#8b5cf6; color:#fff; border:none; margin-right:5px;" onclick="openDecisionMachoForm('${ev.animalId}', '${ev.animalCrotal}')">Decidir</button>`;
    }

    el.innerHTML = `
      <div class="event-date">
          <span class="event-day">${day}</span>
          <span class="event-month">${monthShort}</span>
      </div>
      <div class="event-content">
          <div class="event-title">
              <span>${ev.type}</span>
              ${statusBadge}
          </div>
          <div class="event-subtitle">${ev.animalCrotal}</div>
          <div style="font-size:12px; color:#4b5563; margin-top:2px;">${ev.desc}</div>
      </div>
      <div style="display:flex; align-items:center;">
           ${actionBtn}
           <button class="ghost small" style="color:#9ca3af;">&gt;</button>
      </div>
    `;
    eventsList.appendChild(el);
  });
}

// --- Specialized Action Handlers ---
window.openDesteteForm = function (animalId, animalCrotal) {
  if (eventFormCard) {
    eventFormCard.classList.remove('hidden');
    if (toggleEventFormBtn) toggleEventFormBtn.textContent = 'Cancelar';

    // Pre-fill
    if (eventTypeInput) {
      eventTypeInput.value = 'Destete';
      // Trigger generic change event if needed to show/hide fields
      eventTypeInput.dispatchEvent(new Event('change'));
    }

    // Needs delay for logic that clears fields on type change?
    setTimeout(() => {
      // We set values directly. "Destete" type usually implies specialized handling.
      // We need to bypass the "Search" UI if we want to force it.
      // Or we just set the hidden input if we know the ID.
      // Let's rely on the search input being the primary way.
      const searchInput = qs('#eventAnimal');
      if (searchInput) {
        searchInput.value = animalCrotal; // Visual
        // Trigger search logic?
      }
      // Force internal value if logic uses it (some existing logic uses filtered search)
      // But the form submission uses qs('#eventAnimal').value usually? 
      // Let's check submission logic. It uses qs('#eventAnimal').value or checks the object?
      // It uses searchInput.value.

      // Date
      if (qs('#eventDate')) qs('#eventDate').value = new Date().toISOString().split('T')[0];
    }, 100);
  }
};

window.openDecisionMachoForm = function (animalId, animalCrotal) {
  if (eventFormCard) {
    eventFormCard.classList.remove('hidden');
    if (toggleEventFormBtn) toggleEventFormBtn.textContent = 'Cancelar';

    // Pre-fill
    if (eventTypeInput) {
      eventTypeInput.value = 'Decisión Macho';
      eventTypeInput.dispatchEvent(new Event('change'));
    }

    setTimeout(() => {
      const searchInput = qs('#eventAnimal');
      if (searchInput) {
        searchInput.value = animalCrotal;
      }
      if (qs('#eventDesc')) {
        qs('#eventDesc').value = 'Decisión Macho: '; // Hint
      }
    }, 100);

    // Show prompt
    alert('Por favor, registra un evento (Castración o Selección Semental) para completar esta decisión.');
  }
};

window.openEventDetail = function (id) {
  const events = storage.read('events', []);
  const ev = events.find(e => e.id === id);
  if (!ev) return;

  const content = qs('#eventDetailContent');
  const modal = qs('#eventDetailModal');

  const d = new Date(ev.date);

  let actionsHTML = '';
  // Re-implement specialized actions in Modal
  if (ev.type === 'Tratamiento' && !ev.completed && ev.desc.includes('Protocolo')) {
    actionsHTML = `
            <div style="margin-top:15px; padding-top:15px; border-top:1px dashed #e5e7eb;">
                <p style="font-weight:bold; font-size:0.9em;">Acciones de Protocolo</p>
                <div style="margin-top:8px;">
                    <input type="text" id="note-${ev.id}" placeholder="Anotaciones extra..." style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:6px; margin-bottom:8px;">
                    <button class="primary full" onclick="confirmTreatment('${ev.id}')">Confirmar Tratamiento Realizado</button>
                </div>
            </div>
        `;
  }
  else if (ev.type === 'Revisión' && ev.desc.includes('Diagnóstico') && !ev.result) {
    actionsHTML = `
            <div style="margin-top:15px; padding-top:15px; border-top:1px dashed #e5e7eb;">
                <p style="font-weight:bold; font-size:0.9em;">Registrar Diagnóstico</p>
                <input type="text" id="note-${ev.id}" placeholder="Notas..." style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:6px; margin-bottom:8px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button class="primary" onclick="setDiagnosis('${ev.id}', 'Gestante')" style="background:#16a34a; border-color:#16a34a;">Positivo (+)</button>
                    <button class="primary" onclick="setDiagnosis('${ev.id}', 'Vacía')" style="background:#dc2626; border-color:#dc2626;">Negativo (-)</button>
                </div>
            </div>
        `;
  }

  content.innerHTML = `
        <h2 style="margin-top:0; margin-right: 24px; font-size: 1.5rem; line-height: 1.2;">${ev.type}</h2>
        <div style="color:#6b7280; margin-bottom:24px; font-weight:600; font-size: 0.95rem;">
            Animal: <span class="clickable-crotal" onclick="window.openAnimalDetails('${ev.animalId}')" style="color:#2563eb; cursor:pointer; text-decoration:underline; font-weight:800;" title="Ver ficha del animal">${ev.animalCrotal}</span>
        </div>
        
        <div class="detail-row"><span class="detail-label">Fecha</span> <span class="detail-value">${d.toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Estado</span> <span class="detail-value">${ev.completed ? 'Completado' : (ev.status || 'Pendiente')}</span></div>
        <div class="detail-row"><span class="detail-label">Descripción</span> <span class="detail-value" style="text-align:right; max-width:60%;">${ev.desc}</span></div>
        ${ev.cost ? `<div class="detail-row"><span class="detail-label">Coste</span> <span class="detail-value">${ev.cost}€</span></div>` : ''}
        ${ev.notes ? `<div class="detail-row"><span class="detail-label">Notas</span> <span class="detail-value">${ev.notes}</span></div>` : ''}
        
        ${actionsHTML}
    `;

  // Bind Delete
  const btnDel = qs('#btnDeleteEventModal');
  if (btnDel) btnDel.onclick = () => {
    deleteEvent(id);
    modal.classList.add('hidden');
  };

  // Bind Close
  const btnClose = qs('#btnCloseEventModal');
  const spanClose = qs('#closeEventDetail');
  const closer = () => modal.classList.add('hidden');
  if (btnClose) btnClose.onclick = closer;
  if (spanClose) spanClose.onclick = closer;

  modal.classList.remove('hidden');
};

window.confirmTreatment = function (id) {
  if (!confirm('¿Confirmar que se ha administrado el tratamiento?')) return;
  const events = storage.read('events', []);
  const ev = events.find(e => e.id === id);
  if (ev) {
    const noteInput = document.getElementById(`note-${id}`);
    if (noteInput && noteInput.value) {
      ev.notes = noteInput.value;
    }

    ev.completed = true;
    // ev.desc += ' [Completado]'; // No longer needed as we have UI indicator
    storage.write('events', events);
    renderEvents();
    updateDashboardAlerts();
  }
};

window.setDiagnosis = function (id, result) {
  if (!confirm(`¿Confirmar diagnóstico: ${result}?`)) return;
  const events = storage.read('events', []);
  const ev = events.find(e => e.id === id);
  if (ev) {
    const noteInput = document.getElementById(`note-${id}`);
    if (noteInput && noteInput.value) {
      ev.notes = noteInput.value;
    }

    ev.result = result; // Store structured result
    ev.completed = true;

    // Also update description for legacy visibility
    ev.desc = ev.desc.replace('Diagnóstico Gestación', `Diagnóstico: ${result.toUpperCase()}`);

    storage.write('events', events);
    renderEvents();
    updateDashboardAlerts();

    // If confirmed Pregnant, maybe trigger an alert or toast?
    if (result === 'Gestante') alert('¡Enhorabuena! Vaca confirmada gestante.');
    else alert('Vaca vacía. Se recomienda reiniciar protocolo.');

    if (typeof renderAnimals === 'function') renderAnimals(); // Refresh UI if showing status
  }
};

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


// Duplicate function deleted


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
    if (typeof BreedDataManager !== 'undefined' && BreedDataManager.downloadCSV) {
      BreedDataManager.downloadCSV();
    } else {
      console.warn('BreedDataManager methods not found, using fallback download.');
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
    }

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



// --- Market Data & Feed Price Event Listeners ---
// --- Market Data & Feed Price Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing Market Data Events...');

  // 1. Upload Beef Prices
  const uploadBeefBtn = document.getElementById('uploadBeefPriceBtn');
  const beefInput = document.getElementById('beefPriceCSV');
  if (uploadBeefBtn && beefInput) {
    console.log('Beef Upload buttons found.');
    uploadBeefBtn.addEventListener('click', () => {
      const file = beefInput.files[0];
      if (!file) {
        alert('Selecciona un archivo CSV');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof MarketDataManager !== 'undefined') {
          const count = MarketDataManager.importBeefCSV(e.target.result);
          const status = document.getElementById('beefPriceStatus');
          if (status) {
            status.textContent = `✅ ${count} precios actualizados.`;
            status.classList.remove('hidden');
            setTimeout(() => status.classList.add('hidden'), 5000);
          }
        } else {
          console.error('MarketDataManager not loaded');
          alert('Error: MarketDataManager no está cargado.');
        }
      };
      reader.readAsText(file);
    });
  } else {
    console.warn('Beef Upload buttons NOT found in DOM.');
  }

  // 2. Download Beef Template
  const downloadBeefBtn = document.getElementById('downloadBeefTemplateBtn');
  if (downloadBeefBtn) {
    downloadBeefBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const csvContent = typeof MarketDataManager !== 'undefined' ? MarketDataManager.defaultBeefCSV : "categoria;conformacion;grasa;precio_100kg\nAñojo;R;3;5.20\nVaca;O;3;3.50";
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_precios_vacuno.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  } else {
    console.warn('Beef Download Template button NOT found.');
  }

  // 3. Update Feed Prices
  const updateFeedBtn = document.getElementById('updateFeedPriceBtn');
  const feedInput = document.getElementById('feedUpdateCSV');
  if (updateFeedBtn && feedInput) {
    updateFeedBtn.addEventListener('click', () => {
      const file = feedInput.files[0];
      if (!file) {
        alert('Selecciona un archivo CSV');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof MarketDataManager !== 'undefined') {
          const count = MarketDataManager.updateFeedPrices(e.target.result);
          const status = document.getElementById('feedUpdateStatus');
          if (status) {
            status.textContent = `✅ ${count} alimentos actualizados.`;
            status.classList.remove('hidden');
            setTimeout(() => status.classList.add('hidden'), 5000);
          }
        } else {
          console.error('MarketDataManager not loaded');
        }
      };
      reader.readAsText(file);
    });
  }

  // 4. Download Feed Price Template
  const downloadFeedUpdateBtn = document.getElementById('downloadFeedUpdateTemplateBtn');
  if (downloadFeedUpdateBtn) {
    downloadFeedUpdateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const csvContent = "Alimento_ID;Nuevo_Precio\nC01;0.26\nP01;0.45";
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_actualizar_precios_pienso.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
});

// --- Helper: Breed Recommendations ---
function recommendBreedsForFarm(finca) {
  const container = qs('#detailFarmBreeds');
  if (!container) return;

  if (!window.BreedDataManager) {
    container.innerHTML = '<span style="color:red; font-size:0.9em;">Error: Gestor de Razas no disponible.</span>';
    return;
  }

  // 1. Get Criteria
  const management = (finca.management || '').toLowerCase(); // intensivo, extensivo, semi

  // 2. Filter Breeds
  const allData = window.BreedDataManager.getAllBreeds();
  const allBreeds = Object.values(allData);
  let recommended = [];

  // Crossbreed Storage
  let crosses = [];

  if (management === 'extensivo') {
    // A. Purebreds: Rustic
    recommended = allBreeds.filter(b => {
      const rustic = ['Avileña', 'Retinta', 'Morucha', 'Berrenda', 'Pirenaica'];
      return rustic.some(r => b.name.includes(r)) || (b.heat_tolerance && (b.heat_tolerance === 'Alta' || b.heat_tolerance === 'Muy alta'));
    });

    // B. Crosses: Industrial Cross (Rustic Mother x Industrial Father)
    // Suggest generic crosses known to work well
    crosses.push(
      { name: 'Cruce: Avileña x Limousin', type: 'Industrial', desc: 'Vigor híbrido: Rusticidad + Carne' },
      { name: 'Cruce: Retinta x Charolais', type: 'Industrial', desc: 'Adaptación y conformación' }
    );

  } else if (management === 'intensivo') {
    // A. Purebreds: High Yield
    recommended = allBreeds.filter(b => {
      return (b.adg_feedlot >= 1.3) || ['Charolais', 'Limousin', 'Azul Belga', 'Blonde'].some(n => b.name.includes(n));
    });

    // B. Crosses: Terminal
    crosses.push(
      { name: 'Cruce: Limousin x Charolais', type: 'Terminal', desc: 'Máximo rendimiento cárnico' },
      { name: 'Cruce: Azul Belga x Holstein', type: 'Terminal', desc: 'Aprovechamiento lechero industrial' }
    );

  } else {
    // Semi-Intensive
    recommended = allBreeds.filter(b => b.adg_grazing >= 0.6 && b.adg_feedlot >= 1.0);

    // B. Crosses: Maternal / Balanced
    crosses.push(
      { name: 'Cruce: Angus x Hereford (Careta)', type: 'Maternal', desc: 'Excelente maternidad y carne' },
      { name: 'Cruce: F1 (Simmental x Brahman)', type: 'Resistencia', desc: 'Doble propósito y resistencia' }
    );
  }

  // 3. Render
  container.innerHTML = '';
  if (recommended.length === 0 && crosses.length === 0) {
    container.innerHTML = '<span style="color:#666; font-size:0.9em;">No hay recomendaciones específicas.</span>';
    return;
  }

  // Sort by ADG desc
  recommended.sort((a, b) => b.adg_feedlot - a.adg_feedlot);

  // Render Purebreds
  recommended.slice(0, 5).forEach(b => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.style.cssText = 'background-color: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; cursor: help;';
    el.textContent = b.name;
    el.title = `ADG: ${b.adg_feedlot} kg/d`;
    container.appendChild(el);
  });

  // Render Crosses
  crosses.forEach(c => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.style.cssText = 'background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; cursor: help; font-weight: bold;';
    el.textContent = c.name;
    el.title = `${c.type}: ${c.desc}`;
    container.appendChild(el);
  });
}

window.logout = function () { console.log('Logging out...'); localStorage.removeItem('currentUser'); window.location.reload(); };
// Initialize Application on Load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('App starting...');
    loadSession();
  });
}
