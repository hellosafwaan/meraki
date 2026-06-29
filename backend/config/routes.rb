Rails.application.routes.draw do
  devise_for :users, skip: :all

  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "auth/login",  to: "auth#login"
      delete "auth/logout", to: "auth#logout"

      resources :devices
    end
  end
end
