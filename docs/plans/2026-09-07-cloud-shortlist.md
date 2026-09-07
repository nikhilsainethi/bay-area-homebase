# Supabase sign-in and synced shortlist

Use the user-created project jmidvyxnvzbkucbixwab. Preserve GitHub Pages hosting and local records. Add email/password sign-in, account registration and recovery through Supabase Auth. Scope each row by auth.uid() with RLS; no service-role key in client code. Store each property's validated JSON and a server timestamp. All cloud reads/writes fail closed when signed out; remount app on identity changes to clear private state.

Import browser records only through an explicit button after sign-in, skip duplicates, never erase the browser copy. Export reads the active cloud store. JSON import uses the same validated, atomic bulk insert path. Test merge and validation first, verify DB RLS under two simulated identities, then build and redeploy GitHub Pages. Database setup and client publishable key depend on dashboard access; retain the working live version until configured.
