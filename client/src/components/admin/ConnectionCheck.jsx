import { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Button, Muted } from "../account/styles";
import { errorMessage } from "../../utils/format";

const Box = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background-color: #f8f4f4;
  font-size: 14px;
`;

const Address = styled.code`
  font-family: inherit;
  font-weight: 700;
`;

// Shows the owner the internet address the server sees for them. The rate
// limits (logins, sign-ups, checkout) count per address, so it must be the
// visitor's real address, not one shared by everyone (e.g. Render's proxy).
function ConnectionCheck() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const check = async () => {
    setError("");
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/users/connection`);
      setResult(response.data.data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't check the connection"));
    }
  };

  return (
    <Box>
      <Muted>
        Login, sign-up and checkout limits count attempts per internet address. Check that the
        server sees your real address: it should match the one shown on{" "}
        <a href="https://whatismyipaddress.com" target="_blank" rel="noopener noreferrer">
          whatismyipaddress.com
        </a>
        .
      </Muted>
      <div>
        <Button type="button" onClick={check}>
          Check my connection
        </Button>
      </div>
      {result && (
        <span role="status">
          The server sees your address as <Address>{result.ip}</Address>. If that isn&apos;t your
          address, find yours in this list: <Address>{result.forwardedFor || "(empty)"}</Address>.
          Then, on Render, set <Address>TRUST_PROXY_HOPS</Address> to 1 plus the number of
          addresses that come after yours (it&apos;s {String(result.trustProxyHops)} now).
        </span>
      )}
      {error && <span role="alert">{error}</span>}
    </Box>
  );
}

export default ConnectionCheck;
