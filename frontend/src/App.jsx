import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DetalleParcela from './components/DetalleParcela';
import AreasRiego from './components/AreasRiego'; // Asegúrate de tener este archivo creado
import { 
  SunIcon, 
  CloudIcon, 
  ArrowRightIcon,
  MapIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon // Icono extra para la vista de construcción
} from '@heroicons/react/24/outline';

function App() {
  // 1. Estado para controlar qué pantalla se ve (inicia en 'dashboard')
  const [vistaActual, setVistaActual] = useState('dashboard');

  // Datos simulados para la presentación
  const dashboardData = {
    humedadPromedio: 42,
    ndvi: 0.74, 
    consumoAgua: 1250, 
    evapotranspiracion: 5.2, 
    clima: {
      tempActual: 28,
      tempMin: 12,
      tempMax: 32,
      viento: 18, 
      vientoDir: 'NE', 
      radiacion: 850 
    }
  };

  return (
    <div className="min-h-screen bg-earth-dark flex font-sans antialiased pb-10">
      
      {/* Le pasamos el control al Sidebar para que sepa qué resaltar y pueda cambiar la vista */}
      <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} />
      
      <main className="flex-1 ml-64 p-10">
        
        {/* =========================================
            VISTA 1: PANEL PRINCIPAL (DASHBOARD) 
            ========================================= */}
        {vistaActual === 'dashboard' && (
          <div className="animate-fade-in">
            <header className="mb-10">
              <h1 className="text-4xl font-serif font-bold text-white mb-2">Monitor de Cultivo</h1>
              <div className="flex items-center gap-2">
                <span className="text-creamy-blue/80 font-medium">Panel Principal IrriGo</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400 text-sm">Actualizado hace 2 minutos</span>
              </div>
            </header>

            {/* MÉTRICAS PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-earth-panel p-6 rounded-3xl border border-white/5 shadow-xl">
                <p className="text-gray-400 font-medium uppercase text-[10px] tracking-[0.1em] mb-4">Humedad Promedio</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-4xl font-bold text-white">{dashboardData.humedadPromedio}</h3>
                  <span className="text-lg text-creamy-blue font-serif">%</span>
                </div>
              </div>

              <div className="bg-earth-panel p-6 rounded-3xl border border-white/5 shadow-xl">
                <p className="text-gray-400 font-medium uppercase text-[10px] tracking-[0.1em] mb-4">Índice de Vegetación (NDVI)</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-4xl font-bold text-white">{dashboardData.ndvi}</h3>
                </div>
                <p className="text-[10px] text-creamy-blue mt-2 uppercase tracking-widest">Estado Óptimo</p>
              </div>

              <div className="bg-earth-panel p-6 rounded-3xl border border-white/5 shadow-xl">
                <p className="text-gray-400 font-medium uppercase text-[10px] tracking-[0.1em] mb-4">Consumo de Agua</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-4xl font-bold text-white">{dashboardData.consumoAgua}</h3>
                  <span className="text-lg text-river-blue font-serif">L</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Últimas 24 horas</p>
              </div>

              <div className="bg-earth-panel p-6 rounded-3xl border border-white/5 shadow-xl">
                <p className="text-gray-400 font-medium uppercase text-[10px] tracking-[0.1em] mb-4">Evapotranspiración</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-4xl font-bold text-white">{dashboardData.evapotranspiracion}</h3>
                  <span className="text-lg text-soil-brown font-serif">mm/d</span>
                </div>
              </div>
            </div>

            {/* RESUMEN CLIMÁTICO */}
            <div className="bg-earth-panel p-8 rounded-[2.5rem] border border-white/5 shadow-2xl mb-10">
              <h3 className="text-xl font-serif font-bold text-white mb-8 border-b border-white/5 pb-4">
                Resumen Climático Local
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-soil-brown/10 rounded-2xl text-soil-brown">
                    <SunIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Temperatura Ambiental</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{dashboardData.clima.tempActual}°C</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Min: {dashboardData.clima.tempMin}°C / Max: {dashboardData.clima.tempMax}°C</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-l border-white/5 pl-8">
                  <div className="p-4 bg-creamy-blue/10 rounded-2xl text-creamy-blue">
                    <CloudIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Velocidad del Viento</p>
                    <span className="text-3xl font-bold text-white">{dashboardData.clima.viento} <span className="text-lg text-creamy-blue">km/h</span></span>
                    <p className="text-xs text-gray-500 mt-1">Dir: {dashboardData.clima.vientoDir}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-l border-white/5 pl-8">
                  <div className="p-4 bg-yellow-500/10 rounded-2xl text-yellow-500">
                    <SunIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Radiación Solar</p>
                    <span className="text-3xl font-bold text-white">{dashboardData.clima.radiacion} <span className="text-lg text-yellow-500">W/m²</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTONES DE NAVEGACIÓN RÁPIDA */}
            <div className="flex gap-6">
              <button 
                onClick={() => setVistaActual('areas')} // Magia: Cambia a la vista de áreas
                className="flex-1 bg-creamy-blue hover:bg-white text-earth-dark font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg cursor-pointer"
              >
                <MapIcon className="w-6 h-6" />
                Ir a Áreas de Riego
                <ArrowRightIcon className="w-5 h-5 ml-2 opacity-50" />
              </button>
              
              <button 
                onClick={() => setVistaActual('reportes')} // Magia: Cambia a la vista de reportes
                className="flex-1 bg-earth-panel hover:bg-white/5 border border-white/10 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg cursor-pointer"
              >
                <ChartBarIcon className="w-6 h-6 text-creamy-blue" />
                Ver Reportes Completos
                <ArrowRightIcon className="w-5 h-5 ml-2 opacity-50 text-creamy-blue" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================
            VISTA 2: ÁREAS DE RIEGO
            ========================================= */}
        {vistaActual === 'areas' && (
          <AreasRiego setVistaActual={setVistaActual} />
        )}

        {/* =========================================
            VISTA 4: DETALLE DE PARCELA (NUEVA)
            ========================================= */}
        {vistaActual === 'detalle-parcela' && (
          <DetalleParcela setVistaActual={setVistaActual} />
        )}

        {/* =========================================
            VISTA 3: EN CONSTRUCCIÓN (Para el resto de botones)
            ========================================= */}
        {['mapa', 'alertas', 'reportes', 'perfil', 'config'].includes(vistaActual) && (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-fade-in">
             <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl">
                <WrenchScrewdriverIcon className="w-10 h-10 text-creamy-blue" />
             </div>
             <h2 className="text-3xl font-serif font-bold text-white mb-4">Sección en Construcción</h2>
             <p className="text-gray-400 max-w-md">
               El módulo de <span className="text-creamy-blue font-bold uppercase">{vistaActual}</span> estará disponible en la próxima versión del sistema IrriGo.
             </p>
             <button 
               onClick={() => setVistaActual('dashboard')}
               className="mt-8 px-8 py-3 bg-earth-panel border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 hover:border-white/20 transition-colors cursor-pointer"
             >
               Volver al Panel Principal
             </button>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;