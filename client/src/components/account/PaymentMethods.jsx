import { useEffect, useState } from "react";
import axios from "axios";
import {
  Section,
  SectionHeader,
  SectionTitle,
  Card,
  CardRow,
  Muted,
  Button,
  LinkButton,
  ErrorText,
  Empty,
} from "./styles";
import { errorMessage } from "../../utils/format";
import { redirectTo } from "../../utils/redirect";

const API = () => `${import.meta.env.VITE_BASE_URL}/account/payment-methods`;

// Cards are stored by Stripe. This page only ever sees the brand, the last
// four digits and the expiry date.
function PaymentMethods() {
  const [methods, setMethods] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const response = await axios.get(API());
        setMethods(response.data.data);
      } catch (err) {
        setError(errorMessage(err, "Could not load your saved cards"));
      }
    };
    fetchMethods();
  }, []);

  const handleAdd = async () => {
    setError("");
    setBusy(true);
    try {
      const response = await axios.post(`${API()}/setup-session`);
      redirectTo(response.data.data);
    } catch (err) {
      setError(errorMessage(err, "Could not start adding a card"));
      setBusy(false);
    }
  };

  const handleRemove = async (method) => {
    if (!window.confirm(`Remove card ending in ${method.last4}?`)) return;
    setError("");
    setBusy(true);
    try {
      await axios.delete(`${API()}/${method.id}`);
      setMethods((current) => current.filter((m) => m.id !== method.id));
    } catch (err) {
      setError(errorMessage(err, "Could not remove the card"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>Payment methods</SectionTitle>
        <Button type="button" onClick={handleAdd} disabled={busy}>
          Add a card
        </Button>
      </SectionHeader>
      <Muted>
        Cards are stored securely by Stripe. You can also choose to save a card
        when you check out.
      </Muted>
      {error && <ErrorText>{error}</ErrorText>}
      {methods === null && !error && <Muted>Loading saved cards…</Muted>}
      {methods?.length === 0 && <Empty>No saved cards yet.</Empty>}
      {methods?.map((method) => (
        <Card key={method.id} data-testid="payment-method">
          <CardRow>
            <span>
              <b>{method.brand?.toUpperCase()}</b> •••• {method.last4}
            </span>
            <Muted>
              Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}
            </Muted>
          </CardRow>
          <div>
            <LinkButton
              type="button"
              danger
              disabled={busy}
              onClick={() => handleRemove(method)}
            >
              Remove
            </LinkButton>
          </div>
        </Card>
      ))}
    </Section>
  );
}

export default PaymentMethods;
