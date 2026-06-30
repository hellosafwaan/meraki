require "rails_helper"

RSpec.describe "Api::V1::Auth", type: :request do
  describe "POST /api/v1/auth/login" do
    let!(:user) { create(:user, email: "admin@test.com", password: "password") }
    let!(:organization) { create(:organization, name: "Acme Corp", slug: "acme-corp") }
    let!(:membership) { create(:organization_membership, :admin, organization: organization, user: user) }

    it "returns a token with valid credentials" do
      post "/api/v1/auth/login", params: { email: "admin@test.com", password: "password" }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["token"]).to be_present
      expect(body["user"]["email"]).to eq("admin@test.com")
    end

    it "includes the user's organizations and per-org role" do
      post "/api/v1/auth/login", params: { email: "admin@test.com", password: "password" }
      body = JSON.parse(response.body)
      orgs = body["user"]["organizations"]
      expect(orgs.length).to eq(1)
      expect(orgs.first["slug"]).to eq("acme-corp")
      expect(orgs.first["role"]).to eq("admin")
    end

    it "returns 401 with invalid credentials" do
      post "/api/v1/auth/login", params: { email: "admin@test.com", password: "wrong" }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
