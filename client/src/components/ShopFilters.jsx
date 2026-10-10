import { useEffect, useState } from "react";
import styled from "styled-components";
import TuneIcon from "@mui/icons-material/Tune";
import {
  SORT_OPTIONS,
  readFilters,
  activeFilterCount,
  withParam,
  withoutFilters,
} from "../utils/shop";

// Filter and sort bar above product listings and search results. Every
// change is written to the page address (see utils/shop.js).

const Container = styled.div`
  width: 100%;
  margin-bottom: 20px;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 0.5px solid lightgray;
`;

const FiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 2px solid teal;
  background: ${(props) => (props.open ? "#f8f4f4" : "white")};
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background-color: #f8f4f4;
  }
`;

const Count = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 300;
`;

const SortLabel = styled.label`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
`;

const Select = styled.select`
  padding: 6px 8px;
  border: 1px solid lightgray;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  background: white;
`;

const Panel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 24px 40px;
  padding: 16px 0px;
  border-bottom: 0.5px solid lightgray;
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const GroupTitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
`;

const Options = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 420px;
`;

const Chip = styled.button`
  min-width: 44px;
  padding: 5px 10px;
  border: 2px solid teal;
  background: ${(props) => (props.selected ? "#f8f4f4" : "white")};
  font-family: inherit;
  font-size: 14px;
  font-weight: ${(props) => (props.selected ? 600 : 400)};
  cursor: pointer;

  &:hover {
    background-color: #f8f4f4;
  }
`;

const PriceForm = styled.form`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;

const PriceInput = styled.input`
  width: 80px;
  padding: 6px 8px;
  border: 1px solid lightgray;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
`;

const Clear = styled.button`
  align-self: flex-end;
  padding: 0px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
`;

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

// Offered options, plus any chosen ones no longer offered (e.g. from an old
// link), so they can still be switched off.
const withChosen = (offered = [], chosen) => [
  ...offered,
  ...chosen.filter((value) => !offered.some((option) => same(option, value))),
];

const cleanPrice = (value) => {
  const number = Number(value);
  return value !== "" && Number.isFinite(number) && number >= 0 ? String(number) : "";
};

function OptionGroup({ title, options, chosen, onToggle }) {
  if (!options.length) return null;
  return (
    <Group role="group" aria-label={title}>
      <GroupTitle>{title}</GroupTitle>
      <Options>
        {options.map((option) => {
          const selected = chosen.some((value) => same(value, option));
          return (
            <Chip
              key={option}
              type="button"
              selected={selected}
              aria-pressed={selected}
              onClick={() => onToggle(option, selected)}
            >
              {option}
            </Chip>
          );
        })}
      </Options>
    </Group>
  );
}

function ShopFilters({ facets, count, searchParams, setSearchParams }) {
  const filters = readFilters(searchParams);
  const active = activeFilterCount(filters);
  const [open, setOpen] = useState(active > 0);
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);

  // Keep the price boxes in step with the address (Back button, Clear all).
  useEffect(() => {
    setMin(filters.min);
    setMax(filters.max);
  }, [filters.min, filters.max]);

  const toggle = (key, chosen) => (option, selected) =>
    setSearchParams(
      withParam(
        searchParams,
        key,
        selected ? chosen.filter((value) => !same(value, option)) : [...chosen, option]
      )
    );

  const applyPrice = (event) => {
    event?.preventDefault();
    const next = withParam(
      withParam(searchParams, "min", cleanPrice(min)),
      "max",
      cleanPrice(max)
    );
    if (next.toString() !== searchParams.toString()) setSearchParams(next);
  };

  const applyOnEnter = (event) => {
    if (event.key === "Enter") applyPrice(event);
  };

  const sizes = withChosen(facets?.sizes, filters.sizes);
  const colors = withChosen(facets?.colors, filters.colors);

  return (
    <Container>
      <Toolbar>
        <FiltersButton
          type="button"
          open={open}
          aria-expanded={open}
          aria-controls="shop-filters"
          onClick={() => setOpen(!open)}
        >
          <TuneIcon fontSize="small" />
          {active ? `Filters (${active})` : "Filters"}
        </FiltersButton>
        {count !== undefined && (
          <Count role="status">
            {count} {count === 1 ? "product" : "products"}
          </Count>
        )}
        <SortLabel>
          Sort by
          <Select
            value={filters.sort}
            onChange={(e) =>
              setSearchParams(
                withParam(searchParams, "sort", e.target.value === "newest" ? "" : e.target.value)
              )
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </SortLabel>
      </Toolbar>
      {open && (
        <Panel id="shop-filters">
          <OptionGroup
            title="Size"
            options={sizes}
            chosen={filters.sizes}
            onToggle={toggle("size", filters.sizes)}
          />
          <OptionGroup
            title="Colour"
            options={colors}
            chosen={filters.colors}
            onToggle={toggle("color", filters.colors)}
          />
          <Group role="group" aria-label="Price">
            <GroupTitle>Price</GroupTitle>
            <PriceForm onSubmit={applyPrice}>
              <PriceInput
                type="number"
                min="0"
                inputMode="decimal"
                aria-label="Minimum price"
                placeholder={facets?.price ? `$${facets.price.min}` : "Min"}
                value={min}
                onChange={(e) => setMin(e.target.value)}
                onBlur={applyPrice}
                onKeyDown={applyOnEnter}
              />
              to
              <PriceInput
                type="number"
                min="0"
                inputMode="decimal"
                aria-label="Maximum price"
                placeholder={facets?.price ? `$${facets.price.max}` : "Max"}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                onBlur={applyPrice}
                onKeyDown={applyOnEnter}
              />
            </PriceForm>
          </Group>
          {active > 0 && (
            <Clear type="button" onClick={() => setSearchParams(withoutFilters(searchParams))}>
              Clear all
            </Clear>
          )}
        </Panel>
      )}
    </Container>
  );
}

export default ShopFilters;
