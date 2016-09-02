'use strict'
const url = require('url')
const http = require('http');
const port = 3000;

const Api = require('./helpers/api')
const userConfig = require('./config/user-config.json')
const Promise = require('bluebird')

const findUser = (email) => {
  return userConfig.filter(c => {
    return c.username === email
  })[0]
}

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');

  const parts = url.parse(req.url, true)
  if (parts.pathname === '/send') {
    const email = parts.query.email
    const session = parts.query.session

    const api = new Api(findUser(email))
    api.book(session)
      .then(() => res.end('<h1>Your session is booked!</h1>'))
      .catch(err => res.end('<h1>' + err + '</h1>'))

  } else {
    res.end('<h1>404</h1>');
  }
});

server.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
