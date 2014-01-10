var escapeHtml = require('escape-html')
  , gruff = require('./gruff');

exports.prepare = function(text, room) {
  return text
    ? gruff(escapeHtml(text.replace(/(^\s+|\s+$)/, '')), room)
    : '';
}
