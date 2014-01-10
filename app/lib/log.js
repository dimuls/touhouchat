var moment = require('moment');

exports.log = function(msg) {
  console.log('[dt:'+moment().format('HH:mm:ss DD.MM.YYYY')+'] '+msg);
}

exports.warn = function(msg) {
  console.warn('[dt:'+moment().format('HH:mm:ss DD.MM.YYYY')+'] '+msg);
}

exports.flog = function(ip, req, msg) {
  exports.warn('[ip:'+ip+'] [req:'+req+'] '+msg);
}

exports.fwarn = function(ip, req, msg) {
  exports.warn('[ip:'+ip+'] [req:'+req+'] '+msg);
}
