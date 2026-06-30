FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@meraki.dev" }
    password { "password" }
  end
end
