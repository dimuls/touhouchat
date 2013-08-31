local room = KEYS[1]
local hroom = '#' .. room
local custom_room = redis.call('hexists', 'predefined_rooms', room) == 0;

if custom_room then
  redis.call('del', hroom)
  redis.call('hdel', 'rooms_counters', room)
end
