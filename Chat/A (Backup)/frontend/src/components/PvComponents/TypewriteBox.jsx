import { BiMicrophone } from "react-icons/bi";
import { BsEmojiSmile } from "react-icons/bs";
import { CgAttachment } from "react-icons/cg";

export default function TypewriteBox() {
  return (
    <div className="flex justify-center h-full w-auto">
      <div className="flex self-end w-full justify-center mb-20">
        <div className="flex bg-ngray-500 cursor-pointer rounded-full w-16 h-16 items-center pr-5 ml-3 hover:bg-npurple-borders">
          <BiMicrophone className="text-nneutral-500" size={25} pr-1 />
        </div>

        <div className="flex bg-ngray-500 pb-1 pt-3 pr-5 w-3/6 h-16 rounded-3xl text-nneutral-500 items-center">
          <CgAttachment
            className="text-nneutral-500 rotate-45 w-8 ml-5 cursor-pointer"
            size={23}
            pr-1
          />
          <input
            className="bg-transparent outline-none flex w-5/6 pr-1 py-1 text-nneutral-500 placeholder-ngray-400"
            type="text"
            placeholder="پیام"
            name=""
            id=""
          />
          <BsEmojiSmile
            className="text-nneutral-500 w-8 ml-5 cursor-pointer"
            size={22}
          />
        </div>
      </div>
    </div>
  );
}
