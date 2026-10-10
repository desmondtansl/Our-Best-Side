import { useEffect, useRef, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import { productImageUrl, productPath } from "../utils/products";
import { searchPath, shopApiUrl } from "../utils/shop";

// Header search with suggestions as you type. Enter (or the search button)
// opens the results page; arrow keys move through the suggestions.

const SUGGESTION_LIMIT = 5;
const MIN_CHARACTERS = 2;
const DEBOUNCE_MS = 250;
const LIST_ID = "search-suggestions";

// On narrower screens the search box takes its own line under the links,
// so the header doesn't overflow.
const Wrapper = styled.div`
  margin-left: 25px;

  @media (max-width: 1024px) {
    order: 1;
    flex-basis: 100%;
    display: flex;
    justify-content: flex-end;
    margin: 10px 0px 0px;
    padding-right: 10px;
  }

  @media (max-width: 540px) {
    justify-content: center;
    padding-right: 0px;
  }
`;

// Holds the box and its suggestions, so the list lines up with the box.
const Inner = styled.div`
  position: relative;

  @media (max-width: 540px) {
    width: 100%;
    max-width: 320px;
  }
`;

const Form = styled.form`
  display: flex;
  align-items: center;
  border: 1px solid lightgray;
  border-radius: 10px;
  background: white;
  overflow: hidden;
`;

const Input = styled.input`
  flex: 1;
  width: 180px;
  padding: 8px 10px;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 14px;
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border: none;
  background: none;
  cursor: pointer;
`;

const List = styled.ul`
  position: absolute;
  top: calc(100% + 6px);
  right: 0px;
  z-index: 20;
  width: 320px;
  max-width: 90vw;
  margin: 0px;
  padding: 6px 0px;
  list-style: none;
  background: white;
  border: 1px solid lightgray;
  border-radius: 10px;
  box-shadow: 0px 6px 20px rgba(0, 0, 0, 0.08);
`;

const Option = styled.li`
  background: ${(props) => (props.active ? "#f8f4f4" : "white")};

  a {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    color: black;
    text-decoration: none;
    font-size: 14px;
  }
`;

const Thumbnail = styled.img`
  width: 40px;
  height: 50px;
  object-fit: cover;
  flex-shrink: 0;
`;

const OptionTitle = styled.span`
  flex: 1;
`;

const OptionPrice = styled.span`
  font-weight: 500;
`;

const SeeAll = styled(Option)`
  border-top: 0.5px solid lightgray;

  a {
    padding: 10px 12px;
    text-decoration: underline;
  }
`;

const Empty = styled.li`
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 300;
`;

function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const wrapperRef = useRef(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(null); // null until loaded
  const [active, setActive] = useState(-1);

  const query = text.trim();
  const ready = open && query.length >= MIN_CHARACTERS;
  // Suggestions, then "See all results" as the last option.
  const optionCount = (suggestions?.length || 0) + 1;

  // Show the current search in the box on the results page.
  useEffect(() => {
    if (location.pathname === "/results") {
      setText(new URLSearchParams(location.search).get("q") || "");
    }
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          shopApiUrl(new URLSearchParams({ q: query }), {
            limit: SUGGESTION_LIMIT,
          }),
        );
        if (!cancelled)
          setSuggestions(Array.isArray(data?.data) ? data.data : []);
      } catch (error) {
        if (!cancelled) setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, ready]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!query) return;
    close();
    navigate(searchPath(query));
  };

  const goTo = (index) => {
    close();
    navigate(
      index < (suggestions?.length || 0)
        ? productPath(suggestions[index])
        : searchPath(query),
    );
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowDown" && ready && suggestions) {
      event.preventDefault();
      setActive((active + 1) % optionCount);
    } else if (event.key === "ArrowUp" && ready && suggestions) {
      event.preventDefault();
      setActive(active <= 0 ? optionCount - 1 : active - 1);
    } else if (event.key === "Enter" && ready && active >= 0) {
      event.preventDefault();
      goTo(active);
    }
  };

  // Close when focus moves outside the search box and its suggestions.
  const handleBlur = (event) => {
    if (!wrapperRef.current?.contains(event.relatedTarget)) close();
  };

  const showList = ready && suggestions !== null;
  const optionId = (index) => `${LIST_ID}-${index}`;

  return (
    <Wrapper ref={wrapperRef} onBlur={handleBlur}>
      <Inner>
        <Form role="search" onSubmit={submit}>
          <Input
            type="search"
            placeholder="Search products"
            aria-label="Search products"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={LIST_ID}
            aria-activedescendant={
              showList && active >= 0 ? optionId(active) : undefined
            }
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
          <SubmitButton type="submit" aria-label="Search">
            <SearchIcon fontSize="small" />
          </SubmitButton>
        </Form>
        {showList && (
          <List id={LIST_ID} role="listbox" aria-label="Search suggestions">
            {suggestions.length === 0 && <Empty>No matching products</Empty>}
            {suggestions.map((product, index) => (
              <Option
                key={product._id}
                id={optionId(index)}
                role="option"
                aria-selected={active === index}
                active={active === index}
              >
                <Link to={productPath(product)} tabIndex={-1} onClick={close}>
                  <Thumbnail src={productImageUrl(product.image)} alt="" />
                  <OptionTitle>{product.title}</OptionTitle>
                  <OptionPrice>${product.price}</OptionPrice>
                </Link>
              </Option>
            ))}
            <SeeAll
              id={optionId(optionCount - 1)}
              role="option"
              aria-selected={active === optionCount - 1}
              active={active === optionCount - 1}
            >
              <Link to={searchPath(query)} tabIndex={-1} onClick={close}>
                See all results for "{query}"
              </Link>
            </SeeAll>
          </List>
        )}
      </Inner>
    </Wrapper>
  );
}

export default SearchBar;
