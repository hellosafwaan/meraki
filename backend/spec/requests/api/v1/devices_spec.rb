require "rails_helper"

RSpec.describe "Api::V1::Devices", type: :request do
  let(:admin)    { create(:user, :admin) }
  let(:engineer) { create(:user, :network_engineer) }
  let(:viewer)   { create(:user) }

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

  describe "GET /api/v1/devices" do
    it "returns all devices when authenticated" do
      create_list(:device, 3)
      get "/api/v1/devices", headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).length).to eq(3)
    end

    it "returns 401 without a token" do
      get "/api/v1/devices"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/devices/:id" do
    it "returns the device" do
      device = create(:device)
      get "/api/v1/devices/#{device.id}", headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["id"]).to eq(device.id)
    end

    it "returns 404 for unknown id" do
      get "/api/v1/devices/99999", headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/devices" do
    it "allows admin to create a device" do
      expect {
        post "/api/v1/devices", params: valid_params, headers: auth_headers_for(admin)
      }.to change(Device, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "forbids viewer from creating a device" do
      post "/api/v1/devices", params: valid_params, headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids engineer from creating a device" do
      post "/api/v1/devices", params: valid_params, headers: auth_headers_for(engineer)
      expect(response).to have_http_status(:forbidden)
    end

    it "returns 401 without a token" do
      post "/api/v1/devices", params: valid_params
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "PUT /api/v1/devices/:id" do
    it "allows admin to update a device" do
      device = create(:device)
      put "/api/v1/devices/#{device.id}", params: { device: { name: "Updated" } }, headers: auth_headers_for(admin)
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["name"]).to eq("Updated")
    end

    it "forbids viewer from updating a device" do
      device = create(:device)
      put "/api/v1/devices/#{device.id}", params: { device: { name: "Updated" } }, headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/devices/:id" do
    it "allows admin to delete a device" do
      device = create(:device)
      expect {
        delete "/api/v1/devices/#{device.id}", headers: auth_headers_for(admin)
      }.to change(Device, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "forbids viewer from deleting a device" do
      device = create(:device)
      delete "/api/v1/devices/#{device.id}", headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
