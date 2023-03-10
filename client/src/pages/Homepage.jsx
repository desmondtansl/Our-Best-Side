import React from "react";
import Annoucement from "../components/Announcement.jsx";
import Navbar from "../components/Navbar.jsx";
import Carousel from "../components/Carousel.jsx";
import FeaturedProductsList from "../components/FeaturedProductsList.jsx";
import FeaturedProductsHeader from "../components/FeaturedProductsHeader.jsx";
import Newsletter from "../components/Newsletter.jsx";
import Footer from "../components/Footer.jsx";

function Homepage() {
  return (
    <div>
      <Annoucement />
      <Navbar />
      <Carousel />
      <FeaturedProductsHeader />
      <FeaturedProductsList />
      <Newsletter />
      <Footer />
    </div>
  );
}
export default Homepage;
