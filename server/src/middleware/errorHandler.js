/** Terminal error handler. Logs the real cause, returns a safe message. */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    console.error(`[${req.method} ${req.path}]`, err);
  }

  // clientMessage is set where a 5xx has a cause worth explaining, such as the
  // model being temporarily out of capacity.
  const message = err.clientMessage ?? (status >= 500 ? 'Something went wrong.' : err.message);

  res.status(status).json({ error: message });
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}
