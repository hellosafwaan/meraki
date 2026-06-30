require "rails_helper"

RSpec.describe DeviceStatusChannel, type: :channel do
  let(:organization) { create(:organization) }
  let(:user)   { create(:user) }
  let(:device) { create(:device, organization: organization) }

  before do
    create(:organization_membership, organization: organization, user: user)
    stub_connection current_user: user
  end

  it "subscribes and streams for a valid device" do
    subscribe device_id: device.id
    expect(subscription).to be_confirmed
    expect(subscription.streams).to include("device_status_#{device.id}")
  end

  it "rejects subscription for an unknown device" do
    subscribe device_id: 99999
    expect(subscription).to be_rejected
  end

  it "rejects subscription for a device in another organization" do
    other_device = create(:device)
    subscribe device_id: other_device.id
    expect(subscription).to be_rejected
  end

  it "broadcasts status update when job fires" do
    subscribe device_id: device.id

    expect {
      ActionCable.server.broadcast(
        "device_status_#{device.id}",
        { id: device.id, status: "degraded" }
      )
    }.to have_broadcasted_to("device_status_#{device.id}").with(
      id: device.id, status: "degraded"
    )
  end
end
