import { 
  ArrowLeftIcon,
  ChevronRightIcon,
  CloudIcon,      
  ChartBarIcon,   
  BeakerIcon,     
  SunIcon,        
  MapPinIcon      
} from '@heroicons/react/24/outline';

const AreasRiego = ({ setVistaActual }) => {
  const parcelas = [
    { 
      id: 1, nombre: 'Parcela Norte', cultivo: 'Nogal', estado: 'optimo', 
      humedad: '68%', ndvi: '0.82', consumo: '485 m³', et: '5.2 mm/d', 
      lat: '19.4326°N', lng: '99.1332°W' 
    },
    { 
      id: 2, nombre: 'Parcela Sur', cultivo: 'Manzana', estado: 'advertencia', 
      humedad: '45%', ndvi: '0.65', consumo: '523 m³', et: '4.8 mm/d', 
      lat: '19.4298°N', lng: '99.1355°W' 
    },
    { 
      id: 3, nombre: 'Parcela Este', cultivo: 'Chile Jalapeño', estado: 'optimo', 
      humedad: '72%', ndvi: '0.78', consumo: '412 m³', et: '5.5 mm/d', 
      lat: '19.4315°N', lng: '99.1310°W' 
    },
    { 
      id: 4, nombre: 'Parcela Oeste', cultivo: 'Fresa', estado: 'critico', 
      humedad: '28%', ndvi: '0.52', consumo: '598 m³', et: '6.1 mm/d', 
      lat: '19.4340°N', lng: '99.1375°W' 
    },
  ];

  const getStatusStyles = (estado) => {
    switch (estado) {
      case 'optimo':
        return { 
          cardBorder: 'border-emerald-800/40', cardBg: 'bg-emerald-950/30',
          badgeBg: 'bg-emerald-800/60 border border-emerald-700/50', badgeText: 'text-emerald-300',
          iconColor: 'text-emerald-500'
        };
      case 'advertencia':
        return { 
          cardBorder: 'border-amber-700/40', cardBg: 'bg-amber-950/30',
          badgeBg: 'bg-amber-800/60 border border-amber-700/50', badgeText: 'text-amber-300',
          iconColor: 'text-amber-500'
        };
      case 'critico':
        return { 
          cardBorder: 'border-orange-800/40', cardBg: 'bg-orange-950/30',
          badgeBg: 'bg-orange-800/60 border border-orange-700/50', badgeText: 'text-orange-300',
          iconColor: 'text-orange-500'
        };
      default:
        return { 
          cardBorder: 'border-white/5', cardBg: 'bg-earth-panel', 
          badgeBg: 'bg-gray-800 border border-gray-600', badgeText: 'text-gray-300',
          iconColor: 'text-gray-500'
        };
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      
      {/* 1. ENCABEZADO Y BOTÓN DE RETROCESO */}
      <header className="mb-10">
        <div 
          onClick={() => setVistaActual('dashboard')}
          className="flex items-center gap-2 text-creamy-blue hover:text-white cursor-pointer transition-colors w-fit mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-bold">Volver al Dashboard</span>
        </div>
        <h2 className="text-4xl font-serif font-bold text-white mb-2">Áreas de Riego</h2>
        <p className="text-gray-400">Rancho La Esperanza • Monitoreo detallado de todas las parcelas</p>
      </header>

      {/* 2. TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-[2rem] p-6 shadow-lg flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-900/50 flex items-center justify-center border border-emerald-800/50">
            <h3 className="text-3xl font-serif font-bold text-emerald-400">3</h3>
          </div>
          <p className="text-emerald-300/80 font-medium text-lg tracking-wide">Áreas Óptimas</p>
        </div>
        
        <div className="bg-amber-950/40 border border-amber-800/30 rounded-[2rem] p-6 shadow-lg flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-900/50 flex items-center justify-center border border-amber-800/50">
            <h3 className="text-3xl font-serif font-bold text-amber-400">2</h3>
          </div>
          <p className="text-amber-300/80 font-medium text-lg tracking-wide">Advertencias</p>
        </div>

        <div className="bg-orange-950/40 border border-orange-800/30 rounded-[2rem] p-6 shadow-lg flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-900/50 flex items-center justify-center border border-orange-800/50">
            <h3 className="text-3xl font-serif font-bold text-orange-400">1</h3>
          </div>
          <p className="text-orange-300/80 font-medium text-lg tracking-wide">Críticas</p>
        </div>
      </div>

      {/* 3. REJILLA DE PARCELAS */}
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

                <div className="bg-black/20 rounded-2xl p-4 shadow-inner">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <SunIcon className="w-4 h-4 text-amber-500/70" />
                    <span className="text-xs font-medium uppercase tracking-wider">ET</span>
                  </div>
                  <span className="text-2xl font-bold text-white/90">{parcela.et}</span>
                </div>

                <div className="col-span-2 bg-black/20 rounded-2xl p-4 shadow-inner">
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