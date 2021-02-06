const path = require('path');
const express = require('express');
const mockApiMiddleware = require('express-mock-api-middleware');

const app = express();
app.use(
  '/',
  mockApiMiddleware(path.resolve(__dirname, 'mock'), {
    ignore: ['asm.js'],
  })
);

const host = 'localhost';
const port = 4000;

app.listen(port, host, (error) => {
  if (error) {
    console.error(error);
    return;
  }
  console.info(`http://${host}:${port}`);
  console.log(`You can access the mock APIs via
  http://${host}:${port}/api/user/info
  http://${host}:${port}/api/user/login (POST)
  http://${host}:${port}/api/product/121
  http://${host}:${port}/api/product/122`);
});
