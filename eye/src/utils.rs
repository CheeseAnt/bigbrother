use users;
use hostname;

pub fn get_current_user() -> String {
    users::get_current_username()
        .map(|u| u.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

pub fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
}
