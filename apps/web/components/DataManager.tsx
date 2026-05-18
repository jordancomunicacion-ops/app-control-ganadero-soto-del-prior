'use client';

import React from 'react';
import { Database, Download, Upload, AlertCircle } from 'lucide-react';

export function DataManager() {
    // Persistencia de precios SEUROP pendiente: actualmente no hay tabla en BD
    // ni acción de servidor, así que importar un CSV no tendría efecto. Hasta
    // que se implemente, dejamos la UI marcada como "Próximamente".
    const lastUpdate = new Date().toLocaleDateString();

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
                        <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase">
                            Próximamente
                        </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Última actualización:</span>
                            <span className="font-bold text-gray-800">{lastUpdate}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 opacity-60 cursor-not-allowed">
                            <Upload className="w-8 h-8 text-gray-300" />
                            <div className="text-center">
                                <p className="text-sm font-bold text-gray-500">Actualizar Tarifas (CSV)</p>
                                <p className="text-xs text-gray-400">Disponible próximamente</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                                <strong>Nota:</strong> La importación SEUROP estará disponible cuando la tabla de precios se persista en base de datos.
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
