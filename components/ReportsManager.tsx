'use client';

import React from 'react';

export function ReportsManager() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>
                <p className="text-gray-600">Generación de informes y estadísticas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer group">
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">📊</span>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Informe Económico</h3>
                    <p className="text-gray-500 text-sm">Resumen de gastos, ingresos estimados y valor de inventario.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer group">
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">📈</span>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Informe de Rendimiento</h3>
                    <p className="text-gray-500 text-sm">Evolución de peso, GMD y eficiencia alimentaria.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer group">
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">🧬</span>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">Informe Reproductivo</h3>
                    <p className="text-gray-500 text-sm">Tasas de fertilidad, partos y saneamiento.</p>
                </div>
            </div>
        </div>
    );
}
