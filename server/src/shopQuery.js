// Turns the shop's search/filter URL (e.g. ?category=men&q=black+jacket
// &size=M&color=Black&min=50&max=200&sort=price-asc) into a MongoDB query.

import { parseList } from "./productFields.js";

const CATEGORY_PARAMS = { men: "Men", ladies: "Ladies" };

export const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { price: 1, _id: -1 },
  "price-desc": { price: -1, _id: -1 },
};

const MAX_QUERY_LENGTH = 100;
const MAX_WORDS = 8;
const MAX_OPTIONS = 20;
export const MAX_LIMIT = 50;

export const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Query values can arrive as a string, an array, or (with Express's query
// parser) an object such as { $ne: "" }. Only plain strings are used, so
// nothing from the URL can become a MongoDB operator.
const strings = (value) =>
  (Array.isArray(value) ? value : [value]).filter((item) => typeof item === "string");

const firstString = (value) => strings(value)[0];

const parseNumber = (value) => {
  const text = firstString(value);
  if (text === undefined || text.trim() === "") return undefined;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

// Matches one option in a size/colour list, ignoring case. Also matches older
// products that stored several options in one entry, such as "S, M".
const optionPattern = (option) =>
  new RegExp(`^(.*,\\s*)?${escapeRegex(option)}\\s*(,.*)?$`, "i");

export const parseShopQuery = (query = {}) => {
  const category = CATEGORY_PARAMS[String(firstString(query.category) || "").toLowerCase()];
  const words = String(firstString(query.q) || "")
    .slice(0, MAX_QUERY_LENGTH)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_WORDS);
  const sizes = parseList(strings(query.size)).slice(0, MAX_OPTIONS);
  const colors = parseList(strings(query.color)).slice(0, MAX_OPTIONS);
  const minPrice = parseNumber(query.min);
  const maxPrice = parseNumber(query.max);
  const sortKey = firstString(query.sort);
  const sort = Object.hasOwn(SORTS, sortKey) ? sortKey : "newest";
  const requestedLimit = Number(firstString(query.limit));
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : undefined;
  return { category, words, sizes, colors, minPrice, maxPrice, sort, limit };
};

// Category and search words: the set of products the filters narrow down.
// Each word must appear (as the start of a word) in the title, description,
// colour or category, so "black jacket" finds "Black Leather Jacket".
export const baseFilter = ({ category, words }) => {
  const conditions = [];
  if (category) conditions.push({ category });
  for (const word of words) {
    const pattern = new RegExp(`\\b${escapeRegex(word)}`, "i");
    conditions.push({
      $or: [
        { title: pattern },
        { description: pattern },
        { color: pattern },
        { category: pattern },
      ],
    });
  }
  return conditions.length ? { $and: conditions } : {};
};

// Base filter plus the shopper's size, colour and price choices. Several
// sizes (or colours) mean "any of these".
export const shopFilter = (parsed) => {
  const conditions = [...(baseFilter(parsed).$and || [])];
  if (parsed.sizes.length) {
    const patterns = parsed.sizes.map(optionPattern);
    conditions.push({
      $or: [
        // Stock tracked per size: the chosen size must be in stock.
        { sizeStock: { $elemMatch: { size: { $in: patterns }, inStock: { $gt: 0 } } } },
        // Otherwise, any product offering the size.
        { "sizeStock.0": { $exists: false }, size: { $in: patterns } },
      ],
    });
  }
  if (parsed.colors.length) {
    conditions.push({ color: { $in: parsed.colors.map(optionPattern) } });
  }
  const price = {};
  if (parsed.minPrice !== undefined) price.$gte = parsed.minPrice;
  if (parsed.maxPrice !== undefined) price.$lte = parsed.maxPrice;
  if (Object.keys(price).length) conditions.push({ price });
  return conditions.length ? { $and: conditions } : {};
};

const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

// S, M, L, XL first in that order, then numeric sizes (US 6, US 7, 28, 30)
// by number, then anything else alphabetically.
export const compareSizes = (a, b) => {
  const rank = (size) => {
    const letter = LETTER_SIZES.indexOf(size.toUpperCase());
    if (letter !== -1) return [0, letter, ""];
    const number = size.match(/\d+(\.\d+)?/);
    if (number) return [1, Number(number[0]), size];
    return [2, 0, size.toLowerCase()];
  };
  const [ga, na, ta] = rank(a);
  const [gb, nb, tb] = rank(b);
  return ga - gb || na - nb || ta.localeCompare(tb);
};

// The filter options to offer: every size, colour and the price range found
// in the base set, so options don't disappear as the shopper narrows down.
export const buildFacets = (products) => {
  const unique = (lists) => {
    const seen = new Map();
    for (const option of parseList(lists.flat())) {
      const key = option.toLowerCase();
      if (!seen.has(key)) seen.set(key, option);
    }
    return [...seen.values()];
  };
  const prices = products.map((p) => p.price).filter((p) => typeof p === "number");
  return {
    sizes: unique(products.map((p) => p.size || [])).sort(compareSizes),
    colors: unique(products.map((p) => p.color || [])).sort((a, b) =>
      a.localeCompare(b)
    ),
    price: prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : null,
  };
};

// Words that say nothing about what a product is.
const IGNORED_WORDS = new Set(["men", "mens", "ladies", "lady", "women", "womens", "the", "and", "with"]);

const titleWords = (title) =>
  new Set(
    String(title || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !IGNORED_WORDS.has(word))
  );

// Ranks candidates for "You may also like": a shared word in the title
// (e.g. both are "Loafers") counts most, then shared colours. Ties keep the
// candidates' order (newest first).
export const rankRelated = (product, candidates, limit) => {
  const words = titleWords(product.title);
  const colors = new Set(parseList(product.color || []).map((c) => c.toLowerCase()));
  const score = (candidate) => {
    let total = 0;
    for (const word of titleWords(candidate.title)) if (words.has(word)) total += 2;
    for (const color of parseList(candidate.color || [])) {
      if (colors.has(color.toLowerCase())) total += 1;
    }
    return total;
  };
  return candidates
    .map((candidate, index) => ({ candidate, index, score: score(candidate) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
};
