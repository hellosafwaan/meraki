class CreateConfigs < ActiveRecord::Migration[7.2]
  def change
    create_table :configs do |t|
      t.references :device, null: false, foreign_key: true
      t.references :pushed_by, null: false, foreign_key: { to_table: :users }
      t.jsonb :config_data, null: false, default: {}
      t.integer :version, null: false
      t.string :note

      t.timestamps
    end
  end
end
