var text = require('../lib/text');

var testStr = '\n\
http://anonchat.pw/\n\
http://anonchat.pw/b/\n\
http://anonchat.pw/b/123/\n\
/b/\n\
/123/\n\
/b/123/\n\
/rm/\n\
/rm/123/';

var testStrRes = '\
<p><a href="http://anonchat.pw/">http://anonchat.pw/</a></p>\
<p><a href="http://anonchat.pw/b/">http://anonchat.pw/b/</a></p>\
<p><a href="http://anonchat.pw/b/123/">http://anonchat.pw/b/123/</a></p>\
<p><a href="/b/" data-bind="click: $root.chat.changeRoom.bind($data, \'b\')">/b/</a></p>\
<p><a href="/b/123/" data-bind="click: $root.chat.changeRoom.bind($data, \'b\', \'123\')">/123/</a></p>\
<p><a href="/b/123/" data-bind="click: $root.chat.changeRoom.bind($data, \'b\', \'123\')">/123/</a></p>\
<p><a href="/rm/" data-bind="click: $root.chat.changeRoom.bind($data, \'rm\')">/rm/</a></p>\
<p><a href="/rm/123/" data-bind="click: $root.chat.changeRoom.bind($data, \'rm\', \'123\')">/rm/123/</a></p>';

exports['right urls parsing'] = function(t) {
  t.expect(1);
  t.strictEqual(testStrRes, text.prepare(testStr, 'b'));
  t.done();
}
