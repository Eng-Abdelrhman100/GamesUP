# GamesUp Admin Access

## No Default Credentials

The project does not ship with a hardcoded default admin email/password.

## Creating an Admin User

Create an admin user directly in your MySQL `users` table (recommended) or via the admin user creation endpoint (if enabled for your role).

## Logging In

1. Open the app at `/admin`
2. Sign in with an admin user email/password from your database

## Notes

- Admin access requires the user role to be one of: `admin`, `manager`, `staff`
- Store branding (name/logo/email) comes from the `settings` table via `/api/settings`
