FactoryBot.define do
  factory :jwt_denylist do
    jti { "MyString" }
    exp { "2026-06-29 17:11:12" }
  end
end
