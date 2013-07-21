var m = require('../model')
  , f = require('./fixtures');

// TODO: make uniq redis state foreach test

function clear() {
  m.c.multi()
    .del('#test')
    .del('#test1')
    .del('#test2')
    .del('rooms_counters')
    .del('predefined_rooms')
    .del('config')
    .exec();
}

clear();

m.init({
  rooms_count_limit: 2,
  log_size_limit: 3
}, { test: 1 });

r = m.room('test');

exports['msgs counter with empty room'] = function(t) {
  t.expect(2);
  r.msgs.counter(function(err, cnt) {
    t.equal(err, null, 'no error');
    t.equal(cnt, 0, 'msgs counter is 0');
    t.done();
  });
};

exports['msgs with empty room'] = function(t) {
  t.expect(2);
  r.msgs(function(err, msgs) {
    t.equal(err, null, 'no error');
    t.deepEqual(msgs, [], 'empty msgs list');
    t.done();
  });
};

exports['get absent msg'] = function(t) {
  t.expect(2);
  r.msg(1, function(err, msg) {
    t.equal(err, null, 'no error');
    t.equal(msg, null, 'absent msg is null');
    t.done();
  });
};

exports['add msg to empty room'] = function(t) {
  t.expect(2);
  r.msg.add(f.msgForFirstAdd, function(err, msg) {
    t.equal(err, null, 'no error');
    if( !err ) {
      msg.dt = '';
      t.deepEqual(msg, f.msgAfterFirstAdd, 'right msg struct after add');
    }
    t.done();
  });
};

exports['get msg from room'] = function(t) {
  t.expect(3);
  r.msg(1, function(err, msg) {
    t.equal(err, null, 'no error');
    t.notEqual(msg, null, 'msg is not null');
    if( msg ) {
      msg.dt = '';
      t.deepEqual(msg, f.msgAfterFirstAdd, 'right msg struct after get');
    } else {
      t.failed();
    }
    t.done();
  });
}

exports['add multiple msgs to room'] = function(t) {
  t.expect(11);
  r.msg.add(f.msgForFirstAdd, function(err, msg) {
    t.equal(err, null, 'no error on add 2th msg');
  r.msg.add(f.msgForFirstAdd, function(err, msg) {
    t.equal(err, null, 'no error on add 3th msg');
  r.msg.add(f.msgForFirstAdd, function(err, msg) {
    t.equal(err, null, 'no error on add 4th msg');
  r.msgs.counter(function(err, cnt) {
    if( err ) { return; }
    t.equal(cnt, 4, 'msgs counter is 4');
  r.c.llen(r.hname, function(err, len) {
    if( err ) { return; }
    t.equal(len, 3, 'room list length is 3');
  r.msgs(function(err, msgs) {
    if( err ) { return; }
    t.notEqual(msgs, null, 'msgs not null after add multiple msgs');
    msgs = msgs.map(function(msg) { msg.dt = ''; return msg; });
    t.deepEqual(msgs, [
      f.msgAfterSecondAdd,
      f.msgAfterThirdAdd,
      f.msgAfterFourthAdd
    ], 'right msgs array after adding 4 msgs');
  r.msg(3, function(err, msg) {
    if( err ) { return; }
    t.notEqual(msg, null, 'msg with id=3 not null');
    msg.dt = '';
    t.deepEqual(msg, f.msgAfterThirdAdd, 'right msg by id=3 after multiple msgs added');
  r.msg(2, function(err, msg) {
    if( err ) { return; }
    t.notEqual(msg, null, 'msg with id=2 not null');
    try { msg.dt = ''; } catch(e) {}
    t.deepEqual(msg, f.msgAfterSecondAdd, 'right msg by id=2 after multiple msgs added');
    t.done();
  });});});});});});});});
}

exports['rooms count limit test'] = function(t) {
  t.expect(2);
  r1 = m.room('test1');
  r2 = m.room('test2');
  r1.msg.add(f.msgForFirstAdd, function(err, msg) {
    t.strictEqual(err, null, 'no error on add msg to 2nd room');
  r2.msg.add(f.msgForFirstAdd, function(err, msg) {
    t.notStrictEqual(err, null, 'error on add msg to 3nd room');
    t.done();
  })});
};

exports['clear if custom test'] = function(t) {
  t.expect(3);
  m.room('test1').clearIfCustom(function(err) {
    t.strictEqual(err, null, 'no error on clear if custom');
    m.c.multi()
      .exists('#test1')
      .hlen('rooms_counters')
      .exec(function(err, rep) {
        t.strictEqual(err, null, 'no error on check');
        t.deepEqual(rep, [0, 1])
        t.done();
        clear();
      });
  });
};

