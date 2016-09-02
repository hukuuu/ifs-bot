const config = require('../config/config.json')
const moment = require('moment')
const winston = require('winston');
const log = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)({
      timestamp: function() {
        return moment()
          .format('DD/MM HH:mm:ss')
      },
      formatter: function(options) {
        // Return string will be passed to logger.
        return options.timestamp() + ' [' + options.level.toUpperCase() + '] ' + (undefined !== options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta)
            .length ? '\n\t' + JSON.stringify(options.meta) : '');
      }
    })
  ]
});
log.level = config.logLevel

module.exports = log;
