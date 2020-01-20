# express-mock-api-middleware
Express middleware for mocking restful APIs

# Install
```
npm install --save-dev express-mock-api-middleware
```

# Usage

## Express
In your `server.js`, add the following code
```
const path = require('path');
const express = require('express');

const app = express();
const mockApiMiddleware = require('express-mock-api-middleware')(
  path.resolve(__dirname, 'mock'),
  { ignore: ['asm.js'] }
);
app.use('/', mockApiMiddleware);

const host = 'localhost';
const port = 4000;

app.listen(port, host, error => {
  if (error) {
    console.error(error);
    return;
  }
  console.info(`http://${host}:${port}`);
});
```
`path.resolve(__dirname, 'mock')` is the folder where mock API files are.
`{ ignore: ['asm.js'] }` is the options for more flexible glob. (See how to use `ignore` in [options](https://github.com/isaacs/node-glob#options))

## Mock files
For example in file `/mock/user.js`, you can have content
```
// you can write your own mock logic here
module.exports = {
  'GET /api/user/info': {
    id: 101,
    userName: 'bob',
    email: 'bob@gmail.com',
    firstName: 'Bob',
    lastName: 'Bushee',
  },

  'POST /api/user/login': (req, res) => {
    const { userName, password } = req.body;
    if (userName === 'bob' && password === 'password') {
      res.send({
        success: true,
      });
    } else {
      res.send({
        success: false,
      });
    }
  },

  'GET /api/product/:id': (req, res) => {
    const { id } = req.params;
    res.sendFile(path.join(__dirname, `products/${id}.json`));
  }
};
```
Then you can access the mock API from `http://localhost:4000/api/user/info`.

## Show debug log
Set the `DEBUG` environment variable
```
DEBUG=mock-api
```