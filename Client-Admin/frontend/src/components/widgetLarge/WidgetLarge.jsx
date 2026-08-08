import woman from "../../assets/images/woman.jpg";
import Button from "../ui/Button";

function WidgetLarge() {
  return (
    <div className="flex-2 shadow-lg p-5">
      <h3 className="text-base font-semibold font-['vazir']">
        آخرین تراکنش‌ها
      </h3>
      <table className="w-full border-spacing-5">
        <tr>
          <th className="text-right pr-4 font-['vazir']">مشتری</th>
          <th className="text-right font-['vazir']">تاریخ</th>
          <th className="text-right font-['vazir']">مقدار</th>
          <th className="text-right font-['vazir']">وضعیت</th>
        </tr>
        <tr>
          <td className="flex items-center font-semibold my-2.5">
            <img
              src={woman}
              alt="profile"
              className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-2"
            />
            <div className="font-['vazir']">توحید لطیفی</div>
          </td>
          <td className="font-light font-['vazir']">1405/06/24</td>
          <td className="font-light font-['vazir']">500.00 ريال</td>
          <td>
            <Button
              type="تأیید شد"
              className="bg-emerald-100 text-emerald-500 font-['vazir'] flex border-none cursor-pointer items-center rounded-xl py-2 px-2.5 "
            />
          </td>
        </tr>

        <tr>
          <td className="flex items-center font-semibold my-2.5">
            <img
              src={woman}
              alt="profile"
              className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-2"
            />
            <div className="font-['vazir']">توحید لطیفی</div>
          </td>
          <td className="font-light font-['vazir']">1405/06/24</td>
          <td className="font-light font-['vazir']">500.00 ريال</td>
          <td>
            <Button
              type="رد شده"
              className="bg-red-100 text-red-500 font-['vazir'] flex border-none cursor-pointer items-center rounded-xl py-2 px-2.5 "
            />
          </td>
        </tr>

        <tr>
          <td className="flex items-center font-semibold my-2.5">
            <img
              src={woman}
              alt="profile"
              className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-2"
            />
            <div className="font-['vazir']">توحید لطیفی</div>
          </td>
          <td className="font-light font-['vazir']">1405/06/24</td>
          <td className="font-light font-['vazir']">500.00 ريال</td>
          <td>
            <Button
              type="در انتظار"
              className="bg-blue-100 text-blue-500 font-['vazir'] flex border-none cursor-pointer items-center rounded-xl py-2 px-2.5 "
            />
          </td>
        </tr>

        <tr>
          <td className="flex items-center font-semibold my-2.5">
            <img
              src={woman}
              alt="profile"
              className="w-10 h-10 rounded-full object-cover cursor-pointer my-0 mx-2"
            />
            <div className="font-['vazir']">توحید لطیفی</div>
          </td>
          <td className="font-light font-['vazir']">1405/06/24</td>
          <td className="font-light font-['vazir']">500.00 ريال</td>
          <td>
            <Button
              type="تأیید شد"
              className="bg-emerald-100 text-emerald-500 font-['vazir'] flex border-none cursor-pointer items-center rounded-xl py-2 px-2.5 "
            />
          </td>
        </tr>
      </table>
    </div>
  );
}

export default WidgetLarge;
