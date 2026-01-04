'use client';

import React, { useState } from 'react';
import { PriceEngine } from '../services/priceEngine';
import { Database, Download, Upload, AlertCircle } from 'lucide-react';

export function DataManager() {
    const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleDateString());

    const handlePriceImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                try {
                    const count = PriceEngine.importPricesFromCSV(text);
                    alert(`Éxito: Se han actualizado ${count} registros de precios SEUROP.`);
                    setLastUpdate(new Date().toLocaleDateString());
                } catch (err) {
                    console.error('Error importing CSV:', err);
                    alert('Error al procesar el archivo CSV. Verifique el formato.');
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <Database className="w-8 h-8 text-green-600" />
                <h1 className="text-2xl font-bold text-gray-800">Gestión de Datos</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SEUROP Price Management */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Precios de Referencia (SEUROP)</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Actualice las tablas de precios oficiales para el cálculo de rentabilidad.
                            </p>
                        </div>
                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase">
                            Activo
                        </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Última actualización:</span>
                            <span className="font-bold text-gray-800">{lastUpdate}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all group">
                            <Upload className="w-8 h-8 text-gray-400 group-hover:text-green-600" />
                            <div className="text-center">
                                <p className="text-sm font-bold text-gray-700">Actualizar Tarifas (CSV)</p>
                                <p className="text-xs text-gray-400">Arrastre o haga clic para subir</p>
                            </div>
                            <input type="file" accept=".csv" className="hidden" onChange={handlePriceImport} />
                        </label>

                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                                <strong>Nota:</strong> El CSV debe seguir el formato estándar MAPA para categorías y clasificaciones SEUROP.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Other Data Tools (Placeholders for future) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-60">
                    <h3 className="text-lg font-bold text-gray-400 mb-2">Exportación de Datos</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        Próximamente: Exporte su inventario y registros en formato Excel o PDF.
                    </p>
                    <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed font-bold uppercase text-xs">
                        <Download className="w-4 h-4" />
                        Descargar Backup
                    </button>
                </div>
            </div>
        </div>
    );
}
