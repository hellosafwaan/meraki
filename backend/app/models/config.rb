class Config < ApplicationRecord
  belongs_to :device
  belongs_to :pushed_by, class_name: "User"

  validates :config_data, presence: true
  validates_with ConfigSchemaValidator

  before_create :set_version

  after_create :log_event

  private

  def set_version
    last = Config.where(device: device).maximum(:version).to_i
    self.version = last + 1
  end

  def log_event
    device.device_events.create!(
      user: pushed_by,
      event_type: "config_push",
      payload: { version: version, note: note }
    )
  end
end
