import React from "react";
import Annoucement from "../components/Announcement.jsx";
import Navbar from "../components/Navbar.jsx";
import Carousel from "../components/Carousel.jsx";
import FeaturedProducts from "../components/FeaturedProducts.jsx";

function Homepage() {
  return (
    <div>
      <Annoucement />
      <Navbar />
      <Carousel />
      <FeaturedProducts />
    </div>
  );
}
export default Homepage;
