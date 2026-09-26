import React from "react";
import Navbar from "../components/Navbar.jsx";
import Carousel from "../components/Carousel.jsx";
import FeaturedProductsList from "../components/FeaturedProductsList.jsx";
import Newsletter from "../components/Newsletter.jsx";
import Footer from "../components/Footer.jsx";

function Homepage() {
  return (
    <div>
      <Navbar />
      <Carousel />
      <FeaturedProductsList />
      <Newsletter />
      <Footer />
    </div>
  );
}
export default Homepage;
