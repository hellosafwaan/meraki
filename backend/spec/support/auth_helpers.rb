module AuthHelpers
  def auth_headers_for(user, organization = nil)
    token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Organization-Id"] = organization.id.to_s if organization
    headers
  end
end
