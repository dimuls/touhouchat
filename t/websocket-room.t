use Mojo::Base -strict;

use Test::More;
use Test::MockObject;

use Websocket::Room;

my $data = { some => 'thing', foo => { bar => 1 } };

sub make_mock_client {
  my $mock = new Test::MockObject();
  $mock->mock('send', sub {});
  return $mock;
}

# Room add or remove client testing
{
  my $room = new Websocket::Room();
  is($room->clients_count, 0, 'Right clients count after creating room');
  $room->add(1, {});
  is($room->clients_count, 1, 'Right clients count after adding room');
  is_deeply($room->client(1), {}, 'Right object returned by getter after adding');
  $room->remove(1);
  is($room->clients_count, 0, 'Right clients count after remove one client');
}

# Room broadcast testing
{
  my $room = new Websocket::Room();
  $room->add($_, make_mock_client) for 1 .. 4;
  $room->broadcast(4, $data);
  for( 1 .. 3 ) {
    my $client = $room->client($_);
    my ($name, $arg) = $client->next_call;
    is($name, 'send', 'Right client method \'send\' called in $room->broadcast');
    is_deeply($data, $arg->[1], 'Right data passed to client method \'send\' called in $room->broadcast');
  }
  is($room->client(4)->called('send'), 0, 'In broadcast client \'send\' method not called');
}

# Room send testing
{
  my $room = new Websocket::Room();
  $room->add($_, make_mock_client) for 1 .. 4;
  $room->send($data);
  for( 1 .. 4 ) {
    my $client = $room->client($_);
    my ($name, $arg) = $client->next_call;
    is($name, 'send', 'Right client method \'send\' called in $room->send');
    is_deeply($data, $arg->[1], 'Right data passed to client method \'send\' called in $room->send');
  }
}


done_testing();
