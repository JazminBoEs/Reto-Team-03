import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { authHeaders } from '../App';
import { 
  ArrowLeftIcon, ChevronRightIcon, CloudIcon, ChartBarIcon, BeakerIcon, MapPinIcon 
} from '@heroicons/react/24/outline';

// 🌟 Recibimos setParcelaActiva desde App.jsx
const AreasRiego = ({ setVistaActual, setParcelaActiva, predioActualId }) => {
  const [parcelas, setParcelas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!predioActualId) {
      setParcelas([]);
      setCargando(false);
      return;
    }

    const cargarDatosDinamicos = async () => {
      try {
        
        const [resAreas, resConfig, resMediciones] = await Promise.all([
          fetch(`${API_BASE_URL}/areas-riego?idPredio=${predioActualId}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/configuraciones-cultivo?idPredio=${predioActualId}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/mediciones-historicas?idPredio=${predioActualId}`, { headers: authHeaders() })
        ]);

        if (!resAreas.ok) throw new Error("Error al obtener datos");

        const areas = await resAreas.json();
        const configuraciones = await resConfig.json();
        const mediciones = await resMediciones.json();

        const datosMapeados = areas.map(area => {
          const configArea = configuraciones.find(c => c.ID_Area === area.ID_Area);
          const medicionesArea = mediciones.filter(m => m.ID_Area === area.ID_Area);
          const ultimaMedicion = medicionesArea.length > 0 ? medicionesArea[medicionesArea.length - 1] : null;

          let estadoReal = 'advertencia';
          if (ultimaMedicion) {
            if (ultimaMedicion.Humedad_suelo >= 18) estadoReal = 'optimo';
            else if (ultimaMedicion.Humedad_suelo < 12) estadoReal = 'critico';
          } else if (!area.Estado) {
            estadoReal = 'critico';
          }

          return {
            id: area.ID_Area,
            nombre: area.Nombre || `Parcela ${area.ID_Area}`,
            cultivo: configArea ? configArea.TipoCultivo : 'Sin configurar',
            estado: estadoReal,
            humedad: ultimaMedicion && ultimaMedicion.Humedad_suelo ? `${ultimaMedicion.Humedad_suelo}%` : 'N/D',
            ndvi: ultimaMedicion && ultimaMedicion.Desarrollo_vegetativa ? ultimaMedicion.Desarrollo_vegetativa.toFixed(2) : 'N/D',
            consumo: ultimaMedicion && ultimaMedicion.consumo_agua ? `${ultimaMedicion.consumo_agua} L` : 'N/D',
            et: ultimaMedicion && ultimaMedicion.Evapotranspiracion ? `${ultimaMedicion.Evapotranspiracion} mm/d` : 'N/D',
            lat: '28.63° N', 
            lng: '-106.07° W'
          };
        });
        
        setParcelas(datosMapeados);
        setCargando(false);
      } catch (error) {
        console.error("Error conectando al backend:", error);
        setCargando(false);
      }
    };

    cargarDatosDinamicos();
  }, [predioActualId]);

  const getStatusStyles = (estado) => {
    switch (estado) {
      case 'optimo':
        return { 
          cardBorder: 'border-emerald-800/40', cardBg: 'bg-emerald-950/30',
          badgeBg: 'bg-emerald-800/60 border border-emerald-700/50', badgeText: 'text-emerald-300'
        };
      case 'advertencia':
        return { 
          cardBorder: 'border-amber-700/40', cardBg: 'bg-amber-950/30',
          badgeBg: 'bg-amber-800/60 border border-amber-700/50', badgeText: 'text-amber-300'
        };
      case 'critico':
        return { 
          cardBorder: 'border-orange-800/40', cardBg: 'bg-orange-950/30',
          badgeBg: 'bg-orange-800/60 border border-orange-700/50', badgeText: 'text-orange-300'
        };
      default:
        return { 
          cardBorder: 'border-white/5', cardBg: 'bg-earth-panel', 
          badgeBg: 'bg-gray-800 border border-gray-600', badgeText: 'text-gray-300'
        };
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold animate-pulse">Sincronizando con módulos IrriGo...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10">
      
      <header className="mb-10">
        <div 
          onClick={() => setVistaActual('dashboard')}
          className="flex items-center gap-2 text-creamy-blue hover:text-white cursor-pointer transition-colors w-fit mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-bold">Volver al Dashboard</span>
        </div>
        <h2 className="text-4xl font-serif font-bold text-white mb-2">Áreas de Riego</h2>
        <p className="text-gray-400">Estado en tiempo real de las parcelas conectadas</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {parcelas.map((parcela) => {
          const styles = getStatusStyles(parcela.estado);
          
          return (
            <div 
              key={parcela.id} 
              // 🌟 AQUÍ OCURRE LA CONEXIÓN: Guardamos el ID en App.jsx y cambiamos de vista
              onClick={() => {
                setParcelaActiva(parcela.id);
                setVistaActual('detalle-parcela');
              }}
              className={`p-8 rounded-[2.5rem] border ${styles.cardBorder} ${styles.cardBg} transition-all hover:shadow-2xl group cursor-pointer relative overflow-hidden`}
            >
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-white mb-2 group-hover:text-creamy-blue transition-colors">
                    {parcela.nombre} 
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">{parcela.cultivo}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${styles.badgeBg} ${styles.badgeText}`}>
                      {parcela.estado}
                    </span>
                  </div>
                </div>
                <ChevronRightIcon className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
              </div>

              <div className="grid grid-cols-3 gap-4 relative z-10">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <CloudIcon className="w-4 h-4 text-creamy-blue/70" />
                    <span className="text-xs font-medium uppercase tracking-wider">Humedad</span>
                  </div>
                  <span className="text-2xl font-bold text-white/90">{parcela.humedad}</span>
                </div>

                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <ChartBarIcon className="w-4 h-4 text-emerald-500/70" />
                    <span className="text-xs font-medium uppercase tracking-wider">NDVI</span>
                  </div>
                  <span className="text-2xl font-bold text-white/90">{parcela.ndvi}</span>
                </div>

                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <BeakerIcon className="w-4 h-4 text-river-blue/70" />
                    <span className="text-xs font-medium uppercase tracking-wider">Consumo</span>
                  </div>
                  <span className="text-2xl font-bold text-white/90">{parcela.consumo}</span>
                </div>

                {/* Ubicación */}
                <div className="col-span-3 bg-black/20 rounded-2xl p-4 mt-2 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPinIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-medium uppercase tracking-wider">Coordenadas</span>
                    </div>
                    <div className="text-sm font-medium text-gray-500 font-mono">
                      {parcela.lat} <span className="mx-2">|</span> {parcela.lng}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {parcelas.length === 0 && !cargando && (
          <div className="col-span-full p-10 border border-white/10 rounded-4xl text-center text-gray-500">
            No se encontraron áreas de riego en la base de datos.
          </div>
        )}
      </div>

    </div>
  );
};

export default AreasRiego;
