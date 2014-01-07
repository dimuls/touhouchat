g = require('../lib/gruff');

exports['current room'] = function(t) {
  t.expect(1);
  t.strictEqual(g('#/b/','b'), '<p><a href="/#/b/">#/b/</a></p>');
  t.done();
};

exports['current room post, long style'] = function(t) {
  t.expect(1);
  t.strictEqual(g('#/b/123/','b'), '<p><a href="/#/b/123/">/123/</a></p>');
  t.done();
};

exports['current room post, short style'] = function(t) {
  t.expect(1);
  t.strictEqual(g('/123/','b'), '<p><a href="/#/b/123/">/123/</a></p>');
  t.done();
};

exports['current room'] = function(t) {
  t.expect(1);
  t.strictEqual(g('#/b/','b'), '<p><a href="/#/b/">#/b/</a></p>');
  t.done();
};

exports['another room'] = function(t) {
  t.expect(1);
  t.strictEqual(g('#/rm/','b'), '<p><a href="/#/rm/">#/rm/</a></p>');
  t.done();
};

exports['another room post'] = function(t) {
  t.expect(1);
  t.strictEqual(g('#/rm/123/','b'), '<p><a href="/#/rm/123/">#/rm/123/</a></p>');
  t.done();
};

