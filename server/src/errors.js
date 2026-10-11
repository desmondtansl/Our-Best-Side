// Unexpected errors: the details go to the server log (Render's logs), and
// the browser gets a plain message, never the internals (database messages,
// file paths, stack traces).

export const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";

export const internalError = (res, error, context = "Request") => {
  console.error(`${context} failed:`, error?.stack || error?.message || error);
  if (res.headersSent) return undefined;
  return res.status(500).json({ data: "", error: SOMETHING_WENT_WRONG });
};

// Express error handler, registered last in app.js. Catches errors passed
// to next() and errors thrown by the body parsers (malformed JSON, a body
// that's too large), and answers in JSON instead of Express's HTML page.
export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ data: "", error: "The request isn't valid JSON" });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ data: "", error: "The request is too large" });
  }
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500;
  if (status === 500) return internalError(res, error, `${req.method} ${req.path}`);
  return res.status(status).json({ data: "", error: SOMETHING_WENT_WRONG });
};

// Unknown addresses get a JSON 404 too.
export const notFoundHandler = (req, res) =>
  res.status(404).json({ data: "", error: "Not found" });
