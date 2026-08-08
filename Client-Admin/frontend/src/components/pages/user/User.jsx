import { BsPerson } from "react-icons/bs";
import { SlCalender } from "react-icons/sl";
import { MdOutlineEmail, MdOutlinePhoneAndroid } from "react-icons/md";
import { IoLocationOutline } from "react-icons/io5";
import man from "../../../assets/images/man.jpg";
import { MdFileUpload } from "react-icons/md";
import { Link } from "react-router-dom";
export default function User() {
  return (
    <div className="flex-4 p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-['vazir']">ویرایش کاربر</h1>
      </div>
      <div className="flex mt-5">
        <div className="flex-1 p-5 shadow-lg">
          <div className="flex items-center">
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={man}
              alt="عکس"
            />
            <div className="flex flex-col mr-5">
              <div className="font-semibold font-['vazir']">توحید لطیفی</div>
              <div className="font-light font-['vazir']">مهندس DevOps</div>
            </div>
          </div>
          <div className="mt-5">
            <div className="text-gray-400 text-sm font-semibold font-['vazir']">
              جزئیات صفحه
            </div>
            <div className="flex text-gray-700 items-center my-5 mx-0">
              <BsPerson className="pl-1.5 text-xl ml-1.5 font-['vazir']" />
              <div className="font-['vazir']">Tohid_latifi</div>
            </div>
            <div className="flex text-gray-700 items-center my-5 mx-0">
              <SlCalender className="pl-1.5 text-lg ml-1.5 font-['vazir']" />
              <div>1405.04.23</div>
            </div>
            <div className="text-gray-400 text-sm font-semibold font-['vazir']">
              سایر اطلاعات
            </div>
            <div className="flex text-gray-700 items-center my-5 mx-0">
              <MdOutlinePhoneAndroid className="pl-1.5 text-xl ml-1.5 font-['vazir']" />
              <div>092345678</div>
            </div>
            <div className="flex text-gray-700 items-center my-5 mx-0">
              <MdOutlineEmail className="pl-1.5 text-xl ml-1.5 font-['vazir']" />
              <div>Tohid.L@gmail.com</div>
            </div>
            <div className="flex text-gray-700 items-center my-5 mx-0">
              <IoLocationOutline className="pl-1.5 text-xl ml-1.5 font-['vazir']" />
              <div>خراسان رضوی ، مشهد</div>
            </div>
          </div>
        </div>

        <div className="mr-5 flex-2 p-5 shadow-lg">
          <div className="text-base font-semibold font-['vazir']">ویرایش</div>
          <form className="flex justify-between mt-5">
            <div>
              <div className="flex flex-col mt-2.5 font-['vazir']">
                <label className="text-sm mb-1">رمز عبور</label>
                <input
                  type="text"
                  placeholder="Tohid_latifi"
                  className="w-60 h-7 border-2 border-b-gray-300 border-x-white border-t-white"
                />
              </div>
              <div className="flex flex-col mt-2.5 font-['vazir']">
                <label className="text-sm mb-1">نام و نام خانوادگی</label>
                <input
                  type="text"
                  placeholder="توحید لطیفی"
                  className="w-60 h-7 border-2 border-b-gray-300 border-x-white border-t-white"
                />
              </div>
              <div className="flex flex-col mt-2.5 font-['vazir']">
                <label className="text-sm mb-1">ایمیل</label>
                <input
                  type="text"
                  placeholder="Tohid.L@gmail.com"
                  className="w-60 h-7 border-2 border-b-gray-300 border-x-white border-t-white"
                />
              </div>
              <div className="flex flex-col mt-2.5 font-['vazir']">
                <label className="text-sm mb-1">شماره ی تماس</label>
                <input
                  type="text"
                  placeholder="092345678"
                  className="w-60 h-7 border-2 border-b-gray-300 border-x-white border-t-white"
                />
              </div>
              <div className="flex flex-col mt-2.5 font-['vazir']">
                <label className="text-sm mb-1">آدرس</label>
                <input
                  className="w-60 h-7 border-2 border-b-gray-300 border-x-white border-t-white"
                  type="text"
                  placeholder="خراسان رضوی ، مشهد"
                />
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <div className="flex items-center">
                <img
                  src={man}
                  alt="عکس"
                  className="w-25 h-25 rounded-xl object-cover ml-5"
                />
                <label htmlFor="file" className="mb-1">
                  <MdFileUpload className="text-base cursor-pointer" />
                </label>
                <input type="file" id="file" style={{ display: "none" }} />
              </div>
              <button className="bg-blue-700 text-white font-semibold rounded-xl border-none p-1 cursor-pointer">
                به‌روزرسانی
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
