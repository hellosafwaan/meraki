class DeviceEvent < ApplicationRecord
  belongs_to :device
  belongs_to :user, optional: true

  enum :event_type, { status_change: "status_change", config_push: "config_push" }, validate: true

  validates :event_type, :payload, presence: true
end
