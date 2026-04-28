import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useClima } from './UseClima';
import { authHeaders } from '../utils/authHeaders';
import {
  ArrowLeftIcon,
  HomeIcon,
  CloudIcon,
  BeakerIcon,
  SunIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const DetalleParcela = ({ setVistaActual, parcelaId, predioActualId }) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [historialHumedad, setHistorialHumedad] = useState([]);
  const [historialNdvi, setHistorialNdvi] = useState([]);

  //Clima desde BD usando el ID de la parcela actual
  const { clima, climaCargando, climaError, sincronizar } = useClima(parcelaId);

  useEffect(() => {
    if (!parcelaId) {
      setVistaActual('areas');
      return;
    }
    if (!predioActualId) return;
    const cargarDetalles = async () => {
      try {
        const [resArea, resConfig, resMediciones, resHumedad, resNdvi] = await Promise.all([
          fetch(`${API_BASE_URL}/areas-riego?idPredio=${predioActualId}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/configuraciones-cultivo?idPredio=${predioActualId}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/mediciones-historicas?idPredio=${predioActualId}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/mediciones-historicas/historial/${parcelaId}?limite=8`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/mediciones-historicas/ndvi/${parcelaId}?dias=7`, { headers: authHeaders() }),
        ]);
        if (!resArea.ok) throw new Error("Error obteniendo datos del área");
        const areasData = await resArea.json();
        const area = areasData.find(a => a.ID_Area === parcelaId);
        if (!area) throw new Error("Área fuera del predio activo");
        const configuraciones = await resConfig.json();
        const mediciones = await resMediciones.json();
        const configArea = configuraciones.find(c => c.ID_Area === parcelaId) || {};
        const medicionesArea = mediciones.filter(m => m.ID_Area === parcelaId);
        const ultimaMedicion = medicionesArea.length > 0 ? medicionesArea[medicionesArea.length - 1] : {};
        setDatos({ area, config: configArea, medicion: ultimaMedicion });

        // Datos dinámicos para gráficas
        if (resHumedad.ok) {
          const hData = await resHumedad.json();
          setHistorialHumedad(hData.map(h => h.Humedad_suelo || 0));
        }
        if (resNdvi.ok) {
          const nData = await resNdvi.json();
          setHistorialNdvi(nData.map(n => Math.round((n.Desarrollo_vegetativa || 0) * 100)));
        }

        // Verificar alertas automáticas (compara medición actual vs config)
        try {
          await fetch(`${API_BASE_URL}/alertas/verificar/${parcelaId}`, { headers: authHeaders() });
        } catch (error) {
          console.error("Error al verificar alertas automaticas:", error);
        }

        setCargando(false);
      } catch (error) {
        console.error("Error al cargar detalles de la parcela:", error);
        setCargando(false);
      }
    };
    cargarDetalles();
  }, [parcelaId, predioActualId, setVistaActual]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold animate-pulse">Cargando telemetría de la parcela...</p>
      </div>
    );
  }

  if (!datos || !datos.area) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h3 className="text-2xl text-white font-bold mb-4">Parcela no encontrada</h3>
        <button onClick={() => setVistaActual('areas')} className="text-creamy-blue underline hover:text-white">Volver a Áreas</button>
      </div>
    );
  }

  // Datos de gráficas: usar datos reales o fallback a la última medición
  const humedadData = historialHumedad.length > 0
    ? historialHumedad
    : [datos.medicion.Humedad_suelo || 0];
  const ndviData = historialNdvi.length > 0
    ? historialNdvi
    : [(datos.medicion.Desarrollo_vegetativa * 100) || 0];

  return (
    <div className="animate-fade-in pb-10">

      {/* NAVEGACIÓN SUPERIOR */}
      <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6 border-b border-white/5 pb-4">
        <button onClick={() => setVistaActual('areas')} className="flex items-center gap-2 text-creamy-blue hover:text-white transition-colors text-sm font-bold cursor-pointer">
          <ArrowLeftIcon className="w-4 h-4" /> Volver a Áreas
        </button>
        <button onClick={() => setVistaActual('dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold cursor-pointer">
          <HomeIcon className="w-4 h-4" /> Volver al Dashboard
        </button>
      </div>

      {/* ENCABEZADO */}
      <header className="mb-8">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">
          {datos.area.Nombre} - {datos.config.TipoCultivo || 'Sin Configurar'}
        </h2>
        <p className="text-gray-400">Estado: {datos.area.Estado ? 'Activo' : 'Inactivo'} • Datos en vivo</p>
      </header>

      {/* INFORMACIÓN GENERAL */}
      <div className="bg-earth-panel p-4 md:p-6 rounded-3xl md:rounded-4xl border border-white/5 shadow-xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Información General</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Tamaño del Área</p>
            <p className="text-lg md:text-xl font-bold text-white">{datos.area.Num_Hectareas} ha</p>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Tipo de Cultivo</p>
            <p className="text-lg md:text-xl font-bold text-white">{datos.config.TipoCultivo || 'Sin Configurar'}</p>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Tipo de Tierra</p>
            <p className="text-lg md:text-xl font-bold text-white">{datos.config.TipoTierra || 'N/D'}</p>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" /> Límite de Riego (Lámina)
            </p>
            <p className="text-sm font-mono font-bold text-gray-300">{datos.config.LaminaRiego || '0'} cm</p>
          </div>
        </div>
      </div>

      {/* TRES COLUMNAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8">

        {/* SUELO */}
        <div className="bg-emerald-950/20 border border-emerald-800/30 p-6 rounded-4xl shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-900/50 rounded-lg text-emerald-400"><CloudIcon className="w-6 h-6" /></div>
            <h3 className="text-xl font-bold text-white">Suelo</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Humedad del Suelo</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-400">{datos.medicion.Humedad_suelo || 0}%</p>
              <p className="text-[10px] text-emerald-500/70 mt-1">Rango ideal: {datos.config.RangoHumedadMIN || 0}% - {datos.config.RangoHumedadMAX || 0}%</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Potencial Hídrico</p>
              <p className="text-xl md:text-2xl font-bold text-white">{datos.medicion.Potencial_Hidrico || 0} MPa</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Electroconductividad</p>
              <p className="text-xl md:text-2xl font-bold text-white">{datos.medicion.Conductividad_suelo || 0} dS/m</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Índice de Vegetación (NDVI)</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-400">{datos.medicion.Desarrollo_vegetativa || 0}</p>
            </div>
          </div>
        </div>

        {/* RIEGO */}
        <div className="bg-blue-950/20 border border-blue-800/30 p-6 rounded-4xl shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-900/50 rounded-lg text-river-blue"><BeakerIcon className="w-6 h-6" /></div>
            <h3 className="text-xl font-bold text-white">Riego</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-river-blue/10 border border-river-blue/30 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs text-river-blue mb-1">Estatus del Módulo</p>
                <p className="text-xl md:text-2xl font-black text-river-blue tracking-widest">{datos.area.ID_Modulo ? 'CONECTADO' : 'OFFLINE'}</p>
                <p className="text-[10px] text-river-blue/70 mt-1">Monitoreo activo</p>
              </div>
              <div className={`w-8 h-8 rounded-full border-4 ${datos.area.ID_Modulo ? 'border-river-blue animate-pulse' : 'border-gray-600'}`}></div>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Consumo de Agua (Lectura actual)</p>
              <p className="text-xl md:text-2xl font-bold text-white">{datos.medicion.consumo_agua || 0} L</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Consumo Acumulado</p>
              <p className="text-xl md:text-2xl font-bold text-white">{datos.medicion.Consumo_Acum || 0} L</p>
            </div>
            <div className="bg-creamy-blue/10 border border-creamy-blue/30 p-4 rounded-2xl mt-4">
              <p className="text-xs text-creamy-blue mb-1">Capacidad de Campo</p>
              <p className="text-lg font-bold text-creamy-blue">{datos.config.CapacidadCampo || 0}%</p>
            </div>
          </div>
        </div>

        {/* AMBIENTE — datos de Open-Meteo guardados en BD */}
        <div className="bg-amber-950/20 border border-amber-800/30 p-6 rounded-4xl shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-900/50 rounded-lg text-amber-500"><SunIcon className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-white">Ambiente</h3>
            </div>
            <div className="flex items-center gap-2">
              {clima && !climaCargando && (
                <>
                  {clima.esFallback && (
                    <span className="text-[10px] text-amber-400/60 bg-amber-900/20 border border-amber-800/20 px-2 py-1 rounded-full">
                     cache
                    </span>
                  )}
                  <button
                    onClick={sincronizar}
                    title="Actualizar clima"
                    className="text-[10px] text-amber-500/60 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    ↻
                  </button>
                </>
              )}
            </div>
          </div>

          {climaCargando ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-gray-400 text-xs">Consultando clima del area...</span>
            </div>
          ) : climaError && !clima ? (
            /* Fallback total: datos del sensor local */
            <div className="space-y-4">
              <p className="text-xs text-red-400/70 bg-red-900/10 border border-red-800/20 p-2 rounded-xl text-center">
                ⚠ Sin conexión — mostrando sensor local
              </p>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Temperatura Ambiental</p>
                <p className="text-2xl font-bold text-amber-500">{datos.medicion.Temp_Ambiental || 0}°C</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Humedad Relativa</p>
                <p className="text-2xl font-bold text-white">{datos.medicion.Humedad_Relativa || 0}%</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Velocidad del Viento</p>
                <p className="text-2xl font-bold text-white">{datos.medicion.Velocidad_Viento || 0} km/h</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Radiación Solar</p>
                <p className="text-2xl font-bold text-amber-500">{datos.medicion.Radiacion_Sol || 0} W/m²</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Evapotranspiración (ET₀)</p>
                <p className="text-2xl font-bold text-orange-400">{datos.medicion.Evapotranspiracion || 0} mm/d</p>
              </div>
            </div>
          ) : clima ? (
            /* Datos reales de Open-Meteo (vía BD) */
            <div className="space-y-4">
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Temperatura Ambiental</p>
                <p className="text-2xl font-bold text-amber-500">{clima.tempActual}°C</p>
                <p className="text-[10px] text-gray-500 mt-1">Guardado: {clima.fecha}</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Humedad Relativa</p>
                <p className="text-2xl font-bold text-white">{clima.humedad}%</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Velocidad del Viento</p>
                <p className="text-2xl font-bold text-white">{clima.viento} km/h</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Radiación Solar</p>
                <p className="text-2xl font-bold text-amber-500">{clima.radiacion} W/m²</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-xs text-gray-400 mb-1">Evapotranspiración ET₀</p>
                <p className="text-2xl font-bold text-orange-400">{clima.evapotranspiracion} mm/d</p>
              </div>
            </div>
          ) : null}
        </div>

      </div>

      {/* GRÁFICAS — DATOS DINÁMICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-earth-panel border border-white/5 p-4 md:p-6 rounded-3xl md:rounded-4xl">
          <h4 className="text-sm font-bold text-gray-300 mb-4">Historial de Humedad (últimas {humedadData.length} lecturas)</h4>
          <div className="overflow-x-auto">
            <div className="h-36 md:h-40 min-w-[280px] w-full flex items-end gap-2">
            {humedadData.map((h, i) => (
              <div key={i} className="flex-1 min-w-6 bg-emerald-500/20 rounded-t-sm relative hover:bg-emerald-500/40 transition-colors" style={{ height: `${Math.min(h, 100)}%` }}>
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white">{Math.round(h)}%</div>
              </div>
            ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-2">
            <span>Más antiguo</span><span>→</span><span>Más reciente</span>
          </div>
        </div>
        <div className="bg-earth-panel border border-white/5 p-4 md:p-6 rounded-3xl md:rounded-4xl">
          <h4 className="text-sm font-bold text-gray-300 mb-4">Evolución del NDVI (últimos {ndviData.length} registros)</h4>
          <div className="overflow-x-auto">
            <div className="h-36 md:h-40 min-w-[280px] w-full flex items-end gap-2 border-b border-white/10">
            {ndviData.map((n, i) => (
              <div key={i} className="flex-1 min-w-6 flex flex-col justify-end items-center">
                <span className="text-[10px] text-emerald-300 mb-1">{Math.round(n)}%</span>
                <div className="w-2 h-2 rounded-full bg-emerald-400 mb-1" style={{ marginBottom: `${Math.max((n - 50), 0) * 2}px` }}></div>
                <div className="w-px h-full bg-white/5"></div>
              </div>
            ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-2">
            <span>Más antiguo</span><span>→</span><span>Más reciente</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DetalleParcela;

