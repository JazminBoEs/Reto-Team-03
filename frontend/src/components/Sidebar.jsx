import { 
  HomeIcon, 
  MapIcon,                 
  Square3Stack3DIcon, 
  BellAlertIcon, 
  ChartBarIcon,            
  UserCircleIcon,          
  AdjustmentsVerticalIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

// Asegúrate de que el nombre de tu imagen coincida (logo.png, logo.svg, etc.)
import logoIrrigo from '../assets/logo.png'; 

// Recibimos las variables de navegación que le pasaremos desde App.jsx
const Sidebar = ({ vistaActual, setVistaActual }) => {
  
  // Agregamos un 'id' a cada opción para que la navegación sea automática
  const mainMenuItems = [
    { name: 'Panel Principal', icon: HomeIcon, id: 'dashboard' },
    { name: 'Mapa de Predio', icon: MapIcon, id: 'mapa' },
    { name: 'Áreas de Riego', icon: Square3Stack3DIcon, id: 'areas' },
    { name: 'Alertas', icon: BellAlertIcon, id: 'alertas' },
    { name: 'Reportes', icon: ChartBarIcon, id: 'reportes' },
  ];

  const bottomMenuItems = [
    { name: 'Mi Perfil', icon: UserCircleIcon, id: 'perfil' },
    { name: 'Configuración', icon: AdjustmentsVerticalIcon, id: 'config' },
    { name: 'Cerrar Sesión', icon: ArrowLeftOnRectangleIcon, id: 'logout', isLogout: true },
  ];

  return (
    <aside className="w-64 h-screen bg-earth-panel/40 border-r border-white/5 flex flex-col p-6 fixed left-0 top-0 backdrop-blur-sm">
      
      {/* Cabecera / Logo interactivo (lleva al inicio) */}
      <div 
        onClick={() => setVistaActual('dashboard')}
        className="flex items-center gap-3 mb-8 px-2 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 bg-white/5">
          <img 
            src={logoIrrigo} 
            alt="IrriGo Logo" 
            className="w-full h-full object-contain p-1" 
          />
        </div>
        <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
          Irri<span className="text-creamy-blue">Go</span>
        </h1>
      </div>

      {/* Bloque Superior: Navegación Principal */}
      <nav className="flex-1 space-y-1.5">
        <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Gestión Agrícola</p>
        
        {mainMenuItems.map((item) => {
          const isActive = vistaActual === item.id; // Verificamos si esta es la vista actual
          
          return (
            <div
              key={item.name}
              onClick={() => setVistaActual(item.id)} // Cambiamos la vista al hacer clic
              className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                isActive 
                  ? 'bg-creamy-blue/10 text-creamy-blue border border-creamy-blue/20 shadow-inner' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="font-medium text-sm">{item.name}</span>
            </div>
          );
        })}
      </nav>

      {/* Bloque Inferior: Cuenta y Configuración */}
      <div className="mt-auto pt-6 border-t border-white/5 space-y-1.5">
        <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Cuenta</p>
        
        {bottomMenuItems.map((item) => {
          const isActive = vistaActual === item.id;
          
          return (
            <div
              key={item.name}
              onClick={() => {
                if (!item.isLogout) setVistaActual(item.id);
              }}
              className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                item.isLogout 
                  ? 'text-soil-brown hover:bg-soil-brown/10 border border-transparent hover:border-soil-brown/20' 
                  : isActive
                    ? 'bg-creamy-blue/10 text-creamy-blue border border-creamy-blue/20 shadow-inner'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="font-medium text-sm">{item.name}</span>
            </div>
          );
        })}
      </div>

    </aside>
  );
};

export default Sidebar;