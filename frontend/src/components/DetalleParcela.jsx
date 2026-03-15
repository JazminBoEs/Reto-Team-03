import { 
  ArrowLeftIcon, 
  HomeIcon, 
  PencilSquareIcon,
  CloudIcon,
  BeakerIcon,
  SunIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const DetalleParcela = ({ setVistaActual }) => {
  return (
    <div className="animate-fade-in pb-10">
      
      {/* 1. NAVEGACIÓN SUPERIOR */}
      <div className="flex items-center gap-6 mb-6 border-b border-white/5 pb-4">
        <button 
          onClick={() => setVistaActual('areas')}
          className="flex items-center gap-2 text-creamy-blue hover:text-white transition-colors text-sm font-bold cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Volver a Áreas
        </button>
        <button 
          onClick={() => setVistaActual('dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold cursor-pointer"
        >
          <HomeIcon className="w-4 h-4" /> Volver al Dashboard
        </button>
      </div>

      {/* 2. ENCABEZADO */}
      <header className="mb-8">
        <h2 className="text-4xl font-serif font-bold text-white mb-2">Parcela Norte - Nogal</h2>
        <p className="text-gray-400">Rancho La Esperanza • Última actualización: hace 5 minutos</p>
      </header>

      {/* 3. INFORMACIÓN GENERAL */}
      <div className="bg-earth-panel p-6 rounded-[2rem] border border-white/5 shadow-xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Información General</h3>
          <button className="flex items-center gap-2 bg-creamy-blue/10 text-creamy-blue hover:bg-creamy-blue hover:text-earth-dark px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-creamy-blue/30">
            <PencilSquareIcon className="w-4 h-4" /> Editar Parámetros
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Tamaño del Área</p>
            <p className="text-xl font-bold text-white">3.5 ha</p>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Tipo de Cultivo</p>
            <p className="text-xl font-bold text-white">Nogal</p>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" /> Coordenadas GPS
            </p>
            <p className="text-sm font-mono font-bold text-gray-300">19.4326°N, 99.1332°W</p>
          </div>
        </div>
      </div>

      {/* 4. TRES COLUMNAS PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* COLUMNA 1: SUELO (Verde) */}
        <div className="bg-emerald-950/20 border border-emerald-800/30 p-6 rounded-[2rem] shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-900/50 rounded-lg text-emerald-400"><CloudIcon className="w-6 h-6"/></div>
            <h3 className="text-xl font-bold text-white">Suelo</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Humedad del Suelo</p>
              <p className="text-2xl font-bold text-emerald-400">68%</p>
              <p className="text-[10px] text-emerald-500/70 mt-1">Óptima para nogal</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Potencial Hídrico</p>
              <p className="text-2xl font-bold text-white">-0.8 MPa</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Electroconductividad</p>
              <p className="text-2xl font-bold text-white">1.2 dS/m</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Índice de Vegetación (NDVI)</p>
              <p className="text-2xl font-bold text-emerald-400">0.82</p>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: RIEGO (Azul) */}
        <div className="bg-blue-950/20 border border-blue-800/30 p-6 rounded-[2rem] shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-900/50 rounded-lg text-river-blue"><BeakerIcon className="w-6 h-6"/></div>
            <h3 className="text-xl font-bold text-white">Riego</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-river-blue/10 border border-river-blue/30 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs text-river-blue mb-1">Estatus del Sistema</p>
                <p className="text-2xl font-black text-river-blue tracking-widest">ACTIVO</p>
                <p className="text-[10px] text-river-blue/70 mt-1">Riego en curso (45 min)</p>
              </div>
              <div className="w-8 h-8 rounded-full border-4 border-river-blue animate-pulse"></div>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Consumo Acumulado</p>
              <p className="text-2xl font-bold text-white">485 m³</p>
              <p className="text-[10px] text-gray-500 mt-1">Este mes</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Consumo Diario Promedio</p>
              <p className="text-2xl font-bold text-white">24.3 m³</p>
            </div>
            <div className="bg-creamy-blue/10 border border-creamy-blue/30 p-4 rounded-2xl mt-4">
              <p className="text-xs text-creamy-blue mb-1">Próximo Riego Programado</p>
              <p className="text-lg font-bold text-creamy-blue">Mañana 06:00</p>
            </div>
          </div>
        </div>

        {/* COLUMNA 3: AMBIENTE (Amarillo/Naranja) */}
        <div className="bg-amber-950/20 border border-amber-800/30 p-6 rounded-[2rem] shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-900/50 rounded-lg text-amber-500"><SunIcon className="w-6 h-6"/></div>
            <h3 className="text-xl font-bold text-white">Ambiente</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Temperatura Ambiental</p>
              <p className="text-2xl font-bold text-amber-500">26°C</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Humedad Relativa</p>
              <p className="text-2xl font-bold text-white">62%</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Velocidad del Viento</p>
              <p className="text-2xl font-bold text-white">12.3 km/h</p>
              <p className="text-[10px] text-gray-500 mt-1">Dir: Noreste</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Radiación Solar</p>
              <p className="text-2xl font-bold text-amber-500">685 W/m²</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl">
              <p className="text-xs text-gray-400 mb-1">Evapotranspiración</p>
              <p className="text-2xl font-bold text-orange-400">5.2 mm/d</p>
            </div>
          </div>
        </div>

      </div>

      {/* 5. SECCIÓN DE GRÁFICAS (Simuladas con CSS para el MVP) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-earth-panel border border-white/5 p-6 rounded-[2rem]">
          <h4 className="text-sm font-bold text-gray-300 mb-4">Historial de Humedad (24h)</h4>
          <div className="h-32 w-full flex items-end gap-2">
             {/* Barras simuladas */}
             {[60, 55, 50, 45, 50, 55, 65, 68].map((h, i) => (
               <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-sm relative group hover:bg-emerald-500/40 transition-colors" style={{ height: `${h}%` }}>
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white opacity-0 group-hover:opacity-100">{h}%</div>
               </div>
             ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-2">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Ahora</span>
          </div>
        </div>

        <div className="bg-earth-panel border border-white/5 p-6 rounded-[2rem]">
          <h4 className="text-sm font-bold text-gray-300 mb-4">Evolución del NDVI (7 días)</h4>
          <div className="h-32 w-full flex items-end gap-2 border-b border-white/10">
             {[78, 79, 80, 81, 82, 82, 82].map((n, i) => (
               <div key={i} className="flex-1 flex flex-col justify-end items-center group">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 mb-1 group-hover:scale-150 transition-transform" style={{ marginBottom: `${(n-70)*3}px` }}></div>
                 <div className="w-px h-full bg-white/5"></div>
               </div>
             ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-2">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DetalleParcela;