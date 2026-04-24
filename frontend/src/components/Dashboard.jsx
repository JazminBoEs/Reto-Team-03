import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useClima } from './UseClima';
import { authHeaders } from '../App';
import {
  SunIcon,
  CloudIcon,
  ArrowRightIcon,
  MapIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';

const Dashboard = ({ setVistaActual, esAdmin, areaPermitida, predioActualId }) => {
  const [cargando, setCargando] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    humedadPromedio: 0,
    ndvi: 0,
    consumoAgua: 0,
    evapotranspiracion: 0,
  });
  const [alertasActivas, setAlertasActivas] = useState([]);
  const [areaClimaRef, setAreaClimaRef] = useState(null);

  // Clima desde BD (backend sincroniza con Open-Meteo)
  const { clima, climaCargando, climaError, sincronizar } = useClima(areaClimaRef);

  useEffect(() => {
    if (!predioActualId) {
      setCargando(false);
      return;
    }

    const cargarMétricas = async () => {
      try {
        const [resMediciones, resAreas] = await Promise.all([
          fetch(`${API_BASE_URL}/mediciones-historicas?idPredio=${predioActualId}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/areas-riego?idPredio=${predioActualId}`, { headers: authHeaders() }),
        ]);
        const res = resMediciones;
        if (!res.ok) throw new Error("Error al cargar métricas");
        const mediciones = await res.json();
        if (resAreas.ok) {
          const areas = await resAreas.json();
          setAreaClimaRef(areas[0]?.ID_Area || null);
        }
        if (mediciones.length > 0) {
          const ultima = mediciones[mediciones.length - 1];
          setDashboardData({
            humedadPromedio: ultima.Humedad_suelo || 0,
            ndvi: ultima.Desarrollo_vegetativa || 0,
            consumoAgua: ultima.Consumo_Acum || 0,
            evapotranspiracion: ultima.Evapotranspiracion || 0,
          });
        }
        setCargando(false);
      } catch (error) {
        console.error("Error sincronizando el dashboard:", error);
        setCargando(false);
      }
    };
    cargarMétricas();

    // Cargar alertas no leídas para el banner
    const cargarAlertas = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/alertas?idPredio=${predioActualId}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const pendientes = data.filter(a => {
            if (esAdmin) return !a.Confirmada_Admin;
            return !a.Leida;
          });
          setAlertasActivas(pendientes);
        }
      } catch (e) { console.error('Error cargando alertas:', e); }
    };
    cargarAlertas();
  }, [esAdmin, predioActualId]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold animate-pulse">Calculando promedios globales...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-white mb-2">Monitor de Cultivo</h1>
        <div className="flex items-center gap-2">
          <span className="text-creamy-blue/80 font-medium">Panel Principal IrriGo</span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-400 text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sincronizado en tiempo real
          </span>
        </div>
      </header>

      {/* BANNER DE ALERTAS ACTIVAS */}
      {alertasActivas.length > 0 && (
        <div
          onClick={() => setVistaActual('alertas')}
          className="mb-6 cursor-pointer group"
        >
          <div className={`relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 group-hover:scale-[1.01] ${
            alertasActivas.some(a => (a.Severidad || '').toLowerCase() === 'alta' || (a.Severidad || '').toLowerCase() === 'critica')
              ? 'bg-red-950/30 border-red-500/40'
              : 'bg-orange-950/30 border-orange-500/40'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  alertasActivas.some(a => (a.Severidad || '').toLowerCase() === 'alta')
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-orange-500/20 text-orange-400'
                }`}>
                  <BellAlertIcon className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">
                    {alertasActivas.length} {alertasActivas.length === 1 ? 'alerta pendiente' : 'alertas pendientes'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {alertasActivas.filter(a => (a.Severidad || '').toLowerCase() === 'alta').length > 0 && (
                      <span className="text-red-400 font-bold mr-2">
                        ⚠ {alertasActivas.filter(a => (a.Severidad || '').toLowerCase() === 'alta').length} de severidad alta
                      </span>
                    )}
                    Haz clic para revisar
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </div>
            {/* Barra de pulso animada */}
            <div className={`absolute bottom-0 left-0 h-0.5 w-full ${
              alertasActivas.some(a => (a.Severidad || '').toLowerCase() === 'alta')
                ? 'bg-red-500/60'
                : 'bg-orange-500/60'
            } animate-pulse`} />
          </div>
        </div>
      )}

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-earth-panel p-6 rounded-3xl border border-white/5 shadow-xl">
          <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest mb-4">Humedad Promedio</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-4xl font-bold text-white">{dashboardData.humedadPromedio}</h3>
            <span className="text-lg text-creamy-blue font-serif">%</span>
          </div>
        </div>
        <div className="bg-earth-panel p-6 rounded-3xl border border-white/5 shadow-xl">
          <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest mb-4">Índice de Vegetación (NDVI)</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-4xl font-bold text-white">{dashboardData.ndvi}</h3>
          </div>
          <p className="text-[10px] text-creamy-blue mt-2 uppercase tracking-widest">Estado Óptimo</p>
        </div>
        <div className="bg-earth-panel p-6 rounded-3xl border border-white/5 shadow-xl">
          <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest mb-4">Consumo Acumulado</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-4xl font-bold text-white">{dashboardData.consumoAgua}</h3>
            <span className="text-lg text-river-blue font-serif">L</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Mes actual</p>
        </div>
        <div className="bg-earth-panel p-6 rounded-3xl border border-white/5 shadow-xl">
          <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest mb-4">Evapotranspiración</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-4xl font-bold text-white">{dashboardData.evapotranspiracion}</h3>
            <span className="text-lg text-soil-brown font-serif">mm/d</span>
          </div>
        </div>
      </div>

      {/* RESUMEN CLIMÁTICO — datos de la BD (sincronizados desde Open-Meteo) */}
      <div className="bg-earth-panel p-8 rounded-[2.5rem] border border-white/5 shadow-2xl mb-10">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-8">
          <h3 className="text-xl font-serif font-bold text-white">Resumen Climático Local</h3>
          <div className="flex items-center gap-3">
            {climaCargando && (
              <span className="text-xs text-gray-500 animate-pulse">Sincronizando clima...</span>
            )}
            {climaError && (
              <span className="text-xs text-red-400">⚠ {climaError}</span>
            )}
            {clima && !climaCargando && (
              <>
                <button
                  onClick={sincronizar}
                  className="text-xs text-creamy-blue hover:text-white bg-creamy-blue/10 hover:bg-creamy-blue/20 px-3 py-1 rounded-full border border-creamy-blue/20 transition-colors cursor-pointer"
                >
                  ↻ Actualizar
                </button>
              </>
            )}
          </div>
        </div>

        {climaCargando ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-creamy-blue border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-gray-400 text-sm">Consultando clima del predio...</span>
          </div>
        ) : climaError && !clima ? (
          <p className="text-center text-gray-500 text-sm py-6">
            No se pudo obtener el clima. Verifica la conexión del servidor.
          </p>
        ) : clima ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Temperatura */}
            <div className="flex items-center gap-4">
              <div className="p-4 bg-soil-brown/10 rounded-2xl text-soil-brown">
                <SunIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Temperatura Ambiental</p>
                <span className="text-3xl font-bold text-white">{clima.tempActual}°C</span>
                <p className="text-xs text-gray-500 mt-1">Humedad rel.: {clima.humedad}%</p>
              </div>
            </div>

            {/* Viento */}
            <div className="flex items-center gap-4 border-l border-white/5 pl-8">
              <div className="p-4 bg-creamy-blue/10 rounded-2xl text-creamy-blue">
                <CloudIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Velocidad del Viento</p>
                <span className="text-3xl font-bold text-white">
                  {clima.viento} <span className="text-lg text-creamy-blue">km/h</span>
                </span>
              </div>
            </div>

            {/* Radiación + ET₀ */}
            <div className="flex items-center gap-4 border-l border-white/5 pl-8">
              <div className="p-4 bg-yellow-500/10 rounded-2xl text-yellow-500">
                <SunIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Radiación Solar</p>
                <span className="text-3xl font-bold text-white">
                  {clima.radiacion} <span className="text-lg text-yellow-500">W/m²</span>
                </span>
                <p className="text-xs text-gray-500 mt-1">ET₀: {clima.evapotranspiracion} mm/d</p>
              </div>
            </div>

          </div>
        ) : null}
      </div>

      {/* BOTONES DE NAVEGACIÓN RÁPIDA */}
      <div className="flex gap-6">
        <button
          onClick={() => setVistaActual('areas')}
          className="flex-1 bg-creamy-blue hover:bg-white text-earth-dark font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg cursor-pointer"
        >
          <MapIcon className="w-6 h-6" />
          Ir a Áreas de Riego
          <ArrowRightIcon className="w-5 h-5 ml-2 opacity-50" />
        </button>
        <button
          onClick={() => setVistaActual('reportes')}
          className="flex-1 bg-earth-panel hover:bg-white/5 border border-white/10 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg cursor-pointer"
        >
          <ChartBarIcon className="w-6 h-6 text-creamy-blue" />
          Ver Reportes Completos
          <ArrowRightIcon className="w-5 h-5 ml-2 opacity-50 text-creamy-blue" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

