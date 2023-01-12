import Homepage from "./pages/Homepage.jsx";
import MenProducts from "./pages/MenProducts.jsx";
import LadiesProducts from "./pages/LadiesProducts.jsx";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/men" element={<MenProducts />} />
      <Route path="ladies" element={<LadiesProducts />} />
    </Routes>
  );
}

export default App;
