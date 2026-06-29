class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  enum :role, { admin: "admin", network_engineer: "network_engineer", viewer: "viewer" }, validate: true

  validates :role, presence: true
end
