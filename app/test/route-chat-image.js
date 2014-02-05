var route = require('../routes/chat/image')
  , fs = require('fs')
  , path = require('path');

var cfg = { paths: { messageImages: __dirname } };

var imgId = '3ac6859ae7ffa2ba7b64fc7e2ca5c581';
var userId = 'af9bfc90f3eccc038c12bf5296972f51b80c231d26710aaa36c573e78cd65d7edac985165c6afada6518bbba74ebfc81e22349198b03e308d0d5d5595944eeca';
var token = 'af9bfc90f3eccc038c12bf5296972f51b80c231d26710aaa36c573e78cd65d7edac985165c6afada6518bbba74ebfc81e22349198b03e308d0d5d5595944eecad21c3ef6a7b02de7c6a4f05d9816e7c97161db7b0f9d497b7bf33cb8e57bf61dfb95f7b44f3b3f7b5ba2f3c8a2eada32d016cabe0f9eeb1086bf8daefde95ace'

exports['jpg test image upload'] = function(t) {
  t.expect(5);
  route(
    { post: function(path, handler) {
        t.equal(path, '/image/', 'right route path');
        handler({ body: { userId: userId, token: token }, files: { image: { path: 'asd' } }}, { json: function(res) { t.deepEqual(res, { ok: 'ok', data: imgId }) } });
      }
    },
    cfg,
    { token: { check: function(_userId, _token, cb) {
      t.equal(_userId, userId, 'right user id in token check');
      t.equal(_token, token, 'right token in token check');
      cb(null, true);
    }} },
    { image: {
        upload: function(file, targetPath, cb) {
          t.equal(file, 'asd', 'right download source path')
          cb(null, imgId);
        }
      }
    }
  );
  t.done();
};

exports['jpg test image download'] = function(t) {
  t.expect(5);
  route(
    { post: function(path, handler) {
        t.equal(path, '/image/', 'right route path');
        handler({ body: { userId: userId, token: token, url: 'asd' }}, { json: function(res) { t.deepEqual(res, { ok: 'ok', data: imgId }) } });
      }
    },
    cfg,
    { token: { check: function(_userId, _token, cb) {
      t.equal(_userId, userId, 'right user id in token check');
      t.equal(_token, token, 'right token in token check');
      cb(null, true);
    }} },
    { image: {
        download: function(file, targetPath, cb) {
          t.equal(file, 'asd', 'right download target path')
          cb(null, imgId);
        }
      }
    }
  );
  t.done();
};
