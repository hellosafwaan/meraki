class ConfigSchemaValidator < ActiveModel::Validator
  REQUIRED_KEYS = {
    "access_point" => %w[ssid band channel security],
    "router"       => %w[wan_ip gateway dns],
    "switch"       => %w[vlans stp],
    "firewall"     => %w[rules]
  }.freeze

  def validate(record)
    device_type = record.device&.device_type
    return unless device_type

    required = REQUIRED_KEYS[device_type]
    return unless required

    missing = required - record.config_data.keys
    if missing.any?
      record.errors.add(:config_data, "is missing required keys for #{device_type}: #{missing.join(', ')}")
    end
  end
end
