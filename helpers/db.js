var Store = require('jfs')
var db = new Store('./data')

var getCookie = (key) => {
  return db.getSync(key)
    .cookie
}
var getLastSent = (key, sub) => {
  var obj = db.getSync(key)
  return obj.lastSent ? obj.lastSent[sub] : null
}
var setCookie = (key, value) => {
  var obj = handle(db.getSync(key))
  obj.cookie = value
  db.saveSync(key, obj)
  return obj
}
var setLastSent = (key, sub, value) => {
  var obj = handle(db.getSync(key))
  var lu = obj.lastSent || {}
  lu[sub] = value
  obj.lastSent = lu
  db.saveSync(key, obj)
  return obj
}

var handle = (obj) => {
  return obj instanceof Error ? {} : obj
}

module.exports = {
  getCookie: getCookie,
  getLastSent: getLastSent,
  setCookie: setCookie,
  setLastSent: setLastSent
}
