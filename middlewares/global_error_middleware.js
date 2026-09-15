const globalErrorMiddleware = (error, req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    return sendDevelopmentError(res, error);
  }
  return sendProductionError(res, error);
};

const sendProductionError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const status = error.status || "Error";
  return res.status(statusCode).json({
    message: error.message,
    status: status,
  });
};
const sendDevelopmentError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const status = error.status || "Error";
  return res.status(statusCode).json({
    error: error,
    message: error.message,
    stack: error.stack,
    status: status,
  });
};
module.exports = globalErrorMiddleware;
