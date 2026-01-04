
export interface Animal {
    id: string;
    crotal: string;
    sex: string;
    birthDate?: string; // or birth
    birth?: string;
    [key: string]: any;
}

export type ReproductiveState = 'Vacía' | 'Cubierta' | 'Gestante' | 'Postparto' | 'Inmadura';

export interface LifecycleAlert {
    type: 'Destete' | 'Castración' | 'Secado' | 'Parto Imminente';
    date: string;
    desc: string;
    animalId: string;
    isDue: boolean; // If today >= alert date
}

export const LifecycleEngine = {
    /**
     * Helper: Calculate Age in Months from Birth Date string
     */
    getAgeInMonths(birthDateStr: string): number {
        if (!birthDateStr) return 0; // or default?
        const birth = new Date(birthDateStr);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - birth.getTime());
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
        return parseFloat(diffMonths.toFixed(1));
    },

    /**
     * Determine Reproductive Status based on Event History
     * State Machine: Inseminación -> Cubierta -> Diagnóstico(+) -> Gestante -> Parto -> Postparto -> Vacía
     */
    getReproductiveStatus(animal: Animal, events: any[]): { status: ReproductiveState, daysInState: number } {
        if (animal.sex !== 'Hembra') return { status: 'Inmadura', daysInState: 0 };

        // Sort events descending
        const sortedEvents = [...events]
            .filter(e => e.animalId === animal.id || e.animalCrotal === animal.crotal)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastParto = sortedEvents.find(e => e.type === 'Parto');
        const lastInsem = sortedEvents.find(e => e.type === 'Inseminación' || e.type === 'Monta');
        const lastDiag = sortedEvents.find(e => e.type === 'Diagnóstico' || (e.type === 'Revisión' && e.desc.includes('Diagnóstico')));

        const today = new Date();

        // 1. Check PARTIALLY (Postparto)
        if (lastParto) {
            const partoDate = new Date(lastParto.date);
            // Ignore older events pre-parto
            if (lastInsem && new Date(lastInsem.date) < partoDate) {
                // If Insem is older than Parto, it's from previous cycle. reset.
                // unless there is a NEW insem.
            }

            // Time since parto
            const daysPost = Math.floor((today.getTime() - partoDate.getTime()) / (1000 * 60 * 60 * 24));

            // If no subsequent events, she is Postparto (active nulliparous logic excluded for simplicity)
            const eventsSinceParto = sortedEvents.filter(e => new Date(e.date) > partoDate);
            const newInsem = eventsSinceParto.find(e => e.type === 'Inseminación');
            const newDiag = eventsSinceParto.find(e => e.type === 'Diagnóstico');

            if (!newInsem) {
                if (daysPost < 45) return { status: 'Postparto', daysInState: daysPost }; // Voluntary Waiting Period
                return { status: 'Vacía', daysInState: daysPost };
            }

            // If Inseminated
            if (newInsem) {
                const daysInsem = Math.floor((today.getTime() - new Date(newInsem.date).getTime()) / (1000 * 60 * 60 * 24));

                if (newDiag) {
                    const isPos = newDiag.result === 'Positivo' || newDiag.desc.includes('Gesta') || newDiag.desc.includes('Preña');
                    if (isPos) return { status: 'Gestante', daysInState: daysInsem }; // Days since Insem = Gestation Days
                    else return { status: 'Vacía', daysInState: 0 }; // Failed
                }

                return { status: 'Cubierta', daysInState: daysInsem };
            }
        }

        // Fallback for Heifers (Novillas) without Parto history
        if (lastInsem) {
            const daysInsem = Math.floor((today.getTime() - new Date(lastInsem.date).getTime()) / (1000 * 60 * 60 * 24));
            if (lastDiag) {
                const isPos = lastDiag.result === 'Positivo' || lastDiag.desc.includes('Gesta');
                if (isPos) return { status: 'Gestante', daysInState: daysInsem };
                return { status: 'Vacía', daysInState: 0 };
            }
            return { status: 'Cubierta', daysInState: daysInsem };
        }

        return { status: 'Vacía', daysInState: 0 };
    },

    /**
     * Generate Alerts based on Age and Sex (Weaning, Castration)
     */
    getLifecycleAlerts(animal: Animal): LifecycleAlert[] {
        const alerts: LifecycleAlert[] = [];
        if (!animal.birthDate) return alerts;

        const birth = new Date(animal.birthDate);
        const today = new Date();
        const ageMonths = (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        // 1. WEANING (Destete) at 7 Months
        const weaningDate = new Date(birth);
        weaningDate.setDate(weaningDate.getDate() + (7 * 30));

        // Alert window: 6.5 months to 7.5 months? Or just permanent if not weaned?
        // Let's say if age is 6.5 - 8.0 and status is not "Destetado" (we don't check status yet, just advice)
        if (ageMonths >= 6.5 && ageMonths <= 8) {
            alerts.push({
                type: 'Destete',
                date: weaningDate.toISOString().split('T')[0],
                desc: `Animal cumple 7 meses. Planificar destete.`,
                animalId: animal.id,
                isDue: today >= weaningDate
            });
        }

        // 2. CASTRATION DECISION (Males) at 6 Months
        if (animal.sex === 'Macho' && ageMonths >= 5.5 && ageMonths <= 7) {
            const castDate = new Date(birth);
            castDate.setDate(castDate.getDate() + (6 * 30));
            alerts.push({
                type: 'Castración',
                date: castDate.toISOString().split('T')[0],
                desc: `Decisión Macho (6 meses): ¿Semental o Buey?`,
                animalId: animal.id,
                isDue: today >= castDate
            });
        }

        return alerts;
    }
};
