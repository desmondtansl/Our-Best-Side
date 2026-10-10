import "@testing-library/jest-dom/vitest";
window.scrollTo = () => {}; // not implemented in jsdom
// Photo previews use object URLs, which jsdom doesn't implement.
URL.createObjectURL = (file) => `blob:${file.name}`;
URL.revokeObjectURL = () => {};
