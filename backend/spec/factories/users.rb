FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@meraki.dev" }
    password { "password" }
    role { "viewer" }

    trait :admin do
      role { "admin" }
    end

    trait :network_engineer do
      role { "network_engineer" }
    end
  end
end
