class CreateDevices < ActiveRecord::Migration[7.2]
  def change
    create_table :devices do |t|
      t.string :name
      t.string :ip_address
      t.string :device_type
      t.string :location
      t.string :status, default: "online", null: false

      t.timestamps
    end
  end
end
