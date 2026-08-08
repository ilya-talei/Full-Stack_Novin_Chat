import { HiBriefcase } from 'react-icons/hi';
import { FiHelpCircle } from 'react-icons/fi';

function BoxThree() {
  return (
    <div className="mx-4 mt-4 rounded-2xl surface-elevated border border-hairline/10 px-2 py-2">
      <div className="rounded-2xl flex flex-col">
        <div className="py-4 hover:bg-surface-muted rounded-2xl cursor-pointer flex items-center my-1">
          <HiBriefcase className="text-ink-muted mx-4 text-xl" />
          <div className="text-[17px] text-ink">خدمات نوین چت</div>
        </div>

        <div className="border-b border-hairline/10" />

        <div className="py-4 hover:bg-surface-muted rounded-2xl cursor-pointer flex items-center my-1">
          <FiHelpCircle className="text-ink-muted mx-4 text-xl" />
          <div className="text-[17px] text-ink">پشتیبانی</div>
        </div>
      </div>
    </div>
  );
}

export default BoxThree;
