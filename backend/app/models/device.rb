class Device < ApplicationRecord
  enum :device_type, { router: "router", switch: "switch", access_point: "access_point", firewall: "firewall" }, validate: true
  enum :status, { online: "online", offline: "offline", degraded: "degraded" }, validate: true

  validates :name, :ip_address, :device_type, :location, presence: true
end
