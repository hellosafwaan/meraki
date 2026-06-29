module Api
  module V1
    class DeviceEventsController < ApplicationController
      def index
        device = Device.find(params[:device_id])
        events = device.device_events.order(created_at: :desc)
        render json: events.as_json(include: { user: { only: [:email, :role] } })
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Device not found" }, status: :not_found
      end
    end
  end
end
