'use strict'
const log = require('../helpers/logger')
const Promise = require('bluebird')
const moment = require('moment')
const config = require('../config/config.json')

class Worker {
  constructor(options) {
    this.user = options.user
    this.api = options.api
    this.db = options.db

    this.run = Promise.coroutine(function*() {
      log.info('worker running for', this.user.username)

      const sessions = yield this.api.findFutureSessions()
      log.info(sessions.length, 'sessions found')
      const targetSessions = sessions.filter(this.isTarget.bind(this))
      log.info(targetSessions.length, 'sessions are target')

      if (!targetSessions.length) {
        log.info('no suitable sessions found.')
      } else {
        for (let session of targetSessions) {
          log.info('should send email for', session.id)
          yield this.api.sendEmail(this.makeLink(this.user.username, session.id), this.makeTemplate(session))
          this.db.setLastSent(this.user.username, this.dateKey(moment(session.start_date)), session.id)
        }
      }

    })

  }

  makeTemplate(session) {
    return `${session.name} - ${moment(session.start_date).calendar()}`
  }

  makeLink(username, sessionId) {
    return `${config.callback}?email=${username}&session=${sessionId}`
  }

  dateKey(date) {
    return `${date.get('days')} ${date.get('hours')} ${date.get('minutes')}`
  }

  alreadySent(username, session) {
    var sessionDate = moment(session.start_date)
    var sub = this.dateKey(sessionDate)
    var lastSent = this.db.getLastSent(username, sub)
    log.silly(username, sub, lastSent, session.id, !lastSent && lastSent == session.id)
    return !!lastSent && lastSent == session.id
  }

  contain(configSessions, session) {
    var start = moment(session.start_date)
    return configSessions.filter(s => {
        return this.dateKey(start) === s
      })
      .length > 0
  }

  isTarget(session) {
    return !session.full &&
      !session.cancelled &&
      (!session.visit || !!session.visit && session.visit.state !== 'booked') &&
      moment(session.booking_open_date)
      .isBefore(moment()) &&
      moment(session.booking_close_date)
      .isAfter(moment()) &&
      !this.alreadySent(this.user.username, session) &&
      this.contain(this.user.sessions, session)
  }

}

module.exports = Worker;
