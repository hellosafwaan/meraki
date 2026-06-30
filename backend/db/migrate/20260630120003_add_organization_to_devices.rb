class AddOrganizationToDevices < ActiveRecord::Migration[7.2]
  def change
    add_reference :devices, :organization, null: false, foreign_key: true
  end
end
