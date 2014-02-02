var moment = require('moment');

exports.log = function(msg) {
  console.log('[dt:'+moment().format('DD.MM.YYYY HH:mm:ss')+'] '+msg);
}

exports.warn = function(msg) {
  console.warn('[dt:'+moment().format('DD.MM.YYYY HH:mm:ss')+'] '+msg);
}

exports.flog = function(ip, req, msg) {
  exports.warn('[ip:'+ip+'] [req:'+req+'] '+msg);
}

exports.fwarn = function(ip, req, msg) {
  exports.warn('[ip:'+ip+'] [req:'+req+'] '+msg);
}
