module Api
  module V1
    class DevicesController < ApplicationController
      before_action :set_device, only: [:show, :update, :destroy]
      before_action :require_admin!, only: [:create, :update, :destroy]

      def index
        render json: @current_org.devices
      end

      def show
        render json: @device
      end

      def create
        device = @current_org.devices.build(device_params)
        if device.save
          render json: device, status: :created
        else
          render json: { errors: device.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @device.update(device_params)
          render json: @device
        else
          render json: { errors: @device.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @device.destroy
        head :no_content
      end

      private

      def set_device
        @device = @current_org.devices.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Device not found" }, status: :not_found
      end

      def device_params
        params.require(:device).permit(:name, :ip_address, :device_type, :location, :status)
      end
    end
  end
end
