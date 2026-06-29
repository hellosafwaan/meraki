require "rails_helper"

RSpec.describe DeviceStatusPollerJob, type: :job do
  let!(:device) { create(:device, ip_address: "127.0.0.1", status: "online") }

  def stub_ping(reachable:)
    ping_double = instance_double(Net::Ping::TCP, ping?: reachable)
    allow(Net::Ping::TCP).to receive(:new).and_return(ping_double)
  end

  describe "#perform" do
    context "when device is reachable" do
      it "keeps status as online and creates no event" do
        stub_ping(reachable: true)
        expect { described_class.new.perform }.not_to change(DeviceEvent, :count)
        expect(device.reload.status).to eq("online")
      end
    end

    context "when online device becomes unreachable" do
      it "transitions to degraded" do
        stub_ping(reachable: false)
        described_class.new.perform
        expect(device.reload.status).to eq("degraded")
      end

      it "creates a status_change DeviceEvent" do
        stub_ping(reachable: false)
        expect { described_class.new.perform }.to change(DeviceEvent, :count).by(1)
        event = DeviceEvent.last
        expect(event.event_type).to eq("status_change")
        expect(event.payload["from"]).to eq("online")
        expect(event.payload["to"]).to eq("degraded")
      end

      it "broadcasts the new status via ActionCable" do
        stub_ping(reachable: false)
        expect(ActionCable.server).to receive(:broadcast).with(
          "device_status_#{device.id}",
          { id: device.id, status: "degraded" }
        )
        described_class.new.perform
      end
    end

    context "when degraded device stays unreachable" do
      let!(:device) { create(:device, ip_address: "127.0.0.1", status: "degraded") }

      it "transitions to offline" do
        stub_ping(reachable: false)
        described_class.new.perform
        expect(device.reload.status).to eq("offline")
      end
    end

    context "when offline device becomes reachable again" do
      let!(:device) { create(:device, ip_address: "127.0.0.1", status: "offline") }

      it "transitions back to online" do
        stub_ping(reachable: true)
        described_class.new.perform
        expect(device.reload.status).to eq("online")
      end
    end
  end
end
