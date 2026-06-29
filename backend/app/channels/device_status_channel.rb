class DeviceStatusChannel < ApplicationCable::Channel
  def subscribed
    device = Device.find_by(id: params[:device_id])
    return reject unless device

    stream_from "device_status_#{device.id}"
  end

  def unsubscribed
    stop_all_streams
  end
end
