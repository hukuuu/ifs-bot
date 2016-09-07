'use strict'
const config = require('../config/config.json')
const moment = require('moment')
const cheerio = require('cheerio');
const Promise = require('bluebird')
const db = require('./db')
const programs = require('./programs')
const log = require('./logger');
let request = Promise.promisify(require("request"));
const mailjet = require('node-mailjet')
  .connect(config.emailToken, config.emailSecret)

class Api {

  constructor(user) {
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

  book(sessionId) {
    return Promise.coroutine(function*() {
      let response = yield this.__request({
        url: '/api/v1/sessions/' + sessionId,
        method: 'GET'
      })
      const session = JSON.parse(response.body)
      this.__validate(session)

      const options = {
        url: `/api/v1/sessions/${sessionId}/book`,
        method: 'POST',
      }
      if (!this.user.multisport) {
        options.url = `/api/v1/sessions/${sessionId}/dropin`
        options.formData = programs[session.program.id]
      }

      response = yield this.__request(options)
      log.debug(response.body)
      return response.statusCode
    }.bind(this))()
  }

  findFutureSessions() {
    return Promise.coroutine(function*() {
      const response = yield this.__request({
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
    }.bind(this))()
  }

  sendEmail(link, name) {
    const recipient = this.user.username
    log.info('send email', recipient, name, link)
    return mailjet
      .post("send")
      .request({
        "MJ-TemplateID": "46050",
        "MJ-TemplateLanguage": "true",
        "FromEmail": config.fromEmail,
        "consts": {
          "name": name,
          "confirmation_link": link
        },
        "Recipients": [{
          "Email": recipient
        }]
      })
  }

  __request(options) {
    return Promise.coroutine(function*() {
      const cookieString = yield this.__getCookieString(true)
      const cookie = request.cookie(cookieString);
      this.jar.setCookie(cookie, this.url)
      const response = yield request(options)
      if (response.statusCode === 401) {
        log.debug('should authenticate first...')
        const cookieString = yield this.__getCookieString(false)
        const cookie = request.cookie(cookieString);
        this.jar.setCookie(cookie, this.url)
        return yield request(options)
      }
      return response
    }.bind(this))()
  }

  __validate(session) {
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
  }

  __getCookieString(cache) {
    return Promise.coroutine(function*() {
      if (cache) {
        log.debug('search cookie in cache')
        const cookie = db.getCookie(this.user.username)
        if (typeof cookie === 'string') {
          log.debug('cookie found')
          return cookie
        }
      }

      let response = yield request({
        url: '/login',
        method: 'GET'
      })
      const $ = cheerio.load(response.body)
      const token = $('meta[name="csrf-token"]')
        .attr('content')
      log.debug('token: ', token)

      response = yield request({
        url: '/login',
        method: 'POST',
        formData: {
          authenticity_token: token,
          login_email: this.user.username,
          login_password: this.user.password,
          commit: 'Log In'
        }
      })
      const success = response.statusCode === 302
      log.debug('POST /login', response.statusCode, ' -> ', success ? 'success' : 'fail')
      if (!success)
        throw new Error('wrong credentials')

      const cookie = this.jar.getCookieString(this.url)

      log.debug('saving cookie in cache')
      db.setCookie(this.user.username, cookie)

      return cookie

    }.bind(this))()
  }

}

module.exports = Api;
