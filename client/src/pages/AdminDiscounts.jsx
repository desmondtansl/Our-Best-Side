import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import BackToDashboard from "../components/BackToDashboard";
import { Button, LinkButton } from "../components/account/styles";
import { errorMessage, formatDate } from "../utils/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Container = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
  font-size: 15px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 600;
`;

const Intro = styled.p`
  font-weight: 300;
  max-width: 720px;
`;

const Card = styled.form`
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 16px 20px;
  margin: 16px 0px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 12px;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
    font-weight: 600;
  }

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

const Inline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 0.5px solid lightgray;
    vertical-align: top;
  }
`;

const Code = styled.code`
  font-family: inherit;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const STATE_STYLES = {
  running: { border: "teal", label: "Running" },
  scheduled: { border: "#c08a00", label: "Scheduled" },
  ended: { border: "gray", label: "Ended" },
  paused: { border: "gray", label: "Paused" },
};

const State = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  background-color: #f8f4f4;
  border: 1px solid ${(props) => STATE_STYLES[props.$state]?.border || "gray"};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
`;

const ErrorText = styled.p`
  color: red;
  font-size: 14px;
  margin: 0;
`;

const Notice = styled.p`
  color: teal;
  font-weight: 600;
  margin: 0;
`;

const API = () => `${import.meta.env.VITE_BASE_URL}/admin/promotions`;

const EMPTY = {
  name: "",
  code: "",
  percentOff: "",
  startDate: "",
  endDate: "",
  showBanner: true,
  // Empty: the standard wording below, which follows the code and %.
  bannerText: "",
};

// The banner's standard wording (the same as the server's).
export const defaultBannerText = (form) =>
  `Use promo code ${form.code.trim().toUpperCase() || "CODE"} for ${form.percentOff || "?"}% off!`;

// "10 Oct – 17 Oct 2026", or "From 10 Oct 2026" with no end date.
const dateRange = (promotion) => {
  const start = formatDate(`${promotion.startDate}T00:00:00`);
  return promotion.endDate
    ? `${start} – ${formatDate(`${promotion.endDate}T00:00:00`)}`
    : `From ${start}`;
};

const toForm = (promotion) => ({
  name: promotion.name,
  code: promotion.code,
  percentOff: String(promotion.percentOff),
  startDate: promotion.startDate,
  endDate: promotion.endDate || "",
  showBanner: promotion.showBanner !== false,
  bannerText: promotion.bannerText || "",
});

const toBody = (form, active) => ({
  ...form,
  code: form.code.trim(),
  percentOff: Number(form.percentOff),
  bannerText: form.bannerText.trim(),
  active,
});

const BannerFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background-color: #f8f4f4;
  font-size: 14px;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: 600;
  }

  label.check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  input[type="text"] {
    padding: 10px;
    border: 0.5px solid lightgray;
    border-radius: 10px;
    font-weight: 400;
  }
`;

// What the homepage banner will look like.
const Preview = styled.div`
  padding: 8px 12px;
  border-radius: 6px;
  background-color: teal;
  color: white;
  font-weight: 500;
  text-align: center;
`;

// Discount codes: each has a name, a code shoppers type in the cart, a
// percentage and the dates it works between.
function AdminDiscounts() {
  useDocumentTitle("Discounts");
  const [promotions, setPromotions] = useState(null);
  const [form, setForm] = useState(EMPTY);
  // The promotion being edited, or null when the form makes a new one.
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const response = await axios.get(API());
      setPromotions(response.data.data);
    } catch (err) {
      setError(errorMessage(err, "Could not load the discounts"));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const resetForm = () => {
    setForm(EMPTY);
    setEditing(null);
    setFormError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setNotice("");
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API()}/${editing._id}`, toBody(form, editing.active));
        setNotice(`Saved "${form.name}".`);
      } else {
        await axios.post(API(), toBody(form, true));
        setNotice(`Created "${form.name}". Shoppers can use ${form.code.trim().toUpperCase()} in their cart.`);
      }
      resetForm();
      await load();
    } catch (err) {
      setFormError(errorMessage(err, "Couldn't save the promotion"));
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (promotion, active) => {
    setError("");
    setNotice("");
    try {
      await axios.put(`${API()}/${promotion._id}`, toBody(toForm(promotion), active));
      await load();
    } catch (err) {
      setError(errorMessage(err, "Couldn't change the promotion"));
    }
  };

  const remove = async (promotion) => {
    if (!window.confirm(`Delete "${promotion.name}" (${promotion.code})?`)) return;
    setError("");
    setNotice("");
    try {
      await axios.delete(`${API()}/${promotion._id}`);
      if (editing?._id === promotion._id) resetForm();
      await load();
    } catch (err) {
      setError(errorMessage(err, "Couldn't delete the promotion"));
    }
  };

  return (
    <Container>
      <Header>
        <Title>Discounts</Title>
        <BackToDashboard />
      </Header>
      <Intro>
        Shoppers type a code in their cart to get a percentage off their order. Each code works
        from the start of its start date until the end of its end date, Singapore time. Without
        an end date, it works until you pause it. While a code is running, a banner on the
        homepage tells shoppers about it (you can turn this off for each code).
      </Intro>

      <Card onSubmit={submit} aria-labelledby="promotion-form-title">
        <CardTitle id="promotion-form-title">
          {editing ? `Edit "${editing.name}"` : "New promotion"}
        </CardTitle>
        <Fields>
          <label>
            Name of the promotion
            <input value={form.name} maxLength={80} required placeholder="e.g. Welcome offer" onChange={set("name")} />
          </label>
          <label>
            Code
            <input
              value={form.code}
              maxLength={30}
              required
              placeholder="e.g. WELCOME10"
              style={{ textTransform: "uppercase" }}
              onChange={set("code")}
            />
          </label>
          <label>
            Discount (%)
            <input
              type="number"
              min="1"
              max="90"
              step="1"
              required
              value={form.percentOff}
              onChange={set("percentOff")}
            />
          </label>
          <label>
            Start date
            <input type="date" required value={form.startDate} onChange={set("startDate")} />
          </label>
          <label>
            <span>
              End date <Optional>(optional)</Optional>
            </span>
            <input
              type="date"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={set("endDate")}
            />
          </label>
        </Fields>
        <BannerFields>
          <label className="check">
            <input
              type="checkbox"
              checked={form.showBanner}
              onChange={(e) => setForm({ ...form, showBanner: e.target.checked })}
            />
            Show a banner on the homepage while it&apos;s running
          </label>
          {form.showBanner && (
            <>
              <label>
                <span>
                  Banner message <Optional>(optional, up to 140 characters)</Optional>
                </span>
                <input
                  type="text"
                  maxLength={140}
                  value={form.bannerText}
                  placeholder={defaultBannerText(form)}
                  onChange={set("bannerText")}
                />
              </label>
              <span>Preview:</span>
              <Preview aria-label="Banner preview">{form.bannerText.trim() || defaultBannerText(form)}</Preview>
            </>
          )}
        </BannerFields>
        {formError && <ErrorText role="alert">{formError}</ErrorText>}
        <Inline>
          <Button primary type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create promotion"}
          </Button>
          {editing && (
            <Button type="button" onClick={resetForm}>
              Cancel
            </Button>
          )}
          {editing?.timesUsed > 0 && (
            <span>
              Changes apply to new orders only; the {editing.timesUsed} orders already placed keep
              their discount.
            </span>
          )}
        </Inline>
      </Card>

      {notice && <Notice role="status">{notice}</Notice>}
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {promotions === null && !error && <p>Loading discounts…</p>}
      {promotions?.length === 0 && <p>No promotions yet. Create one above.</p>}
      {promotions?.length > 0 && (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <th>Promotion</th>
                <th>Code</th>
                <th>Discount</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion._id}>
                  <td>{promotion.name}</td>
                  <td>
                    <Code>{promotion.code}</Code>
                  </td>
                  <td>{promotion.percentOff}% off</td>
                  <td>{dateRange(promotion)}</td>
                  <td>
                    <State $state={promotion.state}>{STATE_STYLES[promotion.state]?.label}</State>
                    {promotion.showBanner !== false && (
                      <div>{promotion.state === "running" ? "Banner showing" : "Banner on"}</div>
                    )}
                  </td>
                  <td>
                    {promotion.timesUsed} {promotion.timesUsed === 1 ? "order" : "orders"}
                  </td>
                  <td>
                    <Actions>
                      <LinkButton
                        type="button"
                        aria-label={`Edit ${promotion.name}`}
                        onClick={() => {
                          setEditing(promotion);
                          setForm(toForm(promotion));
                          setFormError("");
                          setNotice("");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </LinkButton>
                      <LinkButton
                        type="button"
                        aria-label={`${promotion.active ? "Pause" : "Resume"} ${promotion.name}`}
                        onClick={() => setActive(promotion, !promotion.active)}
                      >
                        {promotion.active ? "Pause" : "Resume"}
                      </LinkButton>
                      {promotion.timesUsed === 0 && (
                        <LinkButton
                          danger
                          type="button"
                          aria-label={`Delete ${promotion.name}`}
                          onClick={() => remove(promotion)}
                        >
                          Delete
                        </LinkButton>
                      )}
                    </Actions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </Container>
  );
}

export default AdminDiscounts;
