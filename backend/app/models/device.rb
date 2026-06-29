class Device < ApplicationRecord
  has_many :configs, dependent: :destroy
  has_many :device_events, dependent: :destroy

  enum :device_type, { router: "router", switch: "switch", access_point: "access_point", firewall: "firewall" }, validate: true
  enum :status, { online: "online", offline: "offline", degraded: "degraded" }, validate: true

  validates :name, :ip_address, :device_type, :location, presence: true
end
