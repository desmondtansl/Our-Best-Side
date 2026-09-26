import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { useDispatch } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { resetCart } from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";
import { formatMoney, orderNumber, STATUS_LABELS } from "../utils/format";

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100vh;

  @media (max-width: 280px) {
    height: auto;
  }
`;

const Container = styled.div`
  max-height: 90vh;
  align-items: center;

  @media (max-width: 820px) {
    max-height: none;
  }

  @media (max-width: 280px) {
    max-height: none;
  }
`;

const Wrapper = styled.div`
  display: flex;
  overflow-y: auto;
  justify-content: center;
  flex-direction: column;

  @media (max-width: 820px) {
    overflow-y: hidden;
  }

  @media (max-width: 280px) {
    overflow-y: hidden;
  }
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 600;
  padding: 20px;

  @media (max-width: 280px) {
    font-size: 14px;
  }
`;

const Description = styled.p`
  font-size: 24px;
  font-weight: 400;
  padding: 20px;

  @media (max-width: 280px) {
    font-size: 14px;
  }
`;

const SpareContainer = styled.div``;

const OrderSummary = styled.div`
  padding: 0px 20px 20px;
  font-size: 16px;
  line-height: 1.6;
`;

const OrderItem = styled.li`
  list-style: none;
`;

// The Stripe webhook usually confirms payment within a few seconds of the
// redirect, so poll briefly while the order is still pending.
const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;

function Success() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState(null);
  const [user] = UserAuth();

  useEffect(() => {
    dispatch(resetCart());
  }, [dispatch]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer;
    const fetchOrder = async (attempt) => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/checkout/order/${sessionId}`
        );
        if (cancelled) return;
        setOrder(response.data.data);
        if (response.data.data.status === "pending" && attempt < POLL_ATTEMPTS) {
          timer = setTimeout(() => fetchOrder(attempt + 1), POLL_INTERVAL_MS);
        }
      } catch (error) {
        console.log(error.message);
      }
    };
    fetchOrder(1);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  return (
    <MainContainer>
      <Navbar />
      <Container>
        <Wrapper>
          <Title>Thank you for your purchase!</Title>
          {order && (
            <OrderSummary>
              <p>
                <b>Order #{orderNumber(order.id)}</b> ·{" "}
                {order.status === "pending"
                  ? "Confirming payment…"
                  : STATUS_LABELS[order.status]}
              </p>
              <ul>
                {order.items.map((item, index) => (
                  <OrderItem key={index}>
                    {item.quantity} × {item.title}
                    {item.size && ` (${item.size})`} —{" "}
                    {formatMoney(item.price * item.quantity, order.currency)}
                  </OrderItem>
                ))}
              </ul>
              <p>Total: {formatMoney(order.subtotal, order.currency)}</p>
              {user.data && (
                <p>
                  You can track this order in <Link to="/account">your account</Link>.
                </p>
              )}
            </OrderSummary>
          )}
          <Description>
            A separate email with shipping information will be sent to you when
            we have shipped the items out.
          </Description>
        </Wrapper>
      </Container>
      <SpareContainer></SpareContainer>
      <Footer />
    </MainContainer>
  );
}

export default Success;
