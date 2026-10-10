import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { productImageUrl } from "../../utils/products";

// Photos in the admin product forms, in display order (the first is the main
// photo). Each item is either a saved photo { id, key } or a new one
// { id, file, url }. Photos can be added (several at once), moved, made the
// main photo or removed.

export const MAX_PHOTOS = 8;

let nextId = 0;
export const savedPhotoItems = (keys) => keys.map((key) => ({ id: `saved-${key}`, key }));

const Section = styled.div`
  margin: 10px 0px;
`;

const Hint = styled.p`
  margin: 4px 0px 8px;
  font-size: 13px;
  font-weight: 300;
`;

const Grid = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0px 0px 10px;
  padding: 0px;
  list-style: none;
`;

const Tile = styled.li`
  position: relative;
  width: 104px;
  border: 1px solid ${(props) => (props.main ? "teal" : "lightgray")};
  border-radius: 10px;
  overflow: hidden;
  font-size: 12px;

  img {
    display: block;
    width: 100%;
    height: 130px;
    object-fit: cover;
  }
`;

const MainBadge = styled.span`
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 10px;
  background: teal;
  color: white;
  font-size: 11px;
  font-weight: 600;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 4px;
`;

const Control = styled.button`
  min-width: 26px;
  height: 26px;
  padding: 0px 4px;
  border: 1px solid lightgray;
  border-radius: 6px;
  background: white;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
`;

const Message = styled.p`
  font-size: 13px;
  color: red;
`;

function PhotoManager({ items, onChange, inputId = "images" }) {
  const [message, setMessage] = useState("");
  // Object URLs for new photos are released when they're removed or the form
  // closes.
  const latest = useRef(items);
  latest.current = items;
  useEffect(
    () => () => latest.current.forEach((item) => item.url && URL.revokeObjectURL(item.url)),
    []
  );

  const move = (from, to) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const remove = (index) => {
    const item = items[index];
    if (item.url) URL.revokeObjectURL(item.url);
    onChange(items.filter((_, i) => i !== index));
    setMessage("");
  };

  const add = (event) => {
    const files = [...event.target.files];
    event.target.value = ""; // so the same file can be chosen again
    const room = MAX_PHOTOS - items.length;
    const added = files.slice(0, Math.max(room, 0)).map((file) => ({
      id: `new-${(nextId += 1)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setMessage(
      files.length > room ? `A product can have at most ${MAX_PHOTOS} photos.` : ""
    );
    if (added.length) onChange([...items, ...added]);
  };

  return (
    <Section>
      <label htmlFor={inputId}>
        <b>Product Photos</b>
      </label>
      <Hint>
        Up to {MAX_PHOTOS} photos. The first is the main photo, shown in listings. Photos
        are resized and compressed automatically.
      </Hint>
      {items.length > 0 && (
        <Grid>
          {items.map((item, index) => {
            const n = index + 1;
            return (
              <Tile key={item.id} main={index === 0}>
                <img
                  src={item.url || productImageUrl(item.key)}
                  alt={`Photo ${n}${index === 0 ? " (main)" : ""}`}
                />
                {index === 0 && <MainBadge>Main</MainBadge>}
                <Controls>
                  <Control
                    type="button"
                    aria-label={`Move photo ${n} earlier`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ←
                  </Control>
                  <Control
                    type="button"
                    aria-label={`Make photo ${n} the main photo`}
                    disabled={index === 0}
                    onClick={() => move(index, 0)}
                  >
                    ★
                  </Control>
                  <Control
                    type="button"
                    aria-label={`Move photo ${n} later`}
                    disabled={index === items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    →
                  </Control>
                  <Control
                    type="button"
                    aria-label={`Remove photo ${n}`}
                    onClick={() => remove(index)}
                  >
                    ✕
                  </Control>
                </Controls>
              </Tile>
            );
          })}
        </Grid>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        disabled={items.length >= MAX_PHOTOS}
        onChange={add}
      />
      {message && <Message role="alert">{message}</Message>}
    </Section>
  );
}

export default PhotoManager;
