FactoryBot.define do
  factory :organization_membership do
    association :organization
    association :user
    role { "viewer" }

    trait :admin do
      role { "admin" }
    end

    trait :network_engineer do
      role { "network_engineer" }
    end
  end
end
