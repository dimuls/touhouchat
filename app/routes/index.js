module.exports = function(app, m) {
  
  app.get('/', function(req, res) {
    res.render('index');
  });

  require('./chat')(app, m);

};
