import { createContext, useContext, useMemo } from "react";

/**
 * AppDataContext — Phase 7.1
 *
 * PURPOSE:
 * This context eliminates "prop drilling" — the pattern where appData and
 * setAppData are passed from App → Dashboard → every child screen as props.
 * Now, any component anywhere in the tree can call useAppData() to get the
 * data it needs directly.
 *
 * WHAT IT PROVIDES:
 *   appData       – the full application state object
 *   setAppData    – the state updater (use functional updater pattern!)
 *   currentUser   – the logged-in user object (derived from appData)
 *   currentUserId – shortcut to appData.currentUserId
 *
 * HOW TO USE IN A COMPONENT:
 *   import { useAppData } from "../contexts/AppDataContext";
 *
 *   function MyComponent() {
 *     const { appData, setAppData, currentUser } = useAppData();
 *     // ... use the data
 *   }
 */

// 1. Create the context with a default value of null
const AppDataContext = createContext(null);

/**
 * AppDataProvider — wraps the app and makes data available everywhere.
 *
 * Usage in App.jsx:
 *   <AppDataProvider appData={appData} setAppData={setAppData}>
 *     <Dashboard ... />
 *   </AppDataProvider>
 */
export function AppDataProvider({ appData, setAppData, children }) {
  // Derive commonly-used values so every component doesn't have to
  // compute them separately. useMemo ensures these only recalculate
  // when appData actually changes.
  const currentUserId = appData?.currentUserId || null;

  const currentUser = useMemo(
    () => appData?.users?.find((u) => u.id === currentUserId) || null,
    [appData?.users, currentUserId]
  );

  // Bundle everything into a single object.
  // useMemo prevents creating a new object on every render,
  // which would cause unnecessary re-renders in consumers.
  const value = useMemo(
    () => ({ appData, setAppData, currentUser, currentUserId }),
    [appData, setAppData, currentUser, currentUserId]
  );

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

/**
 * useAppData — the hook components use to access the shared data.
 *
 * Throws a helpful error if used outside the provider (catches bugs early).
 */
export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error(
      "useAppData() was called outside of <AppDataProvider>. " +
      "Make sure your component is wrapped inside the provider in App.jsx."
    );
  }
  return context;
}

export default AppDataContext;
