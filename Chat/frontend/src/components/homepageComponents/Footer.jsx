import { FiBell, FiHome, FiPhone, FiSettings, FiUser } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/routes';

function FooterNav({ items, currentPath, onNavigate }) {
  return (
    <nav className="w-full h-[59px] px-1">
      <div className="flex items-stretch h-full">
        {items.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path === ROUTES.ACCOUNT && currentPath.startsWith('/accountPage')) ||
            (item.path === ROUTES.HOME &&
              ['/personal', '/groups', '/channels', '/homePage'].includes(currentPath));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`footer-nav-item relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                isActive ? 'text-ink' : 'text-ink-muted hover:text-ink-secondary'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.1 : 1.7}
                className="transition-[stroke-width] duration-200"
              />
              <span
                className={`text-[10px] tracking-wide ${
                  isActive ? 'font-medium text-ink' : 'font-normal'
                }`}
              >
                {item.label}
              </span>
              <span
                className={`absolute bottom-1.5 h-[2px] rounded-full transition-all duration-200 ${
                  isActive ? 'w-4 bg-npurple-borders/80' : 'w-0 bg-transparent'
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const menuItems = [
    { icon: FiHome, label: 'خانه', path: ROUTES.HOME },
    { icon: FiBell, label: 'اعلانات', path: ROUTES.NOTIFICATIONS },
    { icon: FiPhone, label: 'تماس', path: ROUTES.CALL },
    { icon: FiUser, label: 'مخاطبین', path: ROUTES.CONTACTS },
    { icon: FiSettings, label: 'تنظیمات', path: ROUTES.ACCOUNT },
  ];

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] bg-[rgb(var(--surface-panel))] w-full">
      <FooterNav
        items={menuItems}
        currentPath={currentPath}
        onNavigate={(path) => navigate(path)}
      />
    </div>
  );
}

export default Footer;
