var m = require('../model');

m.init({
  rooms_count_limit: 2,
  log_size_limit: 3
}, { test: 1 });

function clear(exit) {
  m.c.multi()
    .del('rooms_counters')
    .del('predefined_rooms')
    .del('config')
    .del('users/test')
    .hdel('extensions', 'test')
    .del('users/test-user')
    .exec(function() {
      //if( exit ) { m.c.quit() }
    });
}

clear();

exports['create and remove extension code'] = function(t) {
  t.expect(7);
  m.extension.create(function(err, code) {
    t.equal(err, null, 'no error');
  m.c.hexists('extensions', code, function(err, exists) {
    t.equal(err, null, 'no error');
    t.equal(exists, true, 'extension code created');
  m.extension.remove(code, function(err, count) {
    t.equal(err, null, 'no error');
    t.equal(count, 1, 'one field deleted on extension code remove');
  m.c.hexists('extensions', code, function(err, exists) {
    t.equal(err, null, 'no error');
    t.equal(exists, false, 'extension code removed'); 
    t.done();
  });});});});
}

exports['activate and check extension code'] = function(t) {
  t.expect(6);
  var code = 'test';
  m.c.hset('extensions', code, '', function(err, code) {
    t.equal(err, null, 'no error');
  m.extension.check('test-user', 'test', function(err, ok) {
    t.equal(err, null, 'no error');
    t.equal(ok, false, 'not activated code check fails')
  m.extension.activate('test-user', 'test', function(err) {
    t.equal(err, null, 'no error');
  m.extension.check('test-user', 'test', function(err, ok) {
    t.equal(err, null, 'no error');
    t.equal(ok, true, 'activated code check passes');
    t.done();
    clear(true);
  });});})});
}


