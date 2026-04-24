import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

function authHeaders() {
    const token = localStorage.getItem('irrigo_token');
    return token
        ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        : { 'Content-Type': 'application/json' };
}

/**
 * Hook que obtiene datos climáticos del área desde el webservice.
 * Flujo: Frontend → POST /clima/sincronizar/:idArea (backend llama Open-Meteo y guarda en BD)
 *        Frontend → GET  /mediciones-historicas?id_Area=X (lee de BD normalmente)
 *
 * @param {number} idArea - ID del área de riego
 * @returns {{ clima, climaCargando, climaError, sincronizar }}
 */
export function useClima(idArea) {
    const [clima, setClima] = useState(null);
    const [climaCargando, setClimaCargando] = useState(true);
    const [climaError, setClimaError] = useState(null);

    const sincronizarYCargar = useCallback(async () => {
        if (!idArea) {
            setClima(null);
            setClimaError(null);
            setClimaCargando(false);
            return;
        }
        setClimaCargando(true);
        setClimaError(null);

        try {
            // PASO 1: Le pedimos al backend que consulte Open-Meteo y guarde en BD
            const resSync = await fetch(
                `${API_BASE_URL}/clima/sincronizar/${idArea}`,
                { method: 'POST', headers: authHeaders() }
            );

            if (!resSync.ok) {
                const err = await resSync.json();
                throw new Error(err.message || `Error ${resSync.status}`);
            }

            // PASO 2: Leemos el registro recién guardado (viene en la respuesta del POST)
            const medicion = await resSync.json();
            setClima(adaptarMedicion(medicion));

        } catch (err) {
            // Si falla la sincronización (ej. sin internet), intentamos leer el último
            // dato climático guardado en BD como fallback
            try {
                const resFallback = await fetch(
                    `${API_BASE_URL}/clima/ultimo/${idArea}`,
                    { headers: authHeaders() }
                );
                if (resFallback.ok) {
                    const medicion = await resFallback.json();
                    setClima({ ...adaptarMedicion(medicion), esFallback: true });
                } else {
                    setClimaError(err.message);
                }
            } catch {
                setClimaError(err.message);
            }
        } finally {
            setClimaCargando(false);
        }
    }, [idArea]);

    useEffect(() => {
        sincronizarYCargar();
        // Refresca cada 10 minutos
        const intervalo = setInterval(sincronizarYCargar, 10 * 60 * 1000);
        return () => clearInterval(intervalo);
    }, [sincronizarYCargar]);

    return { clima, climaCargando, climaError, sincronizar: sincronizarYCargar };
}

/** Transforma una fila de MedicionHistorica a los campos que usa la UI */
function adaptarMedicion(m) {
    return {
        tempActual: m.Temp_Ambiental ?? '--',
        humedad: m.Humedad_Relativa ?? '--',
        viento: m.Velocidad_Viento ?? '--',
        radiacion: m.Radiacion_Sol != null ? Math.round(m.Radiacion_Sol) : '--',
        evapotranspiracion: m.Evapotranspiracion ?? '--',
        fecha: m.Fecha
            ? new Date(m.Fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            : '--',
    };
}