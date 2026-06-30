class ApplicationController < ActionController::Base
  include Policy

  protect_from_forgery with: :null_session
  before_action :authenticate_user!
  before_action :set_current_organization

  respond_to :json

  private

  def set_current_organization
    org_id = request.headers["X-Organization-Id"]
    return render json: { error: "Organization required" }, status: :bad_request unless org_id

    @current_org = current_user.organizations.find_by(id: org_id)
    render json: { error: "Forbidden" }, status: :forbidden unless @current_org
  end

  def current_membership
    @current_membership ||= OrganizationMembership.find_by(
      user: current_user,
      organization: @current_org
    )
  end

  def org_role_for(user)
    return nil unless user

    OrganizationMembership.find_by(user: user, organization: @current_org)&.role
  end
end
