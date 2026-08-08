import React from "react";
import { IoMdNotificationsOutline } from "react-icons/io";
import { IoSettingsSharp } from "react-icons/io5";
import { MdLanguage } from "react-icons/md";
import woman from "../../assets/images/woman.jpg";

function Topbar() {
  return (
    <div className="sticky z-50 w-full h-14">
      <div className="h-full flex items-center justify-between py-0 px-5 ">
        <div>
          <div className="font-bold text-2xl text-blue-900">Novin Chat</div>
        </div>
        <div className="flex items-center cursor-pointer text-gray-700">
          <div className="relative my-0 mx-1.5">
            <IoMdNotificationsOutline className="w-7 h-7" />
            <div className="flex justify-center items-center w-4 h-4 text-xs -mt-3 absolute bg-red-500 text-blue-50 rounded-full">
              2
            </div>
          </div>
          <div className="relative my-0 mx-1.5">
            <MdLanguage className="w-6 h-6" />
            <div className="flex justify-center items-center w-4 h-4 text-xs -mt-2.5 absolute bg-red-500 text-blue-50 rounded-full">
              1
            </div>
          </div>
          <div className="relative my-0 mx-1.5">
            <IoSettingsSharp className="w-6 h-6" />
          </div>
          <img
            src={woman}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-1.5"
          />
        </div>
      </div>
    </div>
  );
}

export default Topbar;
