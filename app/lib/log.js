var moment = require('moment');

exports.log = function(msg) {
  console.log('['+moment().format('DD.MM.YYYY HH:mm:ss')+'] '+msg);
}

exports.warn = function(msg) {
  console.warn('['+moment().format('DD.MM.YYYY HH:mm:ss')+'] '+msg);
}

exports.fwarn = function(ip, req, msg) {
  exports.warn('['+ip+'] ['+req+'] '+msg);
}
