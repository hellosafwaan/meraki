class ApplicationController < ActionController::Base
  include Policy

  before_action :authenticate_user!

  respond_to :json
end
