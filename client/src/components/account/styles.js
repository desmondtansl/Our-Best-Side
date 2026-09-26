import styled from "styled-components";

// Colours follow the rest of the site: teal accents, lightgray borders with
// rounded corners (as in the cart summary), #f8f4f4 highlights, #e1d7c6
// buttons (as on Login/Signup), black primary buttons (as "Checkout Now")
// and red error text (as in the newsletter form).

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

export const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 300;
  margin: 0;
`;

export const Card = styled.div`
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 15px;
  line-height: 1.5;
`;

export const CardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Muted = styled.span`
  font-size: 14px;
  font-weight: 300;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Button = styled.button`
  border: none;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  background-color: ${(props) => (props.primary ? "black" : "#e1d7c6")};
  color: ${(props) => (props.primary ? "white" : "black")};

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

export const LinkButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
  color: ${(props) => (props.danger ? "red" : "black")};
`;

export const Badge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 13px;
  background-color: #f8f4f4;
  border: 1px solid ${(props) => (props.status === "cancelled" ? "red" : "teal")};
  color: ${(props) => (props.status === "cancelled" ? "red" : "black")};
`;

export const ErrorText = styled.p`
  color: red;
  font-size: 14px;
  margin: 0;
`;

export const Empty = styled.p`
  font-weight: 300;
  margin: 0;
`;
