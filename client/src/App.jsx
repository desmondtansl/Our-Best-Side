import Homepage from "./pages/Homepage.jsx";
import MenProducts from "./pages/MenProducts.jsx";
import LadiesProducts from "./pages/LadiesProducts.jsx";
import Cart from "./pages/Cart.jsx";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/men" element={<MenProducts />} />
      <Route path="/ladies" element={<LadiesProducts />} />
      <Route path="/cart" element={<Cart />} />
    </Routes>
  );
}

export default App;
