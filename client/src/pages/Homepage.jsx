import React from "react";
import Annoucement from "../components/Announcement.jsx";
import Navbar from "../components/Navbar.jsx";
import Carousel from "../components/Carousel.jsx";
import FeaturedProductsList from "../components/FeaturedProductsList.jsx";

function Homepage() {
  return (
    <div>
      <Annoucement />
      <Navbar />
      <Carousel />
      <FeaturedProductsList />
    </div>
  );
}
export default Homepage;
