export const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

export const unauthorized = (message = 'Authentication required.') => {
  const error = new Error(message);
  error.status = 401;
  return error;
};

export const forbidden = (message = 'You do not have access to this resource.') => {
  const error = new Error(message);
  error.status = 403;
  return error;
};

export const notFound = (message = 'Resource not found.') => {
  const error = new Error(message);
  error.status = 404;
  return error;
};
