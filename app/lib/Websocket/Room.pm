package Websocket::Room;

use v5.14;
use utf8;

sub new($) {
  my ($class) = @_;
  my $self = {
    clients => {},
    store => {},
  };
  bless $self, $class;
  return $self;
}

sub store($;$$) {
  my ($self, $key, $value) = @_;
  return $self->{store} unless defined $key;
  if( defined $value ) {
    $self->{store}->{$key} = $value;
  } else {
    return $self->{store}->{$key};
  }

}

sub clients_count($) {
  return scalar values %{$_[0]->{clients}};
}

sub client($$;$) {
  my ($self, $id, $client) = @_;
  if( defined $client ) {
    $self->{clients}->{$id} = $client;
  } else {
    return $self->{clients}->{$id};
  }
}

sub add($$$) {
  my ($self, $id, $client) = @_;
  $self->{clients}->{$id} = $client;
}

sub remove($$) {
  my ($self, $id) = @_;
  delete $self->{clients}->{$id};
}

sub broadcast($$$) {
  my ($self, $bid, $msg)= @_;
  while( my ($id, $client) = each %{$self->{clients}} ) {
    $client->send($msg) unless $id ~~ $bid;
  }
}

sub send($$) {
  my ($self, $msg)= @_;
  foreach( values %{$self->{clients}} ) {
    $_->send($msg);
  }
}

1;
