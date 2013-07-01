use Mojo::Base -strict;

use Test::More;
use Test::MockObject::Extends;

use Websocket::Rooms;

# Creating with one default rooms testing
{
  my $rooms = new Websocket::Rooms('play');
  is($rooms->rooms_count, 1, 'Rooms created with default rooms qw(play) right rooms count');
  isa_ok($rooms->room('play'), 'Websocket::Room', 'Room $rooms->room(\'play\')');
}

# Creating with two default room testing
{
  my $rooms = new Websocket::Rooms('play', 'games');
  is($rooms->rooms_count, 2, 'Rooms created with default rooms qw(play, games) right rooms count');
  isa_ok($rooms->room('play'), 'Websocket::Room');
  isa_ok($rooms->room('games'), 'Websocket::Room');
}

# Creating with no default room and dynamic room adding testing
{
  my $rooms = new Websocket::Rooms();
  is($rooms->rooms_count, 0, 'Rooms created with no default rooms right rooms count');
  $rooms->add_client('game/1', 1, {});
  is($rooms->rooms_count, 1, 'Rooms count increased by one after adding client to unexisting room');
  isa_ok($rooms->room('game/1'), 'Websocket::Room');
}

my $room_mock = new Test::MockObject::Extends('Websocket::Room');
$room_mock->mock('remove', sub {});

# Dynamic room remove testing: room removed after removing it last client
{
  my $rooms = new Websocket::Rooms();
  $room_mock->mock('clients_count', sub { return 0 });
  $rooms->{_rooms}->{'game/1'} = $room_mock;
  $rooms->remove_client('game/1', 1);
  is($rooms->rooms_count, 0, 'Rooms count decreased by one after removing last client in existing rooms');
}

# Dynamic room remove testing: room leaves existing after removing it not last client
{
  my $rooms = new Websocket::Rooms();
  $room_mock->mock('clients_count', sub { return 1 });
  $rooms->{_rooms}->{'game/1'} = $room_mock;
  $rooms->remove_client('game/1', 1);
  is($rooms->rooms_count, 1, 'Rooms count not decreased by one after removing not last client in existing rooms');
}

done_testing();
