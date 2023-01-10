import React from "react";
import Annoucement from "../components/Announcement";
import Navbar from "../components/Navbar";
import Carousel from "../components/Carousel";

function Homepage() {
  return (
    <div>
      <Annoucement />
      <Navbar />
      <Carousel />
    </div>
  );
}
export default Homepage;
