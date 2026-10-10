import styled from "styled-components";
import { Link } from "react-router-dom";

// A "← Back to …" text link at the top of an admin page.
export const BackLink = styled(Link)`
  display: inline-block;
  margin: 10px;
  font-size: 14px;
  font-weight: 600;
`;

// Shown at the top of every admin page.
function BackToDashboard() {
  return <BackLink to="/dashboard">← Back to Dashboard</BackLink>;
}

export default BackToDashboard;
