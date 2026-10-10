import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import useCloseOnBack from "./useCloseOnBack";

function Popup() {
  const [open, setOpen] = useState(false);
  const { close, closeForLink } = useCloseOnBack(open, setOpen);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <div role="dialog">
          <button onClick={close}>Close</button>
          <button onClick={closeForLink}>Link</button>
        </div>
      )}
    </>
  );
}

describe("useCloseOnBack", () => {
  let pushState;
  let back;
  beforeEach(() => {
    pushState = vi.spyOn(window.history, "pushState");
    back = vi.spyOn(window.history, "back").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const open = () => fireEvent.click(screen.getByRole("button", { name: "Open" }));
  const pressBack = () => fireEvent.popState(window);

  it("adds a history entry when the pop-up opens, so Back closes it", () => {
    render(<Popup />);
    expect(pushState).not.toHaveBeenCalled();
    open();
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(window.history.state).toMatchObject({ popup: true });

    pressBack();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Back already removed the entry.
    expect(back).not.toHaveBeenCalled();
  });

  it("removes the entry when the pop-up is closed another way", () => {
    render(<Popup />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("leaves the entry for a link to take over", () => {
    render(<Popup />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
  });

  it("ignores Back while closed and adds a new entry each time it opens", () => {
    render(<Popup />);
    open();
    pressBack();
    pressBack();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    open();
    expect(pushState).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
