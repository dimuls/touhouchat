module.exports = function(app, cfg, m, l) {
  
  app.get('/:room/', function(req, res) {
    var room = req.params.room;
    if( !room || !room.match(/^[A-Za-z]\w*$/) ) { res.send(404); return; }
    res.render('room', { cfg: cfg, room: room});
  });

  app.get('/:room/:message/', function(req, res) {
    var room = req.params.room;
    var message = req.params.message;
    if( !room || !room.match(/^[A-Za-z]\w*$/) ) { res.send(404); return; }
    if( !message || !message.toString().match(/^\d+$/) ) { res.send(404); return; }
    res.render('room', { cfg: cfg, room: room, message: message });
  });

}
