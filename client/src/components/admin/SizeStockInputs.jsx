import styled from "styled-components";

// One stock box per size in the admin product forms. `values` maps each size
// to the text typed in its box.

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 8px 0px;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;

  input {
    width: 80px;
    padding: 5px;
  }
`;

const Total = styled.p`
  font-size: 13px;
  font-weight: 300;
`;

// The stock to send as JSON ({"S": 3, ...}), or null if any box is empty.
export const sizeStockPayload = (sizes, values) => {
  if (sizes.some((size) => (values[size] ?? "") === "")) return null;
  return JSON.stringify(Object.fromEntries(sizes.map((size) => [size, Number(values[size])])));
};

function SizeStockInputs({ sizes, values, onChange, required }) {
  const total = sizes.reduce((sum, size) => sum + (Number(values[size]) || 0), 0);
  return (
    <div>
      <Grid>
        {sizes.map((size) => (
          <Field key={size}>
            {size}
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              aria-label={`Stock for size ${size}`}
              required={required}
              value={values[size] ?? ""}
              onChange={(e) => onChange({ ...values, [size]: e.target.value })}
            />
          </Field>
        ))}
      </Grid>
      <Total>Total: {total}</Total>
    </div>
  );
}

export default SizeStockInputs;
