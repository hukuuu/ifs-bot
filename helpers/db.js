const Store = require('jfs')
const db = new Store('./data')

module.exports = {
  getCookie(key) {
    return db.getSync(key)
      .cookie
  },
  getLastSent(key, sub) {
    const obj = db.getSync(key)
    return obj.lastSent ? obj.lastSent[sub] : null
  },
  setCookie(key, value) {
    const obj = this.__handle(db.getSync(key))
    obj.cookie = value
    db.saveSync(key, obj)
    return obj
  },
  setLastSent(key, sub, value) {
    const obj = this.__handle(db.getSync(key))
    const lu = obj.lastSent || {}
    lu[sub] = value
    obj.lastSent = lu
    db.saveSync(key, obj)
    return obj
  },

  __handle(obj) {
    return obj instanceof Error ? {} : obj
  }
}
