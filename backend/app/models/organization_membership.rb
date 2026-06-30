class OrganizationMembership < ApplicationRecord
  belongs_to :organization
  belongs_to :user

  enum :role, { admin: "admin", network_engineer: "network_engineer", viewer: "viewer" }, validate: true

  validates :role, presence: true
end
