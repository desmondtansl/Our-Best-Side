import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { formatDate } from "../utils/format";

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  position: relative;
  padding: 10px 48px;
  background-color: teal;
  color: white;
  font-size: 15px;
  font-weight: 500;
  text-align: center;

  @media (max-width: 600px) {
    padding: 10px 44px 10px 16px;
    font-size: 14px;
  }
`;

const Ends = styled.span`
  font-weight: 300;
`;

const CopyButton = styled.button`
  border: 1px dashed white;
  border-radius: 6px;
  padding: 3px 10px;
  background: transparent;
  color: white;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }
`;

const Dismiss = styled.button`
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
`;

// Banners a shopper closed stay closed in this browser (per code).
const STORAGE_KEY = "dismissedPromoBanners";

const readDismissed = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
};

const saveDismissed = (codes) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch (error) {
    // Private browsing: it just won't be remembered.
  }
};

// Running promotions, announced at the top of the homepage. Set up in the
// admin Discounts page; nothing shows when no promotion is running.
function PromoBanner() {
  const [banners, setBanners] = useState([]);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/promotions/banners`);
        setBanners(response.data.data || []);
      } catch (error) {
        // The homepage works without banners.
        setBanners([]);
      }
    };
    fetchBanners();
  }, []);

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch (error) {
      // Clipboard not available: the code is on screen to type.
    }
  };

  const shown = banners.filter((banner) => !dismissed.includes(banner.code));
  if (!shown.length) return null;

  return (
    <div>
      {shown.map((banner) => (
        <Bar key={banner.code} role="region" aria-label={`Promotion ${banner.code}`}>
          <span>{banner.text}</span>
          <CopyButton
            type="button"
            onClick={() => copy(banner.code)}
            aria-label={`Copy code ${banner.code}`}
          >
            {copied === banner.code ? "Copied!" : banner.code}
          </CopyButton>
          {banner.endDate && <Ends>Ends {formatDate(`${banner.endDate}T00:00:00`)}</Ends>}
          <Dismiss
            type="button"
            aria-label="Close this promotion"
            onClick={() => {
              const next = [...dismissed, banner.code];
              setDismissed(next);
              saveDismissed(next);
            }}
          >
            ✕
          </Dismiss>
        </Bar>
      ))}
    </div>
  );
}

export default PromoBanner;
