import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { CardRow, Muted, Empty, ErrorText } from "../account/styles";
import { errorMessage, formatDateTime } from "../../utils/format";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 420px;
  overflow-y: auto;
`;

// The last 100 things admins did (owner only).
function AdminActivity() {
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/users/activity`);
        setActivity(response.data.data);
      } catch (err) {
        setError(errorMessage(err, "Couldn't load the admin activity"));
      }
    };
    load();
  }, []);

  if (error) return <ErrorText role="alert">{error}</ErrorText>;
  if (!activity) return <Muted>Loading activity…</Muted>;
  if (!activity.length) return <Empty>No admin activity yet.</Empty>;

  const admins = [...new Set(activity.map((entry) => entry.by))].sort();
  const shown = filter ? activity.filter((entry) => entry.by === filter) : activity;

  return (
    <>
      <label>
        <Muted>Show </Muted>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show activity by">
          <option value="">Everyone</option>
          {admins.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
      </label>
      <List>
        {shown.map((entry) => (
          <CardRow key={entry._id} data-testid="activity">
            <span>
              <b>{entry.by}</b> · {entry.summary}
            </span>
            <Muted>{formatDateTime(entry.createdAt)}</Muted>
          </CardRow>
        ))}
      </List>
    </>
  );
}

export default AdminActivity;
