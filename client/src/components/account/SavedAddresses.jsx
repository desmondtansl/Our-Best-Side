import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import {
  Section,
  SectionHeader,
  SectionTitle,
  Card,
  CardRow,
  Muted,
  Actions,
  Button,
  LinkButton,
  Badge,
  ErrorText,
  Empty,
} from "./styles";
import { errorMessage } from "../../utils/format";

const Form = styled.form`
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 540px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  grid-column: ${(props) => (props.wide ? "1 / -1" : "auto")};
`;

const Input = styled.input`
  padding: 10px;
  font-size: 14px;
`;

const CheckboxField = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  grid-column: 1 / -1;
`;

const FormActions = styled(Actions)`
  grid-column: 1 / -1;
`;

const API = () => `${import.meta.env.VITE_BASE_URL}/account/addresses`;

const EMPTY_FORM = {
  label: "",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "SG",
  phone: "",
  isDefault: false,
};

const FIELDS = [
  { name: "label", label: "Label (e.g. Home, Office)", required: false },
  { name: "fullName", label: "Full name", required: true },
  { name: "line1", label: "Address line 1", required: true, wide: true },
  { name: "line2", label: "Address line 2", required: false, wide: true },
  { name: "city", label: "City", required: true },
  { name: "state", label: "State / region", required: false },
  { name: "postalCode", label: "Postal code", required: true },
  { name: "country", label: "Country code (e.g. SG)", required: true, maxLength: 2 },
  { name: "phone", label: "Phone", required: false },
];

function SavedAddresses() {
  const [addresses, setAddresses] = useState(null);
  const [form, setForm] = useState(null); // null = form closed
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await axios.get(API());
        setAddresses(response.data.data);
      } catch (err) {
        setError(errorMessage(err, "Could not load your addresses"));
      }
    };
    fetchAddresses();
  }, []);

  const openNew = () => {
    setError("");
    setEditingId(null);
    setForm({ ...EMPTY_FORM, isDefault: !addresses?.length });
  };

  const openEdit = (address) => {
    setError("");
    setEditingId(address._id);
    setForm({ ...EMPTY_FORM, ...address });
  };

  const closeForm = () => {
    setForm(null);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const run = async (request) => {
    setError("");
    setSaving(true);
    try {
      const response = await request();
      setAddresses(response.data.data);
      return true;
    } catch (err) {
      setError(errorMessage(err, "Could not save the address"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    for (const { name } of FIELDS) payload[name] = form[name].trim();
    payload.country = payload.country.toUpperCase();
    payload.isDefault = form.isDefault;
    const ok = await run(() =>
      editingId
        ? axios.put(`${API()}/${editingId}`, payload)
        : axios.post(API(), payload)
    );
    if (ok) closeForm();
  };

  const handleDelete = (address) => {
    if (!window.confirm("Delete this address?")) return;
    run(() => axios.delete(`${API()}/${address._id}`));
  };

  const handleMakeDefault = (address) =>
    run(() => axios.put(`${API()}/${address._id}`, { isDefault: true }));

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>Saved addresses</SectionTitle>
        {!form && (
          <Button type="button" onClick={openNew}>
            Add address
          </Button>
        )}
      </SectionHeader>
      {error && <ErrorText>{error}</ErrorText>}

      {form && (
        <Form onSubmit={handleSubmit} aria-label="Address form">
          {FIELDS.map((field) => (
            <Field key={field.name} wide={field.wide}>
              {field.label}
              <Input
                name={field.name}
                value={form[field.name] || ""}
                onChange={handleChange}
                required={field.required}
                maxLength={field.maxLength}
              />
            </Field>
          ))}
          <CheckboxField>
            <input
              type="checkbox"
              name="isDefault"
              checked={form.isDefault}
              onChange={handleChange}
            />
            Use as my default address
          </CheckboxField>
          <FormActions>
            <Button type="submit" primary disabled={saving}>
              {editingId ? "Save changes" : "Save address"}
            </Button>
            <Button type="button" onClick={closeForm}>
              Cancel
            </Button>
          </FormActions>
        </Form>
      )}

      {addresses === null && !error && <Muted>Loading addresses…</Muted>}
      {addresses?.length === 0 && !form && (
        <Empty>No saved addresses yet.</Empty>
      )}
      {addresses?.map((address) => (
        <Card key={address._id} data-testid="address">
          <CardRow>
            <b>{address.label || address.fullName}</b>
            {address.isDefault && <Badge>Default</Badge>}
          </CardRow>
          <span>
            {address.fullName}
            <br />
            {address.line1}
            {address.line2 && (
              <>
                <br />
                {address.line2}
              </>
            )}
            <br />
            {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}{" "}
            {address.country}
            {address.phone && (
              <>
                <br />
                {address.phone}
              </>
            )}
          </span>
          <Actions>
            <LinkButton type="button" onClick={() => openEdit(address)}>
              Edit
            </LinkButton>
            {!address.isDefault && (
              <LinkButton type="button" onClick={() => handleMakeDefault(address)}>
                Set as default
              </LinkButton>
            )}
            <LinkButton type="button" danger onClick={() => handleDelete(address)}>
              Delete
            </LinkButton>
          </Actions>
        </Card>
      ))}
    </Section>
  );
}

export default SavedAddresses;
