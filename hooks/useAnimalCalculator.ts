import { useState, useEffect } from 'react';
import { NutritionEngine } from '../services/nutritionEngine';
import { CarcassQualityEngine } from '../services/carcassQualityEngine';
import { breedManager, BreedData } from '../services/breedManager';

export function useAnimalCalculator() {
    const [breeds, setBreeds] = useState<Record<string, BreedData>>({});
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        breedManager.init().then(() => {
            setBreeds(breedManager.getAllBreeds());
        });
    }, []);

    const calculate = async (params: {
        animal: any;
        objective: string;
        system: string;
        feeds?: any[];
    }) => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            // Simulate async if needed, or just run sync logic
            const { animal, system, objective } = params;

            // Age in Months
            const ageMonths = (new Date().getTime() - new Date(animal.birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

            // Get Breed
            const breed = breedManager.getBreedSmart(animal.breed);

            // 1. Calculate Diet Requirements
            const dietTargets = NutritionEngine.calculateDiet(breed, animal.weight, ageMonths);

            // 2. Mock Diet Formulation (In a real app, this would optimize based on feed list)
            // For now, return a fixed logical diet based on inputs to show functionality
            const mockDiet = [
                { name: 'Pasto Natural', amount: 15, dm_percent: 25, cost: 0.05 },
                { name: 'Suplemento', amount: 2, dm_percent: 90, cost: 0.45 }
            ];

            const totalKg = mockDiet.reduce((sum, item) => sum + item.amount, 0);
            const totalCost = mockDiet.reduce((sum, item) => sum + (item.amount * item.cost), 0);


            // 3. Performance Prediction
            const totalEnergy = dietTargets ? (dietTargets.requiredEnergyDensity * dietTargets.dmiKg) : 15;

            const dietStats = {
                totalEnergyMcal: totalEnergy,
                totalProteinG: 1200, // Mock
                dmiKg: dietTargets ? dietTargets.dmiKg : 10
            };

            const performance = NutritionEngine.calculatePerformance(breed, dietStats, animal.weight);
            const predictedADG = performance.predictedADG || 1.1;

            // 4. Carcass Estimation
            const carcass = CarcassQualityEngine.estimateCarcassResult(
                { ageMonths, system },
                animal.weight + (predictedADG * 90), // Target weight after 90 days
                predictedADG,
                dietTargets ? (totalEnergy / dietTargets.dmiKg) : 2.4, // Energy Density
                72, // THI
                breed || {}
            );

            setResults({
                diet: mockDiet,
                projectedGain: predictedADG,
                dmiTarget: dietTargets.dmiKg,
                totalCost,
                totalKg,
                fcr: (totalCost / predictedADG).toFixed(2), // Cost Efficiency or Feed Efficiency
                energyTarget: totalEnergy,
                proteinPercent: 14, // Mock
                imbalances: [],
                carcass
            });

        } catch (e: any) {
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
