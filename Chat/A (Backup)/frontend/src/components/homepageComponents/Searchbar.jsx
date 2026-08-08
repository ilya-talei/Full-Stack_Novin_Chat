import { FaSearch } from 'react-icons/fa';
import LiquidGlass from '@components/ui/LiquidGlass';
import { useTheme } from '@context/ThemeContext';
import { CHAT_INPUT_GLASS, chatGlassOverlay } from '@constants/glass';

export default function Searchbar({ value = '', onChange }) {
  const { isDark } = useTheme();

  return (
    <LiquidGlass
      fill
      className="flex-1 min-w-0 rounded-full"
      contentClassName="items-center"
      {...CHAT_INPUT_GLASS}
      overlay={chatGlassOverlay(isDark)}
    >
      <div className="w-full flex items-center gap-2.5 px-4 py-[11px]">
        <FaSearch className="text-ink-muted shrink-0" size={14} />
        <input
          className="bg-transparent outline-none flex-1 text-ink placeholder:text-ink-muted text-sm"
          type="text"
          placeholder="جستجو..."
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    </LiquidGlass>
  );
}
