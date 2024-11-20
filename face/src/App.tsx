import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Index from "./components/Index.tsx"
import Eyeball from "./components/Eyeball.tsx"


const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/eyeball/:uuid", element: <Eyeball /> }
])

const App = () => {
    return <RouterProvider router={router} />
}

export default App
