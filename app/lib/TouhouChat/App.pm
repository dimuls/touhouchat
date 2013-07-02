package TouhouChat::App;

use Mojo::Base 'Mojolicious::Controller';
use POSIX;

sub msg($;$) {
  return { json => { cmd => $_[0], data => $_[1] }};
}

sub error($) {
  return msg 'error', $_[0];
}

sub init_app($) {
  my ($self) = @_;
  Mojo::IOLoop->stream($self->tx->connection)->timeout(300);
}

sub handle {
  my ($self) = @_;
  $self->init_app;

  my $room_id = $self->param('room');
  $self->rooms->add_client($room_id, $self->cid, $self->c);

  my $msgs = $self->room->store('msgs');
  if( defined $msgs ) {
    $self->c->send(msg 'set msgs', $msgs);
  } else {
    $msgs = [];
    $self->room->store('msgs', $msgs);
  }

  $self->room->send(msg 'set client count', $self->room->clients_count);

  $self->on(json => sub {
    my ($c, $msg) = @_;
    given( $msg->{cmd} ) {
      when( 'write' ) {
        my $text = $msg->{data};
        unless( defined $text ) {
          $c->send(error 'Отсутвует текст собщения');
          return;
        }
        $text =~ s/(^\s+|\s+$)//g;
        $text =~ s/\s+/ /g;
        unless( length($text) <= 600 and length($text) >= 1 ) {
          $c->send(error 'Сообщение должно быть от 1 до 600 символов');
          return;
        }
        my $msg_data = { text => $text, dt => strftime("%d.%m.%Y %T", localtime) };
        $self->room->send(msg 'chat message', $msg_data);
        shift @$msgs if scalar @$msgs >= 100;
        push @$msgs, $msg_data;
      }
    }
  });
  $self->on(finish => sub {
    $self->rooms->remove_client($room_id, $self->cid);
    $self->room->send(msg 'set client count', $self->room->clients_count);
  });
}

1;
