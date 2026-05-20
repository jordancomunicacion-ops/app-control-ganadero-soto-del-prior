'use client';

import { useEffect, useState, type ReactElement } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    Ban,
    MinusCircle,
    ArrowRight,
    Loader2,
} from 'lucide-react';
import type { KPI, KPIStatus } from '@/services/kpiEngine';
import { getDashboardKPIs } from '@/app/lib/kpi-actions';

interface KPIScoreboardProps {
    /** Si se aporta, restringe el cuadro a una sola finca. */
    farmId?: string;
    /** Callback opcional cuando el usuario hace drill-down en un KPI. */
    onDrilldown?: (tab: string) => void;
}

const STATUS_STYLES: Record<
    KPIStatus,
    { container: string; icon: ReactElement; text: string; label: string }
> = {
    verde: {
        container: 'bg-emerald-50 border-emerald-200',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        text: 'text-emerald-700',
        label: 'OK',
    },
    ambar: {
        container: 'bg-amber-50 border-amber-200',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        text: 'text-amber-700',
        label: 'Vigilar',
    },
    rojo: {
        container: 'bg-red-50 border-red-200',
        icon: <Ban className="w-4 h-4 text-red-600" />,
        text: 'text-red-700',
        label: 'Acción',
    },
    sin_dato: {
        container: 'bg-gray-50 border-gray-200',
        icon: <MinusCircle className="w-4 h-4 text-gray-400" />,
        text: 'text-gray-500',
        label: 'Sin datos',
    },
};

/**
 * Cuadro de KPIs ejecutivos con semáforo. Se nutre del server action
 * `getDashboardKPIs` que combina varios motores (huella IPCC, soil engine,
 * estadísticas reproductivas, alertas activas).
 *
 * Drill-down: al hacer click en una card que tiene `drilldownTab`, navega
 * a esa pestaña del dashboard mediante `onDrilldown`.
 */
export function KPIScoreboard({ farmId, onDrilldown }: KPIScoreboardProps) {
    const [kpis, setKpis] = useState<KPI[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setKpis(null);
        setError(null);
        getDashboardKPIs(farmId)
            .then((data) => {
                if (!cancelled) setKpis(data);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : 'Error cargando KPIs');
            });
        return () => {
            cancelled = true;
        };
    }, [farmId]);

    if (error) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
                No se han podido cargar los KPIs: {error}
            </div>
        );
    }

    if (!kpis) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-3 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculando KPIs del rebaño…
            </div>
        );
    }

    const criticalCount = kpis.filter((k) => k.status === 'rojo').length;
    const warningCount = kpis.filter((k) => k.status === 'ambar').length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-baseline justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">
                        Cuadro de mando
                    </h3>
                    <p className="text-sm text-gray-600">
                        Indicadores clave con semáforo. Verde = en objetivo;
                        ámbar = vigilar; rojo = requiere acción.
                    </p>
                </div>
                {(criticalCount > 0 || warningCount > 0) && (
                    <div className="text-xs font-medium space-y-0.5 text-right shrink-0">
                        {criticalCount > 0 && (
                            <p className="text-red-700">
                                {criticalCount} en rojo
                            </p>
                        )}
                        {warningCount > 0 && (
                            <p className="text-amber-700">
                                {warningCount} en ámbar
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                {kpis.map((kpi) => (
                    <KPICard key={kpi.id} kpi={kpi} onDrilldown={onDrilldown} />
                ))}
            </div>
        </div>
    );
}

function KPICard({
    kpi,
    onDrilldown,
}: {
    kpi: KPI;
    onDrilldown?: (tab: string) => void;
}) {
    const styles = STATUS_STYLES[kpi.status];
    const clickable = kpi.drilldownTab && onDrilldown;

    const Wrapper = clickable ? 'button' : 'div';
    return (
        <Wrapper
            className={`group border rounded-lg p-3 text-left transition-all ${styles.container} ${
                clickable
                    ? 'hover:shadow-md hover:border-gray-400 cursor-pointer w-full'
                    : ''
            }`}
            onClick={
                clickable
                    ? () => onDrilldown!(kpi.drilldownTab!)
                    : undefined
            }
            title={kpi.hint}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wider font-medium text-gray-500">
                    {kpi.label}
                </p>
                <span className="inline-flex items-center gap-1 shrink-0">
                    {styles.icon}
                </span>
            </div>
            <p className={`text-xl font-bold mt-1 leading-tight ${styles.text}`}>
                {kpi.valueText}
            </p>
            {kpi.hint && (
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                    {kpi.hint}
                </p>
            )}
            {clickable && (
                <p className="text-[10px] font-medium text-gray-400 mt-2 inline-flex items-center gap-1 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all">
                    Ver detalle <ArrowRight className="w-3 h-3" />
                </p>
            )}
        </Wrapper>
    );
}
