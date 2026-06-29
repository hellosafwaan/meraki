module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      token = request.params[:token] || request.headers["Authorization"]&.split(" ")&.last
      return reject_unauthorized_connection unless token

      payload = Warden::JWTAuth::TokenDecoder.new.call(token)
      user = User.find_by(id: payload["sub"])
      user || reject_unauthorized_connection
    rescue JWT::DecodeError
      reject_unauthorized_connection
    end
  end
end
