import { Route, Routes } from "react-router-dom"
import { HomePage } from "./pages/HomePage"
import { NotFoundPage } from "./pages/NotFoundPage"
import { RedirectPage } from "./pages/RedirectPage"

function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path=":urlEncurtada" element={<RedirectPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
