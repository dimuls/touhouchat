package Websocket::Rooms;

use v5.14;
use utf8;

use Websocket::Room;

sub new($) {
  my ($class, @rooms) = @_;
  my $self = {
    _rooms => { map { $_ => new Websocket::Room() } @rooms },
    _predefined_rooms => { map { $_ => 1 } @rooms },
  };
  bless $self, $class;
  return $self;
}

sub rooms_count($) {
  return scalar values %{$_[0]->{_rooms}};
}

sub room($$;$) {
  my ($self, $room_name, $room) = @_;
  if( defined $room ) {
    $self->{_rooms} = $room;
  } else {
    return $self->{_rooms}->{$room_name};
  }
}

sub add_client($$$$) {
  my ($self, $room_name, $client_id, $client) = @_;
  my $room = $self->{_rooms}->{$room_name};
  unless( defined $room ) {
    $room = $self->{_rooms}->{$room_name} = new Websocket::Room();
  }
  $self->room($room_name)->add($client_id, $client);
}

sub remove_client($$$) {
  my ($self, $room_name, $client_id) = @_;
  my $room = $self->{_rooms}->{$room_name};
  if( defined $room ) {
    $room->remove($client_id);
    if( $room->clients_count == 0 and not defined $self->{_predefined_rooms}->{$room_name} ) {
      delete $self->{_rooms}->{$room_name};
    }
  }
}

1;
