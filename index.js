var config = require('./config.json')
var processorJob = require('./processorjob')
var Promise = require('bluebird')
var log = require('winston')
log.level = config.logLevel

var run = Promise.coroutine(function*() {
  while (true) {
    yield processorJob()
    log.info('sleeping', config.interval)
    yield Promise.delay(config.interval)
  }
})

run()
