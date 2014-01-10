module.exports = function(app, cfg, m, l) {
  
  app.get('/:room/', function(req, res) {
    var room = req.params.room;
    if( !room || !room.match(/^[A-Za-z]\w*$/) ) { res.send(404); }
    res.render('room', { joinRoom: room });
  });

}
