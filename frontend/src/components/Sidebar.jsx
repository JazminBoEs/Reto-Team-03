import { 
  HomeIcon, 
  MapIcon,                 
  Square3Stack3DIcon, 
  BellAlertIcon, 
  ChartBarIcon,            
  UserCircleIcon,          
  AdjustmentsVerticalIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Asegúrate de que el nombre de tu imagen coincida (logo.png, logo.svg, etc.)
import logoIrrigo from '../assets/logo.png'; 

const Sidebar = ({
  vistaActual,
  setVistaActual,
  esAdmin,
  onLogout,
  alertasNoLeidas,
  usuarioActual,
  predioActual,
  mobileOpen = false,
  onCloseMobile
}) => {

  const handleNavigation = (id) => {
    setVistaActual(id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogout = () => {
    if (onCloseMobile) onCloseMobile();
    onLogout();
  };
  
  const mainMenuItems = [
    { name: 'Panel Principal', icon: HomeIcon, id: 'dashboard' },
    { name: 'Mapa de Predio', icon: MapIcon, id: 'mapa' },
    { name: 'Áreas de Riego', icon: Square3Stack3DIcon, id: 'areas' },
    { name: 'Alertas', icon: BellAlertIcon, id: 'alertas', badge: alertasNoLeidas },
    { name: 'Reportes', icon: ChartBarIcon, id: 'reportes' },
  ];

  const bottomMenuItems = [
    { name: 'Mi Perfil', icon: UserCircleIcon, id: 'perfil' },
    // Parámetros solo visible para admins
    ...(esAdmin ? [{ name: 'Parámetros', icon: AdjustmentsVerticalIcon, id: 'parametros' }] : []),
    { name: 'Cerrar Sesión', icon: ArrowLeftOnRectangleIcon, id: 'logout', isLogout: true },
  ];

  return (
    <aside
      className={`w-[18rem] md:w-64 h-screen bg-earth-panel/70 md:bg-earth-panel/40 border-r border-white/5 flex flex-col p-5 md:p-6 fixed left-0 top-0 backdrop-blur-sm overflow-y-auto z-50 transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      
      {/* Cabecera / Logo interactivo */}
      <div 
        onClick={() => handleNavigation('dashboard')}
        className="flex items-center gap-3 mb-6 px-2 cursor-pointer hover:opacity-80 transition-opacity"
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
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onCloseMobile}
          className="ml-auto md:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Info del usuario logueado */}
      {usuarioActual && (
        <div className="mb-6 px-2 py-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-linear-to-br from-creamy-blue to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0">
              {usuarioActual.Nombre?.charAt(0)}{usuarioActual.Apellido?.charAt(0) || ''}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate">{usuarioActual.Nombre} {usuarioActual.Apellido}</p>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                esAdmin 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-creamy-blue/20 text-creamy-blue border border-creamy-blue/20'
              }`}>
                {esAdmin ? 'Admin' : 'Lector'}
              </span>
            </div>
          </div>
          {/* Nombre del predio activo */}
          {predioActual && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Predio activo</p>
              <p className="text-xs text-gray-300 font-medium truncate">{predioActual.nombrePredio || 'Sin nombre'}</p>
            </div>
          )}
        </div>
      )}

      {/* Navegación Principal */}
      <nav className="flex-1 space-y-1.5">
        <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Gestión Agrícola</p>
        
        {mainMenuItems.map((item) => {
          const isActive = vistaActual === item.id;
          
          return (
            <div
              key={item.name}
              onClick={() => handleNavigation(item.id)}
              className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                isActive 
                  ? 'bg-creamy-blue/10 text-creamy-blue border border-creamy-blue/20 shadow-inner' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <div className="relative">
                <item.icon className="w-6 h-6" />
                {/* Badge de alertas no leídas */}
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="font-medium text-sm">{item.name}</span>
            </div>
          );
        })}
      </nav>

      {/* Bloque Inferior */}
      <div className="mt-auto pt-6 border-t border-white/5 space-y-1.5">
        <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Cuenta</p>
        
        {bottomMenuItems.map((item) => {
          const isActive = vistaActual === item.id;
          
          return (
            <div
              key={item.name}
              onClick={() => {
                if (item.isLogout) {
                  handleLogout();
                } else {
                  handleNavigation(item.id);
                }
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
