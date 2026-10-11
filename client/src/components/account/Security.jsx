import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import {
  Section,
  SectionHeader,
  SectionTitle,
  Card,
  Muted,
  Actions,
  Button,
  Badge,
  ErrorText,
} from "./styles";
import { UserAuth } from "../../context/Auth";
import { errorMessage } from "../../utils/format";
import { startSession, userFrom } from "../../utils/session";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 360px;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 10px;
  font-size: 14px;
`;

const Notice = styled.p`
  margin: 0;
  padding: 12px 16px;
  border-radius: 10px;
  background-color: #f8f4f4;
  border: 1px solid teal;
  font-size: 14px;
`;

const Success = styled.p`
  margin: 0;
  font-size: 14px;
  color: teal;
`;

const QrCode = styled.img`
  width: 180px;
  height: 180px;
  border: 0.5px solid lightgray;
  border-radius: 10px;
`;

const Key = styled.code`
  font-family: inherit;
  font-weight: 700;
  letter-spacing: 1px;
  word-break: break-all;
`;

const Codes = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, max-content);
  gap: 6px 24px;
  margin: 0;
  padding: 12px 16px;
  list-style: none;
  border-radius: 10px;
  background-color: #f8f4f4;
  font-weight: 700;
  letter-spacing: 1px;

  @media (max-width: 360px) {
    grid-template-columns: max-content;
  }
`;

const API = () => import.meta.env.VITE_BASE_URL;

// Groups a setup key in fours, so it's easier to type into an app.
const grouped = (key) => key.match(/.{1,4}/g).join(" ");

function ChangePassword({ onNewToken }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const change = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDone(false);
    if (form.next !== form.confirm) return setError("The new passwords don't match");
    setSaving(true);
    try {
      const response = await axios.post(`${API()}/auth/change-password`, {
        currentPassword: form.current,
        newPassword: form.next,
      });
      onNewToken(response.data.data);
      setForm({ current: "", next: "", confirm: "" });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, "Couldn't change your password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionTitle as="h3">Password</SectionTitle>
      <Form onSubmit={submit}>
        <Field>
          Current password
          <Input type="password" required autoComplete="current-password" value={form.current} onChange={change("current")} />
        </Field>
        <Field>
          New password
          <Input type="password" required minLength={8} autoComplete="new-password" value={form.next} onChange={change("next")} />
        </Field>
        <Muted>At least 8 characters. Avoid common passwords.</Muted>
        <Field>
          New password again
          <Input type="password" required autoComplete="new-password" value={form.confirm} onChange={change("confirm")} />
        </Field>
        {error && <ErrorText role="alert">{error}</ErrorText>}
        {done && (
          <Success role="status">
            Password changed. Your other devices have been logged out.
          </Success>
        )}
        <Actions>
          <Button primary disabled={saving}>Change password</Button>
        </Actions>
      </Form>
    </Card>
  );
}

function TwoStepLogin({ user, onNewToken }) {
  const [status, setStatus] = useState(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const enabled = Boolean(user?.twoFactorEnabled);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API()}/account/two-factor`)
      .then((response) => !cancelled && setStatus(response.data.data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const run = async (action) => {
    setError("");
    setSaving(true);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const startSetup = (e) => {
    e.preventDefault();
    run(async () => {
      const response = await axios.post(`${API()}/account/two-factor/setup`, { password });
      setSetup(response.data.data);
      setPassword("");
    });
  };

  const turnOn = (e) => {
    e.preventDefault();
    run(async () => {
      const response = await axios.post(`${API()}/account/two-factor/enable`, { code });
      setRecoveryCodes(response.data.data.recoveryCodes);
      setSetup(null);
      setCode("");
      onNewToken(response.data.data);
    });
  };

  const turnOff = (e) => {
    e.preventDefault();
    run(async () => {
      const response = await axios.post(`${API()}/account/two-factor/disable`, { password, code });
      setPassword("");
      setCode("");
      onNewToken(response.data.data);
    });
  };

  return (
    <Card>
      <SectionHeader>
        <SectionTitle as="h3">Two-step login</SectionTitle>
        <Badge>{enabled ? "On" : "Off"}</Badge>
      </SectionHeader>

      {user?.isAdmin && !enabled && (
        <Notice role="status">
          Admin pages need two-step login. Turn it on below to use them.
        </Notice>
      )}

      {recoveryCodes && (
        <>
          <Success role="status">Two-step login is on.</Success>
          <Muted>
            Save these recovery codes somewhere safe, away from your phone (e.g. printed, or
            in a password manager). If you lose your phone, each code logs you in once. They
            won&apos;t be shown again.
          </Muted>
          <Codes aria-label="Recovery codes">
            {recoveryCodes.map((recovery) => (
              <li key={recovery}>{recovery}</li>
            ))}
          </Codes>
          <Actions>
            <Button type="button" onClick={() => setRecoveryCodes(null)}>
              I&apos;ve saved them
            </Button>
          </Actions>
        </>
      )}

      {!enabled && !setup && !recoveryCodes && (
        <Form onSubmit={startSetup}>
          <Muted>
            After your password, you&apos;ll also enter a code from an authenticator app on your
            phone (e.g. Google Authenticator or Microsoft Authenticator), so a password alone
            isn&apos;t enough to get into your account.
          </Muted>
          <Field>
            Your password
            <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <ErrorText role="alert">{error}</ErrorText>}
          <Actions>
            <Button primary disabled={saving}>Set up two-step login</Button>
          </Actions>
        </Form>
      )}

      {setup && (
        <Form onSubmit={turnOn}>
          <Muted>
            1. In your authenticator app, add an account and scan this code. On this phone?{" "}
            <a href={setup.otpauthUrl}>Open it in the app</a>, or type in the key below.
          </Muted>
          <QrCode src={setup.qrCode} alt="QR code for your authenticator app" />
          <Muted>
            Key: <Key>{grouped(setup.secret)}</Key>
          </Muted>
          <Field>
            2. Enter the 6-digit code the app shows
            <Input required autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          {error && <ErrorText role="alert">{error}</ErrorText>}
          <Actions>
            <Button primary disabled={saving}>Turn on</Button>
            <Button type="button" onClick={() => setSetup(null)}>
              Cancel
            </Button>
          </Actions>
        </Form>
      )}

      {enabled && !recoveryCodes && (
        <Form onSubmit={turnOff}>
          <Muted>
            Logging in needs your password and a code from your authenticator app.
            {status && ` Recovery codes left: ${status.recoveryCodesLeft}.`}
          </Muted>
          {status?.recoveryCodesLeft <= 3 && (
            <Notice role="status">
              You&apos;re running low on recovery codes. Turn two-step login off and on again to
              get new ones.
            </Notice>
          )}
          <Muted>To turn it off, enter your password and a code.</Muted>
          <Field>
            Your password
            <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field>
            Code from your app, or a recovery code
            <Input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          {user?.isAdmin && <Muted>Admin pages can&apos;t be used while it&apos;s off.</Muted>}
          {error && <ErrorText role="alert">{error}</ErrorText>}
          <Actions>
            <Button disabled={saving}>Turn off two-step login</Button>
          </Actions>
        </Form>
      )}
    </Card>
  );
}

// My Account → Security: change the password, and turn two-step login on or
// off. Each change logs out the account's other devices; this one carries on
// with the new token the server sends back.
function Security() {
  const [user, setUser] = UserAuth();

  const onNewToken = ({ token, user: updated }) => {
    startSession(token);
    setUser({ data: userFrom(updated), error: null, loading: false });
  };

  return (
    <Section>
      <SectionTitle>Security</SectionTitle>
      <ChangePassword onNewToken={onNewToken} />
      <TwoStepLogin user={user.data} onNewToken={onNewToken} />
    </Section>
  );
}

export default Security;
