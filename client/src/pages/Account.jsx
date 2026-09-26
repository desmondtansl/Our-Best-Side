import styled from "styled-components";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import OrderHistory from "../components/account/OrderHistory";
import SavedAddresses from "../components/account/SavedAddresses";
import PaymentMethods from "../components/account/PaymentMethods";
import { UserAuth } from "../context/Auth";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const Wrapper = styled.div`
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
  flex: 1;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 300;
  margin-bottom: 4px;
`;

const Email = styled.p`
  font-weight: 300;
  margin-top: 0;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 0.5px solid lightgray;
  margin: 20px 0px;
  overflow-x: auto;
`;

const Tab = styled.button`
  border: none;
  background: none;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 16px;
  white-space: nowrap;
  border-bottom: 2px solid ${(props) => (props.active ? "teal" : "transparent")};
  font-weight: ${(props) => (props.active ? 600 : 400)};
`;

const TABS = [
  { id: "orders", label: "Orders", Component: OrderHistory },
  { id: "addresses", label: "Addresses", Component: SavedAddresses },
  { id: "payments", label: "Payment methods", Component: PaymentMethods },
];

function Account() {
  useDocumentTitle("My Account");
  const [user] = UserAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const active = TABS.find((tab) => tab.id === searchParams.get("tab")) || TABS[0];
  const { Component } = active;

  return (
    <Container>
      <Navbar />
      <Wrapper>
        <Title>My account</Title>
        <Email>{user.data?.email}</Email>
        <Tabs role="tablist">
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              role="tab"
              aria-selected={tab.id === active.id}
              active={tab.id === active.id}
              onClick={() => setSearchParams({ tab: tab.id })}
            >
              {tab.label}
            </Tab>
          ))}
        </Tabs>
        <Component />
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default Account;
