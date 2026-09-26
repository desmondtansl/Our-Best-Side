import styled from "styled-components";
import { Link } from "react-router-dom";

const StyledLink = styled(Link)`
  display: inline-block;
  margin: 10px;
  font-size: 14px;
  font-weight: 600;
`;

// Shown at the top of every admin page.
function BackToDashboard() {
  return <StyledLink to="/dashboard">← Back to Dashboard</StyledLink>;
}

export default BackToDashboard;
