import React from "react";
import { BsCurrencyDollar, BsPerson, BsShopWindow } from "react-icons/bs";
import { FiMessageSquare } from "react-icons/fi";
import { IoMdTrendingUp } from "react-icons/io";
import {
  MdLineStyle,
  MdOutlineBarChart,
  MdOutlineDynamicFeed,
  MdOutlineEmail,
  MdReport,
  MdTimeline,
} from "react-icons/md";
import { PiSuitcaseSimple } from "react-icons/pi";
import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-1/5 h-full bg-blue-50">
      <div>
        <h3 className="text-gray-500 font-['vazir'] p-1">داشبورد</h3>
        <ul className="list-none p-1.5">
          <Link to="/" className="no-underline text-inherit">
            <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
              <MdLineStyle className="pl-1.5 text-lg font-['vazir']" />
              خانه
            </li>
          </Link>

          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <MdTimeline className="pl-1.5 text-lg font-['vazir']" />
            تحلیل‌ها
          </li>

          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <IoMdTrendingUp className="pl-1.5 text-lg font-['vazir']" />
            فروش
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-gray-500 font-['vazir'] p-1">منوی سریع</h3>
        <ul className="list-none p-1.5">
          <Link to="/users" className="no-underline text-inherit">
            <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
              <BsPerson className="pl-1.5 text-lg font-['vazir']" />
              کاربران
            </li>
          </Link>

          <Link to="products" className="no-underline text-inherit">
            <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
              <BsShopWindow className="pl-1.5 text-lg font-['vazir']" />
              محصولات
            </li>
          </Link>

          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <BsCurrencyDollar className="pl-1.5 text-lg font-['vazir']" />
            تراکنش‌ها
          </li>

          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <MdOutlineBarChart className="pl-1.5 text-lg font-['vazir']" />
            گزارش‌ها
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-gray-500 font-['vazir'] p-1">اعلان‌ها</h3>
        <ul className="list-none p-1.5">
          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <MdOutlineEmail className="pl-1.5 text-lg font-['vazir']" />
            ایمیل
          </li>

          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <MdOutlineDynamicFeed className="pl-1.5 text-lg font-['vazir']" />
            بازخورد
          </li>

          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <FiMessageSquare className="pl-1.5 text-lg font-['vazir']" />
            پیام‌ها
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-gray-500 font-['vazir'] p-1">کارکنان</h3>
        <ul className="list-none p-1.5">
          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <PiSuitcaseSimple className="pl-1.5 text-lg font-['vazir']" />
            مدیریت
          </li>

          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <MdTimeline className="pl-1.5 text-lg font-['vazir']" />
            تحلیل‌ها
          </li>

          <li className="flex items-center p-1 cursor-pointer hover:bg-neutral-200 rounded-md text-gray-900">
            <MdReport className="pl-1.5 text-lg font-['vazir']" />
            گزارش‌ها
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Sidebar;
