require "rails_helper"

RSpec.describe "Api::V1::Devices", type: :request do
  let(:valid_params) do
    {
      device: {
        name: "Test Router",
        ip_address: "192.168.1.1",
        device_type: "router",
        location: "HQ - Server Room"
      }
    }
  end

  let(:invalid_params) do
    { device: { name: "", device_type: "router", location: "HQ" } }
  end

  describe "GET /api/v1/devices" do
    it "returns all devices" do
      create_list(:device, 3)
      get "/api/v1/devices"
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).length).to eq(3)
    end
  end

  describe "GET /api/v1/devices/:id" do
    it "returns the device" do
      device = create(:device)
      get "/api/v1/devices/#{device.id}"
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["id"]).to eq(device.id)
    end

    it "returns 404 for unknown id" do
      get "/api/v1/devices/99999"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/devices" do
    it "creates a device with valid params" do
      expect {
        post "/api/v1/devices", params: valid_params
      }.to change(Device, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 422 with invalid params" do
      post "/api/v1/devices", params: invalid_params
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
    end
  end

  describe "PUT /api/v1/devices/:id" do
    it "updates the device" do
      device = create(:device)
      put "/api/v1/devices/#{device.id}", params: { device: { name: "Updated Name" } }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["name"]).to eq("Updated Name")
    end

    it "returns 422 with invalid params" do
      device = create(:device)
      put "/api/v1/devices/#{device.id}", params: { device: { name: "" } }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/devices/:id" do
    it "deletes the device" do
      device = create(:device)
      expect {
        delete "/api/v1/devices/#{device.id}"
      }.to change(Device, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "returns 404 for unknown id" do
      delete "/api/v1/devices/99999"
      expect(response).to have_http_status(:not_found)
    end
  end
end
