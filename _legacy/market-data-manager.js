/**
 * Market Data Manager
 * Handles parsing of MAPA Beef Market Reports (CSV) and Price Retrieval
 */
const MarketDataManager = {
    _prices: {}, // Internal cache
    _metadata: {
        week: null,
        year: null
    },

    // Default 2024/2025 Reference Prices (Euro/100kg Canal)
    defaultPrices: {
        // A: Añojos (Machos 12-24m)
        "AR3": 545.0, "AU2": 530.0, "AU3": 535.0, "AO3": 490.0,
        // D: Vacas (Hembras >48m / Paridas) - Vaca "D"
        "DR3": 420.0, "DO3": 360.0, "DP2": 280.0, "DU4": 460.0, "DR4": 410.0,
        // E: Novillas (Hembras 12-48m no paridas)
        "ER3": 535.0, "EU3": 550.0, "EO3": 480.0,
        // Z: Terneros (8-12m)
        "ZR3": 540.0, "ZU3": 555.0,
        // Generic Class Fallbacks
        "A": 540.0, "B": 350.0, "C": 400.0, "D": 380.0, "E": 530.0, "Z": 535.0, "V": 550.0
    },

    init() {
        console.log('MarketDataManager: Initializing...');
        this.loadFromStorage();

        // Load defaults if empty
        if (Object.keys(this._prices).length === 0) {
            console.log('[MarketData] Cache empty. Loading defaults.');
            this._prices = { ...this.defaultPrices };
        }

        this.bindEvents();
        window.MarketDataManager = this;
    },

    bindEvents() {
        // Beef Price CSV Upload
        const uploadBtn = document.getElementById('uploadBeefPriceBtn');
        const fileInput = document.getElementById('beefPriceCSV');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                const file = fileInput.files[0];
                console.log('[MarketData] Upload Clicked. File:', file);

                if (!file) {
                    this.showStatus('beefPriceStatus', 'error', 'Selecciona un archivo CSV');
                    return;
                }

                this.showStatus('beefPriceStatus', 'success', '⏳ Procesando archivo...');

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        console.log('[MarketData] File Read. Size:', e.target.result.length);
                        const result = this.parseCSV(e.target.result);

                        if (result && result.count > 0) {
                            this.showStatus('beefPriceStatus', 'success', `✅ Éxito: ${result.totalProcessed} filas leídas. ${result.count} categorías actualizadas (Sem ${result.week}/${result.year}).`);
                            fileInput.value = '';
                        } else {
                            // Failure case
                            let sample = e.target.result.split('\n')[0].substring(0, 50) + '...';
                            this.showStatus('beefPriceStatus', 'error', `⚠ Error: 0 precios válidos encontrados. ¿Formato correcto? (Cabecera: "${sample}")`);
                            console.warn('CSV Parse Failed. Sample content:', e.target.result.substring(0, 200));
                        }
                    } catch (err) {
                        console.error('[MarketData] Parse Error:', err);
                        this.showStatus('beefPriceStatus', 'error', `⚠ Error Interno: ${err.message}`);
                    }
                };
                reader.onerror = (e) => {
                    console.error('[MarketData] Read Error:', e);
                    this.showStatus('beefPriceStatus', 'error', 'Error al leer el archivo');
                };
                reader.readAsText(file);
            });
        }

        // Feed Price Update CSV (Legacy Feature Ported)
        const updateFeedBtn = document.getElementById('updateFeedPriceBtn');
        const feedInput = document.getElementById('feedUpdateCSV');
        if (updateFeedBtn && feedInput) {
            updateFeedBtn.addEventListener('click', () => {
                const file = feedInput.files[0];
                if (!file) {
                    this.showStatus('feedUpdateStatus', 'error', 'Selecciona un archivo CSV');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const count = this.updateFeedPrices(e.target.result);
                    if (count > 0) {
                        this.showStatus('feedUpdateStatus', 'success', `Actualizados ${count} precios de alimentos.`);
                        feedInput.value = '';
                    } else {
                        this.showStatus('feedUpdateStatus', 'error', 'No se actualizaron precios (Verifica IDs o formato).');
                    }
                };
                reader.readAsText(file);
            });
        }
    },

    showStatus(elementId, type, message) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.className = `mt-2 text-xs ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
        el.textContent = message;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 5000);
    },

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('MARKET_DATA_CACHE');
            if (stored) {
                const data = JSON.parse(stored);
                this._prices = data.prices || {};
                this._metadata = data.metadata || {};
                console.log(`[MarketData] Loaded ${Object.keys(this._prices).length} prices (Week ${this._metadata.week}/${this._metadata.year})`);
            }
        } catch (e) {
            console.error('[MarketData] Error loading cache:', e);
        }
    },

    saveToStorage() {
        const payload = {
            prices: this._prices,
            metadata: this._metadata
        };
        localStorage.setItem('MARKET_DATA_CACHE', JSON.stringify(payload));
    },

    /**
     * Parse CSV from MAPA or Custom Format
     * Handles historical files by keeping the LATEST price for each category.
     */
    parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/);

        // Tracking to ensure we keep the LATEST data
        const latestEntries = {}; // { "AR3": { price: 540, year: 2024, week: 48 } }
        let totalRowsWithPrice = 0;
        let maxWeek = 0;
        let maxYear = 0;

        // Auto-Detect Column Indices
        let headers = {};
        let headerFound = false;

        // Pre-scan indices
        let idxPrice = -1;
        let idxCode = -1;
        let idxName = -1;
        let idxConf = -1;
        let idxFat = -1;
        let idxWeek = -1;
        let idxYear = -1;

        // Scan for headers
        for (let line of lines) {
            if (!line.trim()) continue;
            const cols = line.split(/,|;/).map(c => c.trim().replace(/^"|"$/g, ''));
            const lowerCols = cols.map(c => c.toLowerCase());
            if (lowerCols.some(c => c.includes('precio') || c.includes('price'))) {
                headers.price = lowerCols.findIndex(c => c.includes('precio') || c.includes('price'));
                // Fix: Prioritize 'codigo'/'cod' to avoid matching 'categoria' (which contains 'cat')
                headers.code = lowerCols.findIndex(c => c.includes('codigo') || c.includes('cod') || c.includes('clase'));
                if (headers.code === -1) headers.code = lowerCols.findIndex(c => c.includes('cat') && !c.includes('prec'));
                headers.conf = lowerCols.findIndex(c => c.includes('conf') || (c.includes('cla') && !c.includes('cod')));
                headers.fat = lowerCols.findIndex(c => c.includes('fat') || c.includes('gras') || c.includes('eng'));
                headers.name = lowerCols.findIndex(c => c === 'categoria' || c.includes('nombre') || c.includes('prod'));
                let wIdx = lowerCols.indexOf('semana');
                if (wIdx === -1) wIdx = lowerCols.findIndex(c => c.includes('sem') && !c.includes('informe'));
                if (wIdx === -1) wIdx = lowerCols.findIndex(c => c.includes('sem'));
                headers.week = wIdx;
                headers.year = lowerCols.findIndex(c => c.includes('año') || c.includes('year') || c.includes('any') || c.includes('aÃ±o'));

                if (headers.price !== -1) {
                    headerFound = true;
                    console.log('[MarketData] Header detected:', headers);
                    break;
                }
            }
        }

        // Apply defaults if header not found or missing specific cols
        idxPrice = (headerFound && headers.price !== -1) ? headers.price : 8;
        idxCode = (headerFound && headers.code !== -1) ? headers.code : 5;
        idxName = (headerFound && headers.name !== -1) ? headers.name : 4;
        idxConf = (headerFound && headers.conf !== -1) ? headers.conf : -1;
        idxFat = (headerFound && headers.fat !== -1) ? headers.fat : -1;
        idxWeek = (headerFound && headers.week !== -1) ? headers.week : 3;
        idxYear = (headerFound && headers.year !== -1) ? headers.year : 2;

        // Corrected LOOP: Use for...of instead of forEach to allow 'continue'
        for (const line of lines) {
            if (!line.trim()) continue;
            // Handle comma or semicolon
            const cols = line.split(/,|;/).map(c => c.trim().replace(/^"|"$/g, ''));

            if (cols.length < Math.max(idxPrice, idxCode)) continue;

            // Extract Data
            let priceRaw = cols[idxPrice];
            let code = cols[idxCode];
            let week = parseInt(cols[idxWeek]) || 0;
            let year = parseInt(cols[idxYear]) || 0;

            // Name Fallback for Code
            if ((!code || code.length < 2) && cols[idxName]) {
                code = cols[idxName]; // Use Product Name if code is missing
            }

            // CLEAN PARSING LOGIC (v14)
            let finalKey = null;

            if (code) {
                const cUpper = code.toUpperCase().trim();

                // 1. Direct Code Match (e.g. "AR3", "DO", "ZR")
                if (/^[A-Z][SEUROP][1-5]?$/.test(cUpper)) {
                    finalKey = cUpper;
                }
                // 2. Smart Parsing (Fallback for verbose descriptions like "Añojo R 3")
                else if (cUpper.length > 3) {
                    const desc = cUpper;
                    let letter = '';

                    if (desc.includes('AÑOJO') || (desc.includes('MACHO') && desc.includes('12-24'))) letter = 'A';
                    else if (desc.includes('VACA') || (desc.includes('HEMBRA') && desc.includes('>48'))) letter = 'D';
                    else if (desc.includes('NOVILLA') || (desc.includes('HEMBRA') && desc.includes('12-48'))) letter = 'E';
                    else if (desc.includes('TERNERO') || desc.includes('8-12')) letter = 'Z';
                    else if (desc.includes('TORO')) letter = 'B';
                    else if (desc.includes('BUEY') || desc.includes('CEBÓN') || desc.includes('CEBON')) letter = 'C';
                    else if (desc.includes('VITELA') || desc.includes('BLANCA') || desc.includes('ROSADA') || desc.includes('<8')) letter = 'V';

                    let conf = (idxConf !== -1 && cols[idxConf]) ? cols[idxConf].trim().toUpperCase() : null;
                    let fat = (idxFat !== -1 && cols[idxFat]) ? cols[idxFat].trim() : null;

                    if (letter && conf && fat) {
                        const cMatch = conf.match(/([SEUROP])/);
                        const fMatch = fat.match(/([1-5])/);
                        if (cMatch && fMatch) finalKey = `${letter}${cMatch[1]}${fMatch[1]}`;
                    }

                    if (!finalKey && letter) {
                        const confMatch = desc.match(/\b([SEUROP])(?=\s|\d|$)/);
                        const fatMatch = desc.match(/\b([1-5])(?=\s|$)/);
                        if (confMatch && fatMatch) finalKey = `${letter}${confMatch[1]}${fatMatch[1]}`;
                    }
                }
            }

            if (finalKey) code = finalKey;



            // Normalize Code (Remove spaces, Uppercase)
            if (code) {
                code = code.toString().trim().toUpperCase().replace(/\s+/g, '');
            }

            if (code && priceRaw) {
                // Normalize Price (Europe format 1.234,56 vs 1234.56)
                // Remove thousands separator (.), replace decimal (,) with (.)
                // Note: MAPA CSV usually uses ',' for decimal.
                if (priceRaw.includes('.') && priceRaw.includes(',')) {
                    priceRaw = priceRaw.replace(/\./g, '').replace(',', '.');
                } else if (priceRaw.includes(',')) {
                    priceRaw = priceRaw.replace(',', '.');
                }

                const price = parseFloat(priceRaw);

                if (!isNaN(price) && price > 0) {
                    totalRowsWithPrice++;

                    // Logic: Is this entry newer than what we have?
                    const current = latestEntries[code];
                    let isNewer = true;

                    if (current) {
                        if (year < current.year) isNewer = false;
                        else if (year === current.year && week < current.week) isNewer = false;
                    }

                    if (isNewer) {
                        latestEntries[code] = { price, year, week };
                        // Update Global Max Metadata
                        if (year > maxYear) { maxYear = year; maxWeek = week; }
                        else if (year === maxYear && week > maxWeek) { maxWeek = week; }
                    }
                }
            }
        }

        const uniqueCodes = Object.keys(latestEntries);
        if (uniqueCodes.length > 0) {
            // Apply updates
            uniqueCodes.forEach(key => {
                this._prices[key] = latestEntries[key].price;
            });

            this._metadata = { week: maxWeek, year: maxYear, updated: Date.now() };
            this.saveToStorage();

            console.log(`[MarketData] Processed ${totalRowsWithPrice} rows. Updated ${uniqueCodes.length} unique categories.`);
            return {
                count: uniqueCodes.length,
                totalProcessed: totalRowsWithPrice,
                week: maxWeek,
                year: maxYear
            };
        }
        return null;
    },

    importBeefCSV(csvText) {
        const result = this.parseCSV(csvText);
        return result ? result.count : 0;
    },

    /**
     * Determine MAPA Official Code (Strict Logic)
     */
    determineMAPACode(animalData) {
        const { ageMonths, sex, isCastrated, isParida } = animalData;
        const s = (sex || '').toLowerCase();

        // 1. V: < 8 months
        if (ageMonths < 8) return 'V';

        // 2. Z: 8 - 12 months
        if (ageMonths >= 8 && ageMonths < 12) return 'Z';

        // 3. A: Male, 12-24m, Non-castrated
        if (s === 'macho' && !isCastrated && ageMonths >= 12 && ageMonths < 24) return 'A';

        // 4. B: Male, >=24m, Non-castrated
        if (s === 'macho' && !isCastrated && ageMonths >= 24) return 'B';

        // 5. C: Male, >=12m, Castrated (Buey)
        if (s === 'macho' && isCastrated && ageMonths >= 12) return 'C';

        // 6. D: Female, Parida (Cow)
        // Assume >48m is unlikely to be heifer if status unknown
        if (s === 'hembra' && (isParida || ageMonths > 48)) return 'D';

        // 7. E: Female, Non-parida (Heifer), >=12m
        if (s === 'hembra' && !isParida && ageMonths >= 12) return 'E';

        return null;
    },

    /**
     * Get Price for a specific animal profile
     * Uses strict MAPA logic: Letter + Conformation + Fat
     */
    getBeefPrice(categoryInput, conformation, fat, animalData = {}) {
        // If animalData is provided, derive code strictly. 
        // fallback to categoryInput only if animalData is missing (legacy compat)

        let mapaLetter = '';

        if (animalData.ageMonths) {
            mapaLetter = this.determineMAPACode(animalData);
        }

        // Fallback for manual string input (legacy)
        if (!mapaLetter) {
            const cat = categoryInput.toUpperCase();
            if (cat.includes('AÑ') || cat === 'A') mapaLetter = 'A';
            else if (cat.includes('VAC') || cat === 'D') mapaLetter = 'D';
            else if (cat.includes('NOV') || cat === 'E') mapaLetter = 'E';
            else if (cat.includes('TER') || cat === 'Z') mapaLetter = 'Z';
            else if (cat.includes('TOR') || cat === 'B') mapaLetter = 'B';
        }

        const conf = (conformation || 'R').toUpperCase();
        const ft = (fat || '3').toString();

        let resultCode = '';
        let price = 0;
        let matchType = '';

        if (mapaLetter) {
            // Priority 1: Exact Match (AR3)
            const try1 = `${mapaLetter}${conf}${ft}`;

            // Priority 2: Class Match (AR) - rare but possible
            const try2 = `${mapaLetter}${conf}`;

            if (this._prices[try1]) {
                resultCode = try1;
                price = this._prices[try1];
                matchType = 'exact (strict)';
            } else if (this._prices[try2]) {
                resultCode = try2;
                price = this._prices[try2];
                matchType = 'approx (class)';
            }
        }

        // Priority 3: Fuzzy Name Search as last resort
        if (!price && categoryInput) {
            const search = categoryInput.toLowerCase();
            const match = Object.keys(this._prices).find(k => k.toLowerCase().includes(search));
            if (match) {
                resultCode = match;
                price = this._prices[match];
                matchType = 'category_name_fallback';
            }
        }

        // Priority 4: Final Fallback to Defaults (Generic Letter)
        if (!price && mapaLetter && this.defaultPrices[mapaLetter]) {
            price = this.defaultPrices[mapaLetter];
            matchType = `default_generic_${mapaLetter}`;
            resultCode = mapaLetter;
        }

        if (price > 0) {
            console.log(`[MarketData] For ${categoryInput} (Let:${mapaLetter} Conf:${conf} Fat:${ft}) -> Found: ${price}€ (Key:${resultCode}, Type:${matchType})`);
        } else {
            console.warn(`[MarketData] No price found for ${categoryInput} (Let:${mapaLetter} Conf:${conf} Fat:${ft}). Keys checked: ${mapaLetter}${conf}${ft}`);
        }

        return { price, code: resultCode, type: matchType, source: 'MAPA', letter: mapaLetter };
    },

    /**
     * Update Feed Prices from Simple CSV (Legacy Feature Ported)
     * Format: ID;Price
     */
    updateFeedPrices(csvText) {
        const lines = csvText.trim().split(/\r?\n/);
        let updated = 0;

        let currentFeeds = {};
        const cached = localStorage.getItem('FEED_DATA_CACHE');
        if (cached) currentFeeds = JSON.parse(cached);
        else return 0;

        lines.forEach(line => {
            const cols = line.split(/,|;/).map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) return;

            const idOrName = cols[0].toLowerCase();
            const newPrice = parseFloat(cols[1]);

            if (isNaN(newPrice)) return;

            let foundKey = null;
            Object.keys(currentFeeds).forEach(key => {
                const f = currentFeeds[key];
                if (key.toLowerCase() === idOrName || (f.id && f.id.toLowerCase() === idOrName)) {
                    foundKey = key;
                }
            });

            if (foundKey) {
                currentFeeds[foundKey].cost_eur_kg = newPrice;
                updated++;
            }
        });

        if (updated > 0) {
            localStorage.setItem('FEED_DATA_CACHE', JSON.stringify(currentFeeds));
            if (window.renderFeedData) window.renderFeedData();
        }
        return updated;
    }
};

if (typeof window !== 'undefined') {
    window.MarketDataManager = MarketDataManager;
    document.addEventListener('DOMContentLoaded', () => MarketDataManager.init());
}
