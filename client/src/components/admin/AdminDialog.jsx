import { useRef } from "react";
import styled from "styled-components";
import useModal from "../../hooks/useModal";
import useCloseOnBack from "../../hooks/useCloseOnBack";

// The pop-ups on the admin order pages (cancel, ship, refund) share this
// frame. While shown:
// - Esc, tapping outside and the phone's Back button close it
// - Tab stays inside, and focus goes to the element marked data-autofocus
//   (or the first button, link or field)
// `children` is a function given `close`, so buttons inside can close it.

const Overlay = styled.div`
  position: fixed;
  inset: 0px;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.4);
`;

const Frame = styled.div`
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 20px 24px 24px;
  border-radius: 10px;
  background: white;
  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 15px;
  line-height: 1.5;

  @media (max-width: 600px) {
    padding: 16px;
  }
`;

export const DialogTitle = styled.h2`
  margin: 0px;
  font-size: 22px;
  font-weight: 500;
`;

// A warning that can't be missed: first thing under the title, in a red
// box, in large bold red text.
const WarningBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 2px solid red;
  border-radius: 10px;
  background-color: #fff0f0;
  color: red;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.3;
`;

const WarningIcon = styled.span`
  font-size: 28px;
  line-height: 1;
`;

export function CannotBeUndone({ id }) {
  return (
    <WarningBox id={id}>
      <WarningIcon aria-hidden="true">⚠</WarningIcon>
      <span>This action cannot be undone.</span>
    </WarningBox>
  );
}

export const DialogList = styled.ul`
  margin: 0px;
  padding-left: 20px;
`;

// A grey box for a related note, e.g. about refunding.
export const DialogNote = styled.div`
  padding: 12px 16px;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  background-color: #f8f4f4;
`;

export const DialogButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
`;

const DialogButton = styled.button`
  flex: 1 1 auto;
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

// "No, keep order" and other ways back: beige, like the site's buttons.
export const BackButton = styled(DialogButton)`
  background-color: #e1d7c6;
  color: black;
`;

// Actions that can't be undone: red.
export const DangerButton = styled(DialogButton)`
  background-color: red;
  color: white;
`;

// Other main actions: black, like "Checkout Now".
export const PrimaryButton = styled(DialogButton)`
  background-color: black;
  color: white;
`;

export const DialogError = styled.p`
  margin: 0px;
  color: red;
  font-size: 14px;
`;

function AdminDialog({ titleId, describedBy, alert = false, onClose, children }) {
  const frameRef = useRef(null);
  // Shown while mounted. Back closes it instead of leaving the page.
  const { close } = useCloseOnBack(true, (value) => {
    if (!value) onClose();
  });
  const trapFocus = useModal(true, { onClose: close, containerRef: frameRef });

  return (
    <Overlay
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <Frame
        ref={frameRef}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        onKeyDown={trapFocus}
      >
        {children({ close })}
      </Frame>
    </Overlay>
  );
}

export default AdminDialog;
