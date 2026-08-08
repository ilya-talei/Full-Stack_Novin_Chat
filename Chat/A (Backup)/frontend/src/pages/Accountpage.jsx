import BoxOne from "../components/accountpageComponents/BoxOne"
import BoxTwo from "../components/accountpageComponents/BoxTwo"
import BoxThree from "../components/accountpageComponents/BoxThree"
import simg from '../assets/fox.jpg';

const profilesData = [
    { name: 'پارسا', img: simg , number : '+98 993 973 7403'},           
  ];

function accountpage() {
  

  return (
    <>
      

      <div className="text-white text-xl mr-9 mt-3 font-semibold">حساب من</div>


      <div>

        <BoxOne username={profilesData[0].name} imgsrc={profilesData[0].img} number={profilesData[0].number}/>

        <BoxTwo />

        <BoxThree />

      </div>


    </>
  )
}

export default accountpage
