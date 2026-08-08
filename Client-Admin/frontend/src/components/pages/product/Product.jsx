import { Link } from "react-router-dom";
import Chart from "../../chart/Chart";
import { productData } from "../../../data";
import man from "../../../assets/images/man.jpg";
import { MdFileUpload } from "react-icons/md";

function Product() {
  return (
    <div className="flex-4 p-5 font-['vazir']">
      <div className="flex items-center justify-between">
        <h1>محصول</h1>
        <Link to="/newProduct">
          <button className="w-20 border-none p-2.5 bg-emerald-400 text-white ext-sm rounded-xl cursor-pointer">
            ساختن
          </button>
        </Link>
      </div>
      <div className="flex">
        <div className="flex-2">
          <Chart
            data={productData}
            dataKey="فروش"
            title="عملکرد در فروش"
            grid
          />
        </div>
        <div className="flex-1 p-5 m-5 shadow-lg">
          <div className="flex items-center">
            <img
              className="h-10 w-10 rounded-full ml-2.5 mr-2.5 object-cover"
              src={man}
              alt="محصول"
            />
            <div className="font-semibold">بسته ی معمولی</div>
          </div>
          <div className="mt-2.5">
            <div className="flex w-36 font-light justify-between mt-2.5 pb-1 border-2 border-b-gray-300 border-white">
              <div>id: </div>
              <div>123</div>
            </div>
            <div className="flex w-36 font-light justify-between mt-2.5 pb-1 border-2 border-b-gray-300 border-white">
              <div>فروش: </div>
              <div>1482</div>
            </div>
            <div className="flex w-36 font-light justify-between mt-2.5 pb-1 border-2 border-b-gray-300 border-white">
              <div>فعال: </div>
              <div>بله</div>
            </div>
            <div className="flex w-36 font-light justify-between mt-2.5 pb-1 border-2 border-b-gray-300 border-white">
              <div>موجودی: </div>
              <div>نه</div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-5 m-5 shadow-lg">
        <form className="flex justify-between">
          <div className="flex flex-col">
            <label className="mb-2.5 text-gray-700">اسم محصول</label>
            <input
              type="text"
              placeholder="بسته ی طلایی"
              className="mb-2.5 p-1 border-2 border-b-gray-300 border-white"
            />
            <label className="mb-2.5 text-gray-700">موجودی</label>
            <select
              name="icStock"
              id="inStock"
              className="mb-2.5 border-2 border-gray-700"
            >
              <option value="yes">بله</option>
              <option value="no">خیر</option>
            </select>
            <label className="mb-2.5 text-gray-700">فعال</label>
            <select
              name="active"
              id="active"
              className="mb-2.5 border-2 border-gray-700"
            >
              <option value="yes">بله</option>
              <option value="no">خیر</option>
            </select>
          </div>
          <div className="flex flex-col justify-between">
            <div className="flex items-center">
              <img
                className="h-28 w-28 rounded-xl ml-2.5 mr-5 object-cover"
                src={man}
                alt="محصول"
              />
              <label htmlFor="file">
                <MdFileUpload className="text-base cursor-pointer" />
              </label>
              <input type="file" id="file" style={{ display: "none" }} />
            </div>
            <button className="bg-blue-700 text-white font-semibold rounded-xl border-none p-1 cursor-pointer">
              به روز رسانی
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Product;
