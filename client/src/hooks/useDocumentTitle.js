import { useEffect } from "react";

export const SITE_NAME = "Our Best Side";
const DEFAULT_DESCRIPTION =
  "Our Best Side: menswear and ladieswear, delivered in Singapore.";

// Sets the browser tab title ("Suede Loafers | Our Best Side") and the page's
// meta description, which search engines and link previews use.
const useDocumentTitle = (title, description) => {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description || DEFAULT_DESCRIPTION);
  }, [title, description]);
};

export default useDocumentTitle;
