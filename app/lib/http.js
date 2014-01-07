var http = require('http')
  , https = require('https');

exports.get = function(url, cb) {
  var proto = url.match(/^https/) ? https : http;
  try {
    proto.get(url, function(res) {
      if( res.statusCode != 200 ) { cb('not 200 OK status code'); return; }
      if( !res.headers['content-length'] || !res.headers['content-length'].match(/^\d+$/) ) { cb('wrong content length ('+res.headers['content-length']+')'); return; }
      if( !res.headers['content-type'] || !res.headers['content-type'].match(/^image\/(?:p?jpeg|gif|png)$/) ) { cb('not supported content type('+res.headers['content-type']+')'); return; }
      var buffer = new Buffer(parseInt(res.headers['content-length']));
      var offset = 0;
      res.on('data', function(chunk) { chunk.copy(buffer, offset); offset = chunk.length; });
      res.on('end', function() { cb(null, buffer); });
    }).on('error', function(err) {
      cb('download error('+err+')');
    });
  } catch(err) {
    cb('unexpected error('+err+')');
  }
};
