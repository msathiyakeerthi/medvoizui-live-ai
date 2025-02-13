import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css"; // Update this with custom styles
import HomePage from "./pages/home";
import { GlobalProvider } from "./provider/GlobalContext";

function App() {
	return (
		<Router>
			<GlobalProvider>
				<Routes>
					<Route path='/' element={<HomePage />} />
				</Routes>
			</GlobalProvider>
		</Router>
	);
}

export default App;
