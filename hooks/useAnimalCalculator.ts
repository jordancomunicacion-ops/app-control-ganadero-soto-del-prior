import { useState, useEffect } from 'react';
import { NutritionEngine } from '../services/nutritionEngine';
import { CarcassEngine } from '../services/carcassEngine';
import { BreedManager, Breed } from '../services/breedManager';

export function useAnimalCalculator() {
    const [breeds, setBreeds] = useState<Record<string, Breed>>({});
    const [results, setResults] = useState<any>(null);
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
        animal: any;
        objective: string;
        system: string;
        feeds?: any[];
        overrideBreed?: Breed; // Support for simulating different breeds/crosses
    }) => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const { animal, system } = params;

            // Age in Months
            const ageMonths = (new Date().getTime() - new Date(animal.birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

            // Determine Effective Breed
            let breed = params.overrideBreed || BreedManager.getBreedById(animal.breed);

            // SPECIAL LOGIC: Automatic F1 Resolution
            // If breed is generic 'Cruzado' or missing, try to resolve via parents
            const isGeneric = !breed || animal.breed === 'Cruzado' || animal.breed === 'Mestizo';

            if (isGeneric) {
                // Try to find parent genetics in the animal object
                // Adapting to Schema: animal.genotype?.fatherBreedId OR animal.fatherBreedId shortcut
                const fatherId = animal.genotype?.fatherBreedId || (animal as any).fatherBreedId;
                const motherId = animal.genotype?.motherBreedId || (animal as any).motherBreedId;

                if (fatherId && motherId) {
                    const hybrid = BreedManager.calculateHybrid(fatherId, motherId);
                    if (hybrid) breed = hybrid;
                }
            }

            // Fallback
            if (!breed) {
                breed = BreedManager.getBreedByName(animal.breed) || BreedManager.getAllBreeds()[0];
            }

            // 1. Calculate Diet Requirements (New API)
            // Map objective to internal state labels if needed
            let state: any = 'Cebo';
            if (params.objective === 'Mantenimiento') state = 'Mantenimiento';

            // Assume weight is current weight
            const adgTarget = breed.adg_feedlot || 1.2; // Use breed potential as target baseline
            const reqs = NutritionEngine.calculateRequirements(animal.weight, adgTarget, ageMonths, state, animal.sex || 'Macho');

            // 2. Real Diet Calculation
            let dietToAnalyze = params.feeds || [];

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
            let totalDMI = 0;

            dietToAnalyze.forEach(item => {
                const kgMS = item.amount * (item.dm_percent / 100);
                totalDMI += kgMS;
                totalEnergyMcal += kgMS * (item.energy_mcal || 0);
                totalProteinG += kgMS * ((item.protein_percent || 0) * 10);
            });

            // 3. Performance Prediction (New API)
            // Avg Energy Density
            const dietEnergyDensity = totalDMI > 0 ? (totalEnergyMcal / totalDMI) : 0;

            const predictedADG = NutritionEngine.predictPerformance(breed, dietEnergyDensity, totalDMI, animal.weight);

            // 4. Carcass Estimation (New API)
            const carcass = CarcassEngine.calculateCarcass(
                animal.weight + (predictedADG * 90), // Projected weight
                ageMonths + 3,
                breed,
                dietEnergyDensity,
                predictedADG,
                {
                    isBellota: NutritionEngine.checkBellotaCompliance({ ageMonths }, new Date().getMonth()).compliant,
                    isOx: animal.sex === 'Macho' && ageMonths > 24
                }
            );

            // 5. Environmental & Efficiency (New API)
            const dietPb = totalDMI > 0 ? (totalProteinG / 10 / totalDMI) : 0; // Back to %
            const nitrogenBalance = NutritionEngine.calculateNitrogenBalance(animal.weight, predictedADG, dietPb, totalDMI);

            setResults({
                diet: dietToAnalyze,
                projectedGain: predictedADG,
                dmiTarget: 10, // Approx
                dmiActual: totalDMI,
                totalCost,
                totalKg,
                fcr: predictedADG > 0 ? (totalCost / predictedADG) : 0,
                energyTarget: reqs.em_mcal * totalDMI, // Reqs logic implies density * intake
                energyActual: totalEnergyMcal,
                proteinPercent: dietPb,
                imbalances: [
                    totalEnergyMcal < (reqs.em_mcal * totalDMI * 0.9) ? '⚠️ Energía insuficiente' : '',
                    dietPb < reqs.pb_percent ? `⚠️ Proteína baja (Req: ${reqs.pb_percent}%)` : ''
                ].filter(Boolean),
                carcass: {
                    conformation_est: carcass.conformation,
                    marbling_est: carcass.marbling_score,
                    is_premium: carcass.is_premium,
                    rc_percent: carcass.rc_percent
                },
                envImpact: nitrogenBalance
            });

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Error en cálculo');
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
