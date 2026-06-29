FactoryBot.define do
  factory :device_event do
    device { nil }
    event_type { "MyString" }
    payload { "" }
  end
end
