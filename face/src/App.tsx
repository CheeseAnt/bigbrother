import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Index from "./components/Index.tsx"
import Eyeball from "./components/Eyeball.tsx"
import Login from "./components/Login.tsx"  
import styles from "./styles/Index.module.css";
import { isBadAuth } from "./api.ts";
import { useEffect, useState } from 'react';

const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/eyeball/:uuid", element: <Eyeball /> }
])

const App = () => {
  const [ badAuth, setBadAuth ] = useState(true);

  useEffect(() => {
    if (badAuth) {
      isBadAuth().then(res => setBadAuth(res));
    }
  }, [badAuth])

  return <div className={`${styles.container} container-fluid`} data-bs-theme='dark'>
    {badAuth && <Login />}
    {!badAuth && <RouterProvider router={router} />}
  </div>
}

export default App
