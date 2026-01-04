
import { DietAlert } from './nutritionEngine';

export const SystemicEngine = {
    /**
     * Regla A2: Cálculos Base (Snapshot Diario)
     * Procesa los datos del día para generar métricas consolidadas
     */
    calculateDailyMetrics(
        animal: { weight: number, currentAdg?: number },
        diet: { totalDm: number, totalMcal: number, totalProtein: number, totalFdn: number },
        farmDaily: { maxTemp: number, heatStressIndex: number }
    ) {
        // 1. Ingesta Real vs Teórica
        const dmiPercentBw = (diet.totalDm / animal.weight) * 100;

        // 2. Eficiencia Energética (Simplificada)
        // Si hay ADG observado, calculamos FCR real
        let fcrObs = 0;
        if (animal.currentAdg && animal.currentAdg > 0) {
            fcrObs = diet.totalDm / animal.currentAdg;
        }

        return {
            dmiPercentBw: parseFloat(dmiPercentBw.toFixed(2)),
            fcrObserved: parseFloat(fcrObs.toFixed(2)),
            dietEnergyMcal: parseFloat(diet.totalMcal.toFixed(2)),
            effectiveTemperature: farmDaily.heatStressIndex || farmDaily.maxTemp
        };
    },

    /**
     * Regla A6: Motor de Alertas (Desviaciones)
     */
    checkAlerts(
        metrics: { fcrObserved: number, adgObserved?: number, dietFdn: number, dietEnergy: number },
        targets: { refFcr: number, refAdg: number },
        system: string
    ): DietAlert[] {
        const alerts: DietAlert[] = [];

        // 1. Riesgo Acidosis (Sistémico)
        // Alta energía, bajo FDN
        if (metrics.dietEnergy > 2.9 && metrics.dietFdn < 18) {
            alerts.push({
                code: 'ACIDOSIS',
                level: 'critical',
                message: '🔥 Riesgo Alto Acidosis: Energía extrema sin fibra.',
                action: 'Subir FDN > 20%'
            });
        }

        // 2. Baja Ganancia
        if (metrics.adgObserved && metrics.adgObserved < (targets.refAdg * 0.75)) {
            alerts.push({
                code: 'LOW_N_EFF', // Using existing code for low efficiency
                level: 'warning',
                message: `📉 Ganancia Baja (${metrics.adgObserved} vs ${targets.refAdg}).`,
                action: 'Revisar salud o aumentar energía'
            });
        }

        // 3. Ineficiencia (FCR)
        if (metrics.fcrObserved > 0 && metrics.fcrObserved > (targets.refFcr * 1.25)) {
            alerts.push({
                code: 'LOW_N_EFF',
                level: 'warning',
                message: `💸 Ineficiencia Alimentaria (FCR ${metrics.fcrObserved}).`,
                action: 'Ajustar ración o vender animal'
            });
        }

        return alerts;
    },

    /**
     * Regla A7: Predicción de Calidad Cárnica (Modelo Híbrido)
     */
    predictMeatQuality(
        marblingPotential: number, // 1-5
        daysFinishing: number,
        avgEnergyDensity: number,
        isBellota: boolean
    ) {
        // Base Score (Genética)
        let qualityIndex = marblingPotential * 10; // 10-50

        // Diet Bonus (Energía y Tiempo)
        if (avgEnergyDensity > 2.8) qualityIndex += 10;
        if (daysFinishing > 100) qualityIndex += 15;

        // Bellota Multiplier (Sapiens Logic)
        if (isBellota) {
            qualityIndex *= 1.25; // +25% Quality for verified Bellota
        }

        // Cap at 100
        qualityIndex = Math.min(100, qualityIndex);

        return {
            qualityIndex: Math.round(qualityIndex),
            predMarbling: (qualityIndex / 100) * 12, // BMS Scale approx
            confidence: daysFinishing > 60 ? 0.8 : 0.4
        };
    }
};
