import Homepage from "./pages/Homepage.jsx";
import MenProducts from "./pages/MenProducts.jsx";
import LadiesProducts from "./pages/LadiesProducts.jsx";
import Cart from "./pages/Cart.jsx";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import { Routes, Route } from "react-router-dom";
import UploadProduct from "./pages/AdminUploadProduct.jsx";
import SearchProduct from "./pages/AdminSearchProduct.jsx";
import EditProduct from "./pages/AdminEditProduct.jsx";
import Dashboard from "./pages/AdminDashboard.jsx";
import IndividualMenProduct from "./pages/IndividualMenProduct.jsx";
import IndividualLadiesProduct from "./pages/IndividualLadiesProduct.jsx";
import { UserAuth } from "./context/Auth.jsx";

function App() {
  const [user] = UserAuth();
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/men" element={<MenProducts />} />
      <Route path="/men/:params" element={<IndividualMenProduct />} />
      <Route path="/ladies/:params" element={<IndividualLadiesProduct />} />
      <Route path="/ladies" element={<LadiesProducts />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<UploadProduct />} />
      <Route path="/search" element={<SearchProduct />} />
      <Route path="/search/:params" element={<EditProduct />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
