import { useRef, useState } from "react";
import styled from "styled-components";
import CloseIcon from "@mui/icons-material/Close";
import useModal from "../hooks/useModal";
import useCloseOnBack from "../hooks/useCloseOnBack";
import { SIZE_CHARTS, HOW_TO_MEASURE, pickSizeChart, chartRowFor } from "../config/sizeGuide";

// "Size guide" link beside the size picker; opens the right chart for the
// product (see config/sizeGuide.js) with the chosen size highlighted.

const Trigger = styled.button`
  margin-left: 12px;
  white-space: nowrap;
  padding: 0px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
`;

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

const Dialog = styled.div`
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px 24px 24px;
  border-radius: 10px;
  background: white;
  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.2);

  @media (max-width: 600px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const Title = styled.h2`
  margin: 0px;
  font-size: 22px;
  font-weight: 500;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-right: -10px;
  padding: 0px;
  border: none;
  background: none;
  cursor: pointer;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;

  caption {
    margin-bottom: 8px;
    text-align: left;
    font-size: 14px;
    font-weight: 300;
  }

  th,
  td {
    padding: 8px;
    border-bottom: 0.5px solid lightgray;
    text-align: left;
  }

  th {
    font-weight: 600;
  }
`;

const Row = styled.tr`
  background: ${(props) => (props.selected ? "#f8f4f4" : "transparent")};
  font-weight: ${(props) => (props.selected ? 600 : 400)};
`;

const Tips = styled.ul`
  margin: 16px 0px 0px;
  padding-left: 20px;
  font-size: 14px;
  font-weight: 300;
  line-height: 1.6;
`;

function SizeGuide({ product, sizes, selectedSize }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  // The phone's Back button closes the guide instead of leaving the page.
  const { close } = useCloseOnBack(open, setOpen);
  const trapFocus = useModal(open, {
    onClose: close,
    containerRef: dialogRef,
    returnFocusRef: triggerRef,
  });

  const chartKey = pickSizeChart(product, sizes);
  if (!chartKey) return null;
  const chart = SIZE_CHARTS[chartKey];
  const selectedRow = chartRowFor(selectedSize);
  const unit = chartKey === "shoes" ? "Foot length in cm" : "Body measurements in cm";

  return (
    <>
      <Trigger ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Size guide
      </Trigger>
      {open && (
        <Overlay
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <Dialog
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            onKeyDown={trapFocus}
          >
            <Header>
              <Title id="size-guide-title">Size guide</Title>
              <CloseButton type="button" aria-label="Close size guide" onClick={close}>
                <CloseIcon />
              </CloseButton>
            </Header>
            <Table>
              <caption>
                {chart.title}. {unit}.
              </caption>
              <thead>
                <tr>
                  {chart.columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.rows.map(([size, ...values]) => (
                  <Row
                    key={size}
                    selected={size.toUpperCase() === selectedRow}
                    aria-current={size.toUpperCase() === selectedRow ? "true" : undefined}
                  >
                    <th scope="row">{size}</th>
                    {values.map((value, i) => (
                      <td key={i}>{value}</td>
                    ))}
                  </Row>
                ))}
              </tbody>
            </Table>
            <Tips>
              {HOW_TO_MEASURE[chartKey].map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </Tips>
          </Dialog>
        </Overlay>
      )}
    </>
  );
}

export default SizeGuide;
