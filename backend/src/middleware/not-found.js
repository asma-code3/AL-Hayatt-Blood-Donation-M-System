import { notFound } from '../utils/http.js';

export const notFoundHandler = (req, _res, next) => {
  next(notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
