import HeaderPV from "./HeaderPV";
import TypewriteBox from "./TypewriteBox";
import Massageboxcomponent from "./massageboxcomponent";

export default function PrivateChat() {
  return (
    <div className="flex-auto w-max h-screen bg-gray-700 items-center justify-center text-red">
      <HeaderPV />
      <Massageboxcomponent />
      {/* <TypewriteBox /> */}
    </div>
  );
}
