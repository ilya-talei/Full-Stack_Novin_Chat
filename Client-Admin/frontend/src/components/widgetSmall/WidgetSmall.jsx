import { IoMdEye } from "react-icons/io";
import woman from "../../assets/images/woman.jpg";
import Button from "../ui/Button";
function WidgetSmall() {
  return (
    <div className="flex-1 shadow-lg p-5 mr-5">
      <div className="text-base font-semibold font-['vazir']">عضو جدید</div>
      <ul>
        <li className="flex items-center justify-between my-5 mx-0">
          <img
            src={woman}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-1.5"
          />
          <div className="flex flex-col">
            <div className="font-semibold font-['vazir']">توحید لطیفی</div>
            <div className="font-light font-['vazir']"> مهندس DevOps</div>
          </div>
          <button className="bg-blue-100 text-gray-600 flex cursor-pointer items-center rounded-xl py-2 px-2.5">
            <IoMdEye className="text-xs font-['vazir'] ml-2.5" />
            نمایش
          </button>
        </li>

        <li className="flex items-center justify-between my-5 mx-0">
          <img
            src={woman}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-1.5"
          />
          <div className="flex flex-col">
            <div className="font-semibold font-['vazir']">توحید لطیفی</div>
            <div className="font- font-['vazir']"> مهندس DevOps</div>
          </div>
          <button className="bg-blue-100 text-gray-600 flex cursor-pointer items-center rounded-xl py-2 px-2.5">
            <IoMdEye className="text-xs font-['vazir'] ml-2.5" />
            نمایش
          </button>
        </li>

        <li className="flex items-center justify-between my-5 mx-0">
          <img
            src={woman}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-1.5"
          />
          <div className="flex flex-col">
            <div className="font-semibold font-['vazir']">توحید لطیفی</div>
            <div className="font-light font-['vazir']"> مهندس DevOps</div>
          </div>
          <button className="bg-blue-100 text-gray-600 flex cursor-pointer items-center rounded-xl py-2 px-2.5">
            <IoMdEye className="text-xs font-['vazir'] ml-2.5" />
            نمایش
          </button>
        </li>

        <li className="flex items-center justify-between my-5 mx-0">
          <img
            src={woman}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-1.5"
          />
          <div className="flex flex-col">
            <div className="font-semibold font-['vazir']">توحید لطیفی</div>
            <div className="font-light font-['vazir']"> مهندس DevOps</div>
          </div>
          <button className="bg-blue-100 text-gray-600 flex cursor-pointer items-center rounded-xl py-2 px-2.5">
            <IoMdEye className="text-xs font-['vazir'] ml-2.5" />
            نمایش
          </button>
        </li>

        <li className="flex items-center justify-between my-5 mx-0">
          <img
            src={woman}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-1.5"
          />
          <div className="flex flex-col">
            <div className="font-semibold font-['vazir']">توحید لطیفی</div>
            <div className="font-light font-['vazir']"> مهندس DevOps</div>
          </div>
          <button className="bg-blue-100 text-gray-600 flex cursor-pointer items-center rounded-xl py-2 px-2.5">
            <IoMdEye className="text-xs font-['vazir'] ml-2.5" />
            نمایش
          </button>
        </li>
      </ul>
    </div>
  );
}

export default WidgetSmall;
