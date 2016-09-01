var config = require('./config.json')
var processorJob = require('./processorjob')
var Promise = require('bluebird')
var log = require('./logger')
var moment = require('moment')

var job = Promise.coroutine(function*() {
  yield processorJob()
  log.info('sleep for', moment.duration(config.interval)
    .humanize())
  yield Promise.delay(config.interval)
})

var run = Promise.coroutine(function*() {
  while (true) {
    try {
      yield job()
    } catch (err) {
      log.error(err)
      log.info('sleep for', moment.duration(config.miniInterval)
        .humanize())
      yield Promise.delay(config.miniInterval)
      yield run()
    }
  }
})


run()
