import Searchbar from "../components/homepageComponents/Searchbar"
import Category from "../components/homepageComponents/Category"
import Profiles from "../components/homepageComponents/Profiles"
import Profilessection from "../components/homepageComponents/Profilessection";

function Homepage() {
  

  return (
    <>
      <div className="">

        <div>

            <div className="flex items-center mx-3">

              <Searchbar />
              <Category />
              

            </div>

            <div className="mt-5 mx-4">

              <Profilessection />

            </div>

        </div>

        

      </div>
    </>
  )
}

export default Homepage
