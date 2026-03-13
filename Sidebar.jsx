import { 
  HomeIcon, 
  Square3Stack3DIcon, 
  BellAlertIcon, 
  AdjustmentsVerticalIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const menuItems = [
    { name: 'Panel Principal', icon: HomeIcon, active: true },
    { name: 'Áreas de Riego', icon: Square3Stack3DIcon, active: false },
    { name: 'Alertas', icon: BellAlertIcon, active: false },
    { name: 'Configuración', icon: AdjustmentsVerticalIcon, active: false },
  ];

  return (
    <aside className="w-64 h-screen bg-earth-panel/40 border-r border-white/5 flex flex-col p-6 fixed left-0 top-0 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-10 h-10 bg-leaf-green rounded-2xl flex items-center justify-center shadow-lg shadow-leaf-green/20">
          <GlobeAltIcon className="w-6 h-6 text-earth-dark" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
          Irri<span className="text-leaf-green">Go</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <div
            key={item.name}
            className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 ${
              item.active 
                ? 'bg-leaf-green/10 text-leaf-green border border-leaf-green/20 shadow-inner' 
                : 'text-gray-500 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="font-medium">{item.name}</span>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-earth-dark/60 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-leaf-green rounded-full animate-pulse"></div>
          <p className="text-xs font-bold text-leaf-green uppercase tracking-widest">Sistema Sincronizado</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;