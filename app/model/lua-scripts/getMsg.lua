local room = KEYS[1]
local id = tonumber(ARGV[1])
local ls_limit = tonumber(redis.call('hget', 'config', 'log_size_limit'))
local cnt = tonumber(redis.call('hget', 'rooms_counters', room))
if cnt and id <= cnt and id > cnt - ls_limit then
  local i
  if cnt <= ls_limit then
    i = id - 1
  else
    i = id  - (cnt - ls_limit + 1)
  end
  return redis.call("lindex", "#" .. KEYS[1], i)
else 
  return false
end 
