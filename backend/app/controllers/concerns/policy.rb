module Policy
  extend ActiveSupport::Concern

  def require_admin!
    render json: { error: "Forbidden" }, status: :forbidden unless current_membership&.admin?
  end

  def require_engineer_or_admin!
    render json: { error: "Forbidden" }, status: :forbidden unless
      current_membership&.admin? || current_membership&.network_engineer?
  end
end
