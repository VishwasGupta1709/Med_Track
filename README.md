# MedTrack

## Local Setup

1. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start PostgreSQL:

   ```powershell
   docker compose up -d
   ```

3. Install dependencies:

   ```powershell
   npm install
   ```

4. Generate the Prisma client:

   ```powershell
   npx prisma generate
   ```

5. Run the initial migration:

   ```powershell
   npx prisma migrate dev --name init_patient_profile
   ```

6. Start the Next.js development server:

   ```powershell
   npm run dev
   ```

Open the app at:

```text
http://localhost:3000/patients
```
