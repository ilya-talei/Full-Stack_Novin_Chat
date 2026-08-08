import { useState, useRef, useEffect } from 'react';
import { MdCategory } from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import LiquidGlass from '@components/ui/LiquidGlass';
import { useTheme } from '@context/ThemeContext';
import { CHAT_INPUT_GLASS, chatGlassOverlay } from '@constants/glass';

const options = [
  { label: 'همه', path: ROUTES.HOME },
  { label: 'شخصی', path: ROUTES.PERSONAL },
  { label: 'گروه‌ها', path: ROUTES.GROUPS },
  { label: 'کانال‌ها', path: ROUTES.CHANNELS },
];

export default function Category() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const current = options.find((o) => o.path === location.pathname) ?? options[0];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <LiquidGlass
        button
        className="rounded-full"
        {...CHAT_INPUT_GLASS}
        overlay={chatGlassOverlay(isDark)}
      >
        <button
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-[11px] text-ink-secondary hover:text-ink transition-colors"
          onClick={() => setIsOpen((v) => !v)}
        >
          <MdCategory size={18} />
          <span className="text-xs font-medium">{current.label}</span>
        </button>
      </LiquidGlass>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-40 w-44 animate-slide-in">
          <LiquidGlass
            fill
            className="rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
            contentClassName="flex-col items-stretch"
            {...CHAT_INPUT_GLASS}
            overlay={chatGlassOverlay(isDark)}
          >
            <div className="py-1.5 w-full">
              {options.map((option) => {
                const active = location.pathname === option.path;
                return (
                  <button
                    key={option.path}
                    type="button"
                    onClick={() => {
                      navigate(option.path);
                      setIsOpen(false);
                    }}
                    className={`w-full text-right px-4 py-2.5 text-sm transition-colors ${
                      active
                        ? 'text-npurple-borders bg-npurple-borders/15'
                        : 'text-ink-secondary hover:bg-white/10 hover:text-ink'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </LiquidGlass>
        </div>
      )}
    </div>
  );
}
