const { Prisma } = require('@prisma/client');

const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Prisma known request errors (e.g. unique constraint violation)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A record with that value already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
  }

  // Validation errors from express-validator (passed via next())
  if (err.type === 'validation') {
    return res.status(422).json({ errors: err.errors });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message });
};

module.exports = { notFound, errorHandler };
