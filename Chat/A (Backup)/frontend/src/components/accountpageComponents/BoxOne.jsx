import { HiChevronDown } from 'react-icons/hi';

function BoxOne({ username, number, imgsrc }) {
  return (
    <div className="mx-4 mt-6 rounded-2xl h-24 surface-elevated border border-hairline/10 px-2 py-2">
      <div className="rounded-2xl hover:bg-surface-muted pb-1 border-b border-hairline/10 flex cursor-pointer">
        <div className="w-16 h-16 rounded-full items-center mt-1 overflow-hidden">
          <img className="rounded-full w-full h-full object-cover" src={imgsrc} alt={username} />
        </div>

        <div className="flex flex-col items-center w-full mt-1 mr-2">
          <div className="flex w-full justify-between text-[17px]">
            <div className="text-ink">{username}</div>
            <HiChevronDown className="ml-1 cursor-pointer text-3xl transition text-ink-muted" />
          </div>
          <div className="flex w-full text-[15px]">
            <div className="text-ink-muted ltr">{number}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoxOne;
