import { MdFileUpload } from "react-icons/md";

function NewProduct() {
  return (
    <div className="newProduct flex-4 font-['vazir'] shadow-lg m-5">
      <h1 className="addProductTitle font-semibold text-xl m-5">محصول جدید</h1>
      <form className="addProductForm mt-2.5">
        <div className="addProductItem flex flex-col w-64 mb-2.5">
          <label className="text-gray-400 font-semibold mb-2.5  mr-5">عکس</label>
          <div className="flex justify-between items-center w-32 bg-gray-300 border-2 border-gray-600 rounded-md px-2 mr-10">
            <p>فایل انتخاب کنید</p>
            <MdFileUpload className="text-base cursor-pointer text-gray-600" />
          </div>
        </div>
        <div className="addProductItem flex flex-col w-64 mb-2.5">
          <label className="text-gray-400 font-semibold mb-2.5 mr-5">اسم</label>
          <input type="text" placeholder="بسته ی معمولی" className="border-2 border-gray-600 rounded-md p-1.5 mr-10" />
        </div>
        <div className="addProductItem flex flex-col w-64 mb-2.5">
          <label className="text-gray-400 font-semibold mb-2.5 mr-5">موجودی</label>
            <input type="text" placeholder="123" id="123" className="border-2 border-gray-600 rounded-md p-1.5 mr-10" />
        </div>
        <div className="addProductItem flex flex-col w-64 mb-2.5">
          <label className="text-gray-400 font-semibold mb-2.5 mr-5">فعال</label>
          <select name="active" id="active" className="border-2 border-gray-600 rounded-md p-1.5 mr-10">
            <option value="yes">بله</option>
            <option value="no">نه</option>
          </select>
        </div>
        <button className="addProductButton bg-blue-700 text-white font-semibold border-none rounded-xl cursor-pointer mt-2.5 py-2.5 px-5 mr-5">
          ساختن
        </button>
      </form>
    </div>
  );
}

export default NewProduct;
