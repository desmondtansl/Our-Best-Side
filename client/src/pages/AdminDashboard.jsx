import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: lightblue;
`;

const Title = styled.h1`
  font-size: 40px;
  font-weight: 600;
`;

const Wrapper = styled.div`
  padding: 10px 20px;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  background-color: coral;
`;

const MenuItems = styled.div`
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  margin-left: 25px;
  padding: 10px 30px;
`;

function AdminDashboard() {
  return (
    <Container>
      <Wrapper>
        <Title>Admin Dashboard</Title>
        <Link to="/upload" style={{ textDecoration: "none" }}>
          <MenuItems>Upload New Products</MenuItems>
        </Link>
        <Link to="/edit" style={{ textDecoration: "none" }}>
          <MenuItems>Edit Products</MenuItems>
        </Link>
        <Link to="/delete" style={{ textDecoration: "none" }}>
          <MenuItems>Delete Products</MenuItems>
        </Link>
        <Link to="/" style={{ textDecoration: "none" }}>
          <MenuItems>Logout</MenuItems>
        </Link>
      </Wrapper>
    </Container>
  );
}

export default AdminDashboard;
