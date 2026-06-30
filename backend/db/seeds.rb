puts "Seeding organizations..."

org1 = Organization.find_or_create_by!(slug: "acme-corp") { |o| o.name = "Acme Corp" }
org2 = Organization.find_or_create_by!(slug: "globex")    { |o| o.name = "Globex Industries" }

puts "Done. #{Organization.count} organizations seeded."

puts "Seeding users..."

admin    = User.find_or_create_by!(email: "admin@meraki.dev")    { |u| u.password = "password" }
engineer = User.find_or_create_by!(email: "engineer@meraki.dev") { |u| u.password = "password" }
viewer   = User.find_or_create_by!(email: "viewer@meraki.dev")   { |u| u.password = "password" }

puts "Done. #{User.count} users seeded."

puts "Seeding memberships..."

OrganizationMembership.find_or_create_by!(organization: org1, user: admin)    { |m| m.role = "admin" }
OrganizationMembership.find_or_create_by!(organization: org2, user: admin)    { |m| m.role = "admin" }
OrganizationMembership.find_or_create_by!(organization: org1, user: engineer) { |m| m.role = "network_engineer" }
OrganizationMembership.find_or_create_by!(organization: org1, user: viewer)   { |m| m.role = "viewer" }

puts "Done. #{OrganizationMembership.count} memberships seeded."

puts "Seeding devices..."

[
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
].each do |attrs|
  org1.devices.find_or_create_by!(ip_address: attrs[:ip_address]) { |d| d.assign_attributes(attrs) }
end

[
  { name: "Globex Router",   ip_address: "127.0.0.21", device_type: "router",       location: "Plant A",           status: "online" },
  { name: "Globex Firewall", ip_address: "127.0.0.22", device_type: "firewall",     location: "Plant A",           status: "degraded" },
  { name: "Globex AP-01",    ip_address: "127.0.0.23", device_type: "access_point", location: "Plant A - Floor 1", status: "online" },
].each do |attrs|
  org2.devices.find_or_create_by!(ip_address: attrs[:ip_address]) { |d| d.assign_attributes(attrs) }
end

puts "Done. #{Device.count} devices seeded."
