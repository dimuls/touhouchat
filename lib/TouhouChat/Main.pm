package TouhouChat::Main;
use Mojo::Base 'Mojolicious::Controller';

# This action will render a template
sub index {
  my ($self) = @_;
  $self->res->code(301);
  $self->redirect_to('b');
}

sub room {
  my ($self) = @_;
  $self->render;
}

1;
