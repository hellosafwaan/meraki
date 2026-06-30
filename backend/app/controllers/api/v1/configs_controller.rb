module Api
  module V1
    class ConfigsController < ApplicationController
      before_action :set_device
      before_action :require_engineer_or_admin!, only: [:create]

      def index
        configs = @device.configs.includes(:pushed_by).order(version: :desc)
        render json: configs.map { |config|
          config.as_json(include: { pushed_by: { only: [:email] } }).tap do |json|
            json["pushed_by"]["role"] = org_role_for(config.pushed_by)
          end
        }
      end

      def create
        config = @device.configs.build(config_params)
        config.pushed_by = current_user

        if config.save
          render json: config, status: :created
        else
          render json: { errors: config.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_device
        @device = @current_org.devices.find(params[:device_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Device not found" }, status: :not_found
      end

      def config_params
        permitted = params.require(:config).permit(:note)
        raw = params.dig(:config, :config_data)
        permitted[:config_data] = raw.respond_to?(:to_unsafe_h) ? raw.to_unsafe_h : raw
        permitted
      end
    end
  end
end
