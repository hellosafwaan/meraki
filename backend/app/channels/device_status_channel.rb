class DeviceStatusChannel < ApplicationCable::Channel
  def subscribed
    device = Device.find_by(id: params[:device_id])
    return reject unless device
    return reject unless current_user.organizations.include?(device.organization)

    stream_from "device_status_#{device.id}"
  end

  def unsubscribed
    stop_all_streams
  end
end
