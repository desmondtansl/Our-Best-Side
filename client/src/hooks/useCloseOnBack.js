import { useEffect, useRef } from "react";

// While a pop-up (the mobile menu, the size guide) is open, the phone's Back
// button or gesture closes it instead of leaving the page. Opening adds an
// entry to the browser history for the pop-up; Back removes it.
//
// Returns:
// - close(): closes the pop-up and removes its history entry, for ✕, Esc and
//   tapping outside.
// - closeForLink(): closes the pop-up when a link inside it is followed. The
//   link should navigate with `replace`, so it takes the pop-up's place in
//   the history instead of leaving an extra entry behind.
const useCloseOnBack = (open, setOpen) => {
  const entryAdded = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    window.history.pushState({ ...window.history.state, popup: true }, "");
    entryAdded.current = true;
    const closeOnBack = () => {
      entryAdded.current = false;
      setOpen(false);
    };
    window.addEventListener("popstate", closeOnBack);
    return () => window.removeEventListener("popstate", closeOnBack);
    // Runs on open and close only.
  }, [open]);

  const close = () => {
    if (entryAdded.current) {
      entryAdded.current = false;
      window.history.back();
    }
    setOpen(false);
  };

  const closeForLink = () => {
    entryAdded.current = false;
    setOpen(false);
  };

  return { close, closeForLink };
};

export default useCloseOnBack;
