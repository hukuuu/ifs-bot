var config = require('./config.json')
var moment = require('moment')
var cheerio = require('cheerio');
var Promise = require('bluebird')
var db = require('./db')
var programs = require('./programs')
var log = require('./logger');
var request = Promise.promisify(require("request"));

function Api(user) {
  this.user = user
  this.jar = request.jar()
  this.url = config.url
  request = request.defaults({
    jar: this.jar,
    baseUrl: this.url,
    headers: {
      'club-id': config.clubId
    },
    timeout: config.timeout
  })
}

Api.prototype.book = Promise.coroutine(function*(sessionId) {
  var response = yield this.__request({
    url: '/api/v1/sessions/' + sessionId,
    method: 'GET'
  })
  var session = JSON.parse(response.body)
  this.__validate(session)
  response = yield this.__request({
    url: '/api/v1/sessions/' + sessionId + '/dropin',
    method: 'POST',
    formData: programs[session.program.id]
  })
  return response.statusCode
})

Api.prototype.findFutureSessions = Promise.coroutine(function*() {
  var response = yield this.__request({
    url: '/api/v1/clubs/a932c526-1552-4ec0-8096-ee0be5a40ff3/sessions',
    method: 'GET',
    qs: {
      from: moment()
        .toISOString(),
      to: moment()
        .add(1, 'weeks')
        .toISOString()
    }
  })

  return JSON.parse(response.body)
});

Api.prototype.__request = Promise.coroutine(function*(options) {
  var cookieString = yield this.__getCookieString(true)
  var cookie = request.cookie(cookieString);
  this.jar.setCookie(cookie, this.url)
  var response = yield request(options)
  if (response.statusCode === 401) {
    log.debug('should authenticate first...')
    var cookieString = yield this.__getCookieString(false)
    var cookie = request.cookie(cookieString);
    this.jar.setCookie(cookie, this.url)
  }
  return yield request(options)
})


Api.prototype.__validate = (session) => {
  if (session.full)
    throw new Error('session is full');
  if (session.cancelled)
    throw new Error('session is cancelled')
  if (session.visit && session.visit.state === 'booked')
    throw new Error('session is already booked')
  if (moment(session.booking_open_date)
    .isAfter(moment()))
    throw new Error('booking not open')
  if (moment(session.booking_close_date)
    .isBefore(moment()))
    throw new Error('booking closed')
};

Api.prototype.__getCookieString = Promise.coroutine(function*(cache) {
  if (cache) {
    log.debug('search cookie in cache')
    var cookie = db.getCookie(this.user.username)
    if (typeof cookie === 'string') {
      log.debug('cookie found')
      return cookie
    }
  }

  var response = yield request({
    url: '/login',
    method: 'GET'
  })
  var $ = cheerio.load(response.body)
  var token = $('meta[name="csrf-token"]')
    .attr('content')
  log.debug('token: ', token)

  var response = yield request({
    url: '/login',
    method: 'POST',
    formData: {
      authenticity_token: token,
      login_email: this.user.username,
      login_password: this.user.password,
      commit: 'Log In'
    }
  })
  var success = response.statusCode === 302
  log.debug('POST /login', response.statusCode, ' -> ', success ? 'success' : 'fail')
  if (!success)
    throw new Error('wrong credentials')

  var cookie = this.jar.getCookieString(this.url)

  log.debug('saving cookie in cache')
  db.setCookie(this.user.username, cookie)

  return cookie

})

module.exports = Api;
