import styled from "styled-components";

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;

  input {
    padding: 10px;
    border: 0.5px solid lightgray;
    border-radius: 10px;
    font-weight: 400;
  }
`;

const Optional = styled.span`
  font-weight: 300;
`;

// Couriers often used in Singapore, offered as suggestions. Any name can be
// typed.
const COURIERS = ["SingPost", "Ninja Van", "J&T Express", "Qxpress", "DHL", "Lalamove"];

// Courier, tracking number and tracking link, used when shipping and on the
// order's page. `value` is { courier, number, url }.
function TrackingFields({ value, onChange, idPrefix = "tracking" }) {
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value });
  return (
    <>
      <Field>
        <span>
          Courier <Optional>(optional)</Optional>
        </span>
        <input
          list={`${idPrefix}-couriers`}
          value={value.courier}
          maxLength={100}
          onChange={set("courier")}
        />
        <datalist id={`${idPrefix}-couriers`}>
          {COURIERS.map((courier) => (
            <option key={courier} value={courier} />
          ))}
        </datalist>
      </Field>
      <Field>
        <span>
          Tracking number <Optional>(optional)</Optional>
        </span>
        <input value={value.number} maxLength={100} onChange={set("number")} />
      </Field>
      <Field>
        <span>
          Tracking link <Optional>(optional)</Optional>
        </span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://"
          value={value.url}
          maxLength={100}
          onChange={set("url")}
        />
      </Field>
    </>
  );
}

export default TrackingFields;
