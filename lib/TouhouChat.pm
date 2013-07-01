package TouhouChat;

use Mojo::Base 'Mojolicious';
use Websocket::Rooms;

# This method will run once at server start
sub startup {
  my $self = shift;

  # Documentation browser under "/perldoc"
  $self->plugin('PODRenderer');
  #$self->plugin('DefaultHelpers');
 
  $self->secret('AOIShq092u0qdh08dH)*HR#)@*hf32q0fq-H*)#@HDF)A8fh10');

  # Websocket helpers
  my $rooms = new Websocket::Rooms('b', 'to', 'rm');
  $self->helper(rooms => sub { return $rooms });
  $self->helper(room => sub {
    my($self, $room) = @_;
    $room ||= $self->param('room');
    return $rooms->room($room);
  });

  $self->helper(c => sub { return $_[0]->tx });
  $self->helper(cid => sub { return sprintf '%s', $_[0]->c });

  # Router
  my $r = $self->routes;

  # Normal route to controller
  $r->get('/')->to('main#index');
  $r->get('/:room')->to('main#room');
  $r->websocket('/app/:room')->to('app#handle');
}
1;
