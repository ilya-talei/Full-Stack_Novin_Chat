
import logo from '../assets/logoss.svg'


function Loginpage1() {
  

  return (
    <>
      

      <div className="bg-sliderbg w-screen h-screen flex flex-col  items-center">

        <div className='bg-ngray-800 mt-44 w-[500px] flex justify-center rounded-2xl'>

            <div className="w-[350px] text-center py-10">


            <img src={logo} alt="" className='mx-auto'/>

            <div className="text-3xl text-white font-bold mb-3 mt-5">ورود به نوین چت</div>
            <div className="text-neutral-400 mb-10">لطفا پس از بررسی نام رمز عبور خود را وارد کنید.</div>


            <div className="text-start mb-1 text-neutral-200">نام :</div>

            <input
            type="text"
            className="w-full mb-5 py-3 bg-sliderbg border rounded-xl border-[#565655] hover:border-npurple-borders focus:border-npurple-borders focus:ring-[2px] focus:ring-npurple-borders focus:outline-none text-neutral-100 px-2"
            />

            <div className="text-start mb-1 text-neutral-200">رمز عبور:</div>


            <input
            type="text"
            className="w-full mb-10 py-3 bg-sliderbg border rounded-xl border-[#565655] hover:border-npurple-borders focus:border-npurple-borders focus:ring-[2px] focus:ring-npurple-borders focus:outline-none text-neutral-100 px-2"
            />

            <button className="w-full bg-[#8774E1] py-4 text-white rounded-2xl">بعدی</button>


            


        </div>

        </div>

        
        

      </div>


    </>
  )
}

export default Loginpage1
