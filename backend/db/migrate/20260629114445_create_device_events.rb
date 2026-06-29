class CreateDeviceEvents < ActiveRecord::Migration[7.2]
  def change
    create_table :device_events do |t|
      t.references :device, null: false, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.string :event_type, null: false
      t.jsonb :payload, null: false, default: {}

      t.timestamps
    end
  end
end
