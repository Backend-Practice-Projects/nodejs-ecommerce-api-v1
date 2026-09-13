class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    //Means error we can predect
    this.isOperational = true;
    this.status = `${statusCode}`.startsWith(4) ? "Fail" : "Error";
  }
}
module.exports = ApiError;
