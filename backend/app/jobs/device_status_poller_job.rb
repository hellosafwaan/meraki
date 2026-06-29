class DeviceStatusPollerJob < ApplicationJob
  queue_as :default

  def perform
    Device.find_each do |device|
      checker = Net::Ping::TCP.new(device.ip_address, 80, 2)
      reachable = checker.ping?
      new_status = resolve_status(device.status, reachable)
      next if new_status == device.status

      previous_status = device.status
      device.update!(status: new_status)

      device.device_events.create!(
        event_type: "status_change",
        payload: { from: previous_status, to: new_status }
      )

      ActionCable.server.broadcast(
        "device_status_#{device.id}",
        { id: device.id, status: new_status }
      )
    end
  end

  private

  def resolve_status(current, reachable)
    return "online" if reachable
    return "degraded" if current == "online"
    "offline"
  end
end
