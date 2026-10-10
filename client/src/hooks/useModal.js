import { useEffect } from "react";

const focusable = (container) =>
  container
    ? [...container.querySelectorAll("a[href], button:not([disabled]), input, select")]
    : [];

// Behaviour shared by pop-ups (the mobile menu, the size guide). While open:
// - focus moves to the first button or link inside
// - Esc closes it
// - the page behind doesn't scroll
// - when it closes, focus returns to `returnFocusRef` (the button that opened
//   it) or else to whatever had focus before
// Returns a keydown handler for the pop-up that keeps Tab inside it.
const useModal = (open, { onClose, containerRef, returnFocusRef }) => {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    focusable(containerRef.current)[0]?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    const returnTo = returnFocusRef?.current || previous;
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", closeOnEscape);
      returnTo?.focus?.();
    };
    // Runs on open and close only (onClose is a new function each render).
  }, [open]);

  return (event) => {
    if (event.key !== "Tab") return;
    const items = focusable(containerRef.current);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
};

export default useModal;
