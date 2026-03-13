import Sidebar from './components/Sidebar';
import { sensorData } from './data/mockData';

function App() {
  return (
    <div className="min-h-screen bg-earth-dark flex font-sans antialiased">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-10">
        <header className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-white mb-2">Monitor de Cultivo</h1>
          <div className="flex items-center gap-2">
            <span className="text-leaf-green/80 font-medium">Chihuahua, México</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400 text-sm">Actualizado hace 5 minutos</span>
          </div>
        </header>

        {/* Rejilla de Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Tarjeta Humedad */}
          <div className="bg-earth-panel p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
              <div className="w-20 h-20 bg-leaf-green rounded-full filter blur-3xl"></div>
            </div>
            <p className="text-gray-400 font-medium uppercase text-xs tracking-[0.2em] mb-4">Humedad Suelo</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-6xl font-bold text-white">{sensorData.humidity}</h3>
              <span className="text-2xl text-leaf-green font-serif">%</span>
            </div>
            <div className="mt-8 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-leaf-green h-full rounded-full transition-all duration-1000" 
                style={{ width: `${sensorData.humidity}%` }}
              ></div>
            </div>
          </div>

          {/* Tarjeta Temperatura */}
          <div className="bg-earth-panel p-8 rounded-[2.5rem] border border-white/5 shadow-2xl group">
            <p className="text-gray-400 font-medium uppercase text-xs tracking-[0.2em] mb-4">Ambiente</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-6xl font-bold text-white">{sensorData.temperature}</h3>
              <span className="text-2xl text-river-blue font-serif">°C</span>
            </div>
            <p className="mt-8 text-sm text-gray-500 italic">Temperatura estable para el crecimiento</p>
          </div>

          {/* Tarjeta Batería */}
          <div className="bg-earth-panel p-8 rounded-[2.5rem] border border-white/5 shadow-2xl group">
            <p className="text-gray-400 font-medium uppercase text-xs tracking-[0.2em] mb-4">Energía Solar</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-6xl font-bold text-white">{sensorData.battery}</h3>
              <span className="text-2xl text-soil-brown font-serif">%</span>
            </div>
            <div className="mt-8 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <div 
                  key={level} 
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    level <= 4 ? 'bg-soil-brown' : 'bg-white/10'
                  }`}
                ></div>
              ))}
            </div>
          </div>

        </div>

        {/* Sección de aviso rápido */}
        <div className="mt-12 p-6 bg-leaf-green/5 border border-leaf-green/10 rounded-3xl flex items-center justify-between">
           <p className="text-leaf-green/90 font-medium">Próximo riego programado para las 20:00 PM</p>
           <button className="px-6 py-2 bg-leaf-green text-earth-dark font-bold rounded-xl hover:bg-white transition-colors cursor-pointer">
              Regar ahora
           </button>
        </div>
      </main>
    </div>
  );
}

export default App;