var escapeHtml = require('escape-html')
  , wakabamark = require('./wakabamark');

exports.prepare = function(text, room) {
  return text
    ? wakabamark(escapeHtml(text.replace(/(^\s+|\s+$)/, '')), room)
    : '';
}
