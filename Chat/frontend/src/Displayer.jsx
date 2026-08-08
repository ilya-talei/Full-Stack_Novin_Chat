import { Routes, Route, Navigate } from "react-router-dom";
import Homepage from "../src/pages/Homepage";
import Notifs from "./pages/Notifs";
import Call from "./pages/Call";
import Contacts from "./pages/Contacts";
import Footer from "./components/homepageComponents/Footer";
import Accountpage from "../src/pages/Accountpage";
import Loginpage1 from "./pages/Loginpage1";
import NavMenue from "./components/homepageComponents/NavMenue";

function Displayer() {
  return (
    <>
      <Footer />
      <NavMenue />
      <Routes>
        <Route path="/" element={<Navigate to="/homePage" replace />} />
        <Route path="/login" element={<Loginpage1 />} />

        <Route path="/homePage" element={<Homepage />} />
        <Route path="/notif" element={<Notifs />} />
        <Route path="/call" element={<Call />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/accountPage" element={<Accountpage />} />

        <Route path="/personal" element={<Homepage />} />
        <Route path="/groups" element={<Homepage />} />
        <Route path="/channels" element={<Homepage />} />
      </Routes>
    </>
  );
}

export default Displayer;
