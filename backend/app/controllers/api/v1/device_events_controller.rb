module Api
  module V1
    class DeviceEventsController < ApplicationController
      def index
        device = @current_org.devices.find(params[:device_id])
        events = device.device_events.includes(:user).order(created_at: :desc)
        render json: events.map { |event|
          event.as_json.tap do |json|
            json["user"] = event.user && { "email" => event.user.email, "role" => org_role_for(event.user) }
          end
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Device not found" }, status: :not_found
      end
    end
  end
end
