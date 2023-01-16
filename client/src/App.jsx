import Homepage from "./pages/Homepage.jsx";
import MenProducts from "./pages/MenProducts.jsx";
import LadiesProducts from "./pages/LadiesProducts.jsx";
import Cart from "./pages/Cart.jsx";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/men" element={<MenProducts />} />
      <Route path="/ladies" element={<LadiesProducts />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
