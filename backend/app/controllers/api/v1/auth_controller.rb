module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_user!, only: [:login]
      skip_before_action :set_current_organization, only: [:login]

      def login
        user = User.find_by(email: params[:email])
        if user&.valid_password?(params[:password])
          token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
          orgs = user.organization_memberships.includes(:organization).map do |membership|
            org = membership.organization
            { id: org.id, name: org.name, slug: org.slug, role: membership.role }
          end
          render json: { token: token, user: { email: user.email, organizations: orgs } }
        else
          render json: { error: "Invalid email or password" }, status: :unauthorized
        end
      end
    end
  end
end
