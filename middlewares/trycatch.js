// Async handler middleware to wrap route handlers and catch errors
// Forwards any thrown errors to Express's error handler via next()
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('Async handler caught error:', err);
    next(err);
  });
};
