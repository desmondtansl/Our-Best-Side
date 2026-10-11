import { useState } from "react";
import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserAuth } from "../context/Auth";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { errorMessage } from "../utils/format";
import { deviceId } from "../utils/deviceId";
import { startSession, userFrom } from "../utils/session";

const Container = styled.div`
  overflow: hidden;
  height: 100vh;
  flex-direction: column;
  justify-content: space-between;
  display: flex;

  @media (max-width: 1024px) {
    height: 90vh;
  }

  @media (max-width: 280px) {
    height: auto;
  }
`;

const Wrapper = styled.div`
  width: 100vw;
  height: auto;
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-top: 0;
`;

const Title = styled.h1`
  display: flex;
  font-size: 30px;
  font-weight: 400;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 15%;

  @media (max-width: 1024px) {
    width: auto;
  }

  @media (max-width: 820px) {
    width: auto;
  }

  @media (max-width: 414px) {
    width: auto;
  }

  @media (max-width: 375px) {
    width: auto;
  }

  @media (max-width: 360px) {
    width: auto;
  }

  @media (max-width: 280px) {
    width: auto;
  }
`;

const Input = styled.input`
  flex: 1;
  min-width: 40%;
  margin: 10px 0px;
  padding: 10px;
`;

const ErrorText = styled.p`
  color: red;
  font-size: 14px;
  margin: 10px 0px 0px;
`;

const Button = styled.button`
  width: auto;
  border: none;
  padding: 15px 20px;
  cursor: pointer;
  margin-bottom: 10px;
  font-size: 14px;
  display: inline-block;
  align-items: center;
  background-color: #e1d7c6;
`;

const InfoContainer = styled.div``;

const Hint = styled.p`
  margin: 6px 0px 0px;
  font-size: 13px;
  font-weight: 300;
  max-width: 280px;
`;

const TextButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  margin-bottom: 10px;
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
  align-self: flex-start;
`;

const SpareContainer = styled.div``;

function Login() {
  useDocumentTitle("Login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [user, setUser] = UserAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Accounts with two-step login: after the password, the code from the
  // authenticator app (or a recovery code) is asked for with this ticket.
  const [ticket, setTicket] = useState("");
  const [code, setCode] = useState("");

  const finishLogin = (data) => {
    startSession(data.token);
    setUser({ data: userFrom(data.user), error: null, loading: false });
    // After using a recovery code, show how many are left.
    navigate(data.recoveryCodesLeft !== undefined ? "/account?tab=security" : "/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/auth/login`,
        {
          email,
          password,
          deviceId: deviceId(),
        }
      );
      const { data } = response.data;
      if (data.twoFactorRequired) {
        setTicket(data.ticket);
        setPassword("");
        return;
      }
      finishLogin(data);
    } catch (err) {
      const message = errorMessage(err, "Couldn't log in. Please try again.");
      setError(message === "Invalid credentials" ? "Wrong email or password." : message);
    } finally {
      setLoading(false);
    }
  };

  const handleCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/auth/login/two-factor`,
        { ticket, code, deviceId: deviceId() }
      );
      finishLogin(response.data.data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't check the code. Please try again."));
      if (err?.response?.status === 401 && /timed out/.test(errorMessage(err))) {
        setTicket("");
        setCode("");
      }
    } finally {
      setLoading(false);
    }
  };

  const startAgain = () => {
    setTicket("");
    setCode("");
    setError("");
  };

  return (
    <Container>
      <Navbar />
      <Wrapper>
        <Title>Welcome Back</Title>
        {ticket ? (
          <Form onSubmit={handleCode}>
            <Hint>Enter the 6-digit code from your authenticator app.</Hint>
            <Input
              aria-label="Code"
              placeholder="6-digit code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Hint>Lost your phone? Enter one of your recovery codes instead.</Hint>
            {error && <ErrorText role="alert">{error}</ErrorText>}
            <Button disabled={loading}>Verify</Button>
            <TextButton type="button" onClick={startAgain}>
              Start again
            </TextButton>
          </Form>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Input
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              required
              placeholder="Password"
              type="password"
              minlength="8"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <ErrorText role="alert">{error}</ErrorText>}
            <Button disabled={loading}>Login</Button>
          </Form>
        )}
        <InfoContainer>
          Don't have an account?{" "}
          <Link to="/signup">Sign up here</Link>
        </InfoContainer>
      </Wrapper>
      <SpareContainer></SpareContainer>
      <Footer />
    </Container>
  );
}

export default Login;
