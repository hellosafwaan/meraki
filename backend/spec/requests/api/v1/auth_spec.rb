require "rails_helper"

RSpec.describe "Api::V1::Auth", type: :request do
  describe "POST /api/v1/auth/login" do
    let!(:user) { create(:user, :admin, email: "admin@test.com", password: "password") }

    it "returns a token with valid credentials" do
      post "/api/v1/auth/login", params: { email: "admin@test.com", password: "password" }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["token"]).to be_present
      expect(body["user"]["role"]).to eq("admin")
    end

    it "returns 401 with invalid credentials" do
      post "/api/v1/auth/login", params: { email: "admin@test.com", password: "wrong" }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
