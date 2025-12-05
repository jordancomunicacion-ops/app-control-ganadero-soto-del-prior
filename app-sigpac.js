// ========================================
// STORAGE HELPER
// ========================================
const storage = {
    read(key, fallback) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : fallback;
        } catch {
            return fallback;
        }
    },
    write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    const diffTime = Math.abs(today - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} dÃ­as`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`;
    return `${Math.floor(diffDays / 365)} aÃ±os`;
}

// ========================================
// DOM ELEMENTS
// ========================================
const authSection = qs('#auth');
const appSection = qs('#app');
const loginTab = qs('#loginTab');
const registerTab = qs('#registerTab');
const loginForm = qs('#loginForm');
const loginAlert = qs('#loginAlert');
const registerForm = qs('#registerForm');
const rememberCheck = qs('#rememberCheck');
const logoutBtn = qs('#logoutBtn');
const profileBtn = qs('#profileBtn');
const sidebarAvatar = qs('#sidebarAvatar');
const sidebarName = qs('#sidebarName');

// Navigation
const navLinks = qsa('.nav-link');
const sections = qsa('.section');

// Profile
const profileSection = qs('#profile');
const profileForm = qs('#profileForm');
const profileAvatar = qs('#profileAvatar');
const profileNameInput = qs('#profileName');
const profileEmailInput = qs('#profileEmail');
const avatarInput = qs('#avatarInput');
const avatarRemove = qs('#avatarRemove');
const profileCancel = qs('#profileCancel');

// Farms
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
const farmEditId = qs('#farmEditId');
const farmFormTitle = qs('#farmFormTitle');
const farmSubmitBtn = qs('#farmSubmitBtn');
const cancelFarmEdit = qs('#cancelFarmEdit');

// Animals
const animalForm = qs('#animalForm');
const animalsList = qs('#animalsList');
const animalCount = qs('#animalCount');
const toggleAnimalForm = qs('#toggleAnimalForm');
const animalFormCard = qs('#animalFormCard');
const cancelAnimalForm = qs('#cancelAnimalForm');
const searchAnimal = qs('#searchAnimal');
const filterFarm = qs('#filterFarm');
const filterBreed = qs('#filterBreed');
const filterSex = qs('#filterSex');
const animalFarmSelect = qs('#animalFarm');

// Events
const eventForm = qs('#eventForm');
const eventsList = qs('#eventsList');
const eventCount = qs('#eventCount');
const toggleEventForm = qs('#toggleEventForm');
const eventFormCard = qs('#eventFormCard');
const cancelEventForm = qs('#cancelEventForm');
const eventAnimalSelect = qs('#eventAnimal');
const filterEventType = qs('#filterEventType');
const filterEventAnimal = qs('#filterEventAnimal');

// FCR
const fcrForm = qs('#fcrForm');
const fcrResults = qs('#fcrResults');
const fcrHistory = qs('#fcrHistory');
const fcrHistoryCount = qs('#fcrHistoryCount');
const fcrAnimalSelect = qs('#fcrAnimal');

// Stats
const statFincas = qs('#stat-fincas');
const statAnimales = qs('#stat-animales');
const statEventos = qs('#stat-eventos');
const statFcr = qs('#stat-fcr');

// ========================================
// STATE
// ========================================
let currentUser = null;
let selectedReportType = null;

// ========================================
// DATA HELPERS
// ========================================
function getProfileKey(user) {
    return `profile_${user}`;
}

function defaultProfile(user) {
    return { name: user, email: '', avatar: '' };
}

function getFincas() {
    if (!currentUser) return [];
    return storage.read(`fincas_${currentUser}`, []);
}

function saveFincas(fincas) {
    if (!currentUser) return;
    storage.write(`fincas_${currentUser}`, fincas);
    updateStats();
}

function getAnimals() {
    if (!currentUser) return [];
    return storage.read(`animals_${currentUser}`, []);
}

function saveAnimals(animals) {
    if (!currentUser) return;
    storage.write(`animals_${currentUser}`, animals);
    updateStats();
}

function getEvents() {
    if (!currentUser) return [];
    return storage.read(`events_${currentUser}`, []);
}

function saveEvents(events) {
    if (!currentUser) return;
    storage.write(`events_${currentUser}`, events);
    updateStats();
}

function getFCRHistory() {
    if (!currentUser) return [];
    return storage.read(`fcr_${currentUser}`, []);
}

function saveFCRHistory(history) {
    if (!currentUser) return;
    storage.write(`fcr_${currentUser}`, history);
}

// ========================================
// AUTH FUNCTIONS
// ========================================
function showAuth() {
    authSection?.classList.remove('hidden');
    appSection?.classList.add('hidden');
}

function showApp(user) {
    authSection?.classList.add('hidden');
    appSection?.classList.remove('hidden');
    if (sidebarName) sidebarName.textContent = user;
    loadProfile(user);
    renderFincas();
    renderAnimals();
    renderEvents();
    renderFCRHistory();
    updateStats();
    populateSelects();
}

function loadSession() {
    const sessionUser = storage.read('sessionUser', null);
    if (sessionUser) {
        currentUser = sessionUser;
        showApp(sessionUser);
        return;
    }

    const remembered = storage.read('rememberedCreds', null);
    if (remembered) {
        qs('#loginUser').value = remembered.user;
        qs('#loginPass').value = remembered.pass;
        rememberCheck.checked = true;
    }

    showAuth();
}

function switchTab(tab) {
    if (tab === 'login') {
        loginTab?.classList.add('active');
        registerTab?.classList.remove('active');
        loginForm?.classList.remove('hidden');
        registerForm?.classList.add('hidden');
    } else {
        registerTab?.classList.add('active');
        loginTab?.classList.remove('active');
        registerForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
    }
}

// ========================================
// EVENT LISTENERS - AUTH
// ========================================
loginTab?.addEventListener('click', () => switchTab('login'));
registerTab?.addEventListener('click', () => switchTab('register'));

registerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = qs('#regUser').value.trim();
    const email = qs('#regEmail').value.trim();
    const pass = qs('#regPass').value;

    const users = storage.read('users', {});
    if (users[user]) {
        alert('Este usuario ya existe. Prueba con otro nombre.');
        return;
    }

    users[user] = { pass, email };
    storage.write('users', users);
    storage.write(getProfileKey(user), { name: user, email, avatar: '' });
    storage.write('sessionUser', user);
    currentUser = user;
    showApp(user);
    registerForm.reset();
});

loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = qs('#loginUser').value.trim();
    const pass = qs('#loginPass').value;

    const users = storage.read('users', {});
    if (!users[user] || users[user].pass !== pass) {
        loginAlert?.classList.remove('hidden');
        return;
    }

    loginAlert?.classList.add('hidden');
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
    activateSection('home');
});

profileBtn?.addEventListener('click', () => {
    activateSection('profile');
});

// ========================================
// NAVIGATION
// ========================================
function activateSection(sectionId) {
    sections.forEach(s => s.classList.add('hidden'));
    navLinks.forEach(l => l.classList.remove('active'));

    const targetSection = qs(`#${sectionId}`);
    const targetLink = qs(`[data-target="${sectionId}"]`);

    if (targetSection) targetSection.classList.remove('hidden');
    if (targetLink) targetLink.classList.add('active');

    if (sectionId === 'profile') {
        profileSection?.classList.remove('hidden');
    }
}

navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.target;
        if (target) activateSection(target);
    });
});

// Quick actions
qsa('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'add-animal') {
            activateSection('animals');
            animalFormCard?.classList.remove('hidden');
        } else if (action === 'add-event') {
            activateSection('events');
            eventFormCard?.classList.remove('hidden');
        } else if (action === 'calc-fcr') {
            activateSection('fcr');
        }
    });
});

qs('#action-report')?.addEventListener('click', () => {
    activateSection('reports');
});

// ========================================
// FARMS MANAGEMENT
// ========================================
farmForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert('Inicia sesiÃ³n para registrar fincas.');
        return;
    }

    const editId = farmEditId?.value;
    const finca = {
        id: editId || crypto.randomUUID(),
        name: farmNameInput?.value.trim(),
        location: farmLocationInput?.value.trim(),
        size: farmSizeInput?.value,
        soil: farmSoilInput?.value,
        license: farmLicenseInput?.value.trim(),
        animals: farmAnimalsInput?.value,
        management: farmManagementInput?.value,
        feed: farmFeedInput?.value
    };

    if (!finca.name || !finca.location || !finca.size || !finca.soil || !finca.license || !finca.animals || !finca.management || !finca.feed) {
        alert('Completa todos los campos.');
        return;
    }

    const fincas = getFincas();

    if (editId) {
        const index = fincas.findIndex(f => f.id === editId);
        if (index !== -1) {
            fincas[index] = finca;
        }
        farmEditId.value = '';
        farmFormTitle.textContent = 'Registrar Nueva Finca';
        farmSubmitBtn.textContent = 'Guardar Finca';
        cancelFarmEdit.style.display = 'none';
    } else {
        fincas.push(finca);
    }

    saveFincas(fincas);
    farmForm.reset();
    renderFincas();
    populateSelects();
});

cancelFarmEdit?.addEventListener('click', () => {
    farmForm.reset();
    farmEditId.value = '';
    farmFormTitle.textContent = 'Registrar Nueva Finca';
    farmSubmitBtn.textContent = 'Guardar Finca';
    cancelFarmEdit.style.display = 'none';
});

function editFarm(id) {
    const fincas = getFincas();
    const finca = fincas.find(f => f.id === id);
    if (!finca) return;

    farmEditId.value = finca.id;
    farmNameInput.value = finca.name;
    farmLocationInput.value = finca.location;
    farmSizeInput.value = finca.size;
    farmSoilInput.value = finca.soil;
    farmLicenseInput.value = finca.license;
    farmAnimalsInput.value = finca.animals;
    farmManagementInput.value = finca.management;
    farmFeedInput.value = finca.feed;

    farmFormTitle.textContent = 'Editar Finca';
    farmSubmitBtn.textContent = 'Actualizar Finca';
    cancelFarmEdit.style.display = 'inline-block';

    activateSection('farms');
    farmForm.scrollIntoView({ behavior: 'smooth' });
}

function deleteFarm(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar esta finca?')) return;

    const fincas = getFincas();
    const filtered = fincas.filter(f => f.id !== id);
    saveFincas(filtered);
    renderFincas();
    populateSelects();
}

function renderFincas() {
    const fincas = getFincas();
    if (!fincasList) return;

    if (fincas.length === 0) {
        fincasList.innerHTML = '<p class="status">No hay fincas registradas</p>';
        return;
    }

    fincasList.innerHTML = fincas.map(f => `
    <div class="farm">
      <div class="farm-title">
        <h4>${f.name}</h4>
        <div style="display: flex; gap: 8px;">
          <button class="ghost small" onclick="editFarm('${f.id}')">âœï¸ Editar</button>
          <button class="ghost small" onclick="deleteFarm('${f.id}')">ðŸ—‘ï¸ Eliminar</button>
        </div>
      </div>
      <div class="farm-meta">
        <span>ðŸ“ ${f.location}</span>
        <span>ðŸ“ ${f.size} ha</span>
        <span>ðŸ„ ${f.animals} animales</span>
      </div>
      <div class="farm-meta">
        <span>ðŸŒ± ${f.soil}</span>
        <span>ðŸ·ï¸ ${f.license}</span>
        <span>ðŸ”§ ${f.management}</span>
        <span>ðŸŒ¾ ${f.feed}</span>
      </div>
    </div>
  `).join('');
}

// ========================================
// ANIMALS MANAGEMENT
// ========================================
toggleAnimalForm?.addEventListener('click', () => {
    animalFormCard?.classList.toggle('hidden');
});

cancelAnimalForm?.addEventListener('click', () => {
    animalFormCard?.classList.add('hidden');
    animalForm?.reset();
});

animalForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert('Inicia sesiÃ³n para registrar animales.');
        return;
    }

    const animal = {
        id: crypto.randomUUID(),
        animalId: qs('#animalId')?.value.trim(),
        name: qs('#animalName')?.value.trim(),
        farm: qs('#animalFarm')?.value,
        breed: qs('#animalBreed')?.value,
        sex: qs('#animalSex')?.value,
        birthDate: qs('#animalBirth')?.value,
        weight: parseFloat(qs('#animalWeight')?.value),
        notes: qs('#animalNotes')?.value.trim(),
        registeredDate: new Date().toISOString()
    };

    if (!animal.animalId || !animal.farm || !animal.breed || !animal.sex || !animal.birthDate || !animal.weight) {
        alert('Completa todos los campos obligatorios.');
        return;
    }

    const animals = getAnimals();

    // Check for duplicate ID
    if (animals.some(a => a.animalId === animal.animalId)) {
        alert('Ya existe un animal con este ID. Usa uno diferente.');
        return;
    }

    animals.push(animal);
    saveAnimals(animals);
    animalForm.reset();
    animalFormCard?.classList.add('hidden');
    renderAnimals();
    populateSelects();
});

// Animal filters
searchAnimal?.addEventListener('input', renderAnimals);
filterFarm?.addEventListener('change', renderAnimals);
filterBreed?.addEventListener('change', renderAnimals);
filterSex?.addEventListener('change', renderAnimals);

function deleteAnimal(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar este animal?')) return;

    const animals = getAnimals();
    const filtered = animals.filter(a => a.id !== id);
    saveAnimals(filtered);
    renderAnimals();
    populateSelects();
}

function renderAnimals() {
    const animals = getAnimals();
    const fincas = getFincas();

    if (!animalsList || !animalCount) return;

    // Apply filters
    let filtered = animals;

    const searchTerm = searchAnimal?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(a =>
            a.animalId.toLowerCase().includes(searchTerm) ||
            (a.name && a.name.toLowerCase().includes(searchTerm))
        );
    }

    const farmFilter = filterFarm?.value;
    if (farmFilter) {
        filtered = filtered.filter(a => a.farm === farmFilter);
    }

    const breedFilter = filterBreed?.value;
    if (breedFilter) {
        filtered = filtered.filter(a => a.breed === breedFilter);
    }

    const sexFilter = filterSex?.value;
    if (sexFilter) {
        filtered = filtered.filter(a => a.sex === sexFilter);
    }

    animalCount.textContent = filtered.length;

    if (filtered.length === 0) {
        animalsList.innerHTML = '<p class="status">No hay animales que coincidan con los filtros</p>';
        return;
    }

    animalsList.innerHTML = filtered.map(a => {
        const farm = fincas.find(f => f.id === a.farm);
        const farmName = farm ? farm.name : 'Desconocida';
        const age = calculateAge(a.birthDate);

        return `
      <div class="farm">
        <div class="farm-title">
          <div>
            <h4>${a.animalId}${a.name ? ` - ${a.name}` : ''}</h4>
            <span class="tag" style="background: ${a.sex === 'Hembra' ? '#fde2e6' : '#dbeafe'}; color: ${a.sex === 'Hembra' ? '#b91c1c' : '#1e40af'};">${a.sex}</span>
          </div>
          <button class="ghost small" onclick="deleteAnimal('${a.id}')">ðŸ—‘ï¸ Eliminar</button>
        </div>
        <div class="farm-meta">
          <span>ðŸ·ï¸ ${a.breed}</span>
          <span>ðŸŒ¾ ${farmName}</span>
          <span>ðŸŽ‚ ${age}</span>
          <span>âš–ï¸ ${a.weight} kg</span>
        </div>
        ${a.notes ? `<p class="status">${a.notes}</p>` : ''}
      </div>
    `;
    }).join('');
}

// ========================================
// EVENTS MANAGEMENT
// ========================================
toggleEventForm?.addEventListener('click', () => {
    eventFormCard?.classList.toggle('hidden');
});

cancelEventForm?.addEventListener('click', () => {
    eventFormCard?.classList.add('hidden');
    eventForm?.reset();
});

eventForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert('Inicia sesiÃ³n para registrar eventos.');
        return;
    }

    const event = {
        id: crypto.randomUUID(),
        type: qs('#eventType')?.value,
        animal: qs('#eventAnimal')?.value,
        date: qs('#eventDate')?.value,
        description: qs('#eventDesc')?.value.trim(),
        cost: parseFloat(qs('#eventCost')?.value) || 0,
        nextDate: qs('#eventNext')?.value || null,
        registeredDate: new Date().toISOString()
    };

    if (!event.type || !event.animal || !event.date || !event.description) {
        alert('Completa todos los campos obligatorios.');
        return;
    }

    const events = getEvents();
    events.push(event);
    saveEvents(events);
    eventForm.reset();
    eventFormCard?.classList.add('hidden');
    renderEvents();
});

// Event filters
filterEventType?.addEventListener('change', renderEvents);
filterEventAnimal?.addEventListener('change', renderEvents);

function deleteEvent(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar este evento?')) return;

    const events = getEvents();
    const filtered = events.filter(e => e.id !== id);
    saveEvents(filtered);
    renderEvents();
}

function renderEvents() {
    const events = getEvents();
    const animals = getAnimals();

    if (!eventsList || !eventCount) return;

    // Apply filters
    let filtered = events;

    const typeFilter = filterEventType?.value;
    if (typeFilter) {
        filtered = filtered.filter(e => e.type === typeFilter);
    }

    const animalFilter = filterEventAnimal?.value;
    if (animalFilter) {
        filtered = filtered.filter(e => e.animal === animalFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    eventCount.textContent = filtered.length;

    if (filtered.length === 0) {
        eventsList.innerHTML = '<p class="status">No hay eventos registrados</p>';
        return;
    }

    eventsList.innerHTML = filtered.map(e => {
        const animal = animals.find(a => a.id === e.animal);
        const animalName = animal ? `${animal.animalId}${animal.name ? ` - ${animal.name}` : ''}` : 'Desconocido';

        const typeColors = {
            'VacunaciÃ³n': { bg: '#dbeafe', color: '#1e40af' },
            'Tratamiento': { bg: '#fce7f3', color: '#9f1239' },
            'Parto': { bg: '#dcfce7', color: '#166534' },
            'Destete': { bg: '#fef3c7', color: '#92400e' },
            'Pesaje': { bg: '#e0e7ff', color: '#3730a3' },
            'Otro': { bg: '#f3f4f6', color: '#374151' }
        };

        const typeStyle = typeColors[e.type] || typeColors['Otro'];

        return `
      <div class="farm">
        <div class="farm-title">
          <div>
            <span class="tag" style="background: ${typeStyle.bg}; color: ${typeStyle.color};">${e.type}</span>
            <h4 style="margin: 4px 0;">${e.description}</h4>
          </div>
          <button class="ghost small" onclick="deleteEvent('${e.id}')">ðŸ—‘ï¸ Eliminar</button>
        </div>
        <div class="farm-meta">
          <span>ðŸ„ ${animalName}</span>
          <span>ðŸ“… ${formatDate(e.date)}</span>
          ${e.cost > 0 ? `<span>ðŸ’° ${e.cost.toFixed(2)}â‚¬</span>` : ''}
        </div>
        ${e.nextDate ? `<p class="status">ðŸ“Œ PrÃ³xima fecha: ${formatDate(e.nextDate)}</p>` : ''}
      </div>
    `;
    }).join('');
}

// ========================================
// FCR CALCULATOR
// ========================================
fcrForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const weightInit = parseFloat(qs('#fcrWeightInit')?.value);
    const weightFinal = parseFloat(qs('#fcrWeightFinal')?.value);
    const feed = parseFloat(qs('#fcrFeed')?.value);
    const days = parseInt(qs('#fcrDays')?.value);
    const animalId = qs('#fcrAnimal')?.value;

    if (!weightInit || !weightFinal || !feed || !days) {
        alert('Completa todos los campos.');
        return;
    }

    if (weightFinal <= weightInit) {
        alert('El peso final debe ser mayor que el peso inicial.');
        return;
    }

    const gain = weightFinal - weightInit;
    const fcr = feed / gain;
    const adg = gain / days;

    // Determine efficiency rating
    let efficiency = '';
    let rating = '';
    if (fcr < 6) {
        efficiency = 'Excelente';
        rating = 'â­â­â­â­â­';
    } else if (fcr < 7) {
        efficiency = 'Muy Bueno';
        rating = 'â­â­â­â­';
    } else if (fcr < 8) {
        efficiency = 'Bueno';
        rating = 'â­â­â­';
    } else if (fcr < 10) {
        efficiency = 'Regular';
        rating = 'â­â­';
    } else {
        efficiency = 'Mejorable';
        rating = 'â­';
    }

    // Display results
    qs('#result-fcr').textContent = fcr.toFixed(2);
    qs('#result-gain').textContent = gain.toFixed(1);
    qs('#result-adg').textContent = adg.toFixed(3);
    qs('#result-efficiency').textContent = efficiency;
    qs('#result-rating').textContent = rating;
    fcrResults.style.display = 'block';

    // Save to history
    const history = getFCRHistory();
    history.push({
        id: crypto.randomUUID(),
        animalId,
        weightInit,
        weightFinal,
        feed,
        days,
        fcr,
        gain,
        adg,
        efficiency,
        date: new Date().toISOString()
    });
    saveFCRHistory(history);
    renderFCRHistory();
    updateStats();
});

function deleteFCR(id) {
    if (!confirm('Â¿Eliminar este cÃ¡lculo?')) return;

    const history = getFCRHistory();
    const filtered = history.filter(h => h.id !== id);
    saveFCRHistory(filtered);
    renderFCRHistory();
    updateStats();
}

function renderFCRHistory() {
    const history = getFCRHistory();
    const animals = getAnimals();

    if (!fcrHistory || !fcrHistoryCount) return;

    // Sort by date (newest first)
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    fcrHistoryCount.textContent = sorted.length;

    if (sorted.length === 0) {
        fcrHistory.innerHTML = '<p class="status">No hay cÃ¡lculos guardados</p>';
        return;
    }

    fcrHistory.innerHTML = sorted.map(h => {
        const animal = animals.find(a => a.id === h.animalId);
        const animalName = animal ? `${animal.animalId}${animal.name ? ` - ${animal.name}` : ''}` : 'General';

        return `
      <div class="farm">
        <div class="farm-title">
          <div>
            <h4>FCR: ${h.fcr.toFixed(2)} - ${h.efficiency}</h4>
          </div>
          <button class="ghost small" onclick="deleteFCR('${h.id}')">ðŸ—‘ï¸ Eliminar</button>
        </div>
        <div class="farm-meta">
          <span>ðŸ„ ${animalName}</span>
          <span>ðŸ“… ${formatDate(h.date)}</span>
          <span>âš–ï¸ ${h.weightInit}kg â†’ ${h.weightFinal}kg</span>
          <span>ðŸ“ˆ ${h.gain.toFixed(1)}kg ganancia</span>
        </div>
        <div class="farm-meta">
          <span>ðŸŒ¾ ${h.feed}kg alimento</span>
          <span>ðŸ“Š ${h.adg.toFixed(3)}kg/dÃ­a</span>
          <span>â±ï¸ ${h.days} dÃ­as</span>
        </div>
      </div>
    `;
    }).join('');
}

// ========================================
// REPORTS
// ========================================
qsa('[data-report]').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedReportType = btn.dataset.report;
        qs('#reportStatus').textContent = `Reporte seleccionado: ${btn.textContent}`;
    });
});

qs('#exportCSV')?.addEventListener('click', () => {
    if (!selectedReportType) {
        alert('Selecciona un tipo de reporte primero');
        return;
    }

    exportToCSV(selectedReportType);
});

qs('#exportPDF')?.addEventListener('click', () => {
    if (!selectedReportType) {
        alert('Selecciona un tipo de reporte primero');
        return;
    }

    exportToPDF(selectedReportType);
});

function exportToCSV(type) {
    let data = [];
    let headers = [];
    let filename = '';

    if (type === 'inventory') {
        const animals = getAnimals();
        const fincas = getFincas();
        headers = ['ID', 'Nombre', 'Finca', 'Raza', 'Sexo', 'Fecha Nacimiento', 'Edad', 'Peso (kg)', 'Notas'];
        data = animals.map(a => {
            const farm = fincas.find(f => f.id === a.farm);
            return [
                a.animalId,
                a.name || '',
                farm ? farm.name : '',
                a.breed,
                a.sex,
                a.birthDate,
                calculateAge(a.birthDate),
                a.weight,
                a.notes || ''
            ];
        });
        filename = 'inventario_animales.csv';
    } else if (type === 'events') {
        const events = getEvents();
        const animals = getAnimals();
        headers = ['Tipo', 'Animal', 'Fecha', 'DescripciÃ³n', 'Costo (â‚¬)', 'PrÃ³xima Fecha'];
        data = events.map(e => {
            const animal = animals.find(a => a.id === e.animal);
            return [
                e.type,
                animal ? animal.animalId : '',
                e.date,
                e.description,
                e.cost,
                e.nextDate || ''
            ];
        });
        filename = 'historial_eventos.csv';
    } else if (type === 'fcr') {
        const history = getFCRHistory();
        const animals = getAnimals();
        headers = ['Animal', 'Fecha', 'Peso Inicial', 'Peso Final', 'Ganancia', 'Alimento', 'DÃ­as', 'FCR', 'GDP', 'Eficiencia'];
        data = history.map(h => {
            const animal = animals.find(a => a.id === h.animalId);
            return [
                animal ? animal.animalId : 'General',
                formatDate(h.date),
                h.weightInit,
                h.weightFinal,
                h.gain.toFixed(1),
                h.feed,
                h.days,
                h.fcr.toFixed(2),
                h.adg.toFixed(3),
                h.efficiency
            ];
        });
        filename = 'analisis_fcr.csv';
    } else if (type === 'farms') {
        const fincas = getFincas();
        headers = ['Nombre', 'UbicaciÃ³n', 'TamaÃ±o (ha)', 'Suelo', 'Licencia', 'Animales', 'Manejo', 'AlimentaciÃ³n'];
        data = fincas.map(f => [
            f.name,
            f.location,
            f.size,
            f.soil,
            f.license,
            f.animals,
            f.management,
            f.feed
        ]);
        filename = 'resumen_fincas.csv';
    } else if (type === 'complete') {
        // Complete report combines all data
        alert('Generando reporte completo...');
        exportToCSV('inventory');
        setTimeout(() => exportToCSV('events'), 500);
        setTimeout(() => exportToCSV('fcr'), 1000);
        setTimeout(() => exportToCSV('farms'), 1500);
        return;
    }

    // Generate CSV
    const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    alert(`Reporte exportado: ${filename}`);
}

function exportToPDF(type) {
    if (typeof jspdf === 'undefined') {
        alert('Error: LibrerÃ­a PDF no cargada. Recarga la pÃ¡gina.');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    let title = '';
    let content = [];

    if (type === 'inventory') {
        title = 'Inventario de Animales';
        const animals = getAnimals();
        const fincas = getFincas();
        content = animals.map(a => {
            const farm = fincas.find(f => f.id === a.farm);
            return `${a.animalId} - ${a.name || 'Sin nombre'} | ${a.breed} | ${a.sex} | ${farm ? farm.name : 'N/A'} | ${a.weight}kg`;
        });
    } else if (type === 'events') {
        title = 'Historial de Eventos';
        const events = getEvents();
        const animals = getAnimals();
        content = events.map(e => {
            const animal = animals.find(a => a.id === e.animal);
            return `${e.type} - ${animal ? animal.animalId : 'N/A'} | ${formatDate(e.date)} | ${e.description}`;
        });
    } else if (type === 'fcr') {
        title = 'AnÃ¡lisis FCR';
        const history = getFCRHistory();
        content = history.map(h => {
            return `FCR: ${h.fcr.toFixed(2)} | Ganancia: ${h.gain.toFixed(1)}kg | ${h.efficiency}`;
        });
    } else if (type === 'farms') {
        title = 'Resumen de Fincas';
        const fincas = getFincas();
        content = fincas.map(f => {
            return `${f.name} | ${f.location} | ${f.size}ha | ${f.animals} animales`;
        });
    } else if (type === 'complete') {
        title = 'Reporte Completo - Control Ganadero';
        const fincas = getFincas();
        const animals = getAnimals();
        const events = getEvents();
        content = [
            `Total Fincas: ${fincas.length}`,
            `Total Animales: ${animals.length}`,
            `Total Eventos: ${events.length}`,
            '',
            '--- Resumen por Finca ---',
            ...fincas.map(f => `${f.name}: ${f.animals} animales, ${f.size}ha`)
        ];
    }

    // Add content to PDF
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
    doc.text(`Usuario: ${currentUser}`, 20, 35);

    let y = 45;
    content.forEach(line => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(line, 20, y);
        y += 7;
    });

    doc.save(`reporte_${type}_${Date.now()}.pdf`);
    alert('Reporte PDF generado exitosamente');
}

// ========================================
// PROFILE MANAGEMENT
// ========================================
function loadProfile(user) {
    const profile = storage.read(getProfileKey(user), defaultProfile(user));
    if (profileNameInput) profileNameInput.value = profile.name || user;
    if (profileEmailInput) profileEmailInput.value = profile.email || '';
    renderAvatar(profile.avatar, profile.name || user);
}

function renderAvatar(dataUrl, name) {
    const initial = (name || 'U')[0].toUpperCase();
    [profileAvatar, sidebarAvatar].forEach(el => {
        if (!el) return;
        if (dataUrl) {
            el.innerHTML = `<img src="${dataUrl}" alt="${name}">`;
        } else {
            el.innerHTML = initial;
            el.style.background = '#22c55e';
        }
    });
    if (profileAvatar) profileAvatar.dataset.src = dataUrl || '';
}

function saveProfile() {
    if (!currentUser) return;
    const profile = {
        name: profileNameInput?.value || currentUser,
        email: profileEmailInput?.value || '',
        avatar: profileAvatar?.dataset.src || ''
    };
    storage.write(getProfileKey(currentUser), profile);
    if (sidebarName) sidebarName.textContent = profile.name;
    renderAvatar(profile.avatar, profile.name);
    alert('Perfil actualizado');
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

// ========================================
// STATS AND UPDATES
// ========================================
function updateStats() {
    const fincas = getFincas();
    const animals = getAnimals();
    const events = getEvents();
    const fcrHistory = getFCRHistory();

    if (statFincas) statFincas.textContent = fincas.length;
    if (statAnimales) statAnimales.textContent = animals.length;

    // Events this month
    const now = new Date();
    const thisMonth = events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
    });
    if (statEventos) statEventos.textContent = thisMonth.length;

    // Average FCR
    if (statFcr) {
        if (fcrHistory.length > 0) {
            const avgFcr = fcrHistory.reduce((sum, h) => sum + h.fcr, 0) / fcrHistory.length;
            statFcr.textContent = avgFcr.toFixed(2);
        } else {
            statFcr.textContent = '-';
        }
    }

    // Update alerts
    updateAlerts();
}

function updateAlerts() {
    const alertsList = qs('#alertsList');
    if (!alertsList) return;

    const events = getEvents();
    const animals = getAnimals();

    const alerts = [];

    // Check for upcoming events
    const today = new Date();
    const upcoming = events.filter(e => {
        if (!e.nextDate) return false;
        const nextDate = new Date(e.nextDate);
        const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    });

    if (upcoming.length > 0) {
        alerts.push(`<li><span><span class="dot amber"></span> ${upcoming.length} evento(s) prÃ³ximo(s)</span><span class="pill">âš ï¸</span></li>`);
    }

    if (animals.length === 0) {
        alerts.push(`<li><span><span class="dot blue"></span> No hay animales registrados</span><span class="pill">Info</span></li>`);
    }

    if (alerts.length === 0) {
        alerts.push(`<li><span><span class="dot green"></span> Sistema operativo</span><span class="pill">OK</span></li>`);
    }

    alertsList.innerHTML = alerts.join('');
}

function populateSelects() {
    const fincas = getFincas();
    const animals = getAnimals();

    // Populate farm selects
    const farmSelects = [animalFarmSelect, filterFarm];
    farmSelects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        const isFilter = select === filterFarm;
        select.innerHTML = isFilter ? '<option value="">Todas las fincas</option>' : '<option value="">Selecciona una finca</option>';
        fincas.forEach(f => {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.name;
            select.appendChild(option);
        });
        select.value = currentValue;
    });

    // Populate animal selects
    const animalSelects = [eventAnimalSelect, filterEventAnimal, fcrAnimalSelect];
    animalSelects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        const isFilter = select === filterEventAnimal;
        const isFCR = select === fcrAnimalSelect;
        select.innerHTML = isFilter ? '<option value="">Todos los animales</option>' : isFCR ? '<option value="">CÃ¡lculo general</option>' : '<option value="">Selecciona animal</option>';
        animals.forEach(a => {
            const option = document.createElement('option');
            option.value = a.id;
            option.textContent = `${a.animalId}${a.name ? ` - ${a.name}` : ''}`;
            select.appendChild(option);
        });
        select.value = currentValue;
    });

    // Populate breed filter
    if (filterBreed) {
        const breeds = [...new Set(animals.map(a => a.breed))];
        const currentValue = filterBreed.value;
        filterBreed.innerHTML = '<option value="">Todas las razas</option>';
        breeds.forEach(breed => {
            const option = document.createElement('option');
            option.value = breed;
            option.textContent = breed;
            filterBreed.appendChild(option);
        });
        filterBreed.value = currentValue;
    }
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', loadSession);
