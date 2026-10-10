import { css } from "styled-components";

// The site's link styles. Every link is black: index.html makes links take
// the colour of the text around them instead of the browser's blue/purple.
// Each link has one of three looks:
//
// - Text links, in a sentence or a short action on its own ("Start
//   shopping", "Sign up here"): underlined. That's the browser default, so
//   they need no styles of their own.
// - Navigation links (the desktop header, the admin dashboard): navLink.
// - Links that look like a button (SHOP NOW, Continue Shopping): buttonLink.
//
// The mobile menu's rows and the product cards have their own looks (a row
// highlight, a photo with its name and price), also in black.

// No underline, except under a mouse pointer.
export const navLink = css`
  color: black;
  text-decoration: none;

  @media (hover: hover) {
    &:hover {
      text-decoration: underline;
    }
  }
`;

// A black outlined box, light grey under a mouse pointer like the site's
// other buttons. The whole box is the link.
export const buttonLink = css`
  display: inline-block;
  padding: 10px;
  border: 2px solid black;
  background-color: transparent;
  color: black;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    background-color: #f8f4f4;
  }
`;
