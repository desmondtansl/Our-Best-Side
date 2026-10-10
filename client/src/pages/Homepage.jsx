import React from "react";
import Navbar from "../components/Navbar.jsx";
import Carousel from "../components/Carousel.jsx";
import PromoBanner from "../components/PromoBanner.jsx";
import FeaturedProductsList from "../components/FeaturedProductsList.jsx";
import Newsletter from "../components/Newsletter.jsx";
import Footer from "../components/Footer.jsx";
import useDocumentTitle from "../hooks/useDocumentTitle";

function Homepage() {
  useDocumentTitle();
  return (
    <div>
      <Navbar />
      <PromoBanner />
      <Carousel />
      <FeaturedProductsList />
      <Newsletter />
      <Footer />
    </div>
  );
}
export default Homepage;
