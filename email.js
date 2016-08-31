var config = require('./config.json')
var mailjet = require('node-mailjet')
  .connect(config.emailToken, config.emailSecret)
var log = require('winston')

var sendEmail = (recipient, link, name) => {
  log.info('send email', recipient, name, link)
  return mailjet
    .post("send")
    .request({
      "MJ-TemplateID": "46050",
      "MJ-TemplateLanguage": "true",
      "FromEmail": config.fromEmail,
      "Vars": {
        "name": name,
        "confirmation_link": link
      },
      "Recipients": [{
        "Email": recipient
      }]
    })
}

module.exports = sendEmail;
