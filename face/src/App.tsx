import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Index from "./components/Index.tsx"
import Eyeball from "./components/Eyeball.tsx"
import styles from "./styles/Index.module.css";

const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/eyeball/:uuid", element: <Eyeball /> }
])

const App = () => {
  return <div className={`${styles.container} container-fluid`} data-bs-theme='dark'>
    <RouterProvider router={router} />
  </div>
}

export default App
