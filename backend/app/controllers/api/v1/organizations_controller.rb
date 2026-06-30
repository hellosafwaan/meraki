module Api
  module V1
    class OrganizationsController < ApplicationController
      skip_before_action :set_current_organization

      def index
        orgs = current_user.organization_memberships.includes(:organization).map do |membership|
          org = membership.organization
          { id: org.id, name: org.name, slug: org.slug, role: membership.role }
        end
        render json: orgs
      end
    end
  end
end
