import { useState, useEffect } from 'react';
import { 
  ArrowLeftIcon, ChevronRightIcon, CloudIcon, ChartBarIcon, BeakerIcon, SunIcon, MapPinIcon 
} from '@heroicons/react/24/outline';

const AreasRiego = ({ setVistaActual }) => {
  // 1. Estados para guardar los datos de la API y controlar la pantalla de carga
  const [parcelas, setParcelas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // 2. Fetch a tu Backend de Python al cargar la página
  useEffect(() => {
    // Apuntamos al puerto 3000 de tu Flask
    fetch('https://friendly-space-memory-9g5gpg7xrvrh9xw9-3000.app.github.dev/api/v1/areas-riego')
      .then(res => {
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        return res.json();
      })
      .then(data => {
        // Transformamos los datos de SQL al formato visual de nuestras tarjetas
        const datosMapeados = data.map(area => ({
          id: area.ID_Area,
          nombre: area.Nombre,
          cultivo: 'Cultivo Registrado', // Dato genérico para el MVP
          // Si el Estado es 1 es óptimo, si es 0 es crítico
          estado: area.Estado ? 'optimo' : 'critico', 
          humedad: area.Estado ? '68%' : '28%',
          ndvi: area.Estado ? '0.82' : '0.52',
          consumo: '485 m³',
          et: '5.2 mm/d',
          lat: '28.63° N', lng: '-106.07° W'
        }));
        
        setParcelas(datosMapeados);
        setCargando(false);
      })
      .catch(error => {
        console.error("Error al conectar con la base de datos:", error);
        setCargando(false);
      });
  }, []);

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

  // 3. Pantalla de carga animada
  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <div className="w-16 h-16 border-4 border-creamy-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold animate-pulse">Conectando con la base de datos IrriGo...</p>
      </div>
    );
  }

  // 4. Renderizado principal
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
        <p className="text-gray-400">Datos obtenidos en tiempo real del backend en Python</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {parcelas.map((parcela) => {
          const styles = getStatusStyles(parcela.estado);
          
          return (
            <div 
              key={parcela.id} 
              onClick={() => setVistaActual('detalle-parcela')}
              className={`p-8 rounded-[2.5rem] border ${styles.cardBorder} ${styles.cardBg} transition-all hover:shadow-2xl group cursor-pointer`}
            >
              
              <div className="flex justify-between items-start mb-6">
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

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-2xl p-4 shadow-inner">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <CloudIcon className="w-4 h-4 text-creamy-blue/70" />
                    <span className="text-xs font-medium uppercase tracking-wider">Humedad</span>
                  </div>
                  <span className="text-2xl font-bold text-white/90">{parcela.humedad}</span>
                </div>

                <div className="bg-black/20 rounded-2xl p-4 shadow-inner">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <ChartBarIcon className="w-4 h-4 text-emerald-500/70" />
                    <span className="text-xs font-medium uppercase tracking-wider">NDVI</span>
                  </div>
                  <span className="text-2xl font-bold text-white/90">{parcela.ndvi}</span>
                </div>

                <div className="bg-black/20 rounded-2xl p-4 shadow-inner">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <BeakerIcon className="w-4 h-4 text-river-blue/70" />
                    <span className="text-xs font-medium uppercase tracking-wider">Consumo</span>
                  </div>
                  <span className="text-2xl font-bold text-white/90">{parcela.consumo}</span>
                </div>

                {/* Ubicación (Ocupa 2 columnas) */}
                <div className="col-span-2 bg-black/20 rounded-2xl p-4 shadow-inner mt-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <MapPinIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium uppercase tracking-wider">Ubicación GPS</span>
                  </div>
                  <div className="text-sm font-medium text-gray-400 leading-relaxed font-mono">
                    {parcela.lat} <span className="mx-2 text-gray-600">|</span> {parcela.lng}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default AreasRiego;