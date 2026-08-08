import { FaBookmark, FaUser, FaCog } from 'react-icons/fa';

function BoxTwo() {
  return (
    <div className="mx-4 mt-4 rounded-2xl surface-elevated border border-hairline/10 px-2 py-2">
      <div className="rounded-2xl flex flex-col">
        <div className="py-4 hover:bg-surface-muted rounded-2xl cursor-pointer flex items-center my-1">
          <FaBookmark className="text-ink-muted mx-4 text-xl" />
          <div className="text-[17px] text-ink">پیام های ذخیره شده</div>
        </div>

        <div className="border-b border-hairline/10" />

        <div className="py-4 hover:bg-surface-muted rounded-2xl cursor-pointer flex items-center my-1">
          <FaUser className="text-ink-muted mx-4 text-xl" />
          <div className="text-[17px] text-ink">مخاطبین</div>
        </div>

        <div className="border-b border-hairline/10" />

        <div className="py-4 hover:bg-surface-muted rounded-2xl cursor-pointer flex items-center my-1">
          <FaCog className="text-ink-muted mx-4" />
          <div className="text-[17px] text-ink">تنظیمات</div>
        </div>
      </div>
    </div>
  );
}

export default BoxTwo;
