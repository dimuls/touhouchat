var moment = require('moment');

function log(msg) {
  console.log('[dt:'+moment().format('DD.MM.YYYY HH:mm:ss')+'] '+msg);
};

function warn(msg) {
  console.warn('[dt:'+moment().format('DD.MM.YYYY HH:mm:ss')+'] '+msg);
};

function flog(ip, req, msg) {
  log('[ip:'+ip+'] [req:'+req+'] '+msg);
};

function fwarn(ip, req, msg) {
  warn('[ip:'+ip+'] [req:'+req+'] '+msg);
};

module.exports = {
  log: log,
  warn: warn,
  flog: flog,
  fwarn: fwarn,
};
