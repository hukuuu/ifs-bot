var url = require('url')
var http = require('http');
var port = 3000;

var Api = require('./api')
var userConfig = require('./user-config.json')
var Promise = require('bluebird')

var findUser = (email) => {
  return userConfig.filter(c => {
    return c.username === email
  })[0]
}

var server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');

  var parts = url.parse(req.url, true)
  if (parts.pathname === '/send') {
    var email = parts.query.email
    var session = parts.query.session

    var api = new Api(findUser(email))
    api.book(session)
      .then(() => res.end('<h1>stana</h1>'))
      .catch(err => res.end('<h1>' + err + '</h1>'))

  } else {
    res.end('<h1>404</h1>');
  }
});

server.listen(port,  () => {
  console.log(`Server running at port ${port}`);
});
