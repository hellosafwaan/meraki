Rails.application.routes.draw do
  devise_for :users, skip: :all

  mount ActionCable.server => "/cable"

  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "auth/login",  to: "auth#login"
      delete "auth/logout", to: "auth#logout"

      resources :organizations, only: [:index]

      resources :devices do
        resources :configs, only: [:index, :create]
        resources :device_events, only: [:index]
      end
    end
  end
end
