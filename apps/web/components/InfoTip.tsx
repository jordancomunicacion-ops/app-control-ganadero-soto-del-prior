'use client';

import React from 'react';
import { glossary } from '@/lib/glossary';

/**
 * Pequeño icono de información reutilizable. Se hidrata desde el glosario
 * (`lib/glossary.ts`) por clave, o acepta un `text` libre.
 *
 * Patrón doble:
 *   - Por defecto muestra solo el icono "?" con tooltip nativo (hover).
 *   - Si se le pasa `inline`, renderiza el texto debajo del label en
 *     pequeño y cursiva — útil cuando el espacio es generoso y queremos
 *     que la explicación esté siempre visible.
 */
export function InfoTip({
    termKey,
    text,
    inline,
    className,
}: {
    termKey?: string;
    text?: string;
    inline?: boolean;
    className?: string;
}) {
    const entry = termKey ? glossary(termKey) : undefined;
    const explanation = text ?? entry?.plain;
    if (!explanation) return null;

    if (inline) {
        return (
            <p className={`text-xs italic text-gray-500 leading-snug ${className ?? ''}`}>
                {explanation}
            </p>
        );
    }

    // Tooltip discreto: el icono se ve, el texto aparece al pasar el cursor.
    return (
        <span
            title={explanation}
            aria-label={explanation}
            role="img"
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold cursor-help align-middle ${className ?? ''}`}
        >
            ?
        </span>
    );
}

/**
 * Bloque "valor técnico + explicación en román paladino".
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ Etiqueta técnica            VALOR · UNIDAD  │
 *   │ pequeña explicación clara (cursiva, gris)   │
 *   └─────────────────────────────────────────────┘
 *
 * Usado en las fichas (FarmsManager soil card, Dashboard, Calculator).
 */
export function TechValue({
    label,
    value,
    termKey,
    explain,
    highlight = false,
    className,
}: {
    label: string;
    value: React.ReactNode;
    termKey?: string;
    explain?: string;
    highlight?: boolean;
    className?: string;
}) {
    const entry = termKey ? glossary(termKey) : undefined;
    const explanation = explain ?? entry?.plain;

    return (
        <div className={className}>
            <div className={`flex justify-between items-baseline gap-2 ${highlight ? 'border-t border-green-200 pt-1 mt-1' : ''}`}>
                <span className={`${highlight ? 'text-gray-700 font-bold uppercase tracking-wide text-xs' : 'text-gray-500 font-medium text-xs'}`}>
                    {label}
                </span>
                <span className={`${highlight ? 'font-black text-green-700' : 'font-bold text-gray-800 text-xs'} text-right`}>
                    {value}
                </span>
            </div>
            {explanation && (
                <p className="text-[11px] italic text-gray-400 leading-snug mt-0.5">
                    {explanation}
                </p>
            )}
        </div>
    );
}
