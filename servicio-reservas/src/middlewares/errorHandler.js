

function errorHandler(err, req, res, next) {
  console.error('Error global atrapado:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  });
}

module.exports = errorHandler;
