'use strict'

const Promise = require('bluebird')
const moment = require('moment')

const config = require('./config/config.json')
const users = require('./config/user-config.json')
const log = require('./helpers/logger')
const db = require('./helpers/db')
const Api = require('./helpers/api')

const Worker = require('./workers/worker');

const sleep = interval => {
  log.info('sleep for', moment.duration(interval)
    .humanize())
  return Promise.delay(interval)
}

const tick = Promise.coroutine(function*() {
  for (let user of users) {
    const options = {
      api: new Api(user),
      db,
      user
    }
    yield new Worker(options)
      .run()
  }
})

Promise.coroutine(function*() {
  log.info('starting bot')
  while (true) {
    log.info('tick')
    yield tick()
    yield sleep(config.interval)
  }
})()
