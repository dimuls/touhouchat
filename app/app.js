
/**
 * Module dependencies.
 */

var express = require('express.io')
  , path = require('path')
  , config = require('./config')
  , model = require('./model')
  , lib = require('./lib');

var app = express().http().io();

// all environments
app.set('port', 8081);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({ secret: 'asdqwodj109018fh0w8efhq9p3agh08g3h' }));
app.use(express.multipart({ limit: '5mb' }));
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'upload')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

model.init(config, lib);

require('./routes')(app, config, model, lib);

app.listen(app.get('port'));
