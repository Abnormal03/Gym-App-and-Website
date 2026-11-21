# Backend operations

## Provision the first platform admin

There is no public platform-admin sign-up. Provision the account only after the `SuperAdmin` migration has been applied and the backend Prisma client has been generated.

Set these values in the backend process environment (or in `backend/.env` for local development):

- `SUPER_ADMIN_NAME`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD` — at least 12 characters
- `DATABASE_URL`

Then run from this backend directory:

```sh
npm run provision:super-admin
```

The command creates or updates the account with the supplied email, hashes the password, and prints only the account email and ID. Running it again for the same email resets the password and reactivates that account. Remove the one-time password from temporary shell/environment settings when finished; do not commit credentials.

For Render, set the variables in the backend service environment, open the service Shell after the migration deployment, run `npm run provision:super-admin`, and then remove `SUPER_ADMIN_PASSWORD` from the service environment if ongoing password resets are not intended. Store the credential in an approved password manager. The super-admin signs in through the Platform admin option at `/login`.
