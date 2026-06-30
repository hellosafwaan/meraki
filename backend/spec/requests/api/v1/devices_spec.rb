require "rails_helper"

RSpec.describe "Api::V1::Devices", type: :request do
  let(:organization) { create(:organization) }
  let(:admin)    { create(:user) }
  let(:engineer) { create(:user) }
  let(:viewer)   { create(:user) }

  before do
    create(:organization_membership, :admin, organization: organization, user: admin)
    create(:organization_membership, :network_engineer, organization: organization, user: engineer)
    create(:organization_membership, organization: organization, user: viewer)
  end

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
    it "returns devices for the current organization" do
      create_list(:device, 3, organization: organization)
      create(:device)
      get "/api/v1/devices", headers: auth_headers_for(viewer, organization)
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).length).to eq(3)
    end

    it "returns 401 without a token" do
      get "/api/v1/devices"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 400 without an organization header" do
      get "/api/v1/devices", headers: auth_headers_for(viewer)
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 403 when not a member of the organization" do
      other_org = create(:organization)
      get "/api/v1/devices", headers: auth_headers_for(viewer, other_org)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/v1/devices/:id" do
    it "returns the device" do
      device = create(:device, organization: organization)
      get "/api/v1/devices/#{device.id}", headers: auth_headers_for(viewer, organization)
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["id"]).to eq(device.id)
    end

    it "returns 404 for unknown id" do
      get "/api/v1/devices/99999", headers: auth_headers_for(viewer, organization)
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for a device in another organization" do
      device = create(:device)
      get "/api/v1/devices/#{device.id}", headers: auth_headers_for(viewer, organization)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/devices" do
    it "allows admin to create a device scoped to the organization" do
      expect {
        post "/api/v1/devices", params: valid_params, headers: auth_headers_for(admin, organization)
      }.to change(organization.devices, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "forbids viewer from creating a device" do
      post "/api/v1/devices", params: valid_params, headers: auth_headers_for(viewer, organization)
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids engineer from creating a device" do
      post "/api/v1/devices", params: valid_params, headers: auth_headers_for(engineer, organization)
      expect(response).to have_http_status(:forbidden)
    end

    it "returns 401 without a token" do
      post "/api/v1/devices", params: valid_params
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "PUT /api/v1/devices/:id" do
    it "allows admin to update a device" do
      device = create(:device, organization: organization)
      put "/api/v1/devices/#{device.id}", params: { device: { name: "Updated" } }, headers: auth_headers_for(admin, organization)
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["name"]).to eq("Updated")
    end

    it "forbids viewer from updating a device" do
      device = create(:device, organization: organization)
      put "/api/v1/devices/#{device.id}", params: { device: { name: "Updated" } }, headers: auth_headers_for(viewer, organization)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/devices/:id" do
    it "allows admin to delete a device" do
      device = create(:device, organization: organization)
      expect {
        delete "/api/v1/devices/#{device.id}", headers: auth_headers_for(admin, organization)
      }.to change(Device, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "forbids viewer from deleting a device" do
      device = create(:device, organization: organization)
      delete "/api/v1/devices/#{device.id}", headers: auth_headers_for(viewer, organization)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
