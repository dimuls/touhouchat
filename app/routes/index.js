module.exports = function(app, cfg, m, l) {
  
  app.get('/', function(req, res) {
    res.render('index');
  });

  require('./room')(app, cfg, m, l);
  require('./chat')(app, cfg, m, l);

};
