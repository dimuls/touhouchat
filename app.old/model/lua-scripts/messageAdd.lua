local room = KEYS[1]
local hroom = '#' .. room
local msg = cjson.decode(ARGV[1])
local log_size_limit = tonumber(redis.call('hget', 'config', 'log_size_limit'))
local rooms_count_limit = tonumber(redis.call('hget', 'config', 'rooms_count_limit'))
local rooms_count = redis.call('hlen', 'rooms_counters')
local room_exists = redis.call('exists', hroom) == 1

if not room_exists and rooms_count >= rooms_count_limit then
  return redis.error_reply("Can\'t create room: limit is reached");
else 
  msg.id = tonumber(redis.call('hincrby', 'rooms_counters', room, 1))
  if msg.id > log_size_limit then
    redis.call('lpop', hroom);
  end
  redis.call('rpush', hroom, cjson.encode(msg));
  return msg.id;
end
