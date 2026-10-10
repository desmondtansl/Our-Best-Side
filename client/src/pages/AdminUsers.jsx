import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import BackToDashboard from "../components/BackToDashboard";
import { UserAuth } from "../context/Auth";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { formatDateTime, errorMessage } from "../utils/format";
import {
  Section,
  SectionTitle,
  Card,
  CardRow,
  Muted,
  Button,
  LinkButton,
  ErrorText,
  Empty,
} from "../components/account/styles";

const Container = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24px;
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

const Form = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 10px;
  border: 0.5px solid lightgray;
  border-radius: 10px;
`;

const Role = styled.span`
  display: inline-block;
  margin-left: 8px;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 13px;
  background-color: #f8f4f4;
  border: 1px solid teal;
`;

const Notice = styled.p`
  margin: 0;
  font-size: 14px;
  color: teal;
  font-weight: 600;
`;

const API = () => `${import.meta.env.VITE_BASE_URL}/admin/users`;

const describeChange = (entry) =>
  entry.action === "grant"
    ? `${entry.by} gave admin access to ${entry.email}`
    : `${entry.by} removed admin access from ${entry.email}`;

function AdminUsers() {
  useDocumentTitle("Manage Admins");
  const [user] = UserAuth();
  const [data, setData] = useState(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await axios.get(API());
        setData(response.data.data);
      } catch (err) {
        setError(errorMessage(err, "Could not load the admins"));
      }
    };
    fetchAdmins();
  }, []);

  const change = async (action, target, successMessage) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await axios.post(`${API()}/${action}`, { email: target });
      setData(response.data.data);
      setNotice(successMessage);
      return true;
    } catch (err) {
      setError(errorMessage(err, "Could not change admin access"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleGrant = async (e) => {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) return;
    if (
      !window.confirm(
        `Give ${target} admin access? They'll be able to add and edit products and manage orders.`
      )
    ) {
      return;
    }
    if (await change("grant", target, `${target} is now an admin.`)) setEmail("");
  };

  const handleRevoke = async (target) => {
    if (!window.confirm(`Remove admin access from ${target}?`)) return;
    await change("revoke", target, `${target} is no longer an admin.`);
  };

  return (
    <Container>
      <Header>
        <Title>Manage Admins</Title>
        <BackToDashboard />
      </Header>
      <Muted>
        Admins can add and edit products and manage orders. Only the shop owner can see this
        page and change who is an admin.
      </Muted>

      <Section aria-labelledby="add-admin-title">
        <SectionTitle id="add-admin-title">Add an admin</SectionTitle>
        <Muted>They need an account first: ask them to sign up on the site with this email.</Muted>
        <Form onSubmit={handleGrant}>
          <Input
            type="email"
            aria-label="Email of the person to make an admin"
            placeholder="name@example.com"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button primary type="submit" disabled={busy}>
            Grant access
          </Button>
        </Form>
      </Section>

      {error && <ErrorText role="alert">{error}</ErrorText>}
      {notice && <Notice role="status">{notice}</Notice>}

      <Section aria-labelledby="admins-title">
        <SectionTitle id="admins-title">Admins</SectionTitle>
        {!data && !error && <Empty>Loading admins…</Empty>}
        {data?.admins.map((admin) => {
          const isYou = admin.email === user.data?.email;
          return (
            <Card key={admin._id}>
              <CardRow>
                <span>
                  {admin.email}
                  {admin.isOwner && <Role>Owner</Role>}
                  {isYou && <Role>You</Role>}
                </span>
                {!admin.isOwner && !isYou && (
                  <LinkButton
                    danger
                    type="button"
                    disabled={busy}
                    onClick={() => handleRevoke(admin.email)}
                  >
                    Remove access
                  </LinkButton>
                )}
              </CardRow>
            </Card>
          );
        })}
      </Section>

      {data && (
        <Section aria-labelledby="changes-title">
          <SectionTitle id="changes-title">Recent changes</SectionTitle>
          {data.log.length === 0 ? (
            <Empty>No changes made from this page yet.</Empty>
          ) : (
            data.log.map((entry) => (
              <CardRow key={entry._id}>
                <span>{describeChange(entry)}</span>
                <Muted>{formatDateTime(entry.createdAt)}</Muted>
              </CardRow>
            ))
          )}
        </Section>
      )}
    </Container>
  );
}

export default AdminUsers;
