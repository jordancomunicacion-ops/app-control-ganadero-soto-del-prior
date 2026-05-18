import { useState, useEffect } from 'react';
import { NutritionEngine, heatBrahmanGuess } from '../services/nutritionEngine';
import { CarcassEngine } from '../services/carcassEngine';
import { LifecycleEngine } from '../services/lifecycleEngine';
import { BreedManager, type Breed } from '../services/breedManager';
import { PriceEngine } from '../services/priceEngine';
import { computeSalesPrice } from '@/app/lib/price-actions';
import type { AnimalLike, LivestockEvent } from '@/types/livestock';

type CalculatorDietItem = {
    name?: string;
    amount: number;
    dm_percent: number;
    energy_mcal?: number;
    protein_percent?: number;
    fiber_percent?: number;
    ndf_percent?: number;
    fdn_percent?: number;
    cost_per_kg?: number;
};

type CalculatorAnimal = AnimalLike & {
    birth_date?: string;
    genotype?: { fatherBreedId?: string; motherBreedId?: string };
    fatherBreedId?: string;
    motherBreedId?: string;
    // Optional explicit Bos indicus fraction (0–1). When absent, we infer
    // it from the breed's biological_type (Composite → 0.5, Indicus → 1).
    brahmanPercent?: number;
};

type FeedingState = 'Cebo' | 'Mantenimiento' | 'Recría' | 'Calidad';

export interface CalculatorResults {
    diet: CalculatorDietItem[];
    projectedGain: number;
    dmiTarget: number;
    dmiActual: number;
    totalCost: number;
    totalKg: number;
    historicalCosts: { events: number; feed: number; total: number };
    financials: {
        projectedSales: number;
        pricePerKg: number;
        category: string;
        priceSource: 'exact' | 'class' | 'letter' | 'fallback';
        totalCost: number;
        margin: number;
    };
    fcr: number;
    energyTarget: number;
    energyActual: number;
    proteinPercent: number;
    alerts: ReturnType<typeof NutritionEngine.validateDiet>;
    imbalances: unknown[];
    carcass: {
        conformation_est: string;
        marbling_est: number;
        fat_cover: number;
        is_premium: boolean;
        rc_percent: number;
        weight_est?: number;
        limitingFactor: string;
    };
    envImpact: ReturnType<typeof NutritionEngine.calculateNitrogenBalance>;
}

export function useAnimalCalculator() {
    const [breeds, setBreeds] = useState<Record<string, Breed>>({});
    const [results, setResults] = useState<CalculatorResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // BreedManager is synchronous now
        const breedList = BreedManager.getAllBreeds();
        const breedMap: Record<string, Breed> = {};
        breedList.forEach(b => {
            breedMap[b.id] = b;
        });
        setBreeds(breedMap);
    }, []);

    const calculate = async (params: {
        animal: CalculatorAnimal;
        objective: string;
        system: string;
        feeds?: CalculatorDietItem[];
        events?: LivestockEvent[];
        overrideBreed?: Breed;
        // Live THI from WeatherService (preferred), in NRC dairy units.
        thi?: number;
        // Soil / agronomic context. When provided, the diet skeleton uses
        // feedSelectionEngine to pick locally-adapted forages and concentrates
        // instead of hard-coded defaults.
        farmContext?: import('@/services/feedSelectionEngine').FarmAgronomicContext;
    }) => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const { animal, system } = params;

            // Age in Months (Robust Check)
            const ageMonths = LifecycleEngine.getAgeInMonths(animal.birth_date || animal.birth || (animal.birthDate as string));

            // Determine Effective Breed
            let breed: Breed | undefined = params.overrideBreed || BreedManager.getBreedById(animal.breed ?? '');

            // SPECIAL LOGIC: Automatic F1 Resolution
            // If breed is generic 'Cruzado' or missing, try to resolve via parents
            const isGeneric = !breed || animal.breed === 'Cruzado' || animal.breed === 'Mestizo';

            if (isGeneric) {
                const fatherId = animal.genotype?.fatherBreedId || animal.fatherBreedId;
                const motherId = animal.genotype?.motherBreedId || animal.motherBreedId;

                if (fatherId && motherId) {
                    const hybrid = BreedManager.calculateHybrid(fatherId, motherId);
                    if (hybrid) breed = hybrid;
                }
            }

            // Fallback & Robust Detection
            if (!breed) {
                // Try Exact Match or Robust Normalization
                const rawBreed = animal.breed || '';
                const normalizedBreed = rawBreed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                // Try to find in database first (robust search)
                const dbBreeds = BreedManager.getAllBreeds();
                breed = dbBreeds.find(b =>
                    normalizedBreed.includes(b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) ||
                    normalizedBreed.includes(b.code.toLowerCase())
                );

                // If still not found and it's a generic "Cruzado", try parents one last time
                if (!breed && (normalizedBreed.includes('cruzad') || normalizedBreed.includes('mestiz'))) {
                    const fatherId = animal.genotype?.fatherBreedId || animal.fatherBreedId;
                    const motherId = animal.genotype?.motherBreedId || animal.motherBreedId;
                    if (fatherId && motherId) {
                        const hybrid = BreedManager.calculateHybrid(fatherId, motherId);
                        if (hybrid) breed = hybrid;
                    }
                }

                if (!breed) {
                    breed = {
                        id: 'GENERIC_CROSS', code: 'CROSS', name: 'Cruzado (Genérico)',
                        subspecies: 'Cruzado', biological_type: 'Composite',
                        weight_female_adult: 600, weight_male_adult: 950,
                        adg_feedlot: 1.2, slaughter_age_months: 20,
                        conformation_potential: 4,
                        marbling_potential: 3,
                        yield_potential: 0.58,
                        heat_tolerance: 6, milk_potential: 3
                    } as Breed;
                }
            }

            // TS Safety Guarantee
            if (!breed) throw new Error("No se pudo determinar la raza del animal.");

            // Ensure weight is numeric and localized to the most accurate property
            const currentWeight = parseFloat(String(animal.currentWeight ?? animal.weight ?? 0));

            // 1. Calculate Diet Requirements (objective-aware)
            //
            // Map UI objective → physiological state. Recría = moderate
            // growth (not maintenance!). Engorde/Acabado/Calidad = finishing
            // (not the same profile as max-growth Cebo).
            const reqSex: 'Macho' | 'Hembra' | 'Castrado' =
                (animal.sex === 'Hembra' || animal.sex === 'Castrado') ? animal.sex : 'Macho';

            let state: FeedingState = 'Cebo';
            if (params.objective === 'Mantenimiento') state = 'Mantenimiento';
            else if (params.objective.includes('Recría')) state = 'Recría';
            else if (
                params.objective.includes('Acabado') ||
                params.objective.includes('Calidad') ||
                params.objective === 'Engorde'
            ) state = 'Calidad';
            else if (params.objective.includes('Cebo') || params.objective.includes('Engorde')) state = 'Cebo';

            // Use the KPI engine (objective + functional type aware) as the
            // source of truth for target ADG. Previously we hard-coded
            // breed.adg_feedlot, which over-stated requirements for
            // maintenance / efficiency objectives and produced false protein
            // and energy alerts.
            const kpiTargets = NutritionEngine.calculateKPITargets(
                {
                    breed: animal.breed ?? '',
                    sex: animal.sex ?? 'Macho',
                    weight: currentWeight,
                    ageMonths,
                    biological_type: breed.biological_type,
                },
                params.objective,
                params.system,
            );
            const adgTarget = Math.max(0, kpiTargets.adg);
            const reqs = NutritionEngine.calculateRequirements(currentWeight, adgTarget, ageMonths, state, reqSex);

            // 2. Real Diet Calculation
            let dietToAnalyze: CalculatorDietItem[] = params.feeds || [];

            // Default fallback
            if (!dietToAnalyze || dietToAnalyze.length === 0) {
                // Suggest based on reqs
                dietToAnalyze = [
                    { name: 'Ración Base (Estimada)', amount: 10, dm_percent: 40, energy_mcal: reqs.em_mcal, protein_percent: reqs.pb_percent, cost_per_kg: 0.03 }
                ];
            }

            const totalKg = dietToAnalyze.reduce((sum, item) => sum + item.amount, 0);
            const totalCost = dietToAnalyze.reduce((sum, item) => sum + (item.amount * (item.cost_per_kg || 0)), 0);

            let totalEnergyMcal = 0;
            let totalProteinG = 0;
            let totalFDN = 0;
            let totalDMI = 0;

            dietToAnalyze.forEach(item => {
                const kgMS = item.amount * (item.dm_percent / 100);
                totalDMI += kgMS;
                totalEnergyMcal += kgMS * (item.energy_mcal || 0);
                totalProteinG += kgMS * ((item.protein_percent || 0) * 10);
                totalFDN += kgMS * ((item.fiber_percent || item.ndf_percent || item.fdn_percent || 0) / 100); // Check multiple keys for FDN
            });

            // 3. Performance Prediction (objective-aware)
            // Avg Energy Density
            const dietEnergyDensity = totalDMI > 0 ? (totalEnergyMcal / totalDMI) : 0;

            // Detect oleic+protected-lecithin synergies based on Viera et al.
            // 2024 (ITACyL). The synergy contributes to carcass marbling, not
            // to ADG — the study does not measure live weight gain.
            const synergies = NutritionEngine.calculateSynergies(
                dietToAnalyze.map((d) => ({
                    feed_name: d.name || '',
                    // oleic_pct_dm is exposed for FeedItem; calculator entries
                    // may carry it forward but most legacy paths don't.
                    oleic_pct_dm: (d as { oleic_pct_dm?: number }).oleic_pct_dm,
                })),
                {
                    sex: animal.sex ?? 'Macho',
                    ageMonths,
                    biological_type: breed.biological_type,
                    breed_code: breed.code,
                },
                {
                    // Default dry-aging plan: 14 d for ternera, 60 d for buey.
                    // The user can override this when registering a slaughter
                    // event; for projections we use a conservative estimate.
                    maturationDays: animal.sex === 'Castrado' && ageMonths >= 36 ? 60 : 14,
                },
            );

            // Bos indicus fraction: explicit field on the animal wins over
            // the breed-type heuristic. Used by both NEm scaling and HLI
            // threshold lookup.
            const brahmanPercent = animal.brahmanPercent ?? heatBrahmanGuess(breed);

            const predictedADG = NutritionEngine.predictPerformance(
                breed,
                dietEnergyDensity,
                totalDMI,
                currentWeight,
                {
                    currentMonth: new Date().getMonth(),
                    brahmanPercent,
                    thi: params.thi,
                    // No synergy passed: predictPerformance no longer applies a
                    // marbling-derived ADG boost (Viera et al. 2024 doesn't
                    // measure ADG).
                },
            );

            // 4. Carcass Estimation (with oleic+lecithin synergy bonuses)
            const projectedWeight = currentWeight + (predictedADG * 30);
            type AnimalSex = 'Macho' | 'Hembra' | 'Castrado';
            const sex: AnimalSex = (animal.sex === 'Hembra' || animal.sex === 'Castrado') ? animal.sex : 'Macho';

            // Sum up active synergy contributions to feed into CarcassEngine,
            // which uses them to push marbling and (modestly) yield.
            const synergyBonuses = synergies
                .filter((s) => s.active)
                .reduce(
                    (acc, s) => ({
                        marbling: acc.marbling + (s.bonus_marbling || 0),
                        yield_percent: acc.yield_percent + (s.bonus_yield || 0),
                    }),
                    { marbling: 0, yield_percent: 0 },
                );

            const carcass = CarcassEngine.calculateCarcass(
                projectedWeight,
                ageMonths + 1,
                breed,
                dietEnergyDensity,
                predictedADG,
                {
                    isBellota: system.toLowerCase().includes('montanera') || system.toLowerCase().includes('bellota'),
                    isOx: (sex === 'Macho' || sex === 'Castrado') && ageMonths > 24,
                    sex,
                    synergyBonuses,
                    currentMonth: new Date().getMonth(),
                    thi: params.thi,
                    brahmanPercent,
                }
            );

            // 5. Environmental & Efficiency (New API)
            const dietPb = totalDMI > 0 ? (totalProteinG / 10 / totalDMI) : 0; // Back to %
            const nitrogenBalance = NutritionEngine.calculateNitrogenBalance(currentWeight, predictedADG, dietPb, totalDMI);

            // 6. Advanced Financials
            const historicalEventCosts = (params.events || []).reduce((sum, e) => sum + (parseFloat(String(e.cost ?? 0)) || 0), 0);

            type MonthlyRecordWithCost = NonNullable<AnimalLike['monthlyRecords']>[number] & { totalCost?: number; w?: number };
            const historicalFeedCosts = ((animal.monthlyRecords || []) as MonthlyRecordWithCost[]).reduce((sum, record) => {
                const recordCost = record.totalCost ?? ((record.w ?? record.weightKg ?? 0) * 0.02 * 0.25 * 30);
                return sum + recordCost;
            }, 0);

            const futureFeedCost = totalCost * 30;
            const totalAccumulatedCost = historicalEventCosts + historicalFeedCosts + futureFeedCost;

            // Use the server-side SEUROP price (DB-fresh from weekly cron
            // refresh) for projections. Falls back transparently to the
            // hardcoded table when the DB has no entry for the code.
            let salesProjection: Awaited<ReturnType<typeof computeSalesPrice>>;
            try {
                salesProjection = await computeSalesPrice({
                    ageMonths: ageMonths + 1,
                    sex: animal.sex ?? 'Macho',
                    isCastrated: animal.sex === 'Castrado',
                    isParida: animal.status === 'Parto' || animal.category === 'Nodriza',
                    carcassWeightKg: carcass.carcass_weight,
                    conformation: carcass.conformation,
                    // SEUROP grid is indexed by subcutaneous fat cover (1-5),
                    // not by intramuscular marbling. Pass the dedicated axis.
                    fat: carcass.fat_cover,
                });
            } catch {
                // If the action fails (offline, unauthorized, etc.) fall
                // back to the synchronous client-side projection so the
                // calculator still produces useful output.
                salesProjection = PriceEngine.calculateSalesPrice(
                    {
                        ageMonths: ageMonths + 1,
                        sex: animal.sex ?? 'Macho',
                        isCastrated: animal.sex === 'Castrado',
                        isParida: animal.status === 'Parto' || animal.category === 'Nodriza',
                    },
                    carcass.carcass_weight,
                    carcass.conformation,
                    carcass.fat_cover,
                );
            }

            setResults({
                diet: dietToAnalyze,
                projectedGain: predictedADG,
                dmiTarget: reqs.dmi_capacity_kg,
                dmiActual: totalDMI,
                totalCost,
                totalKg,
                historicalCosts: {
                    events: historicalEventCosts,
                    feed: historicalFeedCosts,
                    total: historicalEventCosts + historicalFeedCosts
                },
                financials: {
                    projectedSales: salesProjection.totalValue,
                    pricePerKg: salesProjection.pricePerKg,
                    category: salesProjection.categoryCode,
                    priceSource: salesProjection.priceSource,
                    totalCost: totalAccumulatedCost,
                    margin: salesProjection.totalValue - totalAccumulatedCost
                },
                fcr: predictedADG > 0 ? (totalCost / predictedADG) : 0,
                energyTarget: reqs.em_mcal * totalDMI, // Reqs logic implies density * intake
                energyActual: totalEnergyMcal,
                proteinPercent: dietPb,
                alerts: NutritionEngine.validateDiet(
                    dietToAnalyze.map(f => ({
                        item: {
                            id: f.name || 'unknown',
                            name: f.name || 'unknown',
                            category: 'Forraje',
                            dm_percent: f.dm_percent,
                            energy_mcal: f.energy_mcal ?? 0,
                            protein_percent: f.protein_percent ?? 0,
                            fiber_percent: f.fiber_percent ?? f.fdn_percent ?? f.ndf_percent ?? 0,
                            cost_per_kg: f.cost_per_kg ?? 0,
                        } satisfies import('@/services/feedDatabase').FeedItem,
                        amount: f.amount,
                    })),
                    {
                        totalDMI,
                        totalFDN,
                        totalProteinVal: totalProteinG, // grams
                        totalEnergy: totalEnergyMcal,
                        reqs
                    },
                    params.system
                ),
                imbalances: [], // Deprecated
                carcass: {
                    conformation_est: carcass.conformation,
                    marbling_est: carcass.marbling_score,
                    fat_cover: carcass.fat_cover,
                    is_premium: carcass.is_premium,
                    rc_percent: carcass.rc_percent,
                    limitingFactor: (() => {
                        // Logic to determine what's holding back growth
                        const reqEnergy = reqs.em_mcal * totalDMI; // approx needed
                        const reqProtein = (reqs.pb_percent / 100) * totalDMI * 1000; // grams needed

                        const energyRatio = reqEnergy > 0 ? totalEnergyMcal / reqEnergy : 1;
                        const proteinRatio = reqProtein > 0 ? (totalProteinG) / reqProtein : 1;

                        if (predictedADG >= (breed.adg_feedlot || 1.4)) return 'Genética (Máx)';
                        if (totalDMI >= (reqs.dmi_capacity_kg * 0.95) && energyRatio < 1 && proteinRatio < 1) return 'Ingesta (Llenado)';

                        if (energyRatio < proteinRatio) return 'Energía';
                        return 'Proteína';
                    })()
                },
                envImpact: nitrogenBalance
            });

        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Error en cálculo');
        } finally {
            setLoading(false);
        }
    };

    return {
        breeds,
        calculate,
        results,
        loading,
        error
    };
}
