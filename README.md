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
  path.resolve(__dirname, 'mock')
);
app.use(mockApiMiddleware);
```
`path.resolve(__dirname, 'mock')` is the folder where mock API files are.

## Mock files
For example in file `/mock/user.js`, you can have content
```
export default {
  'GET /api/user/info': {
    id: 101,
    userName: 'wilson',
    email: 'wilson@gmail.com',
    firstName: 'Wilson',
    lastName: 'Tian',
  },
  'POST /api/user/login': (req, res) => {
    const { userName, password } = req.body;
    if (userName === 'wilson' && password === 'pass') {
      res.send({
        success: true,
      });
    } else {
      res.send({
        success: false,
      });
    }
  }
};
```
