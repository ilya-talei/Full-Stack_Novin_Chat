import React from "react";
import { useLocation } from "react-router-dom";

function Profiles({ active, name, date, text, img, onClick, ctype }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div
      onClick={onClick}
      className={`flex 
        ${active ? "bg-[#4A97D6] hover:bg-[#4A97D6]" : "hover:bg-ngray-800"}
        ${
          "/homePage" == currentPath
            ? " "
            : currentPath == ctype
              ? " "
              : "hidden"
        }
        rounded-2xl px-2 pt-1 cursor-pointer mb-2 transition-all duration-600`}
    >
      <div className="w-16 h-16 rounded-full items-center mt-1">
        <img className="rounded-full" src={img} alt={name} />
      </div>

      <div className="flex flex-col items-center w-full mr-1">
        <div className="flex w-full justify-between ">
          <div className="text-neutral-100  text-[17px]">{name}</div>
          <div className="text-neutral-300 text-[13px]">{date}</div>
        </div>
        <div className="flex w-full text-[14px]">
          <div className="text-neutral-200">{text}</div>
        </div>
      </div>
    </div>
  );
}

export default Profiles;
