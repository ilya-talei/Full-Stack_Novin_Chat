import Sidebar from "./components/sidebar/Sidebar";
import Topbar from "./components/topbar/Topbar";
import Home from "./components/pages/home/Home";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavMenu from "./components/layout/NavMenu";
import UserList from "./components/pages/userList/UserList";
import User from "./components/pages/user/User";
import NewUser from "./components/pages/newUser/NewUser";
import ProductList from "./components/pages/productList/ProductList";
import Product from "./components/pages/product/Product";
import NewProduct from "./components/pages/newProduct/NewProduct";

function App() {
  return (
    <div className="w-screen h-screen overscroll-x-none">
      <Topbar />
      <div className="flex mt-2.5">
        <Router>
          <Sidebar />
          <NavMenu />
          <Routes>
            <Route exact path="/" element={<Home />} />
            <Route exact path="/users" element={<UserList />} />
            <Route exact path="/products" element={<ProductList />} />
            <Route exact path="/product/:productId" element={<Product />} />
            <Route exact path="/newproduct" element={<NewProduct />} />
            <Route exact path="/users/:userId" element={<User />} />
            <Route exact path="/newuser" element={<NewUser />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;
