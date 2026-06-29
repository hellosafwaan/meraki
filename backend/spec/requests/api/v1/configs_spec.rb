require "rails_helper"

RSpec.describe "Api::V1::Configs", type: :request do
  let(:admin)    { create(:user, :admin) }
  let(:engineer) { create(:user, :network_engineer) }
  let(:viewer)   { create(:user) }
  let(:device)   { create(:device, device_type: "access_point") }

  let(:valid_config_data) do
    { "ssid" => "CorpNet", "band" => "5GHz", "channel" => 36, "security" => "WPA3" }
  end

  let(:invalid_config_data) do
    { "ssid" => "CorpNet" }
  end

  describe "GET /api/v1/devices/:device_id/configs" do
    it "returns all configs for a device ordered by version desc" do
      create(:config, device: device, pushed_by: admin)
      create(:config, device: device, pushed_by: admin)
      get "/api/v1/devices/#{device.id}/configs", headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(2)
      expect(body.first["version"]).to be > body.last["version"]
    end
  end

  describe "POST /api/v1/devices/:device_id/configs" do
    it "allows admin to push a config" do
      expect {
        post "/api/v1/devices/#{device.id}/configs",
          params: { config: { config_data: valid_config_data, note: "Initial push" } },
          headers: auth_headers_for(admin)
      }.to change(Config, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "allows engineer to push a config" do
      post "/api/v1/devices/#{device.id}/configs",
        params: { config: { config_data: valid_config_data } },
        headers: auth_headers_for(engineer)
      expect(response).to have_http_status(:created)
    end

    it "forbids viewer from pushing a config" do
      post "/api/v1/devices/#{device.id}/configs",
        params: { config: { config_data: valid_config_data } },
        headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:forbidden)
    end

    it "auto-increments version per device" do
      post "/api/v1/devices/#{device.id}/configs",
        params: { config: { config_data: valid_config_data } },
        headers: auth_headers_for(admin)
      post "/api/v1/devices/#{device.id}/configs",
        params: { config: { config_data: valid_config_data } },
        headers: auth_headers_for(admin)

      versions = device.configs.pluck(:version).sort
      expect(versions).to eq([1, 2])
    end

    it "rejects config with missing required keys" do
      post "/api/v1/devices/#{device.id}/configs",
        params: { config: { config_data: invalid_config_data } },
        headers: auth_headers_for(admin)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"].first).to include("missing required keys")
    end

    it "creates a config_push DeviceEvent" do
      expect {
        post "/api/v1/devices/#{device.id}/configs",
          params: { config: { config_data: valid_config_data, note: "deploy" } },
          headers: auth_headers_for(admin)
      }.to change(DeviceEvent, :count).by(1)

      event = DeviceEvent.last
      expect(event.event_type).to eq("config_push")
      expect(event.payload["note"]).to eq("deploy")
    end

    it "records pushed_by on the config" do
      post "/api/v1/devices/#{device.id}/configs",
        params: { config: { config_data: valid_config_data } },
        headers: auth_headers_for(engineer)
      expect(Config.last.pushed_by).to eq(engineer)
    end
  end
end
