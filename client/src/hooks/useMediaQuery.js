import { useEffect, useState } from "react";

const matches = (query) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;

// True while the screen matches a CSS media query, e.g. "(max-width: 1024px)",
// updating when the window is resized or a phone is rotated.
const useMediaQuery = (query) => {
  const [match, setMatch] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const list = window.matchMedia(query);
    const update = () => setMatch(list.matches);
    update();
    // Older Safari versions only support addListener/removeListener.
    if (list.addEventListener) {
      list.addEventListener("change", update);
      return () => list.removeEventListener("change", update);
    }
    list.addListener(update);
    return () => list.removeListener(update);
  }, [query]);

  return match;
};

export default useMediaQuery;
