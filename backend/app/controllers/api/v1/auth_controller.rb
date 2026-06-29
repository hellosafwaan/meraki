module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_user!, only: [:login]

      def login
        user = User.find_by(email: params[:email])
        if user&.valid_password?(params[:password])
          token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
          render json: { token: token, user: { email: user.email, role: user.role } }
        else
          render json: { error: "Invalid email or password" }, status: :unauthorized
        end
      end
    end
  end
end
