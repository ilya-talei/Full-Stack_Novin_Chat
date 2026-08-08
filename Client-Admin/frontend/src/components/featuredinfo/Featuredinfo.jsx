import { MdArrowDownward, MdArrowUpward } from "react-icons/md";

function Featuredinfo() {
  return (
    <div className="flex w-full justify-between text-black">
      <div className="flex-1 my-0 mx-5 p-8 rounded-xl cursor-pointer shadow-lg">
        <div className="text-sm font-['vazir']">سود</div>
        <div className="flex items-center my-2.5 mx-0">
          <div className="text-2xl font-semibold font-['vazir']">2000 ريال</div>
          <div className="flex items-center mr-5">
            -11.4 <MdArrowDownward className="text-base mr-1.5 text-red-600" />
          </div>
        </div>
        <div className="text-base text-gray-600 font-['vazir']">
          مقایسه با ماه گذشته
        </div>
      </div>

      <div className="flex-1 my-0 mx-5 p-8 rounded-xl cursor-pointer shadow-lg">
        <div className="text-sm font-['vazir']">فروش</div>
        <div className="flex items-center my-2.5 mx-0">
          <div className="text-2xl font-semibold font-['vazir']">
            5,415 ريال
          </div>
          <div className="flex items-center mr-5">
            -1.4 <MdArrowDownward className="text-base mr-1.5 text-red-600" />
          </div>
        </div>
        <div className="text-base text-gray-600 font-['vazir']">
          مقایسه با ماه گذشته
        </div>
      </div>

      <div className="flex-1 my-0 mx-5 p-8 rounded-xl cursor-pointer shadow-lg">
        <div className="text-sm font-['vazir']">هزینه</div>
        <div className="flex items-center my-2.5 mx-0">
          <div className="text-2xl font-semibold font-['vazir']">
            1,415 ريال
          </div>
          <div className="flex items-center mr-5">
            +1.4 <MdArrowUpward className="text-base mr-1.5 text-green-600" />
          </div>
        </div>
        <div className="text-base text-gray-600 font-['vazir']">
          مقایسه با ماه گذشته
        </div>
      </div>
    </div>
  );
}

export default Featuredinfo;
