const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    return res.status(409).json({ error: 'A record with that value already exists.', detail: err.detail });
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    return res.status(400).json({ error: 'Referenced record does not exist.', detail: err.detail });
  }

  if (err.code === '22P02') {
    // PostgreSQL invalid input syntax
    return res.status(400).json({ error: 'Invalid data format.', detail: err.detail });
  }

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
