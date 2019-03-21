import createMockMiddleware from './createMockMiddleware';

module.exports = function(mockDir, options) {
  return createMockMiddleware(mockDir, options);
};
