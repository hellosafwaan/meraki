FactoryBot.define do
  factory :device do
    association :organization
    sequence(:name) { |n| "Device #{n}" }
    sequence(:ip_address) { |n| "10.0.0.#{n}" }
    device_type { Device.device_types.keys.sample }
    location { "HQ - Floor 1" }
    status { "online" }
  end
end
