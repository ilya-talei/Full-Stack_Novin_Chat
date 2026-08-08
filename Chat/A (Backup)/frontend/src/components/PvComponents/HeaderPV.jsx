import { FaEllipsisV } from "react-icons/fa";
import { FaSearch } from "react-icons/fa";
// import Profilessection from ".";

export default function HeaderPV({
  active,
  name,
  date,
  text,
  img,
  onClick,
  ctype,
}) {
  return (
    <div className="h-2/2">
      <div className="flex-auto max-w-8xl h-16 bg-ngray-900 p-px">
        <div className="flex place-content-between">
          <div className="h-14 w-1/2 cursor-pointer m-0">
            <div className="w-max h-10 items-center">
              <img className="rounded-full" src={img} alt={name} />
            </div>
            <div className="text-black">{name}</div>
          </div>
          <div className="h-16 w-1/4 flex place-content-end pt-5 m-0">
            <FaSearch
              className=" cursor-pointer text-3xl text-neutral-100 ml-4"
              size={18}
              pr-1
            />
            <FaEllipsisV
              className="cursor-pointer text-3xl ml-8 transition text-neutral-100"
              size={18}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
