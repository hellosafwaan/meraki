FactoryBot.define do
  factory :config do
    association :device
    association :pushed_by, factory: :user
    config_data { { "ssid" => "CorpNet", "band" => "5GHz", "channel" => 36, "security" => "WPA3" } }
    note { "Initial config" }

    before(:create) do |config|
      config.device.update!(device_type: "access_point") unless config.device.access_point?
    end
  end
end
