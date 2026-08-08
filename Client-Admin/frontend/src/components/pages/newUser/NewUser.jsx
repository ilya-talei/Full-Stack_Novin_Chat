export default function NewUser() {
  return (
    <div className="flex flex-col flex-4 items-center justify-start font-['vazir']">
      <h1 className="font-bold mr-5">کاربر جدید</h1>
      <form className="flex flex-wrap justify-center items-center">
        <div className="flex flex-col w-1/3 mt-2.5 mr-5">
          <label className="text-xs font-semibold text-gray-600 mb-2.5">
            نام کاربری
          </label>
          <input
            className="h-10 p-2.5 border-2 border-gray-300 rounded-md"
            type="text"
            placeholder="نام کاربری"
          />
        </div>
        <div className="flex flex-col w-1/3 mt-2.5 mr-5">
          <label className="text-xs font-semibold text-gray-600 mb-2.5">
            نام و نام خانوادگی
          </label>
          <input
            className="h-10 p-2.5 border-2 border-gray-300 rounded-md"
            type="text"
            placeholder="نام و نام خانوادگی"
          />
        </div>
        <div className="flex flex-col w-1/3 mt-2.5 mr-5">
          <label className="text-xs font-semibold text-gray-600 mb-2.5">
            ایمیل
          </label>
          <input
            className="h-10 p-2.5 border-2 border-gray-300 rounded-md"
            type="email"
            placeholder="Tohid.L@gmail.com"
          />
        </div>
        <div className="flex flex-col w-1/3 mt-2.5 mr-5">
          <label className="text-xs font-semibold text-gray-600 mb-2.5">
            رمز عبور
          </label>
          <input
            className="h-10 p-2.5 border-2 border-gray-300 rounded-md"
            type="text"
            placeholder="رمز عبور"
          />
        </div>
        <div className="flex flex-col w-1/3 mt-2.5 mr-5">
          <label className="text-xs font-semibold text-gray-600 mb-2.5">
            شماره ی تماس
          </label>
          <input
            className="h-10 p-2.5 border-2 border-gray-300 rounded-md"
            type="text"
            placeholder="شماره ی تماس"
          />
        </div>
        <div className="flex flex-col w-1/3 mt-2.5 mr-5">
          <label className="text-xs font-semibold text-gray-600 mb-2.5">
            آدرس
          </label>
          <input
            className="h-10 p-2.5 border-2 border-gray-300 rounded-md"
            type="text"
            placeholder="آدرس"
          />
        </div>
        <div className="flex flex-col w-1/3 mt-2.5 mr-5">
          <label className="text-xs font-semibold text-gray-600">جنسیت</label>
          <div>
            <input
              className="h-10 p-2.5 border-2 border-gray-300 rounded-md"
              type="radio"
              name="جنسیت"
              id="female"
              value="زن"
            />
            <label className="m-2 text-base text-gray-600" for="female">
              زن
            </label>
            <input
              className="h-10 p-2.5 border-2 border-gray-300 rounded-md"
              type="radio"
              name="جنسیت"
              id="male"
              value="مرد"
            />
            <label className="m-2 text-base text-gray-600" for="male">
              مرد
            </label>
          </div>
        </div>
        <div className="flex flex-col w-1/3 mt-2.5 mr-5">
          <label className="text-xs font-semibold text-gray-600 mb-2.5">
            فعال
          </label>
          <select
            className="h-10 border-2 border-gray-300 rounded-md"
            name="active"
            id="active"
          >
            <option value="yes">بله</option>
            <option value="no">خیر</option>
          </select>
        </div>
      </form>
      <button className="w-52 border-none bg-blue-700 text-white font-semibold rounded-xl mr-5 mt-7 py-2.5 px-5  cursor-pointer">
        ساختن
      </button>
    </div>
  );
}
