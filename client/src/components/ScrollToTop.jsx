import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Opening another page (e.g. a "You may also like" product or a search
// suggestion) starts at the top, as a normal page load would. Changes to
// filters or sort only change the address's ?query, so they don't scroll.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default ScrollToTop;
