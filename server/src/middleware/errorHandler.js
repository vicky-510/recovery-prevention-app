/** Terminal error handler. Logs the real cause, returns a safe message. */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    console.error(`[${req.method} ${req.path}]`, err);
  }

  res.status(status).json({ error: status >= 500 ? 'Something went wrong.' : err.message });
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}
