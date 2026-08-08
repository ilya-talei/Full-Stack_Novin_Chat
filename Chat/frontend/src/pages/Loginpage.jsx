import React from 'react'
import loginImg from '../assets/login.jpg'

export default function Loginpage() {
  return (
    <div dir="rtl" className='grid grid-cols-1 sm:grid-cols-2 h-screen w-full'>
        
        {/* تصویر در سمت راست در حالت دسکتاپ */}
        <div className='hidden sm:block order-1 sm:order-2'>
            <img className='w-full h-full object-cover' src={loginImg} alt="" />
        </div>

        {/* فرم در سمت چپ */}
        <div className='bg-ngray-900 flex flex-col justify-center order-2 sm:order-1'>
            <form className='max-w-[400px] w-full mx-auto rounded-2xl bg-ngray-800 p-8 px-8 text-right'>
                
                <h2 className='text-4xl text-white font-bold text-center mb-3'>
                    ورود به حساب
                </h2>

                <div className='flex flex-col text-neutral-100 pt-2'>
                    <label>نام کاربری</label>
                    <input 
                      className='rounded-lg bg-ngray-500 mt-2 p-2 focus:border-blue-500 focus:bg-ngray-200 focus:outline-none' 
                      type="text" 
                    />
                </div>

                <div className='flex flex-col text-neutral-100 py-2'>
                    <label>رمز عبور</label>
                    <input 
                      className='p-2 rounded-lg bg-ngray-500 mt-2 focus:border-blue-500 focus:bg-ngray-200 focus:outline-none' 
                      type="password" 
                    />
                </div>

                <div className='flex justify-between text-neutral-500 mt-1'>
                    <p>فراموشی رمز عبور</p>
                    <p className='flex items-center'>
                        مرا به خاطر بسپار
                        <input className='mx-2 ' type="checkbox" />
                    </p>
                </div>

                <button className='w-full my-5 py-2 bg-[#58a4b0] shadow-lg  text-white rounded-lg'>
                    ورود
                </button>
                
            </form>
        </div>
    </div>
  )
}
