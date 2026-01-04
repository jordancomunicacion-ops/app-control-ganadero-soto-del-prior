'use client';

import React from 'react';
import { useStorage } from '@/context/StorageContext';
import { NutritionEngine } from '@/services/nutritionEngine';
import { BreedManager } from '@/services/breedManager';

export function ReportsManager() {
    const { read } = useStorage();

    const handleFCRReport = async () => {
        try {
            // No init required for BreedManager
            const user = read<string>('sessionUser', '');
            const animals = read<any[]>(`animals_${user}`, []);

            if (!animals || animals.length === 0) {
                alert('No hay animales registrados para generar el reporte.');
                return;
            }

            // CSV Header
            let csvContent = "ID;Raza;Sexo;Peso (kg);Edad (meses);GMD Estimada (kg/d);Ingesta Objetivo (kg MS);Eficiencia (FCR);Costo Diario Est (€)\n";

            // Process each animal
            for (const animal of animals) {
                // Determine Age
                const ageMonths = (new Date().getTime() - new Date(animal.birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

                // Determine Breed
                const breed = BreedManager.getBreedById(animal.breed) || BreedManager.getBreedByName(animal.breed) || BreedManager.getAllBreeds()[0];

                // Calculate Targets (New API)
                // Assuming 'Cebo' state for FCR report
                const dietTargets = NutritionEngine.calculateRequirements(animal.weight, 1.2, ageMonths, 'Cebo');

                // Fixed Mock Diet Stats for Estimation (similar to Calculator)
                const mockDietStats = {
                    totalEnergyMcal: dietTargets ? (dietTargets.em_mcal * 10) : 15, // Approx
                    totalProteinG: 1200,
                    dmiKg: 10 // Approx fixed DMI for report baseline
                };

                // Calculate Density for Prediction
                const dietEnergyDensity = mockDietStats.totalEnergyMcal / mockDietStats.dmiKg;

                // Calculate Performance (Predict)
                const predictedADG = NutritionEngine.predictPerformance(breed, dietEnergyDensity, mockDietStats.dmiKg, animal.weight);

                // Estimate Cost (Using mock diet average cost ~0.15 €/kg DM equivalent for calculation)
                const estimatedDailyCost = (mockDietStats.dmiKg / 0.9) * 0.15; // Rough estimate

                // Calculate FCR
                const fcr = predictedADG > 0 ? (mockDietStats.dmiKg / predictedADG).toFixed(2) : "N/A";

                // Append Row
                csvContent += `${animal.id};${animal.breed};${animal.sex};${animal.weight};${ageMonths.toFixed(1)};${predictedADG.toFixed(2)};${mockDietStats.dmiKg.toFixed(2)};${fcr};${estimatedDailyCost.toFixed(2)}\n`;
            }

            // Create Download Link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `reporte_rendimiento_fcr_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error generating report:", error);
            alert("Error al generar el reporte. Ver consola para detalles.");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>
                <p className="text-gray-600">Generación de informes y estadísticas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-green-200 transition-colors cursor-pointer group">
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">📊</span>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Informe Económico</h3>
                    <p className="text-gray-500 text-sm">Resumen de gastos, ingresos estimados y valor de inventario.</p>
                </div>

                <div
                    onClick={handleFCRReport}
                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-green-200 transition-colors cursor-pointer group"
                >
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">📈</span>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Informe de Rendimiento (FCR)</h3>
                    <p className="text-gray-500 text-sm">Descargar CSV con evolución de peso, GMD y eficiencia alimentaria.</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-green-200 transition-colors cursor-pointer group">
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">🧬</span>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Informe Reproductivo</h3>
                    <p className="text-gray-500 text-sm">Tasas de fertilidad, partos y saneamiento.</p>
                </div>
            </div>
        </div>
    );
}
