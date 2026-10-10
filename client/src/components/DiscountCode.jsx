import { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { errorMessage, formatMoney } from "../utils/format";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0px;

  label {
    font-size: 14px;
    font-weight: 600;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    min-width: 0;
    padding: 10px;
    border: 0.5px solid lightgray;
    border-radius: 10px;
    text-transform: uppercase;
  }

  button {
    border: none;
    padding: 10px 16px;
    cursor: pointer;
    background-color: #e1d7c6;
  }
`;

const Applied = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 10px 0px;
`;

const LinkButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
`;

const ErrorText = styled.p`
  color: red;
  font-size: 14px;
  margin: 0px;
`;

// The discount for a promotion on `amount`, rounded to the cent as Stripe
// does at checkout.
export const discountFor = (amount, percentOff) =>
  Math.round((Math.round(amount * 100) * percentOff) / 100) / 100;

// The cart's discount code box. `discount` is the applied promotion
// ({ code, name, percentOff }) or null; `onChange` sets or clears it.
function DiscountCode({ discount, amount, onChange }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (discount) {
    return (
      <Applied>
        <span>
          <b>
            {discount.code} ({discount.percentOff}% off)
          </b>
          <br />
          {discount.name}
        </span>
        <span>
          −{formatMoney(discountFor(amount, discount.percentOff))}{" "}
          <LinkButton type="button" onClick={() => onChange(null)} aria-label="Remove discount code">
            Remove
          </LinkButton>
        </span>
      </Applied>
    );
  }

  return (
    <Form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setError("");
        setChecking(true);
        try {
          const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/checkout/discount`, {
            code,
          });
          onChange(response.data.data);
          setCode("");
        } catch (err) {
          setError(errorMessage(err, "Couldn't check that code. Please try again."));
        } finally {
          setChecking(false);
        }
      }}
    >
      <label htmlFor="discount-code">Discount code</label>
      <Row>
        <input
          id="discount-code"
          value={code}
          autoComplete="off"
          autoCapitalize="characters"
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" disabled={checking}>
          {checking ? "Checking…" : "Apply"}
        </button>
      </Row>
      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Form>
  );
}

export default DiscountCode;
