module Policy
  extend ActiveSupport::Concern

  def require_admin!
    render json: { error: "Forbidden" }, status: :forbidden unless current_user.admin?
  end

  def require_engineer_or_admin!
    render json: { error: "Forbidden" }, status: :forbidden unless current_user.admin? || current_user.network_engineer?
  end
end
