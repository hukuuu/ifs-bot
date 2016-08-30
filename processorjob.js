var db = require('./db')
var Promise = require('bluebird')
var moment = require('moment')
var config = require('./config.json')
var userConfig = require('./user-config.json')
var log = require('winston')
log.level = config.logLevel
var sendEmail = require('./email.js')
var Api = require('./api')

var dateKey = (date) => {
  return `${date.get('days')} ${date.get('hours')} ${date.get('minutes')}`
}

var alreadySent = (username, session) => {
  var sessionDate = moment(session.start_date)
  var sub = dateKey(sessionDate)
  var lastSent = db.getLastSent(username, sub)
  log.silly(username, sub, lastSent, session.id, !lastSent && lastSent == session.id)
  return !!lastSent && lastSent == session.id
}

var contain = (configSessions, session) => {
  var start = moment(session.start_date)
  return configSessions.filter(s => {
      return dateKey(start) === s
    })
    .length > 0
}

var template = (session) => {
  return `${session.name} - ${moment(session.start_date).calendar()}`
}

var makeFilter = (user) => {
  return session => {
    log.debug(template(session))
    log.debug('full', 'cancelled', 'visited', 'open', 'close', 'sent', 'inconfig')
    log.debug(!session.full, !session.cancelled, (!session.visit || !!session.visit && session.visit.state !== 'booked'),
      moment(session.booking_open_date)
      .isBefore(moment()),
      moment(session.booking_close_date)
      .isAfter(moment()), !alreadySent(user.username, session), contain(user.sessions, session))

    return !session.full &&
      !session.cancelled &&
      (!session.visit || !!session.visit && session.visit.state !== 'booked') &&
      moment(session.booking_open_date)
      .isBefore(moment()) &&
      moment(session.booking_close_date)
      .isAfter(moment()) &&
      !alreadySent(user.username, session) &&
      contain(user.sessions, session)

  }
}

var makeLink = (username, sessionId) => {
  return `${config.callback}?email=${username}&session=${sessionId}`
}

var doProcess = Promise.coroutine(function*() {

  return Promise.each(userConfig, Promise.coroutine(function*(user) {
    log.info('----------')
    log.info('processing', user.username)
    log.info()

    var api = new Api(user)

    var sessions = yield api.findFutureSessions()
    var targetSessions = sessions.filter(makeFilter(user))

    if (!targetSessions.length) {
      log.info('no suitable sessions found.')
      log.info()
    } else {
      targetSessions.forEach(session => {
        sendEmail(user.username, makeLink(user.username, session.id), template(session))
        db.setLastSent(user.username, dateKey(moment(session.start_date)), session.id)
      })
    }
  }))
})

module.exports = doProcess
