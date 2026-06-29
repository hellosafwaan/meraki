puts "Seeding users..."

[
  { email: "admin@meraki.dev",    password: "password", role: "admin" },
  { email: "engineer@meraki.dev", password: "password", role: "network_engineer" },
  { email: "viewer@meraki.dev",   password: "password", role: "viewer" },
].each do |attrs|
  User.find_or_create_by!(email: attrs[:email]) do |u|
    u.password = attrs[:password]
    u.role = attrs[:role]
  end
end

puts "Done. #{User.count} users seeded."

puts "Seeding devices..."

devices = [
  { name: "Core Router 01",      ip_address: "127.0.0.1",  device_type: "router",       location: "HQ - Server Room",    status: "online" },
  { name: "Core Router 02",      ip_address: "127.0.0.2",  device_type: "router",       location: "HQ - Server Room",    status: "online" },
  { name: "Distribution SW-01",  ip_address: "127.0.0.3",  device_type: "switch",       location: "HQ - Floor 1",        status: "online" },
  { name: "Distribution SW-02",  ip_address: "127.0.0.4",  device_type: "switch",       location: "HQ - Floor 2",        status: "degraded" },
  { name: "Access SW-01",        ip_address: "127.0.0.5",  device_type: "switch",       location: "Branch - NYC",        status: "online" },
  { name: "Access SW-02",        ip_address: "127.0.0.6",  device_type: "switch",       location: "Branch - SF",         status: "offline" },
  { name: "AP-Lobby-01",         ip_address: "127.0.0.7",  device_type: "access_point", location: "HQ - Lobby",          status: "online" },
  { name: "AP-Floor1-01",        ip_address: "127.0.0.8",  device_type: "access_point", location: "HQ - Floor 1",        status: "online" },
  { name: "AP-Floor2-01",        ip_address: "127.0.0.9",  device_type: "access_point", location: "HQ - Floor 2",        status: "degraded" },
  { name: "AP-Branch-NYC-01",    ip_address: "127.0.0.10", device_type: "access_point", location: "Branch - NYC",        status: "online" },
  { name: "FW-Perimeter-01",     ip_address: "127.0.0.11", device_type: "firewall",     location: "HQ - Server Room",    status: "online" },
  { name: "FW-Perimeter-02",     ip_address: "127.0.0.12", device_type: "firewall",     location: "Branch - NYC",        status: "online" },
  { name: "FW-Branch-SF-01",     ip_address: "127.0.0.13", device_type: "firewall",     location: "Branch - SF",         status: "offline" },
  { name: "Edge Router 01",      ip_address: "127.0.0.14", device_type: "router",       location: "Branch - NYC",        status: "online" },
  { name: "Edge Router 02",      ip_address: "127.0.0.15", device_type: "router",       location: "Branch - SF",         status: "degraded" },
]

devices.each do |attrs|
  Device.find_or_create_by!(ip_address: attrs[:ip_address]) do |d|
    d.assign_attributes(attrs)
  end
end

puts "Done. #{Device.count} devices seeded."
