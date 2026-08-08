import React, { useState } from "react";
import Profiles from "../homepageComponents/Profiles";
import buyimg from "../../assets/avatar45512389.jpg";
import Sinookimg from "../../assets/sinook.jpg";
import Foximg from "../../assets/fox.jpg";
import Amirimg from "../../assets/amir.jpg";
import simg from "../../assets/s.jpg";
// import HeaderPV from "./PvComponents/headerPv";

function Profilessection() {
  // استفاده از index برای مدیریت پروفایل فعال. null یعنی هیچ پروفایلی انتخاب نشده.
  const [activeIndex, setActiveIndex] = useState(null);

  const profilesData = [
    {
      name: "خرید اشتراک",
      date: "30 فروردین",
      text: "نمیدونم والا...",
      img: buyimg,
      ctype: "/groups",
    },
    {
      name: "Sinook",
      date: "22 اسفند",
      text: "برو به زندگین برس...",
      img: Sinookimg,
      ctype: "/personal",
    },
    {
      name: "Fox",
      date: "1 دی",
      text: "سلام...",
      img: Foximg,
      ctype: "/channels",
    },
    // دقت کنید که نام‌ها تکراری هستند. اگر در آینده نیاز به تمایز بیشتری بود، بهتر است یک ID یکتا برای هر کدام تعریف کنید.
    {
      name: "امیر حسینی",
      date: "1 اردیبهشت",
      text: "پروژه در چه حاله؟",
      img: Amirimg,
      ctype: "/channels",
    },
    {
      name: "پشتیبانی سروش",
      date: "2 اسفند",
      text: "کلمه help...",
      img: simg,
      ctype: "/channels",
    },
    {
      name: "امیر حسینی",
      date: "1 اردیبهشت",
      text: "پروژه در چه حاله؟",
      img: Amirimg,
      ctype: "/channels",
    },
  ];

  return (
    <>
      {profilesData.map((p, index) => (
        <Profiles
          key={index}
          active={activeIndex === index}
          name={p.name}
          date={p.date}
          text={p.text}
          img={p.img}
          ctype={p.ctype}
          onClick={() => setActiveIndex(index)}
        />
      ))}
    </>
  );
}

export default Profilessection;
